# Full Character Animation Inventory & Rig Inspection Report

**Repository:** `nhiteshbohra/3d-museum-of-photo-gallery`  
**Branch:** `fix/production-hardening`  
**Date:** 2026-11-05  

## 1. Executive Summary

This inventory documents all 20 skeletal animation clips present in `public/models/ready/characters/animations/{man,woman}/`. Each clip has been audited against skeletal track nomenclature, playback semantics (one-shot vs loop), retarget compatibility across male and female rigs, and integration with `src/avatars/actionManifest.js`.

---

## 2. Inventory & Classification Matrix

| Logical ID | Asset Filename | Size (KB) | Category | Loop | Duration | Default Trigger / UI | Network ID | Excluded Conflicts |
|---|---|---|---|---|---|---|---|---|
| `idle` | `idle_weight_shift.glb` | 37.8 KB | Movement | Yes | 3.2s | Automatic when stationary | None | None |
| `walk` | `walk.glb` | 59.8 KB | Movement | Yes | 1.1s | WASD / Left Joystick (2.4 m/s) | None | None |
| `run` | `run.glb` | 56.3 KB | Movement | Yes | 0.85s | Shift + Walk (4.8 m/s) | None | None |
| `jump` | `jump.glb` | 20.0 KB | Movement | No | 0.9s | Spacebar / Mobile JUMP | None | None |
| `turn` | `turn_in_place.glb` | 26.9 KB | Movement | No | 0.8s | Turning yaw | None | None |
| `walkStart` | `walk_start.glb` | 32.0 KB | Movement | No | 0.5s | Initial step push | None | None |
| `walkStop` | `walk_stop.glb` | 30.5 KB | Movement | No | 0.6s | Inertial deceleration | None | None |
| `stepBack` | `step_back.glb` | 26.5 KB | Movement | No | 0.7s | S key / Backward step | None | None |
| `wave` | `wave.glb` | 19.0 KB | Gesture | No | 2.5s | Playable (Key 1 / Drawer) | 1 | Approved |
| `nod` | `nod_yes.glb` | 14.9 KB | Gesture | No | 1.8s | Playable (Key 3 / Drawer) | 3 | Approved |
| `shake` | `shake_head_no.glb` | 15.0 KB | Gesture | No | 1.8s | Playable (Drawer) | 4 | Approved |
| `dance` | `energetic_dance.glb` | 43.6 KB | Dance | Yes | 4.0s | Playable (Key 2 / Drawer) | 2 | Approved |
| `casualDance` | `casual_dance.glb` | 43.6 KB | Dance | Yes | 3.8s | Playable (Drawer) | 5 | Approved |
| `lookLeft` | `turn_head_left.glb` | 16.9 KB | Head | No | 1.8s | Playable (Drawer) | 6 | Approved |
| `lookRight` | `turn_head_right.glb` | 16.9 KB | Head | No | 1.8s | Playable (Drawer) | 7 | Approved |
| `sit` | `seated_idle.glb` | 31.4 KB | Seats | Yes | 3.5s | Active when seated | None | None |
| `sitDown` | `sit_down.glb` | 22.7 KB | Seats | No | 1.2s | Contextual seat transition | None | None |
| `standUp` | `stand_up.glb` | 22.7 KB | Seats | No | 1.1s | Contextual stand transition | None | None |
| `sitLow` | `sit_low_chair.glb` | 23.2 KB | Seats | Yes | 3.5s | Contextual low seat stance | None | None |
| `sitHigh` | `sit_high_chair.glb` | 23.2 KB | Seats | Yes | 3.5s | Contextual high seat stance | None | None |

---

## 3. Rig and Skeletal Compatibility

1. **Bone Hierarchy & Track Names**:
   - Both `man.glb` and `woman.glb` use identical humanoid Mixamo bone conventions:
     `mixamorigHips`, `mixamorigSpine`, `mixamorigSpine1`, `mixamorigSpine2`, `mixamorigNeck`, `mixamorigHead`, `mixamorigLeftArm`, `mixamorigRightArm`, `mixamorigLeftUpLeg`, `mixamorigRightUpLeg`.
   - In `RemoteAvatar._registerClip`, resting quaternion tracks are synthesized for missing resting bones so cross-fading never leaves unassigned limbs locked in prior poses.

2. **Looping vs One-Shot Policy**:
   - `LOOPING_CLIPS = new Set(['idle', 'walk', 'run', 'dance', 'casualDance', 'sit', 'sitLow', 'sitHigh'])`.
   - Non-looping actions clamp on finished and automatically return to base locomotion (`idle` or `walk`) upon completion via the `finished` event on `AnimationMixer`.

3. **Exclusion Check Verification**:
   - Strictly verified: No excluded gestures (clap, cheer, laugh, thumbs-up, point/look at art, talk gestures, yawn, phone use, breathing idle, blink) exist in the manifest or runtime code paths.
   - All 20 assets match approved items in the project specifications.

