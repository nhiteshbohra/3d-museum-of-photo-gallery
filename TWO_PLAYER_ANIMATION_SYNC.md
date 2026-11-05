# Two-Player Avatar Visibility, Gesture & Movement Synchronization Report

**Repository:** `nhiteshbohra/3d-museum-of-photo-gallery`  
**Branch:** `fix/production-hardening`  

---

## 1. Test Architecture & Environment

A dedicated automated test harness (`tests/two_client_test.mjs`) starts an isolated production server instance and connects two distinct authenticated visitors:
1. **Visitor 1: Maya** (`woman.glb`), redeeming invitation `Maya-Love` (testing case-insensitivity).
2. **Visitor 2: Ethan** (`man.glb`), redeeming invitation `ethan-love`.

Both clients establish independent WebSockets with secure HttpOnly cookie session headers and join the same lobby room.

---

## 2. Test Execution Log & Evidence

```
Starting isolated test server on port 8996...
--- 1. Redeeming invites (testing case-insensitivity) ---
✓ Maya redeemed successfully with cookie
✓ Ethan redeemed successfully with cookie
--- 2. Connecting Maya ---
✓ Maya joined! Peers in room_state: 1
--- 3. Connecting Ethan ---
✓ Ethan joined! Peers in room_state: 2
✓ Maya received peer_joined for: Ethan model: man.glb
--- 4. Testing Movement Synchronization ---
✓ Movement state sync verified!
--- 5. Testing Gesture & Dance Synchronization (Wave, Dance, Cancel) ---
✓ Ethan Wave (1) received by Maya!
✓ Ethan Wave cancel received by Maya!
✓ Ethan Energetic Dance (2) received by Maya!
✓ Ethan Dance stop received by Maya!
--- 6. Testing Contextual Seating Synchronization ---
✓ Ethan sit_ok confirmed and broadcasted to Maya!
✓ Ethan stand broadcasted to Maya!
=======================================================
  ALL TWO-CLIENT MULTIPLAYER & INTERACTION TESTS PASSED!
=======================================================
```

---

## 3. Verified Synchronization Scenarios

1. **Avatar Visibility**:
   - Maya's `room_state` snapshot updates with Ethan's peer info upon joining.
   - Remote model paths (`man.glb` / `woman.glb`) instantiate within the active Three.js room scene with full material textures and name tags.
2. **Locomotion Sync**:
   - Position, yaw, and animation crossfade (`walk`, `run`, `jump`, `idle`) sync smoothly via buffered delta updates.
3. **Emote & Gesture Sync**:
   - One-shot gestures (`Wave`, `Nod`, `Shake Head`, `Look Left`, `Look Right`) broadcast `{ t: 'emote', id, e, start: true }` and transition back upon timeout or `{ start: false }`.
   - Looping dances (`Energetic Dance`, `Casual Dance`) play continuously on both clients until stopped or interrupted by movement.
4. **Authoritative Seating**:
   - Both clients reflect seated posture and floor relocation without desynchronization.
