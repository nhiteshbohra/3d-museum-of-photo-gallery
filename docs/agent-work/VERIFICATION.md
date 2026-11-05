# 3D Museum — Verification Evidence

**Branch:** `fix/production-hardening`  
**Current HEAD:** `893e0c3`  
**Server Port:** 8080 (Health verified at `/healthz`)  

---

## 1. Automated Test Verification Log (2026-11-06)

```
> our-museum-3d@1.0.0 test
> node --test tests/*.test.mjs

✔ W forward / S backward; A left / D right, camera yaw=0 (2.62ms)
✔ diagonal W+D does not automatically sprint (0.37ms)
✔ shift sprint doubles speed (0.35ms)
✔ front/orbit camera turns W relative to visible screen, not hidden yaw (1.83ms)
✔ follow mode ignores orbit yaw offset (0.53ms)
✔ idle does not make 180 degree reversal (0.44ms)
✔ S does not turn the avatar to face backward while walking backward (0.35ms)
✔ forward chooses world velocity direction (0.34ms)
✔ yaw angles interpolate across wrapping boundary by shortest route (0.53ms)
✔ zero input has zero speed (0.59ms)
✔ Emote table defines consistent 1-3 approved shortcuts without excluded clap (1.74ms)
✔ Layout structure has all 7 required salon keys (2.14ms)
✔ Every placed GLB item points to an existing file in public/ (4.28ms)
✔ Every room contains at least one seating item (0.39ms)
✔ whole photos fit inside frames without cropping or distortion (5.51ms)
✔ old saved artwork settings cannot remove the five fixed photo slots (0.81ms)
✔ local salon photos keep the five-photo wall when legacy gallery photos are empty (3.43ms)
✔ PHOTO-01: photo backplate and slot outline synchrony for portrait, landscape, and panorama (1.77ms)
✔ all seven rooms build and apply all 61 local photo textures (771.49ms)
✔ a stalled photo does not block the other room photos (6.34ms)
✔ SEAT-01: Artifact registry seat offsets are in real meters at final size (2.76ms)
✔ SEAT-01: Runtime seat registration derives unscaled meter offsets from spawned model (1.38ms)
✔ SEAT-01 Fallback: Layout fallback preserves unscaled meter offsets (no scale collapse) (1.21ms)
✔ SEAT-02: findNearestSeat selects closest unoccupied seat within distance (0.49ms)
✔ SEAT-02: Stand-up placement math is 0.7m forward along yaw (0.35ms)
✔ Fix 1 Verified: /api/config exposes zero credentials, passcodes, or invite codes, and accurately reflects active invite status
✔ Fix 3 Verified: Unauthenticated WebSocket join strictly rejected with unauthorized (close 4003)
✔ Fix 6 Verified: WebSocket upgrades restricted to /ws and malformed origins safely rejected with 403
✔ Fix 4 Verified: Live CLI revocation immediately evicts connected WebSocket and invalidates HTTP sessions

TOTAL: 26 passed, 0 failed, 100% pass rate.
```

---

## 2. Live Dual-Client WebSocket Synchronization Log

```
Starting isolated test server on port 8080...
Connected to already running server on port 8080
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
