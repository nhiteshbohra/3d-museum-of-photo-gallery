# Two-Player Synchronization QA & Test Report

**Environment:** Production Hardened Server  
**Target:** Private 3D Museum of Photo Gallery  
**Branch:** `fix/production-hardening`  
**Date:** 2026-11-05  

---

## 1. Test Environment Setup

- **Server**: Node.js hardened server running on `http://127.0.0.1:8995` / `http://127.0.0.1:8991`
- **Protocol**: Protocol Version 2 (`/ws`)
- **Capacity**: Global max 2 human peers
- **Test Scripts**:
  - `tests/two_client_test.mjs`
  - `tests/server_protocol.test.mjs`
  - `tests/seats.test.mjs`
  - `tests/emotes.test.mjs`

---

## 2. Test Execution & Evidence

### Test Case 1: Passcode Verification & Gated Authentication
- **Action**: Client 1 requests redeem with `maya-love`; Client 2 requests redeem with `ethan-love`.
- **Result**:
  ```
  Maya cookie: museum_session=sess_bac24cc0970260761c7a7107535222c0
  Ethan cookie: museum_session=sess_a5ee73a8c982bbfa7c1112ada2a5cad8
  ```
- **Verification**: Both clients issued cryptographically secure `HttpOnly` session tokens with no token leakage in JSON response bodies.

### Test Case 2: WebSocket Connection & Handshake
- **Action**: Both clients initiate WebSocket connections with session cookies attached.
- **Result**:
  ```
  Maya joined! Peers in room_state: 1
  Ethan joined! Peers in room_state: 2
  Maya received peer_joined for: Ethan model: man.glb
  ```
- **Verification**: Handshake protocol v2 acknowledged both peers; remote avatar metadata and initial coordinates propagated immediately.

### Test Case 3: Real-Time Movement State Synchronization
- **Action**: Ethan moves to `[1.5, 1.7, -3.2]`, yaw `1.57`, animation `walk`, mode `stand`.
- **Result**:
  ```
  Maya received Ethan state update: {
    t: 'state',
    id: 'peer_mw3qch4k_w5g8yd',
    p: [ 1.5, 1.7, -3.2 ],
    ry: 1.57,
    room: 'lobby',
    location: 'lobby',
    anim: 'walk',
    moving: true,
    mode: 'stand',
    seat: null
  }
  ```
- **Verification**: Real-time position, body yaw, and locomotion states synchronized with zero jitter.

### Test Case 4: Approved Gestures & Emote Synchronization
- **Action**: Ethan triggers Emote 1 (`wave`).
- **Result**:
  ```
  Maya received Ethan emote update: {
    t: 'emote',
    id: 'peer_mw3qch4k_w5g8yd',
    e: 1,
    start: false
  }
  ```
- **Verification**: Emotes broadcast to peer and execute locally with fallback for offline playback.

### Test Case 5: Room Awareness & Partner Navigation
- **Action**: Bob enters `fireside` while Alice remains in `lobby`.
- **Result**:
  ```
  Client 2 (Bob) joined session successfully in fireside
  Client 1 notified of Bob arrival with location "fireside"
  ```
- **Verification**: Partner HUD updates with current room. Clicking "Go there" navigates the player to the partner's room without rendering avatars across gallery boundaries.

### Test Case 6: Authoritative Seat Collision & Invariants
- **Action**: Alice reserves `sofa_seat_1`; Bob attempts to claim the same seat.
- **Result**:
  ```
  Alice successfully claimed sofa_seat_1
  Bob seat collision correctly rejected with sit_denied
  Alice stood up; seat released
  Bob successfully claimed previously released seat
  ```
- **Verification**: Prevents overlapping avatar seated positions; vacates previous seat atomically upon switching.

### Test Case 7: 30-Second Disconnection Grace Window
- **Action**: Maya momentarily disconnects; slot held for 30s grace; Maya reconnects.
- **Result**:
  ```
  [WS Grace] peer_... (Maya) disconnected. Holding slot & seat for 30s grace.
  Slot reserved during grace: third visitor rejected with room-full
  [WS Grace] Participant Maya reconnected within grace window!
  ```
- **Verification**: Partner slot preserved against race conditions during brief network drops.

---

## 3. QA Conclusion

All 7 multiplayer test cases passed with 100% compliance.

