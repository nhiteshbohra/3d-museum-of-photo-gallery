# Multiplayer Synchronization & Protocol QA Report

## 1. Overview
This report documents the verification of the real-time networking, protocol handshake, session isolation, seat reservation, and fault-tolerance subsystems in **Our Museum 3D**. The application strictly implements WebSocket Protocol v2 over secure WebSocket (`wss://`).

---

## 2. Protocol Handshake & Capacity Constraints

### 2.1 Authoritative Two-Player Cap
- **Rule**: Exactly one private museum session (`our-home`) exists, supporting a maximum of two human visitors (Maya and Ethan).
- **Enforcement**:
  - `server.js` maintains an active peer set `sessions.get("our-home")`.
  - When a third client sends a `{ type: "join" }` packet, the server evaluates active participants:
    ```javascript
    if (activePeers.size >= 2 && !isGraceSession(token)) {
      ws.send(JSON.stringify({ type: "error", error: "room-full" }));
      ws.close(4403, "Room full");
    }
    ```
- **Automated Verification**: Section 3 of `tests/server_protocol.test.mjs` spawns Alice, Bob, and Charlie. Charlie receives `room-full` and is immediately disconnected with status code 4403.

### 2.2 Protocol Versioning & Passcode Enforcement
- Clients sending `proto_version < 2` are rejected with `{ type: "error", error: "update-required" }`.
- Missing or invalid invitation tokens/passcodes receive `{ type: "error", error: "bad-code" }`.

---

## 3. Disconnection Grace Window (30 Seconds)

### 3.1 Motivation & Mechanics
On mobile networks, switching from cellular LTE/5G to home Wi-Fi or entering an elevator causes momentary socket drops (2-10 seconds). In naive implementations, this causes the partner's avatar to vanish, vacates their seat, and requires a full page refresh.

### 3.2 Hardened Implementation
1. When a client socket closes:
   - Server checks if the client had an active authenticated session.
   - If authenticated, the server places the session into `graceSessions` with a 30,000ms timer.
   - The visitor's seat reservation and avatar identity are retained.
   - A notification is sent to the remaining partner:
     ```json
     { "type": "peer_status", "status": "reconnecting", "peerId": "peer_maya" }
     ```
   - If a 3rd party attempts to join during this window, they are rejected with `room-full` because the slot remains reserved.
2. When the visitor reconnects within 30 seconds:
   - Client sends `{ type: "join", token: sessionToken }`.
   - Server matches `graceSessions`, clears the timer, binds the new socket to the existing session, and restores their avatar and seat.
   - Server notifies the partner:
     ```json
     { "type": "peer_status", "status": "reconnected", "peerId": "peer_maya" }
     ```
3. If the timer expires without reconnection:
   - Server permanently releases the seat, evicts the avatar, and broadcasts `{ type: "peer_left" }`.

### 3.3 Automated Verification
Section 7 of `tests/server_protocol.test.mjs` disconnects Maya, asserts Bob receives `reconnecting`, asserts Charlie cannot steal the slot, and verifies Maya's seamless reconnection and restoration.

---

## 4. Authoritative Seat Reservation & Single-Seat Invariant

### 4.1 Invariant Definition
A player may occupy at most one seat across the entire museum at any given moment. Claiming a new seat must atomically vacate any previous seat. Two players cannot occupy the same seat simultaneously.

### 4.2 State Transition Logic
```
[ Player Standing ]
        |
        v  (Client sends { type: "sit", seatId: "sofa_1" })
[ Check seatId in occupiedSeats ]
        |
        +---> If occupied: Server replies { type: "sit_denied", seatId: "sofa_1" }
        |
        +---> If free:
                 1. Vacate any previous seat occupied by this peer
                 2. Broadcast { type: "stand", seatId: previousSeatId }
                 3. Store occupiedSeats.set("sofa_1", peerId)
                 4. Broadcast { type: "sit", seatId: "sofa_1", peerId }
```

### 4.3 Automated Verification
- **Section 4 of `tests/server_protocol.test.mjs`**: Alice claims `sofa_seat_1`. Bob attempts to claim `sofa_seat_1` and is denied with `sit_denied`. Alice stands up; seat is released; Bob claims it successfully.
- **Section 6 of `tests/server_protocol.test.mjs`**: Maya occupies `bench_1`, then walks to and sits on `sofa_1`. The server automatically broadcasts `stand` for `bench_1` before confirming `sit` on `sofa_1`.

---

## 5. Message Ordering & Join Queueing

### 5.1 Race Condition Resolution
In `src/net/wsClient.js`, outbound gameplay packets (movement, emotes, seat requests) are enqueued in an in-memory buffer until the server transmits the initial `{ type: "room_state" }` packet confirming full session authorization.

### 5.2 Ghost Avatar Elimination
- When a user changes salons or reconnects, all existing remote peer meshes are cross-referenced with `room_state.peers`.
- Any stale avatar meshes not present in the authoritative peer list are immediately disposed from the Three.js scene graph.

---

## 6. QA Verification Matrix

| Test Scenario | Implementation | Test Suite | Result |
|---|---|---|---|
| **Max 2 Human Peers** | Server active peer rejection | `tests/server_protocol.test.mjs:3` | PASS |
| **Passcode Validation** | Token matching on join | `tests/server_protocol.test.mjs:3` | PASS |
| **Simultaneous Seat Request** | Mutex check on `occupiedSeats` | `tests/server_protocol.test.mjs:4` | PASS |
| **Single-Seat Invariant** | Atomic vacate on seat switch | `tests/server_protocol.test.mjs:6` | PASS |
| **30s Disconnection Grace** | Timer in `graceSessions` | `tests/server_protocol.test.mjs:7` | PASS |
| **Partner Grace Notification** | `peer_status` broadcast | `tests/server_protocol.test.mjs:7` | PASS |
| **Slot Preservation in Grace** | Third user rejected during grace | `tests/server_protocol.test.mjs:7` | PASS |
| **Ghost Avatar Teardown** | Client reconciliation with `room_state` | Client engine inspection | PASS |
| **Sanitized Chat Delivery** | Tag escaping prior to broadcast | Client HUD inspection | PASS |

---

## 7. Conclusion
The multiplayer networking subsystem is robust, deterministic, and fully compliant with the 2-player capacity, seat locking, and fault-tolerant reconnection specifications.

