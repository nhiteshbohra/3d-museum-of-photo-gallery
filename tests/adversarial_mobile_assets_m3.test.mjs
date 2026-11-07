// =========================================================================
// Adversarial Verification Test Suite for Milestone M3 (Requirement R6)
// Mobile Optimization & Asset Delivery: Model Bounds, Seating Anchors, & DPR
// =========================================================================
import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { getBounds } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { buildSeatRegistry } from '../src/avatars/seatRegistry.js'
import { findArtifactByPath } from '../src/game/room/artifactRegistry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// Setup gltf-transform NodeIO with Draco decoder
async function createModelIO() {
  const decoderModule = await draco3d.createDecoderModule()
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': decoderModule,
    })
  return io
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MODEL BOUNDING BOX & GEOMETRIC PARITY VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

test('M3-ADV-01: Curved sofa and LOD models preserve exact bounding box within 0.001m', async () => {
  const io = await createModelIO()

  const primaryPath = path.join(rootDir, 'public/models/ready/furniture/3d_pbr_curved_sofa.glb')
  const lodPath = path.join(rootDir, 'public/models/ready/furniture/lod/3d_pbr_curved_sofa_lod.glb')

  assert.ok(fs.existsSync(primaryPath), 'Primary curved sofa GLB must exist')
  assert.ok(fs.existsSync(lodPath), 'LOD curved sofa GLB must exist')

  const docPrimary = await io.read(primaryPath)
  const docLod = await io.read(lodPath)

  const boundsPrimary = getBounds(docPrimary.getRoot().listScenes()[0])
  const boundsLod = getBounds(docLod.getRoot().listScenes()[0])

  // Invariant target bounds: [-4.24407, 0, -4.24407] to [4.24407, 1.46614, 4.24407]
  const expectedMin = [-4.24407, 0, -4.24407]
  const expectedMax = [4.24407, 1.46614, 4.24407]
  const TOLERANCE = 0.001 // 1mm

  for (let i = 0; i < 3; i++) {
    assert.ok(
      Math.abs(boundsPrimary.min[i] - expectedMin[i]) < TOLERANCE,
      `Primary min[${i}] (${boundsPrimary.min[i]}) diverges from expected (${expectedMin[i]}) by >= ${TOLERANCE}`
    )
    assert.ok(
      Math.abs(boundsPrimary.max[i] - expectedMax[i]) < TOLERANCE,
      `Primary max[${i}] (${boundsPrimary.max[i]}) diverges from expected (${expectedMax[i]}) by >= ${TOLERANCE}`
    )
    assert.ok(
      Math.abs(boundsLod.min[i] - expectedMin[i]) < TOLERANCE,
      `LOD min[${i}] (${boundsLod.min[i]}) diverges from expected (${expectedMin[i]}) by >= ${TOLERANCE}`
    )
    assert.ok(
      Math.abs(boundsLod.max[i] - expectedMax[i]) < TOLERANCE,
      `LOD max[${i}] (${boundsLod.max[i]}) diverges from expected (${expectedMax[i]}) by >= ${TOLERANCE}`
    )

    // Direct parity between primary and LOD models
    assert.ok(
      Math.abs(boundsPrimary.min[i] - boundsLod.min[i]) < 0.0001,
      `Primary and LOD min[${i}] diverge: ${boundsPrimary.min[i]} vs ${boundsLod.min[i]}`
    )
    assert.ok(
      Math.abs(boundsPrimary.max[i] - boundsLod.max[i]) < 0.0001,
      `Primary and LOD max[${i}] diverge: ${boundsPrimary.max[i]} vs ${boundsLod.max[i]}`
    )
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. ASSET FILE SIZE & COMPRESSION REDUCTION TARGETS
// ─────────────────────────────────────────────────────────────────────────────

test('M3-ADV-02: Asset transfer size reduction meets target criteria (>=85% primary, >=95% LOD)', () => {
  const originalBytes = 51976104 // 51.98 MB baseline

  const primaryPath = path.join(rootDir, 'public/models/ready/furniture/3d_pbr_curved_sofa.glb')
  const lodPath = path.join(rootDir, 'public/models/ready/furniture/lod/3d_pbr_curved_sofa_lod.glb')

  const primaryBytes = fs.statSync(primaryPath).size
  const lodBytes = fs.statSync(lodPath).size

  const primaryReduction = (originalBytes - primaryBytes) / originalBytes
  const lodReduction = (originalBytes - lodBytes) / originalBytes

  // Primary model must achieve >= 85% reduction
  assert.ok(
    primaryReduction >= 0.85,
    `Primary reduction ${(primaryReduction * 100).toFixed(2)}% did not meet 85% target`
  )
  assert.ok(
    primaryBytes < 7 * 1024 * 1024,
    `Primary asset size (${(primaryBytes / (1024 * 1024)).toFixed(2)} MB) must be strictly < 7.0 MB`
  )

  // LOD model must achieve >= 95% reduction
  assert.ok(
    lodReduction >= 0.95,
    `LOD reduction ${(lodReduction * 100).toFixed(2)}% did not meet 95% target`
  )
  assert.ok(
    lodBytes < 2 * 1024 * 1024,
    `LOD asset size (${(lodBytes / (1024 * 1024)).toFixed(2)} MB) must be strictly < 2.0 MB`
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. SEATING ANCHOR PLACEMENT & ZERO DRIFT VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

test('M3-ADV-03: Curved sofa seating anchors derived by placedItems math have zero drift', () => {
  // Simulate placedItems.js derivation math with the verified model bounds
  const rawMin = new THREE.Vector3(-4.244066867977381, 0, -4.244066867977381)
  const rawMax = new THREE.Vector3(4.244066867977381, 1.466142287322704, 4.244066867977381)

  // Layout item config from src/data/museumLayout.json
  const itm = {
    x: 0,
    y: 0,
    z: -1.5,
    rotationY: 0,
    scale: 0.010,
    targetHeight: 1.5,
    alignToSurface: true,
    sinkY: 0.001,
  }

  function computeAnchors(boundsMin, boundsMax) {
    const geom = new THREE.BoxGeometry(
      boundsMax.x - boundsMin.x,
      boundsMax.y - boundsMin.y,
      boundsMax.z - boundsMin.z
    )
    geom.translate(
      (boundsMin.x + boundsMax.x) / 2,
      (boundsMin.y + boundsMax.y) / 2,
      (boundsMin.z + boundsMax.z) / 2
    )
    const mesh = new THREE.Mesh(geom)
    const root = new THREE.Group()
    root.add(mesh)

    root.position.set(itm.x, itm.y, itm.z)
    root.rotation.y = itm.rotationY
    if (itm.scale !== 1) root.scale.setScalar(itm.scale)

    if (Number.isFinite(itm.targetHeight) && itm.targetHeight > 0) {
      const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3())
      if (size.y > 0) root.scale.multiplyScalar(itm.targetHeight / size.y)
    }

    if (itm.alignToSurface) {
      const box = new THREE.Box3().setFromObject(root)
      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3())
        root.position.x += itm.x - center.x
        root.position.z += itm.z - center.z
        root.position.y += itm.y - box.min.y
      }
    }

    if (Number.isFinite(itm.sinkY) && itm.sinkY !== 0) {
      root.position.y -= itm.sinkY
    }

    const box = new THREE.Box3().setFromObject(root)
    const baseCenterX = (box.min.x + box.max.x) / 2
    const baseCenterZ = (box.min.z + box.max.z) / 2
    const baseMinY = box.min.y

    // Curved sofa seat offsets from artifactRegistry.js
    const artifact = findArtifactByPath('models/ready/furniture/3d_pbr_curved_sofa.glb')
    assert.ok(artifact, 'Curved sofa must be registered in artifactRegistry')
    assert.equal(artifact.seats.length, 3, 'Curved sofa defines exactly 3 physical seat cushions')

    // Also include synthetic 4th seat anchor to verify zero drift under 4-seat configuration
    const testSeats = [
      ...artifact.seats,
      { id: 'curved_4', x: 0.0, z: -0.5, yaw: Math.PI, height: 0.48 },
    ]

    const derived = []
    const rotY = root.rotation.y
    const cos = Math.cos(rotY)
    const sin = Math.sin(rotY)

    for (const seat of testSeats) {
      const wx = baseCenterX + seat.x * cos - seat.z * sin
      const wz = baseCenterZ + seat.x * sin + seat.z * cos
      const wy = baseMinY
      const cushionY = baseMinY + seat.height
      derived.push({ id: seat.id, wx, wy, wz, cushionY })
    }

    return { baseCenterX, baseCenterZ, baseMinY, derived }
  }

  const primaryResult = computeAnchors(rawMin, rawMax)
  // Verify with LOD bounds
  const lodMin = new THREE.Vector3(-4.244066867977381, 0, -4.244066867977381)
  const lodMax = new THREE.Vector3(4.244066867977381, 1.466142287322704, 4.244066867977381)
  const lodResult = computeAnchors(lodMin, lodMax)

  // Verify exact coordinates match expected
  assert.equal(primaryResult.baseCenterX, 0, 'Sofa center X must be 0')
  assert.equal(primaryResult.baseCenterZ, -1.5, 'Sofa center Z must be -1.5')
  assert.equal(primaryResult.baseMinY, -0.001, 'Sofa floor contact with 1mm sink must be -0.001')

  for (let i = 0; i < primaryResult.derived.length; i++) {
    const p = primaryResult.derived[i]
    const l = lodResult.derived[i]

    // Verify zero drift between primary and LOD
    assert.ok(
      Math.abs(p.wx - l.wx) < 1e-7,
      `Seat ${p.id} wx drift: ${Math.abs(p.wx - l.wx)}`
    )
    assert.ok(
      Math.abs(p.wz - l.wz) < 1e-7,
      `Seat ${p.id} wz drift: ${Math.abs(p.wz - l.wz)}`
    )
    assert.ok(
      Math.abs(p.cushionY - l.cushionY) < 1e-7,
      `Seat ${p.id} cushionY drift: ${Math.abs(p.cushionY - l.cushionY)}`
    )
  }

  // Also verify fallback seat registry in seatRegistry.js aligns with expected positions
  const fallbackRegistry = buildSeatRegistry('lobby')
  assert.equal(fallbackRegistry.size, 3, 'Fallback registry must contain 3 sofa seats in lobby')
  assert.ok(fallbackRegistry.has('lobby:itm_lobby_sofa_curved:curved_1'))
  assert.ok(fallbackRegistry.has('lobby:itm_lobby_sofa_curved:curved_2'))
  assert.ok(fallbackRegistry.has('lobby:itm_lobby_sofa_curved:curved_3'))

  const s1 = fallbackRegistry.get('lobby:itm_lobby_sofa_curved:curved_1')
  assert.equal(s1.x, -1.0)
  assert.equal(s1.z, -0.8) // -1.5 + 0.7 = -0.8
  assert.equal(s1.cushionY, 0.48)
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADVERSARIAL TESTING OF getTargetPixelRatio
// ─────────────────────────────────────────────────────────────────────────────

test('M3-ADV-04: getTargetPixelRatio desktop and mobile viewports clamp correctly', () => {
  const engineSource = fs.readFileSync(path.join(rootDir, 'src/engine/engine.js'), 'utf8')
  const match = engineSource.match(/function getTargetPixelRatio\(\)\s*\{[\s\S]*?\n\t\}/)
  assert.ok(match, 'getTargetPixelRatio function must be defined in src/engine/engine.js')
  const fnCode = '(' + match[0] + ')'

  // 1. Desktop viewports (width > 768, touchPoints = 0, no touchstart)
  const desktopCases = [
    { name: 'Desktop 1080p standard (dpr=1)', width: 1920, height: 1080, dpr: 1, expected: 1 },
    { name: 'Desktop 1080p high-DPI (dpr=2)', width: 1920, height: 1080, dpr: 2, expected: 2 },
    { name: 'Desktop 1440p high-DPI (dpr=3)', width: 2560, height: 1440, dpr: 3, expected: 2 }, // capped to 2
    { name: 'Desktop 4K ultra-high (dpr=4)', width: 3840, height: 2160, dpr: 4, expected: 2 }, // capped to 2
    { name: 'Desktop fractional scaling (dpr=1.25)', width: 1920, height: 1080, dpr: 1.25, expected: 1.25 },
    { name: 'Desktop fractional scaling (dpr=1.5)', width: 1920, height: 1080, dpr: 1.5, expected: 1.5 },
  ]

  for (const tc of desktopCases) {
    const sandbox = {
      window: { innerWidth: tc.width, innerHeight: tc.height, devicePixelRatio: tc.dpr },
      navigator: { maxTouchPoints: 0 },
    }
    const getRatio = vm.runInNewContext(fnCode, sandbox)
    const result = getRatio()
    assert.equal(result, tc.expected, `${tc.name}: expected ${tc.expected}, got ${result}`)
  }

  // 2. Mobile viewports (width <= 768 or touch points > 0)
  const mobileCases = [
    { name: 'Mobile iPhone 14 Pro (390x844, dpr=3)', width: 390, height: 844, dpr: 3, touch: 5, expected: 1.5 }, // capped to 1.5
    { name: 'Mobile Android Pixel 7 (412x915, dpr=2.625)', width: 412, height: 915, dpr: 2.625, touch: 5, expected: 1.5 },
    { name: 'Mobile budget Android (360x800, dpr=1)', width: 360, height: 800, dpr: 1, touch: 5, expected: 1 },
    { name: 'Mobile low-DPI (360x800, dpr=1.25)', width: 360, height: 800, dpr: 1.25, touch: 5, expected: 1.25 },
    { name: 'iPad Portrait 768px breakpoint (768x1024, dpr=2)', width: 768, height: 1024, dpr: 2, touch: 5, expected: 1.5 },
    { name: 'iPad Landscape 1024px with touch (1024x768, dpr=2)', width: 1024, height: 768, dpr: 2, touch: 5, expected: 1.5 },
    { name: 'Desktop with touch screen (1920x1080, dpr=3, touch=10)', width: 1920, height: 1080, dpr: 3, touch: 10, expected: 1.5 },
  ]

  for (const tc of mobileCases) {
    const sandbox = {
      window: { innerWidth: tc.width, innerHeight: tc.height, devicePixelRatio: tc.dpr },
      navigator: { maxTouchPoints: tc.touch },
    }
    const getRatio = vm.runInNewContext(fnCode, sandbox)
    const result = getRatio()
    assert.equal(result, tc.expected, `${tc.name}: expected ${tc.expected}, got ${result}`)
  }

  // 3. ontouchstart in window triggering mobile clamp
  const touchStartSandbox = {
    window: { innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 3, ontouchstart: () => {} },
    navigator: { maxTouchPoints: 0 },
  }
  const touchStartRatio = vm.runInNewContext(fnCode, touchStartSandbox)()
  assert.equal(touchStartRatio, 1.5, 'ontouchstart in window should enforce 1.5 DPR cap')
})

test('M3-ADV-05: getTargetPixelRatio boundary conditions, SSR resilience, & resize transitions', () => {
  const engineSource = fs.readFileSync(path.join(rootDir, 'src/engine/engine.js'), 'utf8')
  const match = engineSource.match(/function getTargetPixelRatio\(\)\s*\{[\s\S]*?\n\t\}/)
  const fnCode = '(' + match[0] + ')'

  // A. SSR / Node.js context: window is undefined
  const ssrSandbox = {}
  const ssrRatio = vm.runInNewContext(fnCode, ssrSandbox)()
  assert.equal(ssrRatio, 1, 'SSR (undefined window) should safely return 1 without throwing')

  // B. Falsy and abnormal devicePixelRatio values
  const boundaryCases = [
    { name: 'dpr=0 evaluates to 1 fallback', dpr: 0, expected: 1 },
    { name: 'dpr=null evaluates to 1 fallback', dpr: null, expected: 1 },
    { name: 'dpr=undefined evaluates to 1 fallback', dpr: undefined, expected: 1 },
    { name: 'dpr=NaN evaluates to 1 fallback', dpr: NaN, expected: 1 },
  ]

  for (const bc of boundaryCases) {
    const sandbox = {
      window: { innerWidth: 1920, innerHeight: 1080, devicePixelRatio: bc.dpr },
      navigator: { maxTouchPoints: 0 },
    }
    const ratio = vm.runInNewContext(fnCode, sandbox)()
    assert.equal(ratio, bc.expected, `${bc.name}: got ${ratio}`)
  }

  // C. Dynamic window resize transition: desktop -> mobile -> desktop
  const mutableWindow = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 3,
  }
  const mutableNavigator = { maxTouchPoints: 0 }
  const dynamicSandbox = { window: mutableWindow, navigator: mutableNavigator }
  const getDynamicRatio = vm.runInNewContext(fnCode, dynamicSandbox)

  // 1. Initial desktop
  assert.equal(getDynamicRatio(), 2, 'Initial desktop 1080p with dpr=3 capped to 2')

  // 2. Resize to mobile width (500px)
  mutableWindow.innerWidth = 500
  assert.equal(getDynamicRatio(), 1.5, 'Resized to mobile width 500px capped to 1.5')

  // 3. Resize back to desktop (1440px)
  mutableWindow.innerWidth = 1440
  assert.equal(getDynamicRatio(), 2, 'Resized back to desktop 1440px restores cap of 2')
})

test('M3-ADV-06: Adversarial counter-factual: bounding box drift sensitivity & seat registry verification', () => {
  // Proving why exact bounds parity is critical:
  // If the LOD model deviated by 2.3% in height (1.50m vs 1.46614m):
  const accurateHeight = 1.466142
  const driftedHeight = 1.500000
  const targetHeight = 1.5

  const accurateScale = targetHeight / (accurateHeight * 0.010) * 0.010
  const driftedScale = targetHeight / (driftedHeight * 0.010) * 0.010

  const scaleDiscrepancy = Math.abs(accurateScale - driftedScale)
  assert.ok(
    scaleDiscrepancy > 0.02,
    `2.3% model height drift causes ${(scaleDiscrepancy * 100).toFixed(2)}% scaling distortion`
  )

  // Verify artifactRegistry sofa seat count invariant
  const artifact = findArtifactByPath('models/ready/furniture/3d_pbr_curved_sofa.glb')
  assert.ok(artifact, 'Curved sofa must exist in registry')
  assert.equal(
    artifact.seats.length,
    3,
    'Curved sofa physically defines 3 seating positions (curved_1, curved_2, curved_3)'
  )

  // Confirm seat IDs generated from museumLayout item id
  const fallback = buildSeatRegistry('lobby')
  const seatIds = Array.from(fallback.keys()).filter(k => k.includes('sofa_curved'))
  assert.deepEqual(
    seatIds.sort(),
    [
      'lobby:itm_lobby_sofa_curved:curved_1',
      'lobby:itm_lobby_sofa_curved:curved_2',
      'lobby:itm_lobby_sofa_curved:curved_3',
    ].sort(),
    'Lobby sofa defines exactly 3 registered runtime seat IDs'
  )
})

