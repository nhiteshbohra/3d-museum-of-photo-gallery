# Our Museum 3D — Multiplayer Synchronization Audit

**Branch:** `fix/production-hardening`  
**Files Audited:** `server.js`, `src/avatars/multiplayer.js`, `tests/two_client_test.mjs`, `tests/server_protocol.test.mjs`  
**Auditor:** Senior Tester & Independent Reviewer  

---

## 1. Protocol Architecture & Authentication Boundary

- **Protocol Version:** Protocol v2 (`PROTOCOL_VERSION = 2`).
- **Authentication Gate:**
  - WebSocket upgrade strictly validates the `museum_session` HttpOnly cookie.
  - Unauthenticated WebSocket joins receive immediate error code 4003 (`unauthorized`) and are disconnected.
- **Capacity Constraint:**
  - Strictly enforced server-authoritative 2-player capacity (`MAX_PLAYERS_PER_SESSION = 2`).
  - Third visitor attempts receive `room-full` rejection and are closed with code 4001.

---

## 2. Synchronization Contracts Verified

1. **Dual Avatar Presence:**
   - Client 1 (Maya) connects: assigned slot 1.
   - Client 2 (Ethan) connects: assigned slot 2. Both clients receive `peer_joined` message with character model (`woman.glb` / `man.glb`).
2. **Locomotion Synchronization:**
   - Position $(x, y, z)$, camera yaw, pitch, logical base state (`idle`, `walk`, `run`, `step_back`, `jump`), and active gesture are transmitted.
   - Remote avatars interpolate smoothly across network updates without teleporting.
3. **Approved Gestures Synchronization:**
   - Wave (`wave`) broadcasted and rendered on remote client.
   - Energetic Dance (`dance`) broadcasted and rendered on remote client.
   - Stop / Cancel messages cleanly terminate remote animation actions.
4. **Contextual Seating Arbitration:**
   - When Maya claims `sofa_seat_1`, the server locks the seat atomically.
   - If Ethan attempts to claim `sofa_seat_1`, the server denies the request with `sit_denied`.
   - When Maya stands up, the seat is released, broadcasting `stand` to Ethan.
5. **30-Second Disconnection Grace Window:**
   - If an authenticated visitor temporarily disconnects (e.g. page refresh, network blip), the server holds their player slot and seat for 30 seconds.
   - If the visitor reconnects within 30 seconds, their session state is restored without eviction.
   - If 30 seconds expire without reconnect, the slot and seat are freed cleanly.

---

## 3. Test Evidence & Logs
- `node tests/two_client_test.mjs`: **100% PASS** on port 8080.
- `node --test tests/server_protocol.test.mjs`: **100% PASS** on port 8991.
- Status: **VERIFIED & OPERATIONAL.**

