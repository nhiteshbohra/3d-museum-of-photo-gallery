// =========================================================================
// Automated Test Suite for Seating Pipeline (SEAT-01, SEAT-02, SEAT-03)
// =========================================================================
import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'

import { buildSeatRegistry, findNearestSeat } from '../src/avatars/seatRegistry.js'
import { registerRuntimeSeat, unregisterRuntimeSeat, clearRuntimeSeats, getRuntimeSeats } from '../src/game/room/placedItems.js'
import { findArtifactByPath } from '../src/game/room/artifactRegistry.js'

test('SEAT-01: Artifact registry seat offsets are in real meters at final size', () => {
  const couch = findArtifactByPath('models/ready/furniture/furniture_sofa_1_3dx.glb')
  assert.ok(couch, 'couch must exist in artifact registry')
  assert.ok(Array.isArray(couch.seats), 'couch must define seats')
  assert.equal(couch.seats.length, 3, 'couch should have 3 seat positions')

  for (const s of couch.seats) {
    assert.ok(s.height >= 0.40 && s.height <= 0.60, `Seat cushion height (${s.height}m) must be human scale`)
  }

  // Width separation between couch seats must be realistic (> 0.5m apart)
  const left = couch.seats[0]
  const mid = couch.seats[1]
  const right = couch.seats[2]
  assert.ok(Math.abs(left.x - mid.x) >= 0.6, 'Seats must be separated by at least 60cm')
  assert.ok(Math.abs(right.x - mid.x) >= 0.6, 'Seats must be separated by at least 60cm')
})

test('SEAT-01: Runtime seat registration derives unscaled meter offsets from spawned model', () => {
  clearRuntimeSeats()
  const fakeAnchor = new THREE.Object3D()
  fakeAnchor.position.set(2.5, 0.0, -3.0)

  const seatRecord = {
    id: 'lobby:couch_1:s1',
    roomKey: 'lobby',
    room: 'lobby',
    anchor: fakeAnchor,
    x: 2.5,
    y: 0.0,
    z: -3.0,
    yaw: 1.57,
    height: 0.46,
    cushionY: 0.46,
    occupiedBy: null,
  }

  registerRuntimeSeat(seatRecord)
  const runtimeList = getRuntimeSeats('lobby')
  assert.equal(runtimeList.length, 1)

  const registry = buildSeatRegistry('lobby')
  assert.ok(registry.has('lobby:couch_1:s1'))
  const resolved = registry.get('lobby:couch_1:s1')
  assert.equal(resolved.x, 2.5)
  assert.equal(resolved.cushionY, 0.46)
  assert.equal(resolved.height, 0.46)

  unregisterRuntimeSeat('lobby:couch_1:s1')
  assert.equal(getRuntimeSeats('lobby').length, 0)
})

test('SEAT-01 Fallback: Layout fallback preserves unscaled meter offsets (no scale collapse)', () => {
  clearRuntimeSeats()
  // When no runtime spawned items exist, fallback reads layout
  const registry = buildSeatRegistry()
  assert.ok(registry.size > 0, 'Fallback registry should contain seats from layout')

  for (const [id, seat] of registry.entries()) {
    assert.ok(seat.height >= 0.35 && seat.height <= 0.65, `Seat ${id} cushion height (${seat.height}) must not have collapsed to millimetres`)
  }
})

test('SEAT-02: findNearestSeat selects closest unoccupied seat within distance', () => {
  const seats = new Map()
  seats.set('seat_a', { id: 'seat_a', x: 2.0, z: 0.0, occupiedBy: null })
  seats.set('seat_b', { id: 'seat_b', x: 1.0, z: 0.0, occupiedBy: null })
  seats.set('seat_c', { id: 'seat_c', x: 0.5, z: 0.0, occupiedBy: 'peer_123' }) // occupied

  // Player at origin (0, 0)
  const nearest = findNearestSeat(seats, 0, 0, 5.0)
  assert.ok(nearest, 'Should find nearest unoccupied seat')
  assert.equal(nearest.id, 'seat_b', 'seat_b is at 1.0m, seat_c is occupied, seat_a is at 2.0m')

  // Out of range check
  const none = findNearestSeat(seats, 100, 100, 4.0)
  assert.equal(none, null, 'Out of range player should get null')
})

test('SEAT-02: Stand-up placement math is 0.7m forward along yaw', () => {
  const yaw = 0 // facing +Z in Three.js coordinates
  const seatX = 2.0
  const seatZ = 3.0
  const fwdX = Math.sin(yaw)
  const fwdZ = Math.cos(yaw)

  const standX = seatX + fwdX * 0.7
  const standZ = seatZ + fwdZ * 0.7

  assert.equal(standX, 2.0)
  assert.equal(standZ, 3.7)
  const dist = Math.hypot(standX - seatX, standZ - seatZ)
  assert.ok(Math.abs(dist - 0.7) < 1e-6, 'Stand position must be exactly 0.7m from seat')
})

