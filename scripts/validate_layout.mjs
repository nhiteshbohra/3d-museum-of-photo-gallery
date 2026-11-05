// =========================================================================
// Validate Museum Layout (scripts/validate_layout.mjs)
// Verifies asset paths, transform types, rotation units, and clearances.
// =========================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const layoutPath = path.join(rootDir, 'src/data/museumLayout.json')
const publicDir = path.join(rootDir, 'public')

const raw = fs.readFileSync(layoutPath, 'utf8')
const layout = JSON.parse(raw)

let errors = []
let warnings = []
const seenIds = new Set()

for (const [roomKey, items] of Object.entries(layout.rooms || {})) {
  if (!Array.isArray(items)) continue

  for (const item of items) {
    if (!item.id) {
      errors.push(`[${roomKey}] Missing item "id"`)
    } else if (seenIds.has(item.id)) {
      errors.push(`[${roomKey}] Duplicate item id: "${item.id}"`)
    } else {
      seenIds.add(item.id)
    }

    // Check path exists
    if (item.type === 'glb' || item.path) {
      const fullPath = path.join(publicDir, item.path)
      if (!fs.existsSync(fullPath)) {
        errors.push(`[${roomKey}:${item.id}] Asset path does not exist: "${item.path}" (resolved: ${fullPath})`)
      }
    }

    // Check numeric positions
    for (const axis of ['x', 'y', 'z']) {
      if (typeof item[axis] !== 'number' || Number.isNaN(item[axis])) {
        errors.push(`[${roomKey}:${item.id}] "${axis}" must be a number, got: ${item[axis]}`)
      }
    }

    // Rotation sanity check
    if (typeof item.rotationY === 'number' && Math.abs(item.rotationY) > 2 * Math.PI) {
      errors.push(`[${roomKey}:${item.id}] rotationY ${item.rotationY} > 2π radians. Use "rotationDeg" for degrees.`)
    }

    // Door clearance check (entry door is at x: 0, z: ~7m on South wall)
    if (item.contact === 'floor') {
      const distToSouthDoor = Math.hypot(item.x - 0, item.z - 7.0)
      if (distToSouthDoor < 2.0 && item.z > 5.0) {
        warnings.push(`[${roomKey}:${item.id}] Item may be within 2m of entry door (dist ~${distToSouthDoor.toFixed(2)}m)`)
      }
    }
  }
}

console.log(`Validated ${seenIds.size} placed items across ${Object.keys(layout.rooms || {}).length} rooms.`)

if (warnings.length > 0) {
  console.warn(`\nWarnings (${warnings.length}):`)
  for (const w of warnings) console.warn('  ⚠️ ' + w)
}

if (errors.length > 0) {
  console.error(`\nErrors (${errors.length}):`)
  for (const e of errors) console.error('  ❌ ' + e)
  process.exit(1)
} else {
  console.log('✓ All layout items passed validation!')
}

