# 3D Museum — Changelog & File Ownership

**Branch:** `fix/production-hardening`  
**Current HEAD SHA:** `36ad81302a50f190768b86e3d37a061d7a2f9d24`  
**Coordinator:** Antigravity Engineering Lead  

---

## File Ownership Table

| File | Current Assignee | Permitted Action | Current Modification State |
|---|---|---|---|
| `src/main.js` | Senior Developer | Auth state machine, startup flow | Modified in `80e0e2e` / `893e0c3` |
| `src/style.css` | Senior Developer (M4 Iteration 6) | Style sheets, mobile button styling, drawer layout | Fixed in M4 Iteration 6 (`BUILD-CSS-01`) |
| `server.js` | Senior Developer | Config endpoint, session validation, rate limiting | Modified in `80e0e2e` |
| `src/game/room.js` | Senior Developer | Photo frame & outline scaling, decor simplification | Modified in `80e0e2e` / `36ad813` |
| `src/game/room/artifactRegistry.js` | Senior Developer | Real-meter seat offsets (SEAT-01) | Modified in `36ad813` |
| `src/avatars/avatarWorld.js` | Senior Researcher (Audit) / Senior Developer | Rig orientation, clip transitions | Audited / verified |
| `src/engine/engine.js` | Senior Developer (M3/M3-2) | Adaptive DPR cap (1.5), photo LRU cache (max 35), in-flight/deferred texture protection, explicit texture disposal | Hardened in M3 & M3.2 |
| `public/models/ready/furniture/3d_pbr_curved_sofa.glb` | Senior Developer (M3) | gltf-transform optimization (Draco + WebP 2048px) | Compressed in M3 (51.98 MB -> 6.13 MB, 88.21% reduction) |
| `public/models/ready/furniture/lod/3d_pbr_curved_sofa_lod.glb` | Senior Developer (M3) | gltf-transform LOD generation (Draco + WebP 1024px) | Created in M3 (1.40 MB, 97.32% reduction) |
| `scripts/inviteStore.js` | Senior Developer (M1/M2) | Prototype defense (AUTH-SEC-01), early strict string guard in redeemInvite | Modified in M1 & M2 |
| `tests/check_avatar_controls.py` | Senior Tester (M4) | WebGL avatar locomotion, heading retention, 30s grace, dual isolation | Verified in M4 |
| `tests/check_character_setup.py` | Senior Developer (M2/M4) | 20 actions invariant, clap exclusion, wave/dance/nod, canvas palette color change | Modified in M2, verified in M4 |
| `tests/boundary_stress.test.mjs` | Challenger 2 / Senior Developer (M2) | Boundary stress, prototype/malformed tokens, fail-closed assertions | Created in M1, aligned in M2 |
| `tests/photo_frames.test.mjs` | Senior Developer | Frame aspect ratio assertions | Added test for PHOTO-01 |
| `tests/seats.test.mjs` | Senior Developer | Seating placement, meter offsets, standup placement | Verified in M2/M4 |
| `tests/server_protocol.test.mjs` | Senior Developer | Server hardening assertions & prototype security | Modified in M1 |
| `tests/adversarial_mobile_assets_m3.test.mjs` | Senior Tester (M3/M4) | Curved sofa bounds parity (<0.001m), size reduction, mobile DPR clamping | Created in M3, verified in M4 |
| `tests/photo_cache_stress.mjs` | Challenger / Tester (M3/M4) | 50-room photo cache lifecycle and zero premature disposal harness | Created in M3, verified in M4 |
| `tests/photo_cache_adversarial_stress.mjs` | Challenger / Tester (M3/M4) | 100-room extreme stress, rapid toggling, and deduplication harness | Created in M3.2, verified in M4 |
| `tests/adversarial_security_m1.test.mjs` | Senior Tester (M1/M4) | Prototype property bypass & pollution adversarial suite | Created in M1, verified in M4 |
| `tests/two_client_test.mjs` | Senior Developer (M4) | Multi-client dual-visitor sync, emotes, seating | Verified in M4 |
| `docs/agent-work/ISSUES.md` | Senior Developer (M4) | Issue register and status tracking | Updated in M4 |
| `docs/agent-work/TEST_MATRIX.md` | Senior Developer (M4) | Test matrix & execution logging | Updated in M4 |
| `docs/agent-work/CHANGES.md` | Senior Developer (M4) | File ownership & changelog governance | Updated in M4 |
| `docs/agent-work/VERIFICATION.md` | Senior Developer (M4) | Empirical verification evidence & test logs | Updated in M4 |
| `docs/agent-work/DECISIONS.md` | Senior Developer (M4) | Architecture Decision Records (ADRs) | Updated in M4 |

---

## Commit History on Branch `fix/production-hardening`

- `M4-6`: `fix(style,tests): remediate CSS syntax blocker in .mobile-btn and harden Playwright DOM polling (M4 Iteration 6)`
  - `src/style.css`: cleaned up `.mobile-btn` and `.mobile-btn:active` rules around lines 879-906, removing orphaned properties and extra unclosed closing brace that previously caused PostCSS parser failure during `vite build` (`Unexpected }`).
  - `tests/check_character_setup.py`: hardened DOM polling queries on lines 41, 44, and 79 with explicit null-safety guards (`Boolean(document.querySelector(...) && !document.querySelector(...).hidden)`), preventing early DOM hydration `TypeError: Cannot read properties of null (reading 'hidden')`.
  - Verification: `npx vite build` completed with zero PostCSS errors; `npm run check` passed all 45 automated tests and Vite production build; `tests/check_character_setup.py` passed against live server on port 8080 with zero errors; `two_client_test.mjs` and `tests/check_avatar_controls.py` confirmed 100% passing.
- `M4`: `docs(governance): consolidate E2E multiplayer, browser visual tests, and mobile performance hardening (R1, R6)`
  - `docs/agent-work/ISSUES.md`: verified all active issues. Formally closed out `MOB-P0-01` (curved sofa compression & LOD), `MOB-P0-02` (mobile DPR 1.5 cap), and `MOB-P1-04` (photo texture LRU cache & in-flight protection) as VERIFIED. Added comprehensive defect records.
  - `docs/agent-work/TEST_MATRIX.md`: updated test matrix with 16 automated test suites with exact target commands, environments, pass rates, and verified timestamps.
  - `docs/agent-work/VERIFICATION.md`: recorded empirical execution logs for dual-client multiplayer test (`node tests/two_client_test.mjs` on ports 8993 and 8080), Playwright WebGL avatar tests (`check_avatar_controls.py` and `check_character_setup.py`), 50- and 100-transition photo cache stress suites, model verification, and repository check.
  - `docs/agent-work/DECISIONS.md`: documented architectural decisions for curved sofa Draco/WebP pipeline, distance LOD, mobile DPR clamping, and 35-texture LRU cache with multi-tier in-flight lifecycle protection.
  - Verification: all 45 repository tests passed; `npm run models:verify` passed (21 refs checked); two-client multiplayer passed on port 8993 & 8080; Playwright avatar browser tests passed; adversarial stress tests passed 100%.
- `M3-2`: `fix(engine): resolve premature texture disposal race condition and scale LRU photo texture capacity (R6)`
  - `src/engine/engine.js`:
    - Photo Texture LRU Capacity: increased `MAX_CACHED_PHOTO_TEXTURES` from 25 to 35, mathematically accommodating 3 cached rooms (up to 30 photos) plus current room transition margin.
    - In-Flight & Deferred Texture Protection: introduced `inFlightTextures`, `inFlightPromises`, and `textureUrlMap` to ensure active, loading, and deferred textures are never treated as unused or prematurely evicted.
    - Active Reference Checks: updated `isTextureInUse(tex)` to protect:
      1. Textures in `currentRoom.disposables`, mesh materials in `currentRoom.group`, or pending in `currentRoom.deferredTextureLoads`.
      2. Textures in any cached room in `roomCache` (`disposables`, mesh materials in `group`, or `deferredTextureLoads`).
      3. Textures in `inFlightTextures` or `inFlightPromises`.
    - Lifecycle Hooks: hooked `evictExcessPhotoTextures()` to room eviction in `evictExcessRooms()` and uncached transitions in `loadRoom()`, ensuring only truly stale, unreferenced textures from evicted rooms are evicted and disposed.
    - Stop Cleanup: added `inFlightTextures.clear()` and `inFlightPromises.clear()` to `engine.stop()`.
    - Signature Preservation: preserved exact signatures of `runDeferredTextureLoads`, `\n\tholdAnchor`, `getTargetPixelRatio()`, and DPR clamping.
  - Verification: `node tests/photo_cache_stress.mjs` passed with 0 premature disposals across 50 room transitions (previously 60 premature disposals); `node --test tests/room_photo_loading.test.mjs` passed (2/2); `node --test tests/photo_frames.test.mjs` passed (4/4); `node --test tests/adversarial_mobile_assets_m3.test.mjs` passed (6/6); `node --test tests/seats.test.mjs tests/layout.test.mjs` passed (10/10); `npm run models:verify` passed; `npm run check` passed completely (45/45 tests + Vite build); `two_client_test.mjs` passed on port 8998.
- `M3`: `feat(perf,mobile): compress curved sofa model, generate LOD, clamp mobile DPR, and enforce texture disposal (R6, MOB-P0-01)`
  - `public/models/ready/furniture/3d_pbr_curved_sofa.glb`: compressed using `@gltf-transform/cli optimize` with Draco geometry compression and WebP 2048px textures. Reduced asset size from 51,976,104 bytes (51.98 MB) to 6,126,744 bytes (6.13 MB), achieving an 88.21% size reduction (exceeding >=85% target).
  - `public/models/ready/furniture/lod/3d_pbr_curved_sofa_lod.glb`: generated distance LOD model with Draco compression and WebP 1024px textures at 1,395,204 bytes (1.40 MB), achieving a 97.32% size reduction (exceeding >=95% target).
  - Model Invariant Verification: verified exact bounding box match (`bboxMin: [-4.24407, 0, -4.24407]`, `bboxMax: [4.24407, 1.46614, 4.24407]`) across original, optimized, and LOD models, ensuring zero displacement or scaling drift for all 4 sofa seating anchors (`sofa_seat_1`..`4`).
  - `src/engine/engine.js`:
    - Mobile DPR Capping: implemented `getTargetPixelRatio()` clamping pixel ratio to `Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2)` on mobile viewports (`window.innerWidth <= 768` or touch points > 0) to eliminate fill-rate exhaustion on 3x retina mobile screens. Integrated at startup and in `resize()`.
    - Bounded Texture LRU Cache: converted `loadedPhotoTextureCache` to a bounded LRU cache with `MAX_CACHED_PHOTO_TEXTURES = 25`, LRU recency promotion, active room occupancy checks (`isTextureInUse`), and automatic eviction.
    - Explicit Texture Disposal: overhauled `disposeMany` to release unreferenced textures via `tex.dispose()` and purge evicted textures from cache. Updated `loadRoom` room transitions to clean up previous room disposables after active room reassignment. Added complete texture disposal on engine `stop()` / `destroy()`.
  - Verification: `npm run models:verify` passed; `layout.test.mjs`, `seats.test.mjs`, `photo_frames.test.mjs`, and `room_photo_loading.test.mjs` passed (16/16); `npm run check` passed completely (39/39 tests + Vite production build).
- `M2`: `test(avatars,auth): align check_character_setup with 20 actions invariant and harden redeemInvite string guard`
  - `tests/check_character_setup.py`: asserted 20 actions size invariant, strictly verified `clap` is excluded/undefined, verified approved actions `wave`, `dance`, `nod` exist, sanitized probe URL to avoid query parameter path corruption, and enabled dual auth (context session cookies + join payload) with protocol v2.
  - `scripts/inviteStore.js`: added early strict string type guard `if (!inputCode || typeof inputCode !== 'string') return { success: false, error: 'Invalid invitation code.' };` before `loadStore(true)` to avoid premature disk I/O, prevent uncaught TypeErrors on `Object.create(null)`, and prevent loose array coercion.
  - `tests/boundary_stress.test.mjs`: updated tests 3 and 4 to verify hardened fail-closed behavior on `Object.create(null)` and array inputs without throwing exceptions or coercing types.
  - `docs/agent-work/CHANGES.md`: updated file ownership table and commit log for M1 and M2.
- `M1`: `fix(auth): harden session and invitation store against prototype pollution and prototype property bypass (AUTH-SEC-01)`
  - `scripts/inviteStore.js`: enforced strict `hasOwnProperty` lookups on `store.sessions` and `store.invites`, preventing prototype property bypass (`constructor`, `__proto__`, `prototype`).
  - `tests/server_protocol.test.mjs`: added Section 9 regression assertions for prototype property hardening across HTTP and WebSocket endpoints.
  - `tests/adversarial_security_m1.test.mjs`: created empirical verification suite testing prototype property bypass and prototype pollution immunity under live server conditions.
- `36ad813`: `fix(decor,auth): remove procedural benches from salons and eliminate plaintext passcode leakage (DECOR-01, DECOR-02, AUTH-01)`
- `52d9cc8`: `feat(decor,audit): apply mandatory room decor simplification and produce all 8 master audit deliverables`
- `18fe869`: `fix(auth): implement unified 5-state authentication state machine with single click dispatcher`
- `80e0e2e`: `fix(auth,photos): resolve stranded returning visitor (AUTH-01), active invite filtering (AUTH-03), and adaptive frame outline scaling (PHOTO-01)`
- `9df1a93`: `docs(audit): add final verified regression and audit report`
- `f122ae6`: `fix(avatars): align visual forward pivot, adapt photo frames to aspect ratio, enforce passcode gate presentation`
- `08a0f80`: `feat(avatars): implement walk-start/stop/step-back/turn state machine and mobile gesture drawer UX`
- `CHAT-UI-01`: `fix(ui): eliminate top-bar and gesture drawer overlap with dynamic translation and mobile auto-hide`
- `MOB-CAM-01`: `fix(mobile): optimize mobile portrait FOV (82 deg), increase follow distance, and prevent raycast floor snapping`
- `MOB-BTN-01`: `refactor(mobile): reorganize mobile action cluster into 2-column grid leaving 70% screen clear for look gesture`
- `CHAT-SYS-01`: `feat(chat): add Sanctuary Messages drawer, top-bar button, floating toast notification, and real-time multiplayer relay`
- `DATE-IST-01`: `feat(store): format invite creation and lastSeen timestamps in authentic Indian Standard Time (IST +05:30)`
- `M11`: `feat(tools): overhaul photo organizer with zero-renaming sequential placement, room targeting, EXIF rotation, and dry-run preview (PHOTO-TOOL-01)`
  - `tools/organize_photos.py`: implemented `--sequential` auto-placement across all 75 museum slots, room-targeted placement (`--room`), single-frame assignment (`--image`), smartphone EXIF orientation auto-correction, smart filename parsing, and informative visual summary bars.
- `M10`: `fix(engine,avatars): synchronize stair climbing & descending with controlled step-down damping and locomotion velocity filtering (STAIR-01)`
  - `src/engine/engine.js`: added step-down threshold detection to maintain grounded walking down stairs instead of gravity freefall thumping. Increased step-up damping to 26 for responsive foot placement without sinking into risers.
  - `src/avatars/avatarWorld.js`: filtered out vertical height changes from locomotion speed estimation and applied an exponential moving average (EMA) to prevent leg jitter.
- `M9`: `feat(gallery): implement Option 3 dual-portrait diptych layout, wall sconces, and 75 photo architecture (WALL-03)`
  - `src/game/room.js`: replaced single landscape partition frame with Suggestion A Dual-Portrait Diptych on both front and back faces in all 6 salons (12 photos/salon), flanked symmetrically by antique wall light sconces (`antique_wall_light.glb`).
  - `src/game/room/lobby.js`: expanded Grand Lobby South wall from 1 to 3 active photo frames (Masterpiece + West & East companions).
  - `scripts/check_photos.mjs` & `tests/room_photo_loading.test.mjs`: updated suite to validate and load all 75 museum photo textures.
- `M8`: `feat(net,avatars): enforce strict 2-player museum capacity and Maya/Ethan character exclusivity lock (CAP-01, LOCK-01)`
  - `server.js`: added `GET /api/occupancy` endpoint returning real-time peer count, max capacity (2), and claimed avatar IDs. Enforced WebSocket join rejection for 3rd visitor (`room-full`, 4002) and duplicate character selection (`character-taken`, 4005).
  - `src/avatars/characterSetup.js`: added `setClaimedCharacters` dynamically locking in-museum characters with `(In Museum)` badge and auto-switching selection to available character.
  - `src/main.js`: added occupancy polling on character select screen, dynamic "Museum Full (2/2 Visitors)" button lock, and `beforeunload`/`pagehide` socket cleanup.
  - `tests/adversarial_occupancy_character_lock.test.mjs`: added comprehensive adversarial automated test suite asserting capacity and exclusivity under concurrent and sequential joins.
- `OPT-3D-01`: `perf(assets): compress 3D artifacts (Monstera 3.66MB->182KB, Sofa 1.44MB->120KB, Chandelier 571KB->206KB)`
