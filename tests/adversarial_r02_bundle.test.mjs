import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const distAssetsDir = path.join(distDir, 'assets')
const distIndexHtml = path.join(distDir, 'index.html')

console.log('=== Adversarial Audit: R-02 Pre-Auth Bundle Isolation ===\n')

assert(fs.existsSync(distIndexHtml), 'dist/index.html must exist (run npm run build first)')

// 1. Inspect dist/index.html
const indexHtmlContent = fs.readFileSync(distIndexHtml, 'utf8')
console.log('[Test 1] Inspecting dist/index.html ...')

const scriptMatches = [...indexHtmlContent.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1])
const preloadMatches = [...indexHtmlContent.matchAll(/<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+)["']/gi)].map(m => m[1])
const stylesheetMatches = [...indexHtmlContent.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)].map(m => m[1])

console.log('  Scripts found:', scriptMatches)
console.log('  Modulepreloads found:', preloadMatches)
console.log('  Stylesheets found:', stylesheetMatches)

// Assertions on index.html
for (const script of scriptMatches) {
  assert(!script.includes('vendor-three'), `Forbidden script tag loading vendor-three found in index.html: ${script}`)
  assert(!script.includes('engine-3d'), `Forbidden script tag loading engine-3d found in index.html: ${script}`)
  assert(!script.includes('characterSetup'), `Forbidden script tag loading characterSetup found in index.html: ${script}`)
}
console.log('  ✓ No <script> tags reference vendor-three, engine-3d, or characterSetup')

for (const preload of preloadMatches) {
  assert(!preload.includes('vendor-three'), `Forbidden modulepreload loading vendor-three found in index.html: ${preload}`)
  assert(!preload.includes('engine-3d'), `Forbidden modulepreload loading engine-3d found in index.html: ${preload}`)
  assert(!preload.includes('characterSetup'), `Forbidden modulepreload loading characterSetup found in index.html: ${preload}`)
  assert(!preload.includes('avatars-multiplayer'), `Forbidden modulepreload loading avatars-multiplayer found in index.html: ${preload}`)
}
console.log('  ✓ No <link rel="modulepreload"> tags reference vendor-three, engine-3d, characterSetup, or avatars-multiplayer')

// 2. Identify all chunk files in dist/assets
console.log('\n[Test 2] Auditing dist/assets chunks ...')
const assetFiles = fs.readdirSync(distAssetsDir)
const mainJsFile = assetFiles.find(f => f.startsWith('main-') && f.endsWith('.js'))
assert(mainJsFile, 'main-*.js must exist in dist/assets')
console.log('  Entry JS file:', mainJsFile)

const vendorThreeFile = assetFiles.find(f => f.startsWith('vendor-three-') && f.endsWith('.js'))
const engine3dFile = assetFiles.find(f => f.startsWith('engine-3d-') && f.endsWith('.js'))
const rosterDataFile = assetFiles.find(f => f.startsWith('roster-data-') && f.endsWith('.js'))
const netClientFile = assetFiles.find(f => f.startsWith('net-client-') && f.endsWith('.js'))
const actionManifestFile = assetFiles.find(f => f.startsWith('action-manifest-') && f.endsWith('.js'))
const characterSetupFile = assetFiles.find(f => f.startsWith('characterSetup-') && f.endsWith('.js'))
const avatarsMultiplayerFile = assetFiles.find(f => f.startsWith('avatars-multiplayer-') && f.endsWith('.js'))

console.log('  vendor-three chunk:', vendorThreeFile)
console.log('  engine-3d chunk:', engine3dFile)
console.log('  characterSetup chunk:', characterSetupFile)
console.log('  avatars-multiplayer chunk:', avatarsMultiplayerFile)
console.log('  net-client chunk:', netClientFile)
console.log('  action-manifest chunk:', actionManifestFile)
console.log('  roster-data chunk:', rosterDataFile)

assert(vendorThreeFile, 'vendor-three chunk must exist')
assert(engine3dFile, 'engine-3d chunk must exist')

// 3. Inspect main-*.js imports
console.log('\n[Test 3] Analyzing static and dynamic imports in main JS bundle ...')
const mainJsPath = path.join(distAssetsDir, mainJsFile)
const mainJsContent = fs.readFileSync(mainJsPath, 'utf8')

// Regex for static ESM imports at the top of bundled files
// In Vite rollup output, imports look like: import"./roster-data-...js"; or import{...}from"./...";
const staticImportRegex = /import\s*(?:(?:\{[^}]*\}|\*\s*as\s*[^;]+|[a-zA-Z0-9_$]+)\s*from\s*)?['"]([^'"]+)['"]/g
const staticImports = []
let match
while ((match = staticImportRegex.exec(mainJsContent)) !== null) {
  staticImports.push(match[1])
}
console.log('  Static import targets in main-*.js:', staticImports)

for (const imp of staticImports) {
  assert(!imp.includes('vendor-three'), `main-*.js statically imports vendor-three: ${imp}`)
  assert(!imp.includes('engine-3d'), `main-*.js statically imports engine-3d: ${imp}`)
  assert(!imp.includes('characterSetup'), `main-*.js statically imports characterSetup: ${imp}`)
  assert(!imp.includes('avatars-multiplayer'), `main-*.js statically imports avatars-multiplayer: ${imp}`)
}
console.log('  ✓ main-*.js has ZERO static imports of vendor-three, engine-3d, characterSetup, or avatars-multiplayer')

// 4. Verify pre-auth preloaded chunks do not transitively import Three.js
console.log('\n[Test 4] Analyzing preloaded chunks (roster-data, net-client, action-manifest) for transitive Three.js imports ...')
const preloadedChunks = [rosterDataFile, netClientFile, actionManifestFile]
for (const chunkFile of preloadedChunks) {
  const chunkPath = path.join(distAssetsDir, chunkFile)
  const chunkContent = fs.readFileSync(chunkPath, 'utf8')
  assert(!chunkContent.includes('THREE'), `${chunkFile} must not contain THREE symbols`)
  assert(!chunkContent.includes(vendorThreeFile), `${chunkFile} must not import vendor-three`)
  assert(!chunkContent.includes(engine3dFile), `${chunkFile} must not import engine-3d`)
  console.log(`  ✓ ${chunkFile} is completely free of Three.js or 3D engine references`)
}

// 5. Inspect dynamic import calls in main-*.js
console.log('\n[Test 5] Inspecting dynamic import(...) targets in main-*.js ...')
const dynamicImportRegex = /import\((?:['"]([^'"]+)['"]|([a-zA-Z0-9_$]+))\)/g
const dynamicImports = []
while ((match = dynamicImportRegex.exec(mainJsContent)) !== null) {
  dynamicImports.push(match[1] || match[2])
}
console.log('  Dynamic import targets found in main-*.js:', dynamicImports)
// Verify characterSetup is dynamically imported
const hasCharacterSetupDynamic = mainJsContent.includes(characterSetupFile) ||
  dynamicImports.some(d => d && d.includes('characterSetup'))
console.log('  Dynamic reference to characterSetup present in main-*.js:', hasCharacterSetupDynamic)
assert(hasCharacterSetupDynamic, 'characterSetup must be dynamically referenced, not omitted')

// 6. Source-level verification of src/main.js
console.log('\n[Test 6] Source code static dependency check in src/main.js ...')
const srcMainPath = path.join(rootDir, 'src', 'main.js')
const srcMainContent = fs.readFileSync(srcMainPath, 'utf8')

// Ensure no static import of characterSetup in src/main.js
const staticCharSetupImport = /import\s+.*from\s+['"][^'"]*characterSetup(\.js)?['"]/
assert(!staticCharSetupImport.test(srcMainContent), 'src/main.js still has static import of characterSetup!')
console.log('  ✓ src/main.js has NO static import of characterSetup')

// Ensure dynamic import of characterSetup exists
const dynamicCharSetupImport = /import\s*\(\s*['"][^'"]*characterSetup(\.js)?['"]\s*\)/
assert(dynamicCharSetupImport.test(srcMainContent), 'src/main.js must dynamically import characterSetup')
console.log('  ✓ src/main.js uses dynamic import() for characterSetup')

// Ensure dynamic import is inside showAvatarSelection
const showAvatarSelectionBlock = srcMainContent.match(/async\s+function\s+showAvatarSelection\s*\([^)]*\)\s*\{[\s\S]*?\n\}/)?.[0]
assert(showAvatarSelectionBlock, 'showAvatarSelection function must exist in src/main.js')
assert(showAvatarSelectionBlock.includes("import('./avatars/characterSetup.js')"), 'dynamic import must be inside showAvatarSelection')
console.log('  ✓ dynamic import is located strictly inside showAvatarSelection()')

console.log('\n=== ALL R-02 AUDIT CHECKS PASSED ===')
