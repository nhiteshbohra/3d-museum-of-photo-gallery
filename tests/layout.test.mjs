// =========================================================================
// Automated Test for Museum Layout Integrity (Phase 8.1)
// =========================================================================
import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { buildSeatRegistry } from '../src/avatars/seatRegistry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const layoutPath = path.join(rootDir, 'src/data/museumLayout.json')
const publicDir = path.join(rootDir, 'public')

const layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'))

test('Layout structure has all 7 required salon keys', () => {
  const expectedRooms = ['lobby', 'fireside', 'music', 'library', 'paris', 'orangery', 'alcove']
  const rooms = layout.rooms || {}

  for (const r of expectedRooms) {
    assert.ok(Array.isArray(rooms[r]), `Room "${r}" must exist in layout.rooms`)
    assert.ok(rooms[r].length > 0, `Room "${r}" must contain furnished items`)
  }
})

test('Every placed GLB item points to an existing file in public/', () => {
  const rooms = layout.rooms || {}
  const seenIds = new Set()

  for (const [roomKey, items] of Object.entries(rooms)) {
    for (const item of items) {
      assert.ok(item.id, `Item in "${roomKey}" must have an ID`)
      assert.ok(!seenIds.has(item.id), `Item ID "${item.id}" must be globally unique`)
      seenIds.add(item.id)

      if (item.type === 'glb') {
        assert.ok(item.path, `Item "${item.id}" must specify path`)
        const fullPath = path.join(publicDir, item.path)
        assert.ok(fs.existsSync(fullPath), `Asset file must exist on disk: ${item.path}`)
      }

      // Check numeric transform
      assert.equal(typeof item.x, 'number')
      assert.equal(typeof item.y, 'number')
      assert.equal(typeof item.z, 'number')

      // Check rotation sanity
      if (typeof item.rotationY === 'number') {
        assert.ok(
          Math.abs(item.rotationY) <= 2 * Math.PI,
          `rotationY for "${item.id}" (${item.rotationY}) exceeds 2π rad. Use rotationDeg instead.`
        )
      }
    }
  }
})

test('Lobby contains seating, and non-lobby rooms obey simplification rule (furnishings limited to plants; zero decorative GLB wall lights in non-lobby rooms)', () => {
  const rooms = layout.rooms || {}
  // 1. Lobby must contain seating (sofas)
  const lobbyItems = rooms.lobby || []
  const lobbyHasSeat = lobbyItems.some(itm => itm.id && (itm.id.includes('sofa') || itm.id.includes('couch') || itm.id.includes('bench')))
  assert.ok(lobbyHasSeat, 'Lobby must have a seating item placed')

  // 2. Non-lobby rooms must contain only plants from decorative furnishings in museumLayout.json.
  // Note: Static layout checks in museumLayout.json apply to placed furnishings (no sofas, no bookcases/artifacts, no chandeliers),
  // and non-lobby salons contain zero decorative GLB wall lights to conform to the plants-only decorative policy.
  for (const [roomKey, items] of Object.entries(rooms)) {
    if (roomKey === 'lobby') continue
    for (const itm of items) {
      assert.ok(
        itm.path.includes('plants') || itm.id.includes('plant'),
        `Non-lobby room "${roomKey}" contains forbidden decor item "${itm.id}" (${itm.path}). Only plants are permitted.`
      )
    }
  }
})

test('Runtime buildRoom() traversal validates that non-lobby salons contain no benches, sofas, chandeliers, bookcases or seats', async () => {
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 12 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    getImageData: () => ({ data: new Uint8ClampedArray(512 * 512 * 4) }),
  }, { get: (target, key) => target[key] ?? (() => {}) })
  const originalDocument = globalThis.document
  globalThis.document = { createElement: () => ({ width: 512, height: 512, getContext: () => context, toDataURL: () => 'data:image/png;base64,' }) }

  try {
    const bundle = await build({
      entryPoints: ['src/game/room.js'],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'node',
      loader: { '.png': 'dataurl' },
      plugins: [{
        name: 'omit-model-downloads',
        setup(builder) {
          builder.onLoad({ filter: /[\\/]placedItems\.js$/ }, () => ({
            contents: `
              import * as THREE from 'three'
              export function applyPlacedItems() {}
              export function spawnGlbItem(itm, roomKey, ctx) {
                const grp = new THREE.Group()
                if (itm) {
                  if (typeof itm.x === 'number') grp.position.x = itm.x
                  if (typeof itm.y === 'number') grp.position.y = itm.y
                  if (typeof itm.z === 'number') grp.position.z = itm.z
                  if (typeof itm.rotationX === 'number') grp.rotation.x = itm.rotationX
                  if (typeof itm.rotationY === 'number') grp.rotation.y = itm.rotationY
                  if (typeof itm.rotationZ === 'number') grp.rotation.z = itm.rotationZ
                  grp.userData = { isPlacedArtifact: true, glbPath: itm.path, roomKey, ...itm }
                }
                if (ctx && ctx.group) {
                  ctx.group.add(grp)
                }
                return Promise.resolve(grp)
              }
              export function getPlantsConfig() { return { overrides: [] } }
            `
          }))
        }
      }],
    })
    const { buildRoom } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text + '\n//# sourceURL=layout-runtime-test.mjs').toString('base64')}`)

    const nonLobbyRooms = ['fireside', 'music', 'library', 'paris', 'orangery', 'alcove']
    const forbiddenKeywords = ['bench', 'sofa', 'couch', 'chandelier', 'bookcase']

    for (const roomKey of nonLobbyRooms) {
      const room = buildRoom({
        width: 21,
        length: 18,
        height: 4,
        mode: 'gallery',
        roomKey,
        gallery: { title: roomKey, photos: [] },
        lobby: { categories: [] }
      })

      // 1. Group traversal check: no forbidden furniture or lighting fixtures
      const forbiddenFound = []
      room.group.traverse(obj => {
        const name = (obj.name || '').toLowerCase()
        for (const kw of forbiddenKeywords) {
          if (name.includes(kw)) {
            forbiddenFound.push({ name: obj.name, kw })
          }
        }
      })
      assert.deepEqual(forbiddenFound, [], `Non-lobby room "${roomKey}" contains forbidden runtime objects: ${JSON.stringify(forbiddenFound)}`)

      // 2. Obstacles check: no bench/sofa collision obstacles
      const benchObstacles = (room.obstacles || []).filter(obs => {
        const obsName = (obs.name || obs.id || '').toLowerCase()
        return forbiddenKeywords.some(kw => obsName.includes(kw))
      })
      assert.deepEqual(benchObstacles, [], `Non-lobby room "${roomKey}" contains forbidden obstacles: ${JSON.stringify(benchObstacles)}`)

      // 3. Plants verification: non-lobby room must have botanical decor groups
      const plantsFound = []
      room.group.traverse(obj => {
        if ((obj.name || '').toLowerCase().includes('plant')) {
          plantsFound.push(obj.name)
        }
      })
      assert.ok(plantsFound.length > 0, `Non-lobby room "${roomKey}" must contain botanical planters`)

      // 4. Wall lights verification: every non-lobby room must contain exactly 0 antique wall lights on partition walls (plants-only decorative policy)
      const wallLights = []
      room.group.traverse(obj => {
        if (obj.userData?.glbPath === 'models/ready/lighting/antique_wall_light.glb') {
          wallLights.push(obj)
        }
      })
      assert.equal(wallLights.length, 0, `Non-lobby room "${roomKey}" must contain 0 antique wall lights (plants-only policy), found ${wallLights.length}`)
    }
  } finally {
    globalThis.document = originalDocument
  }
})

test('Seat registry contains seats in lobby but zero seats in non-lobby rooms', () => {
  const nonLobbyRooms = ['fireside', 'music', 'library', 'paris', 'orangery', 'alcove']
  for (const roomKey of nonLobbyRooms) {
    const seats = buildSeatRegistry(roomKey)
    assert.equal(seats.size, 0, `Non-lobby room "${roomKey}" must have 0 registered seats, found ${seats.size}`)
  }

  const lobbySeats = buildSeatRegistry('lobby')
  assert.ok(lobbySeats.size > 0, `Lobby must have registered seating anchors, found ${lobbySeats.size}`)
})

