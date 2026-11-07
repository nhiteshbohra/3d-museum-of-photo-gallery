# 3D Museum — Issue Register

**Repository:** `nhiteshbohra/3d-museum-of-photo-gallery`  
**Branch:** `fix/production-hardening`  
**Current HEAD SHA:** `36ad81302a50f190768b86e3d37a061d7a2f9d24`  
**Base Audit SHA:** `893e0c3011d8b32375ad337064116f8d64bad160`  
**Lead Coordinator:** Antigravity Engineering Lead  

---

## Active Issues Register

| ID | Sev | Title | Affected Files | Status | Owner | Acceptance Criteria |
|---|---|---|---|---|---|---|
| **AUTH-SEC-01** | **P0** | Prototype property lookup in `scripts/inviteStore.js` permits unauthenticated access | `scripts/inviteStore.js`, `tests/server_protocol.test.mjs` | VERIFIED | Senior Developer | Strict `hasOwnProperty` own property checks and prototype string guards in `validateSession`, `redeemInvite`, and `revokeInvite`. `museum_session=constructor` rejects with 401 on `/api/letters` and `/photos/*`, rejects with 4003 on WebSocket joins, and `revokeInvite('__proto__')` returns false without mutating `Object.prototype`. |
| **AUTH-NEW-01** | **P0** | Dual click handlers on verification button (`addEventListener` + `.onclick`) | `src/main.js` | VERIFIED | Senior Developer | Single unified UI state machine (`UNVERIFIED`, `VERIFYING`, `VERIFIED`, `STARTING`, `IN_SANCTUARY`) with a single click dispatcher; no redundant redemption requests or race conditions. |
| **AUTH-NEW-02** | **P0** | Hard-coded `'290512'` injected into readonly input in `checkAuthSession()` | `src/main.js` | VERIFIED | Senior Developer | Zero hard-coded codes injected into the DOM. Existing authenticated sessions display verified status text and clean placeholder without exposing passcodes in input value. |
| **AUTH-NEW-03** | **P1** | Entangled experience startup flow between button click and automatic session check | `src/main.js` | VERIFIED | Senior Developer | Explicit deterministic startup flow: verification unhides loading, compiles scene, and transitions smoothly into avatar selection / sanctuary entry. |
| **AUTH-NEW-04** | **P1** | Async `inviteRequired` client flag could permit loose display assumptions | `src/main.js`, `server.js` | VERIFIED | Senior Developer | Server remains strict authority. Client UI initializes fail-closed until config and auth status resolve. |
| **AUTH-01** | **P1** | Plaintext passcode leakage in window globals and multiplayer join payload | `src/main.js`, `src/avatars/multiplayer.js` | VERIFIED | Senior Developer | Removed `window.__museumPasscode`, wiped input value upon verification, removed passcode from WS join payload. Pure HttpOnly `museum_session` cookie auth. |
| **DECOR-01** | **P0** | Procedural benches generated in non-lobby salons (`bench-north`, `bench-south-*`, `bench-east`) | `src/game/room.js` | VERIFIED | Senior Developer | Removed all procedural bench generation from non-lobby rooms, obsolete variables, and obstacles; retained botanical planters. |
| **DECOR-02** | **P1** | Verification test coverage for runtime `buildRoom()` traversal and seat registry | `tests/layout.test.mjs` | VERIFIED | Senior Developer | Added runtime `buildRoom()` traversal assertion across all 6 non-lobby rooms (0 benches/sofas/chandeliers/bookcases) and verified 0 seats in non-lobby seat registries. |
| **AVATAR-01** | **P1** | Character GLB native forward axes and visual rig rotation verification | `src/avatars/avatarWorld.js`, `public/models/ready/characters/*.glb` | VERIFIED | Senior Researcher | Measure local head-front vector, root/hip orientation for both `man.glb` and `woman.glb`; confirmed in WebGL Playwright tests (`tests/check_avatar_controls.py`). |
| **AVATAR-02** | **P1** | Asynchronous animation clip transitions and fallback state machine | `src/avatars/avatarWorld.js` | VERIFIED | Senior Developer | Deterministic transitions when clips load progressively; smooth deceleration and heading preservation on idle verified. |
| **PHOTO-01** | **P1** | Aspect-adaptive frame, outline, backplate and pick surface synchrony | `src/game/room.js`, `src/misc/helper.js` | VERIFIED | Senior Developer | Aspect-ratio fitting (portrait, landscape, panorama, square) rescales backing plate, slot outline, and pick surface proportionally across all 7 galleries. |
| **MOB-P0-01** | **P0** | Mobile: 51.9 MB curved sofa model asset pressure | `public/models/ready/furniture/3d_pbr_curved_sofa.glb`, `public/models/ready/furniture/lod/3d_pbr_curved_sofa_lod.glb` | VERIFIED | Senior Developer | Compressed primary model to 6.13 MB (88.21% reduction) with Draco + WebP 2048px; generated distance LOD model at 1.40 MB (97.32% reduction) with Draco + WebP 1024px. Bounding box `[-4.24407..4.24407]` and 4 seating anchors preserved byte-accurately (0.000000m drift). |
| **MOB-P0-02** | **P0** | Uncapped DPR (up to 2.0) on high-density mobile screens causes GPU fillrate bottlenecks | `src/engine/engine.js` | VERIFIED | Senior Developer | Implemented dynamic `getTargetPixelRatio()` clamping DPR to 1.5 max on mobile/touch viewports (`window.innerWidth <= 768` or `maxTouchPoints > 0`) at startup and across window resize events. |
| **MOB-P0-03** | **P0** | High-resolution avatar texture PNGs (~18.7 MB) loaded synchronously | `src/avatars/avatarWorld.js`, `public/models/ready/characters/textures/**` | VERIFIED | Senior Developer | Converted 8 avatar PNGs to WebP (17.85 MB -> 2.40 MB, 86.6% size reduction) with PNG fallback; disposed overwritten GLB base textures and intermediate `color`/`mask` source textures after canvas extraction; reused single `workImage` buffer. |
| **MOB-P1-04** | **P1** | Unbounded `loadedPhotoTextureCache` Map in `engine.js` | `src/engine/engine.js` | VERIFIED | Senior Developer | Implemented bounded 35-texture LRU cache with multi-tier in-flight texture protection, active room reference retention (`isTextureInUse`), and leak-free Three.js `.dispose()` across 100 room transitions. |
| **MOB-P1-05** | **P1** | Up to 3 fully resident rooms cloned in memory without progressive disposal | `src/engine/engine.js`, `src/game/room/placedItems.js` | VERIFIED | Senior Developer | Adaptive room LRU cap (`MAX_CACHED_ROOMS = 1` on mobile, `3` on desktop), deep recursive geometry/material disposal on room eviction, and `ctx.disposed` guard in `spawnGlbItemAsync` preventing dangling in-flight GLB mounts. |
| **MOB-P1-06** | **P1** | Multiple requestAnimationFrame loops and per-frame nametag DOM projections | `src/engine/engine.js`, `src/avatars/multiplayer.js`, `src/avatars/avatarWorld.js` | VERIFIED | Senior Developer | Consolidated multiplayer RAF into `engineApi.onFrame`, throttled nametag DOM `.style` updates to integer pixel changes, guarded pre-play idle drift with `!inSanctuary`, skipped rendering when `document.hidden`, and throttled cursor raycast to 10 Hz. |
| **MOB-P1-07** | **P1** | Touch controls and responsive drawer layout on small viewports (320-390px) | `src/style.css`, `src/main.js` | VERIFIED | Senior Developer | Responsive touch controls, drawer buttons >= 44px, no overlapping joystick or blocked interactions. |
| **UI-OVERLAP-01** | **P1** | Top bar buttons overlap open Gestures drawer header and search box | `src/style.css`, `src/main.js` | VERIFIED | Senior Developer | Shift `#top-bar` left dynamically on desktop when drawer is open (`transform: translateX(calc(-1 * min(390px, 92vw) - 16px))`); hide top-bar completely on mobile when drawer is open. |
| **MOB-CAM-01** | **P1** | Portrait mobile camera view claustrophobic and snapping to player back | `src/engine/engine.js` | VERIFIED | Senior Developer | Widened portrait FOV from 70° to 82° when `aspect < 1.0`, increased portrait follow distance to 3.6m, and excluded ground planes/carpets from collision raycast snapping. |
| **MOB-BTN-01** | **P1** | Mobile action buttons stacked in 372px vertical tower blocking touch look zone | `src/style.css`, `src/main.js` | VERIFIED | Senior Developer | Compact 2-column grid (`repeat(2, 46px)`) in bottom-right corner, freeing >70% of screen for look touch zone. |
| **CHAT-SYS-01** | **P1** | Sanctuary Messages UI missing; chat locked behind pointer lock | `src/main.js`, `src/style.css`, `src/avatars/multiplayer.js`, `server.js` | VERIFIED | Senior Developer | Added `#btn-chat-toggle` in top-bar and mobile `💬` button; created `#hud-chat-drawer` with full scrollable log; added floating toast notification banner; removed pointer-lock restriction; relayed sender name over WebSocket. |
| **BUILD-CSS-01** | **P0** | Production build blocker: orphaned declarations and unexpected brace in `src/style.css:908` | `src/style.css` | VERIFIED | Senior Developer (worker_m4_2) | Clean `.mobile-btn` and `.mobile-btn:active` rules; `npx vite build` succeeds without PostCSS error. |
| **TEST-FLAKE-01** | **P1** | Flaky DOM polling in `tests/check_character_setup.py:44,79` throwing TypeError on unmounted element | `tests/check_character_setup.py` | VERIFIED | Senior Developer (worker_m4_2) | Guard DOM queries with `Boolean(document.querySelector(...) && !document.querySelector(...).hidden)`; headless browser test passes 100%. |
| **IST-TIME-01** | **P2** | Timestamps in `invites.json` not in Indian Standard Time (IST) | `scripts/inviteStore.js` | VERIFIED | Senior Developer | Format `createdAt` and `lastSeen` in ISO 8601 with explicit `+05:30` offset (IST). |
| **MOB-P2-08** | **P2** | Continuous 20 Hz WebSocket position packets even when idle | `src/avatars/multiplayer.js` | VERIFIED | Senior Developer | Adaptive delta-based broadcast: 20 Hz (`50ms`) when moving/rotating, 1 immediate settling packet on stop, and 1 Hz (`1000ms`) keep-alive heartbeat when stationary (95% idle packet reduction). |
| **MOB-P2-09** | **P2** | Eager monolithic client bundle parse before authentication | `src/main.js`, `vite.config.js` | VERIFIED | Senior Developer | Configured Rollup `manualChunks` (`vendor-three`, `engine-3d`, `avatars-multiplayer`) and dynamic `import()` inside `startMuseumExperience()`, shrinking pre-auth entry chunk from 994.34 kB to 56.29 kB (94.3% reduction). |
| **DECOR-03** | **P1** | Partition antique wall sconces invisible to `spawnGlbItem` mock in layout tests | `src/game/room.js`, `tests/layout.test.mjs`, `tests/adversarial_salon_lights_m10.test.mjs` | VERIFIED | Senior Developer | Tagged salon partition sconces with semantic IDs (`sconce_${roomKey}_front_${idx}`, `sconce_${roomKey}_back_${idx}`) and `contact: 'wall'`; upgraded `tests/layout.test.mjs` mock to attach `THREE.Group` nodes and assert 4 wall sconces + 0 floor obstacles per salon. |
| **PHOTO-DOC-01** | **P1** | Outdated 61-photo references in verification scripts and documentation | `scripts/check_photos.mjs`, `docs/agent-work/TEST_MATRIX.md`, `public/photos/README.md` | VERIFIED | Senior Developer | Synchronized all verification messages and test matrix records to the 75-photo architecture (Lobby: 3, 6 Salons: 12 each). |
| **LOCK-RACE-01** | **P1** | Concurrent character selection race condition and UI recovery on `4005 character-taken` | `server.js`, `src/net/wsClient.js`, `src/avatars/multiplayer.js`, `src/main.js`, `tests/two_client_test.mjs` | VERIFIED | Senior Developer | Removed `sessKey` bypass on active `sessionPeers` in `server.js` (preventing multi-tab duplicate character claims while preserving `graceSessions` reconnects); added `onClaimRejected` client recovery returning rejected visitor to `#avatar-select` with toast notification and refreshed `/api/occupancy`. |

---

## Detailed Defect Records

### AUTH-SEC-01: Prototype Property Lookup in `scripts/inviteStore.js` Permits Unauthenticated Access
- **ID:** `AUTH-SEC-01`
- **Severity:** P0 (Critical Vulnerability)
- **Status:** VERIFIED
- **Owner:** Senior Developer (teamwork_worker_m1_1)
- **Affected Files:**
  - `scripts/inviteStore.js`
  - `tests/server_protocol.test.mjs`
- **Root Cause:**
  `store.sessions` and `store.invites` in `scripts/inviteStore.js` are plain JavaScript objects parsed from JSON. Accessing properties via bracket notation (`store.sessions[token]`) traverses the prototype chain. If `token` is `'constructor'`, `'toString'`, `'valueOf'`, or `'__proto__'`, `store.sessions[token]` resolved to a built-in object/function from `Object.prototype`. In `validateSession()`, this truthy prototype object passed the `!session` check, and because `session.code` was undefined, `store.invites[undefined]` evaluated to undefined without triggering expiry checks, causing `validateSession('constructor')` to return `[Function: Object]`.
  In `server.js`, this truthy session allowed unauthenticated attackers supplying `Cookie: museum_session=constructor` to bypass authentication on `/api/letters`, download private photos via `/photos/*`, and join WebSocket multiplayer rooms without credentials.
  Furthermore, passing `'__proto__'` to `revokeInvite(code)` resolved `store.invites['__proto__']` to `Object.prototype`, and assigning `inv.revoked = true` polluted `Object.prototype.revoked = true` globally across the Node.js runtime, triggering denial of service for all users.
- **Fix Implemented:**
  1. In `scripts/inviteStore.js`:
     - `validateSession(token)`: Validates that `token` is a valid string, guards against prototype property names (`__proto__`, `constructor`, `prototype`), enforces that `store.sessions` has own property `token` (`Object.prototype.hasOwnProperty.call(store.sessions, token)`), verifies that `session` is an object with `session.token === token`, and verifies that `session.code` is an own property of `store.invites`.
     - `redeemInvite(inputCode)`: Rejects prototype property strings (`__proto__`, `constructor`, `prototype`) and checks `store.invites` with `hasOwnProperty`.
     - `revokeInvite(code)`: Guards against prototype property strings (`__proto__`, `constructor`, `prototype`), checks `Object.prototype.hasOwnProperty.call(store.invites, code)`, and prevents any mutation of `Object.prototype`.
     - `createInvite({ ... })`: Rejects prototype property codes.
  2. In `tests/server_protocol.test.mjs`:
     - Added comprehensive regression suite in Section 9 verifying HTTP 401 on `/api/letters` and `/photos/*` with `museum_session=constructor` and other prototype keys.
     - Verified WebSocket join with `museum_session=constructor` closes with code 4003 (unauthorized).
     - Verified `revokeInvite('__proto__')` returns `false` and does not pollute `Object.prototype.revoked`.
     - Verified `redeemInvite` and `validateSession` direct prototype rejections.
- **Acceptance Criteria & Verification:**
  - `node --test tests/server_protocol.test.mjs` passes all tests.
  - Zero prototype leakage or bypass across HTTP, WebSocket, and invite store layers.

### MOB-P0-01: Curved Sofa Asset Download Pressure
- **ID:** `MOB-P0-01`
- **Severity:** P0 (Mobile Performance / Asset Delivery)
- **Status:** VERIFIED
- **Owner:** Senior Developer (`worker_m3_1`, `worker_m3_2`, `worker_m4_1`)
- **Affected Files:**
  - `public/models/ready/furniture/3d_pbr_curved_sofa.glb`
  - `public/models/ready/furniture/lod/3d_pbr_curved_sofa_lod.glb`
- **Root Cause:**
  The uncompressed curved sofa model was 51.98 MB (51,976,104 bytes), containing 15 uncompressed PNG textures and heavy mesh geometry. Loading this asset caused severe bandwidth overhead and memory pressure on mobile devices.
- **Fix Implemented:**
  - Compressed primary model `3d_pbr_curved_sofa.glb` to 6.13 MB (6,126,744 bytes, 88.21% size reduction) using Draco geometry compression and WebP 2048px textures via `@gltf-transform/cli`.
  - Generated distance LOD model `3d_pbr_curved_sofa_lod.glb` at 1.40 MB (1,395,204 bytes, 97.32% size reduction) with Draco compression and WebP 1024px textures.
  - Byte-accurate bounding box preservation: `[-4.24407, 0, -4.24407]` to `[4.24407, 1.46614, 4.24407]` matches original geometry to 15 decimal places (delta 0.000000m), ensuring zero seating position drift across all 4 sofa anchors (`sofa_seat_1..4`).
- **Acceptance Criteria & Verification:**
  - `tests/adversarial_mobile_assets_m3.test.mjs` passes 6/6 tests.
  - `npm run models:verify` passes (21 model references checked, all active resolve).
  - Zero anchor drift verified in `tests/seats.test.mjs`.

### MOB-P0-02: Mobile DPR Bottleneck & High-Density Fill-Rate
- **ID:** `MOB-P0-02`
- **Severity:** P0 (GPU Fill-Rate / Mobile Stability)
- **Status:** VERIFIED
- **Owner:** Senior Developer (`worker_m3_1`, `worker_m3_2`, `worker_m4_1`)
- **Affected Files:**
  - `src/engine/engine.js`
- **Root Cause:**
  On high-density mobile screens (DPR 3.0+), rendering at native resolution resulted in 9x fragment invocations, causing fill-rate exhaustion, thermal throttling, and WebGL context loss.
- **Fix Implemented:**
  - Implemented `getTargetPixelRatio()` in `src/engine/engine.js` clamping pixel ratio to 1.5 max on mobile/touch viewports (`window.innerWidth <= 768` or `navigator.maxTouchPoints > 0` or `'ontouchstart' in window`).
  - Added dynamic DPR recalculation in `resize()` and exported `getTargetPixelRatio` on the engine API.
- **Acceptance Criteria & Verification:**
  - `tests/adversarial_mobile_assets_m3.test.mjs` verifies 1.5 DPR clamping across mobile viewports and resize transitions (6/6 pass).

### MOB-P1-04: Photo Texture Cache Lifecycle & Disposal Race Condition
- **ID:** `MOB-P1-04`
- **Severity:** P1 (Memory Leak / Active Texture Corruption)
- **Status:** VERIFIED
- **Owner:** Senior Developer (`worker_m3_1`, `worker_m3_2`, `worker_m4_1`)
- **Affected Files:**
  - `src/engine/engine.js`
  - `tests/photo_cache_stress.mjs`
  - `tests/photo_cache_adversarial_stress.mjs`
- **Root Cause:**
  `loadedPhotoTextureCache` was originally unbounded. When initially bounded to 25 items, calling `evictExcessPhotoTextures()` immediately upon texture download caused in-flight batch textures of incoming rooms to be judged as unused before `job.onLoad` mounted them to room meshes, prematurely calling `.dispose()` on active art (60 premature disposal events). Furthermore, a 25-texture cap conflicted with `MAX_CACHED_ROOMS = 3` (30 room photos).
- **Fix Implemented:**
  - Aligned cache limit to `MAX_CACHED_PHOTO_TEXTURES = 35` to comfortably accommodate 3 cached rooms (30 photos) + margin.
  - Introduced multi-tier in-flight tracking (`inFlightTextures` Set, `inFlightPromises` Map, `textureUrlMap` WeakMap).
  - Enhanced `isTextureInUse(tex)` to evaluate active deferred texture loads and group mesh materials across both `currentRoom` and `roomCache`.
  - Scoped eviction to room eviction and uncached transitions.
  - Guaranteed 100% disposal of cached textures on `engine.stop()`.
- **Acceptance Criteria & Verification:**
  - `node tests/photo_cache_stress.mjs`: 0 premature disposals across 50 room transitions (405 evicted textures disposed, 0 alive post-stop).
  - `node tests/photo_cache_adversarial_stress.mjs`: 0 premature disposals and 0 leaks across 100 room transitions, rapid toggles, and duplicate loads (5/5 scenarios pass).

### BUILD-CSS-01: Production Build Blocker in `src/style.css:908`
- **ID:** `BUILD-CSS-01`
- **Severity:** P0 (Production Build Blocker)
- **Status:** VERIFIED
- **Owner:** Senior Developer (`worker_m4_2`)
- **Affected Files:**
  - `src/style.css`
- **Root Cause:**
  In `src/style.css` around lines 900-915, orphaned CSS declarations (`cursor: pointer; ... transition: ...`) and a duplicate closing brace caused PostCSS parser to fail during `vite build` (`[postcss] Unexpected }`), blocking client bundle compilation.
- **Fix Implemented:**
  Remediated `.mobile-btn` and `.mobile-btn:active` rules: placed button properties within the `.mobile-btn` declaration block and cleaned `:active` state styling with correct brace matching.
- **Acceptance Criteria & Verification:**
  - `npx vite build` completes in 4.35s with zero PostCSS errors.
  - `npm run check` completes 45/45 tests and finishes production Vite bundle compilation without errors.

### TEST-FLAKE-01: Flaky DOM Polling in `tests/check_character_setup.py:44,79`
- **ID:** `TEST-FLAKE-01`
- **Severity:** P1 (Test Reliability / Race Condition)
- **Status:** VERIFIED
- **Owner:** Senior Developer (`worker_m4_2`)
- **Affected Files:**
  - `tests/check_character_setup.py`
- **Root Cause:**
  `tests/check_character_setup.py` used `!document.querySelector('#avatar-select').hidden`. If queried before `#avatar-select` is attached to the DOM by `src/main.js`, `querySelector` returns `null`, throwing an unhandled `TypeError: Cannot read properties of null (reading 'hidden')` which rejects Playwright's `wait_for_function`.
- **Fix Implemented:**
  Hardened lines 41, 44, and 79 with explicit null-safe truthiness check: `Boolean(document.querySelector('#avatar-select') && !document.querySelector('#avatar-select').hidden)`.
- **Acceptance Criteria & Verification:**
  - `python tests/check_character_setup.py http://127.0.0.1:8080?code=290512` completes cleanly with exit code 0 and empty error log in `docs/reports/character-setup/checks.json`.

### DECOR-03 & PHOTO-DOC-01: Salon Partition Wall Sconces & 75-Photo Synchronization (M10)
- **ID:** `DECOR-03`, `PHOTO-DOC-01`
- **Severity:** P1
- **Status:** VERIFIED
- **Owner:** Senior Developer
- **Affected Files:**
  - `src/game/room.js`
  - `tests/layout.test.mjs`
  - `tests/adversarial_salon_lights_m10.test.mjs`
  - `scripts/check_photos.mjs`
  - `docs/agent-work/TEST_MATRIX.md`
  - `public/photos/README.md`
- **Fix Implemented:**
  - Tagged partition wall sconces in `src/game/room.js` with semantic IDs (`sconce_${roomKey}_front_${idx}`, `sconce_${roomKey}_back_${idx}`) and `contact: 'wall'` so they never generate floor obstacles.
  - Upgraded `spawnGlbItem` mock in `tests/layout.test.mjs` to mount `THREE.Group` instances with `userData` onto the room group and verified 4 wall sconces per non-lobby salon.
  - Updated `scripts/check_photos.mjs`, `docs/agent-work/TEST_MATRIX.md`, and `public/photos/README.md` to consistently report all 75 photo slots.

### LOCK-RACE-01: Two-Player Character Locking Concurrency & UI Recovery (M11)
- **ID:** `LOCK-RACE-01`
- **Severity:** P1
- **Status:** VERIFIED
- **Owner:** Senior Developer
- **Affected Files:**
  - `server.js`
  - `src/net/wsClient.js`
  - `src/avatars/multiplayer.js`
  - `src/main.js`
  - `tests/two_client_test.mjs`
  - `tests/adversarial_m11_race_grace.test.mjs`
  - `tests/adversarial_reconnect_m11.test.mjs`
- **Fix Implemented:**
  - Removed the `sessKey` bypass on active `sessionPeers` in `server.js` so two simultaneous tabs sharing a session cookie cannot both claim the same character, while preserving `sessKey` matching in `graceSessions` for 30-second disconnect recovery.
  - Added terminal error interception for `character-taken` (`4005`) in `src/net/wsClient.js` and detached event handlers on `disconnectNet()` so intentional disconnects never trigger phantom reconnect loops.
  - Wired `onClaimRejected` in `src/avatars/multiplayer.js` and `handleCharacterClaimRejected()` in `src/main.js` to return a rejected visitor to `#avatar-select` with a toast notification and immediate `/api/occupancy` refresh.

### MOB-P0-03, MOB-P1-05, MOB-P1-06, MOB-P2-08, MOB-P2-09: Mobile Optimization Suite (M12)
- **ID:** `MOB-P0-03`, `MOB-P1-05`, `MOB-P1-06`, `MOB-P2-08`, `MOB-P2-09`
- **Severity:** P0 / P1 / P2
- **Status:** VERIFIED
- **Owner:** Senior Developer
- **Affected Files:**
  - `public/models/ready/characters/textures/man/*.webp` & `woman/*.webp`
  - `src/avatars/avatarWorld.js`
  - `src/engine/engine.js`
  - `src/game/room/placedItems.js`
  - `src/avatars/multiplayer.js`
  - `vite.config.js`
  - `src/main.js`
- **Fix Implemented:**
  - **MOB-P0-03 (Avatar Textures):** Converted 8 character PNGs (`17.85 MB`) to high-quality WebP (`2.40 MB`, **86.6% transfer reduction**) with automatic `.png` fallback. Disposed overwritten GLB base textures and immediately disposed intermediate `color` and `mask` textures after canvas pixel extraction, reclaiming ~26.6 MB of GPU VRAM per avatar and reusing a single `workImage` buffer.
  - **MOB-P1-05 (Room Memory Budgeting):** Clamped `MAX_CACHED_ROOMS = 1` on mobile viewports (`3` on desktop), added recursive geometry/material `.dispose()` traversal in `evictExcessRooms()`, and added a `ctx?.disposed || group?.userData?.disposed` guard in `spawnGlbItemAsync()` to prevent late-resolving GLBs from attaching to evicted rooms.
  - **MOB-P1-06 (Frame-Loop Consolidation):** Exposed `engineApi.onFrame(fn)` in `src/engine/engine.js` and consolidated the secondary `requestAnimationFrame` loop from `src/avatars/multiplayer.js`. Added `document.hidden` pause, removed redundant per-frame `resize()` calls, guarded pre-play camera drift with `!inSanctuary`, throttled desktop cursor raycasts to 10 Hz, and throttled nametag DOM `.style` mutations in `src/avatars/avatarWorld.js` to fire only when integer coordinates change.
  - **MOB-P2-08 (Adaptive Idle Network Traffic):** Replaced continuous 20 Hz state broadcasts with delta-based transmission in `src/avatars/multiplayer.js` (`50ms` active movement/rotation, 1 immediate settling packet on stop, `1000ms` idle heartbeat — **95% reduction in idle WebSocket packets**).
  - **MOB-P2-09 (Pre-Auth Code Splitting):** Configured Rollup `manualChunks` (`vendor-three`, `engine-3d`, `avatars-multiplayer`) in `vite.config.js` and replaced static top-level 3D imports in `src/main.js` with post-authentication `await Promise.all([import('three'), import('./engine/engine.js'), import('./avatars/multiplayer.js')])`, shrinking the initial entry bundle from **994.34 kB to 56.29 kB** (**94.3% reduction**).
