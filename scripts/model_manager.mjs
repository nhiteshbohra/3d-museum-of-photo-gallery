#!/usr/bin/env node
/**
 * Model Manager — safe asset-management for the 3D Museum.
 *
 * Commands (used by `npm run models:*`):
 *   audit          Identify active / unused / uncertain model assets (no moves).
 *   archive        Move ONLY proven-unused models to archive/models/ (reversible).
 *   restore        Restore archived models back to their original public path.
 *   verify         Confirm every active asset reference resolves to a file.
 *
 * Safety rules enforced here:
 *   - Never moves an asset that is referenced anywhere (src/, tests/, scripts/,
 *     tools/, server.js, index.html, museumLayout.json, characters.json).
 *   - Never deletes/renames/re-encodes a file — only moves it.
 *   - Idempotent: running archive twice is a no-op the second time.
 *   - Every move is recorded in docs/audit/MODEL_ARCHIVE_MANIFEST.json so the
 *     restore command can reverse it.
 *   - Preserves dependent resources (scenes with .bin, sibling textures).
 */
import { readdirSync, readFileSync, existsSync, statSync, mkdirSync, writeFileSync, renameSync, cpSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd())
const PUBLIC_MODELS = path.join(ROOT, 'public', 'models')
const ARCHIVE_MODELS = path.join(ROOT, 'archive', 'models')
const MANIFEST_PATH = path.join(ROOT, 'docs', 'audit', 'MODEL_ARCHIVE_MANIFEST.json')
const INVENTORY_PATH = path.join(ROOT, 'docs', 'audit', 'MODEL_ASSET_INVENTORY.md')

// Folders that are NOT 3D model assets (docs, tooling, shared loaders).
const NON_MODEL_DIRS = new Set(['_studio', 'draco'])

const SPAN_DIRS = [
  'src',
  'tests',
  'scripts',
  'tools',
]

const SPAN_FILES = ['server.js', 'index.html']

function walk(dir, out = [], base = '') {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const rel = base ? `${base}/${entry}` : entry
    if (statSync(full).isDirectory()) {
      walk(full, out, rel)
    } else {
      out.push(rel)
    }
  }
  return out
}

/** Collect every string that looks like a model-file path (glb/gltf/fbx/obj/mtl/bin). */
function collectModelRefs() {
  const refs = new Set()
  const scanFile = (rel) => {
    const abs = path.join(ROOT, rel)
    if (!existsSync(abs)) return
    let text = ''
    try {
      text = readFileSync(abs, 'utf8')
    } catch {
      return
    }
    const re = /["'`]?((?:\.\.\/)*models\/ready\/[^"'\s`)]+\.(?:glb|gltf|fbx|obj|mtl|bin))["'`]?/g
    let m
    while ((m = re.exec(text)) !== null) {
      refs.add(m[1].replace(/^\.\.\//, ''))
    }
    // bare filenames for characters (server ALLOWED_MODELS / characters.json)
    const re2 = /["'`]?(man\.glb|woman\.glb)["'`]?/g
    while ((m = re2.exec(text)) !== null) {
      refs.add(`models/ready/characters/${m[1]}`)
    }
  }
  for (const d of SPAN_DIRS) {
    for (const f of walk(path.join(ROOT, d))) scanFile(`${d}/${f}`)
  }
  for (const f of SPAN_FILES) scanFile(f)
  return refs
}

/** Inventory on-disk model assets under public/models/ready (and lod/). */
function inventoryModels() {
  const items = []
  const readyRoot = path.join(PUBLIC_MODELS, 'ready')
  if (!existsSync(readyRoot)) return items
  const traverse = (dir, relBase) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name
      // skip non-model dirs (docs/tooling/loaders)
      if (entry.isDirectory() && NON_MODEL_DIRS.has(entry.name)) continue
      if (entry.isDirectory()) {
        traverse(full, rel)
      } else {
        const ext = path.extname(entry.name).toLowerCase()
        if (['.glb', '.gltf', '.fbx', '.obj', '.mtl', '.bin'].includes(ext)) {
          items.push({
            rel,
            abs: full,
            size: statSync(full).size,
            ext,
          })
        }
      }
    }
  }
  traverse(readyRoot, '')
  return items
}

function refMatchesRef(ref, rel) {
  // normalize trailing/leading slashes
  const r = ref.replace(/\\/g, '/').replace(/^\.\//, '')
  const p = rel.replace(/\\/g, '/')
  return r === p || r.endsWith('/' + p) || p.endsWith('/' + r)
}

/**
 * Extract the exact list of animation GLB filenames actively loaded by avatarWorld.js
 */
function getActiveClipFiles() {
  const avatarWorldPath = path.join(ROOT, 'src', 'avatars', 'avatarWorld.js')
  const clips = new Set()
  if (existsSync(avatarWorldPath)) {
    const text = readFileSync(avatarWorldPath, 'utf8')
    const re = /:\s*['"]([^'"]+\.glb)['"]/g
    let m
    while ((m = re.exec(text)) !== null) {
      clips.add(m[1])
    }
  }
  return clips
}

const activeClips = getActiveClipFiles()

/**
 * Dynamic references that a literal-path scan cannot catch:
 *  - Avatar animation clips actively listed in avatarWorld.js CLIP_FILES.
 *    Any unlisted animation clip (e.g. clap.glb) is proven unreferenced.
 *  - A `.bin` file is a sibling dependency of an in-use `.gltf`/`.glb` scene.
 */
function isDynamicRef(rel) {
  const p = rel.replace(/\\/g, '/')
  const filename = path.basename(p)
  if (/^characters\/animations\/(man|woman)\//.test(p)) {
    if (activeClips.has(filename)) return 'used'
    return null // Not in active animation library -> archive candidate
  }
  if (p.endsWith('.bin')) return 'dependency' // sibling binary of a scene
  return null
}

function runAudit({ json = false } = {}) {
  const refs = collectModelRefs()
  const models = inventoryModels()

  const rows = models.map((m) => {
    const dyn = isDynamicRef(m.rel)
    const referenced = dyn === 'used' || dyn === 'dependency' || [...refs].some((r) => refMatchesRef(r, m.rel))
    const status =
      dyn === 'uncertain' ? 'UNCERTAIN' :
      referenced ? 'USED' : 'UNUSED'
    return { ...m, referenced, status }
  })

  const used = rows.filter((r) => r.status === 'USED')
  const uncertain = rows.filter((r) => r.status === 'UNCERTAIN')
  const unused = rows.filter((r) => r.status === 'UNUSED')

  if (json) {
    console.log(JSON.stringify({ used, uncertain, unused, totalBytes: models.reduce((s, m) => s + m.size, 0) }, null, 2))
    return
  }

  console.log(`\n=== MODEL ASSET AUDIT (${models.length} on-disk assets) ===\n`)
  console.log(`USED (${used.length}):`)
  for (const m of used) {
    console.log(`  [USED]  ${m.rel}  (${(m.size / 1024).toFixed(1)} KB)`)
  }
  if (uncertain.length) {
    console.log(`\nUNCERTAIN (${uncertain.length}) — optional/dynamic, KEPT:`)
    for (const m of uncertain) {
      console.log(`  [SAFE]  ${m.rel}`)
    }
  }
  console.log(`\nUNUSED / PROVEN UNREFERENCED (${unused.length}) — archive candidates:`)
  for (const m of unused) {
    console.log(`  [FREE]  ${m.rel}  (${(m.size / 1024).toFixed(1)} KB)`)
  }
  console.log('\nNote: assets referenced only by the artifact registry but missing on disk are')
  console.log('reported separately in the inventory doc; they are not archive candidates.')
  console.log(`\nTotal on-disk model bytes: ${(models.reduce((s, m) => s + m.size, 0) / 1024 / 1024).toFixed(2)} MB`)
}

function writeManifest(entries) {
  mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true })
  writeFileSync(MANIFEST_PATH, JSON.stringify({ generated: new Date().toISOString(), entries }, null, 2))
}

function readManifest() {
  if (!existsSync(MANIFEST_PATH)) return []
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')).entries || []
  } catch {
    return []
  }
}

function runArchive({ dryRun = false } = {}) {
  const refs = collectModelRefs()
  const models = inventoryModels()
  // Only proven-unused assets are archived. Uncertain/dynamic/dependency assets
  // are never moved (see isDynamicRef).
  const unused = models.filter((m) => {
    if (isDynamicRef(m.rel)) return false
    return ![...refs].some((r) => refMatchesRef(r, m.rel))
  })

  if (unused.length === 0) {
    console.log('\nNo proven-unused model assets found. Nothing to archive. (idempotent no-op)')
    return
  }

  console.log(`\nArchiving ${unused.length} proven-unused model asset(s)...\n`)
  const entries = []
  for (const m of unused) {
    const origin = path.join('public', 'models', 'ready', m.rel)
    const destRel = m.rel // preserve relative path under archive/models/
    const destAbs = path.join(ARCHIVE_MODELS, destRel)
    console.log(`  MOVE: ${origin}  ->  archive/models/${destRel}`)
    entries.push({ from: origin, to: path.join('archive', 'models', destRel), size: m.size, movedAt: new Date().toISOString() })
    if (!dryRun) {
      mkdirSync(path.dirname(destAbs), { recursive: true })
      if (!existsSync(destAbs)) renameSync(m.abs, destAbs)
    }
  }

  if (!dryRun) {
    const merged = [...readManifest().filter((e) => !entries.some((n) => n.from === e.from)), ...entries]
    writeManifest(merged)
    console.log('\nWrote docs/audit/MODEL_ARCHIVE_MANIFEST.json')
  } else {
    console.log('\n[DRY-RUN] No files were moved.')
  }
}

function runRestore({ all = false } = {}) {
  const entries = readManifest()
  if (entries.length === 0) {
    console.log('\nNo archive manifest found — nothing to restore.')
    return
  }
  console.log(`\nRestoring ${entries.length} archived asset(s)...\n`)
  let restored = 0
  for (const e of entries) {
    const src = path.join(ROOT, e.to)
    const dst = path.join(ROOT, e.from)
    if (existsSync(src) && !existsSync(dst)) {
      mkdirSync(path.dirname(dst), { recursive: true })
      renameSync(src, dst)
      console.log(`  RESTORE: ${e.to}  ->  ${e.from}`)
      restored++
    } else if (existsSync(dst)) {
      console.log(`  SKIP (already present): ${e.from}`)
    } else {
      console.log(`  MISSING from archive: ${e.to}`)
    }
  }
  if (!all) {
    // keep manifest for future restores; it is the reversible record
  }
  console.log(`\nRestored ${restored} file(s).`)
}

/**
 * Catalog-only references: paths that exist ONLY in the artifact registry
 * (approved-model catalog) but have no file on disk. These are intentionally
 * empty catalog entries, not actively loaded assets, so verify reports them as
 * warnings rather than failures.
 */
function collectCatalogOnlyRefs() {
  const abs = path.join(ROOT, 'src', 'game', 'room', 'artifactRegistry.js')
  if (!existsSync(abs)) return new Set()
  let text = ''
  try {
    text = readFileSync(abs, 'utf8')
  } catch {
    return new Set()
  }
  const out = new Set()
  const re = /path:\s*['"`]([^'"`]+\.(?:glb|gltf|fbx|obj|mtl|bin))['"`]/g
  let m
  while ((m = re.exec(text)) !== null) {
    out.add(m[1].replace(/^\.\//, ''))
  }
  return out
}

function runVerify() {
  const refs = collectModelRefs()
  const catalogOnly = collectCatalogOnlyRefs()
  let fail = 0
  let warn = 0
  console.log('\n=== VERIFY: active model references ===\n')
  for (const ref of refs) {
    const abs = path.join(ROOT, 'public', ref)
    const inPublic = existsSync(abs)
    const archived = existsSync(path.join(ROOT, 'archive', ref))
    if (inPublic) {
      console.log(`  OK    ${ref}`)
    } else if (archived) {
      if (catalogOnly.has(ref)) {
        console.log(`  WARN catalog-only archived ${ref}`)
        warn++
      } else {
        console.log(`  ARCHIVED ${ref}  -> run "npm run models:restore"`)
        fail++
      }
    } else {
      if (catalogOnly.has(ref)) {
        console.log(`  WARN catalog-only (file absent) ${ref}`)
        warn++
      } else {
        console.log(`  MISSING ${ref}  (no public file, not in archive)`)
        fail++
      }
    }
  }
  console.log(`\n${refs.size} references checked. ${fail === 0 ? 'ALL ACTIVE REFERENCES RESOLVE.' : `${fail} need attention.`} (${warn} catalog-only warnings)`)
  process.exitCode = fail === 0 ? 0 : 1
}

const cmd = process.argv[2]
const flags = process.argv.slice(3)

switch (cmd) {
  case 'audit':
    runAudit({ json: flags.includes('--json') })
    break
  case 'archive':
    runArchive({ dryRun: flags.includes('--dry-run') })
    break
  case 'restore':
    runRestore()
    break
  case 'verify':
    runVerify()
    break
  default:
    console.log(`
Usage:
  node scripts/model_manager.mjs audit [--json]
  node scripts/model_manager.mjs archive [--dry-run]
  node scripts/model_manager.mjs restore
  node scripts/model_manager.mjs verify
`)
    break
}
