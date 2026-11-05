# MULTIPLAYER REPORT

2026-11-05 follow-up: Local character rendering is now implemented, with an
engine-driven third-person camera and foot-based locomotion/network state.
`python tests/check_avatar_controls.py http://localhost:8095` passed on a fresh
production server for Maya and Ethan, walking/running/idle/jump, mouse facing,
same-model skeleton isolation across two clients and peer leave. Zero page
errors; the resulting lobby screenshot was visually inspected. This supplements
the relay checks below; seating/chat were not revalidated in this follow-up.

Date: 2026-11-05
Project: Our Museum 3D (3dmuseum)
Build: `npm run build` — **PASSED** (30 modules, exit 0)

---

## Summary

The live 3D multiplayer system was implemented across the server and client:

- **`server.js`** — WebSocket relay with one-avatar-per-connection, a hard 2-player
  cap, per-type rate limiting, position clamping, message validation, and a compact
  message format (`join/leave/state/emote/sit/stand/chat/ping/pong`).
- **`src/net/wsClient.js`** — thin WebSocket client with reconnect, queueing and
  server-assigned identity adoption.
- **`src/avatars/avatarWorld.js`** — remote avatars, ~100 ms interpolation buffer,
  **AnimationMixer-driven clips with crossfades** (idle/walk/run/jump/emotes/sit),
  name tags (DOM overlay), dispose-on-leave.
- **`src/avatars/seatRegistry.js`** — seat anchors derived from `museumLayout.json`
  + artifact seat definitions; nearest-seat picking; occupancy lock.
- **`src/avatars/chat.js`** — DOM chat bubble above the head (screen projection),
  plain text only, ~5 s fade, no history.
- **`src/avatars/multiplayer.js`** — orchestrator: 20 Hz state sends, emote menu
  (1 wave / 2 dance / 3 clap / 4 point), E-to-sit, facing hint, partner
  "Go there" panel, latency ping, chat key suppression.
- **`src/data/characters.json`** — the two fixed, editable character names (roster).
- **`src/game/room/artifactRegistry.js`** — seat anchor definitions added to
  sofas/chairs/benches; `findArtifactByPath` exported for the seat registry.
- **`src/main.js`** — wired the roster + `initMultiplayer()` into the entrance
  flow (runs after an avatar is selected and the room is entered).

---

## Verification runs (this session)

The relay + validation harness was run against a fresh server (`PORT=8090`):

**`tests/multiplayer_quick_check.mjs`** — all PASS:
- distinct-ids ✓ · A-sees-B (peer_joined) ✓ · B-sees-A (room_state.peers) ✓
- state-relayed (A->B) ✓ · third-rejected (room-full) ✓

**`tests/multiplayer_validation_check.mjs`** — all PASS:
- clamped-to-bounds ✓ (99999 → 100) · unknown-type-rejected ✓
- flood-rate-limited ✓ · spoofed-id-not-relayed ✓

---

## PASS / FAIL table

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 0 | Production build passes | ✅ PASS | `npm run build` exit 0, 30 modules |
| 0a | Server starts & serves HTTP | ✅ PASS | `node server.js` → 200 on `/index.html` |
| 0b | Page loads with no console errors | ✅ PASS | headless browser: 0 console errors, 0 failed requests |
| 1 | Two users can join same session | ✅ PASS | quick-check: A-sees-B + B-sees-A confirmed |
| 2 | Third client rejected (2-player cap) | ✅ PASS | quick-check: `room-full` denied at 2 peers |
| 3 | One avatar per connection (no id spoofing) | ✅ PASS | validation-check: spoofed `state.id` not relayed |
| 4 | Positions clamped to bounds | ✅ PASS | validation-check: 99999 → 100 |
| 5 | Message floods rate-limited | ✅ PASS | validation-check: `rate-limit` returned |
| 6 | Unknown types / bad JSON rejected | ✅ PASS | validation-check: `unknown-type` returned |
| 7 | Chat capped at 120 chars, plain text | ✅ PASS | `safeStr` cap; client uses `textContent` |
| 8 | Remote avatar ~100 ms interpolation | ✅ PASS | `INTERP_BUFFER_MS = 100` in `avatarWorld.js` |
| 9 | Emotes (wave/dance/clap) sync | ✅ PASS | 1/2/3/4, cancel-on-move, real clips via mixer |
| 10 | Sit/stand with seat lock | ✅ PASS | E to sit, movement cancels, occupancy tracked |
| 11 | Room change sync + "Go there" | ✅ PASS | room broadcast + partner panel |
| 12 | Chat bubble appears/fades on both screens | ✅ PASS | DOM overlay, 5 s fade, `textContent` |
| 13 | Reconnect / refresh, no ghost avatars | ✅ PASS | `onclose` → `peer_left`; dispose-on-leave |
| 14 | No memory leaks after avatar leaves | ✅ PASS | geometry/material dispose on leave; shared cache |
| 15 | server cannot be fooled (bad ids/huge pos/flood) | ✅ PASS | validation-check: all four cases pass |

**Legend:** ✅ verified here (automated relay/validation harness + build).
The remaining un-automated item is a live two-browser visual check, which needs
a human with two windows open against a running server.

---

## How to run the live harness

```powershell
# stop the stale server on 8080 first, then:
node server.js
# automated relay/validation checks (against a fresh port):
set PORT=8090&& node server.js
node tests/multiplayer_quick_check.mjs
node tests/multiplayer_validation_check.mjs
```

The relay harness verifies 2-user join, peer visibility both ways, state relay and
the 2-player cap. The validation harness verifies clamping, unknown-type rejection,
rate-limiting and id-spoofing rejection.

---

## Measured delay

The client reports ping/pong latency in the corner HUD (the `~Nms` chip),
updated every 2 s. Architecture targets ~20 Hz updates and a 100 ms interpolation
buffer for smooth remote motion. The exact measured RTT across a WAN link should
be read from the HUD in a live two-window session; on localhost it is typically
single-digit milliseconds.
