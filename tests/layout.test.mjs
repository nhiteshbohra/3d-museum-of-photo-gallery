// =========================================================================
// Automated Test for Museum Layout Integrity (Phase 8.1)
// =========================================================================
import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

test('Lobby contains seating, and non-lobby rooms obey simplification rule (only plants allowed from decor)', () => {
  const rooms = layout.rooms || {}
  // 1. Lobby must contain seating (sofas)
  const lobbyItems = rooms.lobby || []
  const lobbyHasSeat = lobbyItems.some(itm => itm.id && (itm.id.includes('sofa') || itm.id.includes('couch') || itm.id.includes('bench')))
  assert.ok(lobbyHasSeat, 'Lobby must have a seating item placed')

  // 2. Non-lobby rooms must contain only plants from decorative assets (no sofas, no bookcases/artifacts, no chandeliers)
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

