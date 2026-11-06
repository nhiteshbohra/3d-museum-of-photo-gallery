# 3D Museum — Changelog & File Ownership

**Branch:** `fix/production-hardening`  
**Coordinator:** Engineering Lead  

---

## File Ownership Table

| File | Current Assignee | Permitted Action | Current Modification State |
|---|---|---|---|
| `src/main.js` | Senior Developer | Auth state machine, startup flow | Modified in `80e0e2e` / `893e0c3` |
| `server.js` | Senior Developer | Config endpoint, session validation | Modified in `80e0e2e` |
| `src/game/room.js` | Senior Developer | Photo frame & outline scaling | Modified in `80e0e2e` |
| `src/avatars/avatarWorld.js` | Senior Researcher (Audit) / Senior Developer | Rig orientation, clip transitions | Under investigation |
| `src/engine/engine.js` | Senior Developer | Adaptive DPR, photo LRU cache, room limits | In backlog (Milestone F) |
| `public/models/ready/furniture/3d_pbr_curved_sofa.glb` | Senior Developer | gltf-transform optimization & LOD | In backlog (Milestone F) |
| `tests/photo_frames.test.mjs` | Senior Developer | Frame aspect ratio assertions | Added test for PHOTO-01 |
| `tests/server_protocol.test.mjs` | Senior Developer | Server hardening assertions | Added test for active config |

---

## Commit History on Branch `fix/production-hardening`

- Current: `fix(decor,auth): remove procedural benches from salons and eliminate plaintext passcode leakage (DECOR-01, DECOR-02, AUTH-01)`
- `52d9cc8`: `feat(decor,audit): apply mandatory room decor simplification and produce all 8 master audit deliverables`
- `18fe869`: `fix(auth): implement unified 5-state authentication state machine with single click dispatcher`
- `80e0e2e`: `fix(auth,photos): resolve stranded returning visitor (AUTH-01), active invite filtering (AUTH-03), and adaptive frame outline scaling (PHOTO-01)`
- `9df1a93`: `docs(audit): add final verified regression and audit report`
- `f122ae6`: `fix(avatars): align visual forward pivot, adapt photo frames to aspect ratio, enforce passcode gate presentation`
- `08a0f80`: `feat(avatars): implement walk-start/stop/step-back/turn state machine and mobile gesture drawer UX`

