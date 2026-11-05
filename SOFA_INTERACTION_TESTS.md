# Sofa & Chair Contextual Seating Interaction Verification

**Repository:** `nhiteshbohra/3d-museum-of-photo-gallery`  
**Branch:** `fix/production-hardening`  

---

## 1. Architectural Design & Invariants

Contextual seating enforces three core invariants:
1. **Server-Authoritative Claims**: Clients cannot unilaterally occupy a seat. `trySit()` sends `{ t: 'sit', seat: seatId }` to the server. The server verifies ownership:
   - If vacant, replies `{ t: 'sit_ok', seat: seatId }` and broadcasts `{ t: 'sit', id: peerId, seat: seatId }`.
   - If occupied, replies `{ t: 'sit_denied', seat: seatId, reason: 'occupied' }`.
2. **Atomic Single-Seat Invariant (STATE-01)**: Moving or claiming another seat atomically vacates the previously held seat without ghost reservations.
3. **Collision-Safe Floor Relocation (SEAT-02)**: On `standUp()`, the avatar is repositioned 0.7m in front of the seat along its facing yaw, clamped within room boundaries, and pushed away from all obstacle bounding boxes to prevent clipping through furniture or walls.

---

## 2. Test Verification & Evidence

Automated tests in `tests/server_protocol.test.mjs`, `tests/seats.test.mjs`, and `tests/two_client_test.mjs` confirm:
- `findNearestSeat` correctly computes radial distance in real unscaled meters.
- Distance threshold of 3.5m strictly gatekeeps seating interactions.
- Seat collision rejection (`sit_denied`) works cleanly between Maya and Ethan.
- Standing releases seat lock across HTTP/WebSocket state and updates partner view in real time.

```
--- 4. Testing SEAT-03: Authoritative Seat Reservation ---
  ✓ Alice successfully claimed sofa_seat_1
  ✓ Bob seat collision correctly rejected with sit_denied
  ✓ Alice stood up; seat released
  ✓ Bob successfully claimed previously released seat
```
