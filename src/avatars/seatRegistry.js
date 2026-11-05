// =========================================================================
// SEAT REGISTRY — builds world-space seat anchors from runtime spawned models
// (with fallback to museumLayout.json + artifactRegistry).
//
// Convention: each artifact defines `seats: [{ id, x, z, yaw, height }]`
// where x/z are offsets in REAL METRES from the item's centre (at final size),
// height is the seat cushion height in metres above floor, and yaw is facing.
// Never multiply offsets or heights by model scale (SEAT-01).
// =========================================================================
import layout from '../data/museumLayout.json' with { type: 'json' }
import { findArtifactByPath } from '../game/room/artifactRegistry.js'
import { getRuntimeSeats } from '../game/room/placedItems.js'

export function buildSeatRegistry(currentRoomKey = null) {
  const seats = new Map() // seatId -> seat

  // 1. Prefer runtime spawned model seat anchors (derived from actual bounds)
  const runtimeList = getRuntimeSeats(currentRoomKey)
  if (runtimeList && runtimeList.length > 0) {
    for (const s of runtimeList) {
      seats.set(s.id, {
        id: s.id,
        room: s.roomKey || s.room,
        x: s.x,
        y: s.y,
        z: s.z,
        yaw: s.yaw,
        height: s.height,
        cushionY: s.cushionY,
        anchor: s.anchor,
        occupiedBy: s.occupiedBy || null,
      })
    }
    return seats
  }

  // 2. Fallback to layout data if runtime models are not yet spawned
  const rooms = layout?.rooms || {}

  for (const [roomKey, items] of Object.entries(rooms)) {
    if (currentRoomKey && roomKey !== currentRoomKey) continue
    if (!Array.isArray(items)) continue
    for (const item of items) {
      if (!item || item.type !== 'glb') continue
      const artifact = findArtifactByPath(item.path)
      const seatDefs = artifact?.seats
      if (!Array.isArray(seatDefs) || seatDefs.length === 0) continue

      const rotY = (typeof item.rotationY === 'number') ? item.rotationY : 0
      const ix = (typeof item.x === 'number') ? item.x : 0
      const iz = (typeof item.z === 'number') ? item.z : 0
      const iy = (typeof item.y === 'number') ? item.y : 0

      for (const s of seatDefs) {
        // Rotate local offset (in real metres) by item yaw
        const cos = Math.cos(rotY)
        const sin = Math.sin(rotY)
        const lx = s.x
        const lz = s.z
        const wx = ix + lx * cos - lz * sin
        const wz = iz + lx * sin + lz * cos
        const seatId = `${roomKey}:${item.id || 'item'}:${s.id}`
        seats.set(seatId, {
          id: seatId,
          room: roomKey,
          x: wx,
          y: iy,
          z: wz,
          yaw: rotY + (s.yaw || 0),
          height: s.height,
          cushionY: iy + s.height,
          anchor: null,
          occupiedBy: null,
        })
      }
    }
  }
  return seats
}

export function findNearestSeat(seats, px, pz, maxDist = 4) {
  let best = null
  let bestD = maxDist
  for (const seat of seats.values()) {
    if (seat.occupiedBy) continue
    const d = Math.hypot(px - seat.x, pz - seat.z)
    if (d < bestD) { bestD = d; best = seat }
  }
  return best
}
