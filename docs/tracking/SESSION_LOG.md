## Session 2026-11-05 — Step 2: Client Multiplayer Correctness & Lifecycle (P1)

1. **MP-01 (Partner Panel on Room State)**:
   - In `src/avatars/multiplayer.js`, initial `room_state` now identifies the existing peer and calls `setPartner(peer)` immediately so the second user to arrive sees the partner panel and location right away.
2. **MP-02 (Selective Leaver Seat Release)**:
   - Removed destructive `freeLocalSeat()` in `peer_left`. When a remote peer leaves, only seats occupied by `msg.peerId` are freed, preventing the remaining player from being stood up.
3. **MP-03 (Appearance Preservation)**:
   - Ensured `peer_joined` captures the full `appearance` object (skin, hair, top, trousers) and updated `upsertRemote` in `src/avatars/avatarWorld.js` to re-apply appearance when updating an existing peer.
4. **MP-04 (Unified Emotes & Hint)**:
   - Created single source of truth in `src/avatars/emotes.js` with keys 1-4 (Wave, Dance, Clap, Nod).
   - Corrected HUD hint text to `"Press 1 to wave"` (reserving `E` strictly for sitting).
5. **MP-05 (Pointer-Locked Chat & Self-Bubble Projection)**:
   - Enter only triggers chat when the user is inside the sanctuary with pointer lock engaged.
   - Project local player's chat bubble above their own head via `showChatBubble('local', val, pos)`.
   - Updated frame loop to reposition all active chat bubbles every frame.
6. **MP-06 (Connection Lifecycle & Unsubscribe Cleanup)**:
   - Stored and executed unsubscribers for `onNet` events on `stop()`.
   - Cleared the 2s ping interval on `stop()`.
   - Updated `wsClient.js` to avoid queuing stale movement packets while offline and halt reconnection loops on terminal errors (`room-full`, `bad-code`, `update-required`).
7. **Verification**:
   - `npm run build` compiled 34 modules in 3.38s with zero errors.
   - `tests/server_protocol.test.mjs` passed 100% of scenarios.

---

## Session 2026-11-05 — Step 1: Server Hardening & Protocol v2 (P0)

1. **Created Branch**: `fix/production-hardening`.
2. **SEC-01 (Path Traversal & Static Allowlist)**:
   - Configured strict root allowlist (`dist/` production bundle prioritized, `public/` asset fallback).
   - Guarded against path traversal: requests for `server.js`, `package.json`, `src/`, `docs/`, dotfiles, or parent directories (`/../`) return 404.
3. **SEC-02 (Crash-Proofing)**:
   - Guarded `decodeURIComponent` against malformed percent encodings (`GET /%` returns 404 without crashing).
   - Implemented strict regex `Range` header parsing with 416 responses for malformed ranges.
   - Added `error` listeners to file read streams and top-level `unhandledRejection`/`uncaughtException` handlers.
4. **NET-01 (Unified Session Room & Cap)**:
   - Replaced client-chosen session rooms with a single authoritative session room (`our-home`) capped at exactly 2 human players.
   - Decoupled session membership from gameplay locations (`lobby`, `fireside`, etc.).
5. **SEC-03 & SEC-04 (WebSocket Hardening & Passcode Gate)**:
   - Enforced 2048-byte payload limit, origin checking, and 30s ping/pong heartbeat to clean dead connections and free slots.
   - Implemented timing-safe passcode verification (`crypto.timingSafeEqual`) against `MUSEUM_PASSCODE` with IP rate limiting.
6. **SEAT-03 (Server Seat Reservation Authority)**:
   - Server maintains atomic seat lock `Map<seatId, peerId>`. Rejects simultaneous race claims with `sit_denied`, confirms to sender with `sit_ok`, and broadcasts seat releases on stand, room change, or disconnect.
7. **Verification**:
   - Automated test suite [`tests/server_protocol.test.mjs`](file:///f:/projects/3dmuseum/tests/server_protocol.test.mjs) passed 100% of cases.
   - `npm run build` compiled 33 modules in 3.57s with zero errors.

---

## Session 2026-11-05 — .gitignore & Repository Tracking Audit

1. **User .gitignore Customization**:
   - Added `docs/`, `tests/`, and `tools/` to `.gitignore` per explicit user instruction to keep documentation, internal tests, and tools local to the machine.
   - Preserved ignore rules for environment secrets, raw 3D model downloads, test artifact outputs, and OS/IDE clutter.

2. **Verification**:
   - Production build `npm run build` compiled 33 modules cleanly in 3.78s with zero errors.
   - `git status` confirmed `docs/`, `tests/`, and `tools/` are excluded from version control, leaving only runtime application code and assets visible.

---

## Session 2026-11-05 — Live 3D Multiplayer, Third-Person Avatar Camera & Rig Repair

1. **Third-Person Avatar Camera & Local Rendering**:
   - Integrated third-person follow camera anchored behind the active local avatar in `src/engine/engine.js`.
   - Wired WASD movement, mouse look, sprinting, and jumping to drive local avatar animations and foot position.
   - Preserved engine's existing physics and collision resolver.

2. **V3 Pack Calibration & Rig Repair**:
   - Repaired meter-mesh vs centimeter-rig scaling in `src/avatars/characterSetup.js` before height normalization.
   - Partial clips inherit missing joint rotations from the base walk pose, preventing fallback to A-pose/T-pose during standing or emotes.
   - Skeletons and materials are cloned per character instance, allowing two players to choose the same character (e.g. Maya or Ethan) with complete independence.

3. **Multiplayer WebSocket Relay & Client Orchestrator**:
   - `server.js` WebSocket relay handles hard 2-player cap, position clamping ($\pm 100$), rate limiting (30 msg/s), and server-assigned authentic `peerId`.
   - `src/avatars/multiplayer.js` coordinates 20 Hz state synchronization, emote broadcasting (1 Wave, 2 Dance, 3 Clap, 4 Point), and "Go there" salon transition notifications.
   - `src/avatars/chat.js` renders DOM screen-projected chat bubbles above character heads with 120-character cap and 5-second fade.
   - `src/avatars/seatRegistry.js` resolves seat offsets to world space with mutual occupancy locking.

4. **Verification**:
   - Production build: `npm run build` compiled 30 modules cleanly in 3.37s with zero errors.
   - Automated relay tests passed: `tests/multiplayer_quick_check.mjs` (distinct-ids, peer-discovery, 2-player limit) and `tests/multiplayer_validation_check.mjs` (bounds clamping, unknown-type rejection, flood limiting, spoof prevention).
   - Automated avatar controls check passed: `python tests/check_avatar_controls.py http://localhost:8095` (local locomotion, skeleton heights, both roster characters, peer leave, zero console errors).

---

## Session 2026-11-05 — Step 1–4 GLB Model Normalization, Layout Placement & Verification Pipeline

1. **Model Normalization & Optimization**:
   - Converted and optimized 12 3D models into `public/models/ready/` across `furniture/`, `lighting/`, and `plants/`.
   - Compressed models with Draco geometry compression and WebP textures; all meshes strictly under 60k triangles.
   - Generated `models.manifest.json` with dimensions, triangle counts, licenses, and authors.
   - Created `ATTRIBUTIONS.md` for CC-BY-4.0 models and `contact-sheet.html` for interactive 3D turntable inspection.

2. **GLB Model Loading Pipeline (`placedItems.js`)**:
   - Extended `src/game/room/placedItems.js` to load GLB items from `src/data/museumLayout.json`.
   - Implemented shared `gltfCache` to avoid duplicate network fetches.
   - Per-spawn deep cloning ensures resources are tracked in `disposables` and cleaned up upon room eviction.
   - Registered floor items as collision obstacles; ceiling and wall fixtures bypass floor collision.

3. **Spatial Placement & Automated Alignment**:
   - Placed 12 models in Grand Lobby and themed salons using exact room boundaries and door clearances.
   - Scaled each model to match recorded `realHeightMetres`.
   - Generated `docs/reports/ALIGNMENT_REPORT.md` and `docs/reports/COMPLETION_CHECKLIST.md` verifying zero overlaps, floor contact ($\le 1\text{cm}$ gap), wall flushness, door clearance ($\ge 2.0\text{m}$), and artwork clearance ($\ge 1.5\text{m}$).

---

## Session 2026-11-04 — Triangle Collision Footprints & Entrance Readiness Progress Bar

1. **Triangle-Based Collision Footprints**:
   - Replaced whole-model bounding boxes for imported floor models with static 2D footprints sampled on a 15 cm grid.
   - Excluded geometry within 8 cm of base and above 1.7 m height, preserving walkable gaps around curved sofa cushions and tables.
   - Merged occupied cells into simplified AABB rectangles for fast collision checks.

2. **Entrance Readiness Gating**:
   - Gated "ENTER SANCTUARY" button on `engine.ready` (geometry creation, model spawns, deferred textures, and initial shader compilation).
   - Implemented native 0–100% progress bar in `src/main.js` reflecting actual asset completion.
   - Enter button remains hidden until room and selected character are ready.

---

## Session 2026-11-04 — Curved Sofa Resizing & Lobby Fixture Removal

1. **Lobby Fixture Removal**:
   - Traced user-marked screenshots and removed creation calls for central procedural chandelier and lower central downlights at $x=0, z=\pm\text{length}\times 0.25$.
   - Preserved 6 upper promenade platform downlights.

2. **Model Placements & Resizing**:
   - Adopted `lighting_chandelier_osgona.glb` at lobby center with top elevation at 5.6 m ceiling.
   - Placed `plants_monstera.glb` across salons at 1.5 m height with base flush to floor/platform.
   - Enlarged curved sofa uniformly by 29% (`targetHeight: 1.1m`), centered at $(0, 0, 0)$.
   - Verified via `tests/check_lobby_fixtures.py` and visual screenshot review.

---

## Session 2026-11-02 — Gate Hand-Icon Fix, Door Plaque Dynamic Layout & Artwork Sizing v3

1. **Gate Hand-Icon Raycast Fix**:
   - Resolved issue where North wall gates (`seealso-4`, `seealso-5`) did not display interactive hand cursor.
   - Root cause: unassigned destination titles prevented `doorHasTriggerTarget()` from returning true.
   - Fixed `src/game/room.js` by using `assignedDestinations` to ensure all 6 doors have valid salon targets.

2. **Door Panel Trim Overlap & Plaque Z-Offset**:
   - In `src/game/room/doors.js`, dynamically calculated `upperTrim` position after `plaqueCenterY` to prevent z-fighting with upper door panel.
   - Adjusted plaque Z-depth offsets to 0.020, 0.026, and 0.028 m.

3. **Artwork Sizing Schema v3**:
   - Updated East Wall artwork dimensions in `src/config/artworkSizes.js`: width 1.50 m, gap 0.45 m, y 2.30 m.
   - Bumped storage key to `ourmuseum:artworkSizes:v3`.
   - Verified via Playwright automated tests and `npm run build`.

---

## Session 2026-10-31 — Dead Code Purge, Particle Cleanup & Door Lag Optimization

1. **Zero Airspace Particles**:
   - Removed all `THREE.Points` ambient dust motes and floating particles; airspace kept crystal clear.

2. **Door Plaque Canvas Cache**:
   - Implemented `doorPlaqueTextureCache` in `src/game/room/doors.js` caching 2D plaque textures by title.
   - Pre-warmed WebGL shaders on room transitions via `renderer.compile()`.
   - Transition lag reduced from ~500 ms to <50 ms.

---

## Session 2026-10-30 — Comprehensive Museum Artefacts & Realistic Decoration System

1. **Realistic Plush Furniture Geometry**:
   - Replaced flat primitive box cushions with procedural curved domed cushions (`createPlushCushionGeometry` in [`src/game/room/decorations.js`](file:///f:/projects/3dmuseum/src/game/room/decorations.js)).
   - Modeled pillow crowning, outward side swelling, softened corners, deep diamond tufting button indentations, and perimeter French welt piping cords.
   - Upgraded all gallery benches in [`src/game/room/lobby.js`](file:///f:/projects/3dmuseum/src/game/room/lobby.js) to luxury banquettes with beveled walnut plinths, brass inset trim, and turned brass legs.
   - Upgraded lobby center armchairs into French curved tub armchairs with fluted channeled barrel backrests, rolled arms with brass nailhead studs, and champagne lumbar cushions.

2. **Full Implementation of Museum Enhancement Catalogue (L1–L12, P1–P7, F1–F8, S1–S8, A1–A8, I1–I7, W1–W4)**:
   - **Grand Lobby Rotunda**: Central 2-tier grand crystal chandelier, 2.8m inlaid polished 8-point star marble floor medallion, directional brass floor arrows pointing to East & West wings, "OUR MUSEUM • MAYA & ETHAN" entrance arch inscription, and overhead picture lamp.
   - **Fireside Winter Memories**: Classical carved limestone fireplace hearth positioned beneath the north masterpiece painting, glowing ember bed, cast-iron grate, birch logs, antique mantle clock, candle clusters, Persian fireside rug, angled leather reading armchairs, and Greek marble urns.
   - **Music & Classical Melodies**: Vintage lathe-turned brass horn gramophone with spinning vinyl record, glowing "Our Song ♫" neon sign, romantic ceiling festoon fairy string lights, classical flower vases, and hourglass.
   - **The Library & Reading Nook**: Floor-to-ceiling walnut bookcases with hundreds of books, mahogany writing desk with quill/ink/parchment, spinning globe, emerald velvet reading armchair, gilded baroque wall mirror, and wainscoting paneling.
   - **Masterpiece Paris Romance**: 2-tier sparkling crystal chandelier with ceiling rosette, classical marble bust & abstract bronze sculpture on tall marble pedestals, crimson velvet stanchion ropes, and overhead brass picture lamp.
   - **The Glass Orangery**: Architectural tall palms with sculpted fronds, multi-tier brass orchid stands, hanging terracotta trailing pots, rotating ceiling fan, track lighting rails, and coffered ceiling grid.
   - **The Secret Promise Alcove**: Radiant rose-pink "Forever Yours ♥" neon sign, intimate crystal pendant chandelier, brass astronomical telescope on tripod, animated floating rose petals system, marble urns, and candle clusters.

3. **Real-time 60 FPS Animation Engine Integration**:
   - Added animation update loop in [`src/engine/engine.js`](file:///f:/projects/3dmuseum/src/engine/engine.js) rendering smooth motion for candle flames, fireplace firelight, floating rose petals, gramophone vinyl records, clock pendulums, ceiling fans, and globes.

4. **Zero Artwork Obstruction**:
   - Carefully validated and verified that all artefacts, lamps, furniture, and planters leave 100% of the museum's 61 artwork frames visible and unobstructed.

5. **Verification**:
   - `npm run build` compiled 19 modules cleanly in 2.99s with zero errors.
   - Production server restarted and running at `http://localhost:8080/`.

## Session 2026-10-30 — Dual-Surface Architecture (`index.html` Production & `admin.html` Curator Studio) & Trail Board Removal

1. **Trail & Discovery Board Removal**:
   - Removed the entire `gallery-trail-whiteboard` and `random-exhibit-control` Three.js group from [`src/game/room.js`](file:///f:/projects/3dmuseum/src/game/room.js) (lines 1006-1306).
   - Eliminated the arrow boxes, trail labels ("YOU ARE HERE", "Lobby", etc.), and the ruby discovery button from all museum rooms.

2. **Creation of `admin.html` & Multi-Page Build**:
   - Created [`admin.html`](file:///f:/projects/3dmuseum/admin.html) with `<body class="admin-mode">`.
   - Updated [`vite.config.js`](file:///f:/projects/3dmuseum/vite.config.js) with multi-entry rollup inputs for both `index.html` and `admin.html`.
   - Updated [`server.js`](file:///f:/projects/3dmuseum/server.js) with routing for `/admin` and `/admin/`.

3. **Admin UI Isolation in `src/main.js`**:
   - Detected `isAdmin` via `.admin-mode`, `/admin`, or `?admin`.
   - In production (`index.html`): top bar displays only Music and Fullscreen toggles; no Resizer button or drawer; hotkey `R` is disabled.
   - In admin mode (`admin.html`): renders glowing `✦ ADMIN STUDIO ✦` badge, `📐 Size [R]` button, full Live Resizer Drawer HUD, and developer hotkeys.

4. **Verification**:
   - `npm run build` compiled 18 modules (both `dist/index.html` and `dist/admin.html`) cleanly in 2.80s with zero errors.
   - Verified HTTP 200 responses for `http://localhost:8080/index.html`, `http://localhost:8080/admin.html`, and `http://localhost:8080/admin`.

## Session 2026-10-30 — Adoption of User-Tuned Artwork Measurements (Storage Schema v2)

1. **Commitment of Tuned Proportions**:
   - Updated `DEFAULT_ARTWORK_SIZES` in [`src/config/artworkSizes.js`](file:///f:/projects/3dmuseum/src/config/artworkSizes.js) with the user's tuned dimensions:
     * East Wall: 5 artworks, `width: 1.70m`, `height: 1.55m`, `gap: 0.30m`, `y: 2.05m`.
     * North Wall Masterpiece: `width: 4.50m`, `height: 3.00m`, `y: 2.40m`.
     * South Wall Gate Flanking: `width: 3.00m`, `height: 2.15m`, `doorOffsetU: 3.20m`, `y: 2.05m`.
     * Center Partition: `width: 3.50m`, `height: 2.50m`, `y: 2.05m`.
     * West Wall Narrative Board: `width: 6.60m`, `height: 3.00m`, `y: 2.30m`.
     * Grand Lobby South Wall Masterpiece: `width: 6.00m`, `height: 2.85m`, `y: 3.25m`.
   - Bumped `STORAGE_KEY` to `'ourmuseum:artworkSizes:v2'` to activate immediately across all clients.

2. **UI & Clamping Bounds Optimization**:
   - Expanded slider ranges in [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js) (North W to 5.0m, South W to 3.8m, Center W to 4.2m, West H to 3.8m, Lobby W to 7.0m, Lobby Y to 4.0m).
   - Refined height clamping formulas in [`src/game/room.js`](file:///f:/projects/3dmuseum/src/game/room.js) (`photoH / 2 + 0.1` to `height - photoH / 2 - 0.05`) so larger frames display without artificial truncation.

3. **Verification**:
   - `npm run build` compiled 17 modules cleanly in 2.99s with zero errors. Manual browser verification on `http://localhost:8080/`.

## Session 2026-10-30 — Centralized Artwork Sizing Architecture & Real-Time Live Resizer HUD

1. **Centralized Artwork Dimensions Configuration (`src/config/artworkSizes.js`)**:
   - Created dedicated, well-documented configuration file cataloging every single artwork image size, gap, mounting height, and wall coordinate in meters (Three.js world units).
   - Exported `DEFAULT_ARTWORK_SIZES` with complete measurements for:
     * East Wall: 5 sequential artworks (`width: 1.55m`, `height: 1.12m`, `gap: 0.55m`, `y: 1.95m`).
     * North Wall: Centered masterpiece (`width: 2.60m`, `height: 1.60m`, `y: 2.05m`).
     * South Wall: Gate flanking artworks (`width: 1.55m`, `height: 1.10m`, `doorOffsetU: 2.30m`, `y: 2.05m`).
     * Center Partition: Front & back highlight artworks (`width: 2.00m`, `height: 1.40m`, `y: 2.05m`).
     * West Wall: Autofilled narrative memory board (`width: 6.20m`, `height: 2.50m`, `y: 1.95m`).
     * Grand Lobby: South wall masterpiece (`width: 3.80m`, `height: 2.00m`, `y: 2.15m`).
   - Implemented `getArtworkSizes()`, `saveArtworkSizes()`, and `resetArtworkSizes()` with persistent `localStorage` synchronization.

2. **In-Place Three.js Mesh Reconstruction (`src/engine/engine.js`)**:
   - Stored `lastLoadedRoomParams` during room loading.
   - Added `engineApi.reloadRoomInPlace()`, passing `spawn: null` so `applySpawn` returns immediately, preserving exact camera position, yaw, pitch, and velocity.
   - Allows frames, canvases, backplates, and aspect-ratio geometry to resize right in front of the player without page reloading or camera resetting.

3. **Interactive Live Resizer Drawer HUD (`src/main.js` & `src/style.css`)**:
   - Designed a luxury frosted glass side drawer (`#artwork-resizer-drawer`) with gold filigree borders, section cards, range sliders, and value badges.
   - Sliders input event triggers debounced (60ms) live rebuilds.
   - Added `[R]` keyboard shortcut and `#btn-resizer-toggle` in `#top-bar`.
   - Added "📋 Copy Config Code" button generating ready-to-paste JS code.
   - Added "↺ Reset to Factory Defaults" button restoring factory measurements in-place.

4. **Multi-Salon Uniformity (`src/game/room.js` & `src/game/room/lobby.js`)**:
   - Replaced all hardcoded dimensions with dynamic reads from `getArtworkSizes()`.
   - Modifying dimensions in any room automatically applies uniformly across all 6 couple salons and the Grand Lobby.

5. **Manual Verification & Build**:
   - Built cleanly with Vite in 2.79s (`npm run build`) with zero errors.
   - Verified Node.js production server running on port 8080.
   - Strictly followed user instruction: zero Python QA scripts authored or run.

## Session 2026-10-30 — Purge Automated Python QA & Transition to Manual Testing

1. **Deletion of `tools/` Directory**:
   - Completely deleted the `tools/` directory and all associated Python Playwright verification scripts (`tools/qa/verify_museum.py`, `verify_escape_behavior.py`, `verify_salon_overhaul.py`, `verify_topbar_visibility.py`, etc.).
   - Discontinued writing or executing automated Python QA testing for fast and seamless iterations.

2. **Shift to Manual Browser Testing**:
   - Verification will now be conducted manually by the user/developer in the browser (`http://localhost:5173/` or `http://localhost:8080/`), backed solely by fast syntax and Vite build checks (`npm run build`).

## Session 2026-10-30 — Persistent Top-Bar Controls & Hotkeys (`M` Music & `F` Fullscreen)

1. **Persistent Top-Bar Display While Moving**:
   - Removed `.locked #top-bar` hiding rule in [`src/style.css`](file:///f:/projects/3dmuseum/src/style.css) so the top-right bar with the Music toggle (soundwave visualizer) and Fullscreen toggle remains continuously visible while exploring, walking, or looking around in the museum.
   - Styled `.top-bar-key` micro-badges indicating hotkeys `[M]` and `[F]`.

2. **Keyboard Hotkeys**:
   - Wired `M` key to toggle the romantic classical ambient music on and off at any moment during exploration.
   - Wired `F` key to toggle fullscreen mode on and off.
   - Updated Exhibition Pass controls legend to include `[M] Music · [F] Fullscreen`.

3. **Automated Verification**:
   - Vite production build passed in 2.73s (`npm run build`).
   - Playwright QA suite [`tools/qa/verify_topbar_visibility.py`](file:///f:/projects/3dmuseum/tools/qa/verify_topbar_visibility.py) confirmed `#top-bar` remains flex, visible, and 100% opacity during pointer-locked movement, verified hotkey `M` toggles audio state, and captured screenshot `topbar_visible_while_moving.png`.
   - Regression suites `verify_escape_behavior.py` and `verify_salon_overhaul.py` passed 100% with zero errors.

## Session 2026-10-30 — Complete 61-Photo Asset Directory Structure & Replacement Catalog

1. **Total Photo Requirement Calculation**:
   - Calculated the total artwork slots across the museum:
     * Grand Lobby South Wall: **1 photo** (`01_south_wall_masterpiece.png`, 3.8m × 2.0m).
     * 6 Couple Salons: **10 photos each** (Front Partition, Back Partition, North Masterpiece, South Gate Left, South Gate Right, East Wall 1..5) = **60 photos**.
     * **TOTAL REQUIREMENT**: Exactly **61 photos** for the complete project.

2. **Photo Directory Creation & Asset Export**:
   - Created organized directory hierarchy in `photos/` and `public/photos/`:
     * `00_grand_lobby/` (1 photo)
     * `01_fireside_winter_memories/` (10 photos)
     * `02_music_classical_melodies/` (10 photos)
     * `03_library_reading_nook/` (10 photos)
     * `04_masterpiece_paris_romance/` (10 photos)
     * `05_the_glass_orangery/` (10 photos)
     * `06_secret_promise_alcove/` (10 photos)
   - Built [`tools/export_museum_photos.py`](file:///f:/projects/3dmuseum/tools/export_museum_photos.py) and exported all 61 current PNG image assets into these directories.
   - Authored comprehensive `photos/README.md` and `public/photos/README.md` cataloging physical 3D frame dimensions, recommended resolutions (`1920×1080` to `2560×1440`), and drop-in replacement workflow.

## Session 2026-10-30 — Direct Escape Cursor Unlock & Zero Reappearing Ticket Box

1. **Direct Escape & Permanent Pass Dismissal**:
   - Replaced recurring pause overlay with permanent sanctuary entry state (`hasEntered = true` and `body.in-sanctuary`).
   - When the user presses `Escape`, pointer lock releases cleanly ("directly escape him") so the user can freely move their cursor, switch tabs, or interact with browser UI.
   - Guarded `onPointerLockChange(locked)` in `src/main.js` so that once entered, `#overlay` is never unhidden.
   - Enforced `#overlay[hidden], body.in-sanctuary #overlay { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }` in `src/style.css` so flex styling never overrides hidden state.
   - Kept `#scene-container` crystal-clear (`filter: blur(0) brightness(1)`) while unlocked.
   - Added seamless 1-click canvas resume listener: clicking the 3D scene re-acquires pointer lock instantly with zero box popups.
   - Updated ticket pass legend from `[ESC] Pause` to `[ESC] Unlock Cursor`.
   - Hardened Lightbox modal backdrop dismissal with a 250ms timestamp guard to ensure mouseup/click bubbling does not prematurely close newly opened modal frames.

2. **Automated Verification**:
   - Production Vite build compiled in 2.62s (`npm run build`).
   - Playwright QA suite `tools/qa/verify_escape_behavior.py` verified that pressing Escape releases pointer lock with `#overlay` display at `none`, `#ticket-card` hidden, scene clear, and seamless canvas re-lock. Captured screenshot: `escaped_unlocked_view_no_ticket_box.png`.
   - Playwright QA suite `tools/qa/verify_salon_overhaul.py` passed 100% with zero errors.

## Session 2026-10-30 — Comprehensive Salon Artwork Overhaul, 60 Unique Memories & Lightbox Modal

1. **Lobby South Wall Masterpiece**:
   - Replaced placeholder image with the high-resolution landscape master painting (`src/assets/lobbyphoto.png`, 793 KB) provided by the user.
   - Tagged mesh with `pickable = true`, `isPhoto = true`, and wired into raycasting click-to-enlarge detection.

2. **Salon Center Partition Overhaul**:
   - Moved the two botanical plants from the middle pathway out to the outer corners (`x = ±pillarW * 0.46`).
   - Replaced the split front face with a single centered highlight artwork (`2.0m × 1.4m`, mounting `photos[0]`).
   - Replaced the back face with a single centered highlight artwork (`2.0m × 1.4m`, mounting `photos[1]`).

3. **Salon Wall Artwork Slots & Captions Purge**:
   - **North Wall**: Centered a large masterpiece artwork (`2.6m × 1.6m`, mounting `photos[2]`) above the gallery bench.
   - **South Wall**: Added 2 artworks flanking the entrance door (`u = -2.3m` and `u = 2.3m`, mounting `photos[3]` and `photos[4]`).
   - **East Wall**: Expanded from 4 to 5 artworks (`1.55m × 1.12m`, mounting `photos[5]` through `photos[9]`).
   - **Zero Captions**: 100% eliminated `placeCaptionUnderSlot` and caption plaque geometry across all salon walls; zero raw base64 or clutter plaques remain.

4. **Autofilled Narrative Memory Text Panel**:
   - Upgraded `makeWallTextTexture` in `src/game/room.js` to render an obsidian noir velvet gradient background, 24k gold filigree double borders, corner diamonds, salon header, gold divider rule, dynamic font size scaling (28px - 42px) for *Cormorant Garamond* serif quotation lines, and eternal sanctuary footer signature.

5. **60 Distinct Memory Artworks**:
   - Expanded all 6 couple salons in `src/data/coupleMuseum.js` to 10 distinct artworks each (60 unique memory paintings total across the salons + 1 lobby master painting = 61 unique artworks). Every position in every salon displays a unique artwork.

6. **Interactive Click-to-Enlarge Lightbox Modal**:
   - Added `onPhotoClick` callback in `src/engine/engine.js` with 14m raycasting picking range.
   - Built full-screen frosted glassmorphic modal `#photo-lightbox-modal` in `src/main.js` and `src/style.css` with 24k gold border, title badge, close button, and Esc key dismissal.

7. **Automated Verification**:
   - Vite production build passed in 2.54s (`npm run build`).
   - Playwright QA test suites `verify_salon_overhaul.py` and `verify_museum.py` passed 100% with zero console errors.

## Session 2026-10-30 — Grand Lobby Centerpiece, Architectural Directory Monument & Door Spotlight Overhaul

1. **Center Lounge Suite (Round Table & Two Sofas)**:
   - Completely purged the plant that was accidentally positioned in the center floor of the rotunda.
   - Built an architectural Center Lounge Suite in the Grand Lobby:
     * Round Calacatta White Marble Table (`CylinderGeometry(0.64, 0.64, 0.045, 48)`) with beveled polished brass rim, fluted pedestal column, and heavy stepped brass disc base.
     * Table centerpiece with a satin brass floral bowl, blooming alabaster rose/orchid cluster, and burgundy leather-bound guestbook.
     * Two luxury curved tub armchairs/sofas in tufted cognac saddle leather (`0x7e4922`) on solid American walnut plinths (`0x221a14`), champagne velvet lumbar pillows, and 4 tapered cylindrical brushed brass legs with glider foot caps.
     * Solid collision cylinder and box obstacles preventing camera/avatar clipping.

2. **Corner-Only Botanical Planter Distribution**:
   - Removed all plants located in between elements or blocking doorways (e.g. platform door obstruction and middle south wall).
   - Distributed botanical planters strictly to architectural room and stage corners:
     * 4 corners of the Ground Floor rotunda (SW, SE, NW, NE).
     * 4 corners of the Raised Stage / Platforms (Platform NW, SW, NE, SE).
     * Placed all gallery plants into room corners (`halfW - 0.65`).

3. **Door Plaque Readability & Focused Spotlights**:
   - Upgraded door name plaques to high-resolution (1024 × 256) obsidian noir lacquer with 24k gold double filigree borders and corner diamonds.
   - Set salon name font to bold luminous *Cormorant Garamond* (50px, `#ffffff`) with glowing gold shadow, plus bright gold category tag (*Montserrat*).
   - Rendered with self-illuminated face mesh (`MeshBasicMaterial`) guaranteeing 100% legibility from any viewing distance without falling into shadow.
   - Replaced vertical ceiling canister downlight with an extending brass wall-mounted picture lamp fixture (`z = 0.38m`) and high-intensity focused spotlight (`5.5 intensity`, `0xfff1d6`) targeted directly at the salon name plaque.

4. **Grand Exhibition Directory Monument**:
   - Replaced the crude school whiteboard and black pipes with a grand architectural directory monument.
   - Constructed twin dark bronze pedestal stanchions with stepped brass plinth bases and caps.
   - Fitted with polished brass bezel molding and an overhead tubular brass gallery picture light with a dedicated spotlight (`4.2 intensity`).
   - Redesigned 2048 × 1024 canvas face with zero clashing watermarks:
     * Gilded *Cormorant Garamond* header ("OUR MUSEUM • A SANCTUARY FOR MAYA & ETHAN").
     * Distinct two-column wing layout ("← WEST ROTUNDA WING" and "EAST ROTUNDA WING →") with gold diamond bullet points, bold salon names, and descriptive subtitle hints.

5. **Automated Verification**:
   - Vite production build succeeded in 2.71s (`npm run build`).
   - Playwright QA suite (`tools/qa/verify_museum.py`) passed 100% with zero console errors.
   - Visual regression captures confirmed center lounge suite, directory monument, highlighted door plaques, and corner plant distribution.

## Session 2026-10-30 — Purge Golden Hour & Midnight Themes (Sole Classical Architecture Theme)

1. **Purged Theme Switcher Markup & Listeners**:
   - Removed `.ambience-section` containing the 3-button switcher (`🌅 Golden Hour`, `🏛️ Classical`, `🌙 Midnight`) from [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js).
   - Removed `.ambience-pill` click event listeners from [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js).

2. **Purged Dead CSS**:
   - Cleaned out `.ambience-section`, `.ambience-label`, `.ambience-pills`, `.ambience-pill`, `.ambience-pill:hover`, and `.ambience-pill.active` styles from [`src/style.css`](file:///f:/projects/3dmuseum/src/style.css).

3. **Engine Hardening to Classical Museum Lighting**:
   - Standardized [`src/engine/engine.js`](file:///f:/projects/3dmuseum/src/engine/engine.js) permanently on Classical architecture lighting:
     * `renderer.toneMappingExposure = 1.0`
     * `scene.background.set(0x05030a)`
     * `particleMat.color.set(0xffffff)`
     * Ambient light: `0xf5f8ff` (1.0 intensity)
     * Directional sun/skylight: `0xffffff` (1.55 intensity)
     * Point fill light: `0xebf2ff` (1.15 intensity)
   - Completely purged branching logic for `'golden'` and `'midnight'` modes.
   - Removed unused `setAmbiencePreset` and `getAmbiencePreset` methods from the engine API.

4. **Automated Verification**:
   - Vite production build succeeded in 2.52s with zero errors (`npm run build`).
   - Playwright QA suite (`tools/qa/verify_museum.py`) passed 100% with zero console errors.

## Session 2026-10-30 — Complete Visual Realism & Architectural Aesthetic Overhaul

1. **Spotlights & Architectural Downlight Fixtures**:
   - Replaced unconstrained point lights with physical 3D cylindrical dark metal canister fixtures (`CylinderGeometry(0.24, 0.24, 0.08, 32)`), recessed glowing warm circular lenses (`CircleGeometry(0.18, 32)`), and downward `THREE.SpotLight` (`penumbra: 0.85`, `decay: 1.8`) creating authentic soft circular light pools across the Grand Lobby and exhibition galleries.
   - Added dedicated overhead downlight canisters and spotlights over each portal shining down on the door jambs, moldings, and brass hardware.

2. **Door Realism & Classical Architecture**:
   - Upgraded doors from flat planes to classical 3D beveled panel moldings with raised field beveling.
   - Replaced flat lines with Carrara marble plaques carrying gilded serif typography (*Cormorant Garamond* / *Montserrat*).
   - Modeled architectural polished brass lever handles with circular escutcheon backplates.

3. **Circular UI Buttons & Medallions**:
   - Replaced crude square "Go back to lobby" green box with an architectural circular wall medallion: stepped brass escutcheon ring (`CylinderGeometry(0.25, 0.26, 0.024, 48)`), concave emerald/noir lacquer plate, high-resolution circular serif plaque ("RETURN TO LOBBY • GRAND ROTUNDA"), and circular raycast hit mesh (`CircleGeometry(0.28, 32)`).
   - Replaced crude square "Random Exhibit" button with a satin bronze/brass escutcheon plate and glowing circular ruby discovery button (`CylinderGeometry(0.125, 0.118, 0.035, 36)`) with *Cormorant Garamond* plaque.

4. **Botanical Plants**:
   - Replaced crude paper-strip fronds with photorealistic botanical plants: fluted ceramic pots (`CylinderGeometry(0.32, 0.24, 0.65, 32)`), rolled lip rim, satin brass plinth base rings, rich dark organic soil with micro-specular sheen, and organic multi-tier curved tropical leaves with vertex normal calculations.
   - Exported reusable `createRealisticGalleryPlant` and deployed across Grand Lobby and all gallery walls.

5. **Luxury Tufted Leather Gallery Benches**:
   - Replaced crude box benches with luxury tufted leather gallery benches: solid American walnut / ebonized plinth bases (`2.4m × 0.65m × 0.06m`), 3 segmented tufted cognac saddle leather cushions (`0x7e4922`, `roughness: 0.40`), 4 cylindrical brushed brass legs with foot glider caps, and brass cross-stretcher support bars.
   - Exported reusable `createRealisticGalleryBench` and deployed across Grand Lobby, gallery center columns, east deco, and south walls.

6. **Wallcoverings & Plaster Realism**:
   - Upgraded wall texture generator in `src/game/room/textures.js` to fine-woven museum linen plaster with micro-relief bump mapping, subtle fiber variation, and French Gallery Cream / Parisian Alabaster (`0xf4f1eb`).

7. **Zero Dead Code & Verification**:
   - Purged all old box geometry definitions (`seatGeo`, `leafGeo`, `woodMat`, `potMat`) and eliminated duplicate definitions.
   - Production build verified in ~2.70s (`npm run build`).
   - Playwright QA verification (`tools/qa/verify_museum.py`) passed 100% with zero console errors.

## Session 2026-10-30 — Complete Modern Baseline, VIP Landing Suite & Codebase Hardening

1. **Obsolete House Code Purge & Clean Git Baseline**:
   - Safely removed legacy house code (`js/`, `css/`, `studio.html`, root `server_sync.py`).
   - Retained and decoupled both Maya (`assets/Claire.glb`) and Ethan (`assets/Aj.glb`) 3D models with rigging controller in `src/avatars/characters.js`.
   - Committed clean baseline (`2f4ebd1`).

2. **Luxury VIP Landing Experience (Combined Options 1, 2, 3)**:
   - **Option 1 (Atmosphere)**: Living 3D background camera drift/sway in Grand Lobby before pointer-lock; floating volumetric gold dust embers particle system in `src/engine/engine.js`.
   - **Option 2 (VIP Pass)**: Embossed frosted-glass VIP Exhibition Pass card with gold corners, *Cormorant Garamond* serif typography, romantic dedication, visual keycap badges (`[W A S D] / [↑ ← ↓ →] · [SPACE] · [SHIFT] · [ESC]`), and glowing `✦ ENTER SANCTUARY ✦` CTA.
   - **Option 3 (Interactive Ambience & Audio)**: Pre-entry lighting preset selector (🌅 Golden Hour, 🏛️ Classical, 🌙 Midnight) adjusting scene tone-mapping and lights dynamically; zero-dependency romantic ambient synth (Web Audio API) with top-bar animated soundwave visualizer; fullscreen toggle.

3. **Arrow Keys & Scroll Prevention**:
   - Added `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` input mapping to `src/engine/engine.js`.
   - Added `preventDefault()` for arrow keys during pointer-lock to stop unintended browser window scrolling.

4. **100% Dead Multi-Language Code Purge**:
   - Completely deleted `lobbyCategoriesForLanguage()`, language URL parameters, language storage keys, and sync functions from `src/main.js`.
   - Removed dynamic language subdomains, `wikiLang`, and language utilities from `src/wiki/wiki.js` (fixed directly to English).
   - Zero language artifacts remain in `src/`.

5. **Legacy Identity Scrubbing (`notbigmuzzy` & `linkwalk`)**:
   - Scrubbed all occurrences across `package.json`, `src/data/coupleMuseum.js`, `tools/qa/verify_museum.py`, `src/main.js`, `src/engine/engine.js`, `src/game/room.js`, and `src/wiki/wiki.js`.
   - Updated author to Hitesh Bohra and namespaces to `ourmuseum` / `[OurMuseum]`.

6. **Automated Verification**:
   - Vite production build succeeds in ~2.5-3.1s.
   - Playwright QA verification (`tools/qa/verify_museum.py`) passes 100% with zero errors.

## Session 2026-10-30 — Asset Scope Clarification (Sample Video Kept Strictly Reference-Only)
- Verified that `sample/Our Museum - 3D game gift to play together.mp4` is strictly a design & animation reference and not runtime production media.
- Completely removed `assets/video/film.mp4` and all video playback code from runtime:
  * Removed cinema mesh, video element, and texture from `js/environment.js`.
  * Removed `initCinemaScreen()` from `js/main.js`.
  * Removed cinema audio toggle from `js/ui.js`.
  * Restored Artwork 6 to its original position in the Living Room.
- All Playwright regression checks (`check_runtime.py`, `config-check.mjs`) passed 100% with zero errors.

## Session 2026-10-30 — Unified Production Node.js Server & Web Deployment Migration
- Transitioned backend from dual Python servers (`http.server` 8080 + `server_sync.py` 8081) to a single, high-performance Node.js production server (`server.js`):
  * Handles all static assets (HTML, CSS, modern JS modules, Three.js vendor scripts, GLB 3D models, textures, audio).
  * Native HTTP Range requests (`Accept-Ranges: bytes`, `206 Partial Content`) for fluid MP4 video seeking on Safari and Chrome.
  * Native WebSocket synchronization (`ws`) on the exact same HTTP port via `server.on('upgrade')` with zero external web framework bloat.
  * Multi-room message broadcasting with binary/JSON serialization and auto-reconnection.
  * Dynamic protocol and port detection in `js/network.js` (`ws://` vs `wss://`), enabling 1-click cloud hosting on Vercel, Railway, Render, Fly.io, or VPS.
- Created standard `package.json` with `npm start` and `npm run dev` scripts.
- Verified live dual-browser test (`tests/test_live_multiplayer_sync.py`):
  * Maya in Browser 1 moved 0.721m -> Browser 2 received and synced Maya live to 0.721m (delta = 0.000m).
  * Ethan in Browser 2 moved 0.696m -> Browser 1 received and synced Ethan live to 0.696m (delta = 0.000m).
- All Playwright verifications (`check_runtime.py`, `verify_reference_parity.py`, `config-check.mjs`) passed 100% with zero errors.

## Session 2026-10-30 — Reference Parity Features & Visual Immersion (Giftvera Parity)
- Implemented Pre-Game "Choose Your Look" Character Selector on the entrance splash screen matching sample references (Maya, Ethan, Couple cards with active state indicators).
- Implemented Interactive Photo Inspection Carousel in js/ui.js:
  * Full < Prev and Next > modal stage navigation with continuous wrap-around across all 18 memory frames.
  * Interactive top navigation bar with ❮ Back button, Esc key listener, and photo counter badge ("Photo X of 18").
  * Smooth fallback rendering for all fine-art oil paintings directly onto canvas.
- Mounted Wall Cinema Screen in Living Room:
  * VideoTexture rendering of romantic film (assets/video/film.mp4) with 16:9 casing and ambient cove backlighting.
  * Added contextual interaction point ("Watch Couple Film 🎬") with audio mute/unmute toggle.
- Added Grounded Foot Alignment IK & Romantic Partner Look-At Head Tracking:
  * Adjusted sit ankle joint rotation (-0.22 rad) for completely flat floor contact.
  * Real-time head yaw slerp towards partner within 0.4m - 3.2m range.
- Executed comprehensive Playwright verifications:
  * verify_reference_parity.py passed 100% (Look selector, Photo Carousel, Wall Cinema, Seated IK).
  * test_live_multiplayer_sync.py passed 100% across two isolated browser instances.

# SESSION LOG — OUR HOME 3D

## Session 2026-10-30 — Vite source/UI context refresh

- Read the complete first-party src runtime, server/build entry points, tests/QA tools
  and Markdown records. Current HEAD 2f4ebd1 replaces the old js pavilion with a Vite
  first-person lobby, six curated couple themes and Wikipedia-backed galleries.
- Preserved the user's existing main.js diff. No application code/dependency/asset/test
  edits, commits or pushes. User explicitly requires permission before any code edits.
- Refreshed map/architecture/index/guide notes, decisions, TODO/bugs, QA/progress/blockers
  and current-state evidence. Older reports and decisions remain historical.
- Syntax checks for 13 files and scratch production build passed. Fresh Chrome pointer
  lock and all six local themes loaded without uncaught page exceptions. Old config test
  fails because js/config.js no longer exists. No current npm test script exists.
- Read-only observation helper/screenshots were created before the explicit no-code
  reminder. Docs remain ignored/local. Await the next user task; details in
  ../reports/CURRENT_STATE_VITE_2026-10-30.md.

## Session 2026-10-30 — Centralized Documentation Hierarchy (/docs/)
- Created structured documentation folder /docs/ with dedicated subdirectories:
  * docs/tracking/: Files updated on regular basis (TODO.md, SESSION_LOG.md, DECISIONS.md, PROGRESS.md, TEST_MATRIX.md, BUGS.md, BLOCKERS.md).
  * docs/specs/: Architecture and product specifications (OUR_HOME_3D_PROJECT_SPEC.md, MASTER_IMPLEMENTATION_GUIDE.md, AGENT_TEAM_PLAYBOOK.md, USER_CHAOS_REVIEW.md).
  * docs/architecture/: Technical guides and developer constraints (CLAUDE.md, ARCHITECTURE.md).
  * docs/prompts/: Discipline protocols (ai-context-discipline-prompt.md, universal-code-audit-prompt.md).
  * docs/reports/: Historical verification reports and performance budgets (TEST_REPORT_*.md, PERF_REPORT.md, IDEAS.md).
- Created master documentation hub docs/README.md with a daily update reference table for quick navigation.

## Session 2026-10-30 — Real-Time Multiplayer Sync, Zero-Dependency Bundling & In-Game Features
- Implemented real-time multiplayer networking layer (js/network.js + server_sync.py on port 8081).
- Concurrent WebSocket & BroadcastChannel engine supporting cross-device mobile phones and multi-tab sync.
- Implemented 30Hz binary state broadcast with Hermite/linear interpolation for remote characters.
- Built live room status indicator pill in top HUD (connected peers, active player role).
- Implemented 2D architectural radar minimap (js/minimap.js) rendering real-time blips for both partners.
- Implemented Polaroid photo souvenir keepsakes tool (js/photo.js) with customized dedications and instant PNG export.
- Decoupled external CDNs: bundled Three.js r160, GLTFLoader, SkeletonUtils, and BufferGeometryUtils locally in js/vendor/.
- Verified live dual-browser synchronization test (tests/test_live_multiplayer_sync.py) across two isolated Chrome instances:
  * Phone 1 (Maya) moved forward 0.698m -> Phone 2 (Ethan) updated Maya live to exact coordinate (0.698m).
  * Phone 2 (Ethan) moved right 0.719m -> Phone 1 (Maya) received stream and interpolated Ethan live (0.288m).
- All regression checks (config-check.mjs and check_runtime.py) passed with 100% success.

## Session 2026-10-30 — Senior Developer Master Architecture & Implementation Pipeline
- Formulated end-to-end 6-phase engineering pipeline for all remaining scope.
- Authored SENIOR_DEVELOPER_IMPLEMENTATION_PIPELINE.md detailing: Phase 1 (Local CDN bundling & WebKit/Gecko testing), Phase 2 (NavMesh route validation, two-bone foot IK, multi-ray frustum bumper), Phase 3 (WebRTC/WebSocket room state synchronization & Hermite interpolation), Phase 4 (88-key physical piano, HRTF spatial panner, day/night lighting arc, interactive doors), Phase 5 (Dual-touch joystick/look arbiter, geometry batching), and Phase 6 (Orthographic radar minimap, custom Polaroid photo tool).
- Updated TODO.md with prioritized phase tracking.

## Session 2026-10-30 — Moment-by-Moment Movement & Character Response Audit
- Executed comprehensive live-browser Playwright audit in `project-log/audit_movement_moments.py`.
- Verified every single locomotion vector (W, A, S, D, W+A, W+D, Shift+W):
  - W moved forward along camera forward vector (dx=0.000m, dz=-0.442m).
  - S moved backward (dx=0.000m, dz=+0.443m).
  - A strafed left (dx=-0.443m, dz=0.000m).
  - D strafed right (dx=+0.442m, dz=0.000m).
  - Diagonal inputs moved at clean 45-degree angles without rotational jitter.
  - Sprint (Shift+W) smoothly accelerated character from 1.4m/s to 3.2m/s (dist=1.012m over 400ms).
- Verified independent character controllers: Solo Jack moved 0.432m while Maya stayed at 0.000m. Couple mode moved both simultaneously.
- Verified boundary collisions & spring-arm: walking into outer walls is rigidly clamped (Z=13.8m); camera spring-arm safely clamps at Z=10.02m inside room with zero outer void penetration / zero black screen.
- Verified smooth stairs ascent (0.0m to 3.2m) and descent (3.2m to 0.0m).
- Confirmed all 19 photo frames positioned across all room corners and client index.html clean of studio controls.

## Session 2026-10-30 — Character and house repair
- Corrected independent controllers, per-character actions/floors, camera-relative movement,
  walk/run, focus loss and touch input. Together is explicit; default selection is Maya.
- Replaced hips-only animation correction with all-joint bind-space retargeting; normalized
  actual skinned bounds. Sitting/lying use pelvis anchors and safe return positions.
- Repaired stair landing, descent obstruction, kitchen opening and furniture colliders.
- Polished home palette, furniture, plants, textures, welcome screen and responsive HUD.
- Validated imported config, escaped Studio text, reported save failures and fixed share
  paths/audio duplicate scheduling. Added runtime and config regressions.
- Screenshots and exact verification scope: project-log/TEST_REPORT_repair.md. Online
  multiplayer and other unimplemented spec features remain in TODO; no commit/push.

## Session 2026-10-30 — Cycle 2
- **Completed**:
  - S2 Walking & Collision: 2D AABB collision detection with tangent sliding along all partition walls, fireplace, kitchen island, and dining table.
  - S3 Stairs Locomotion: 18-step ramp proxy elevation with lateral containment ($X \in [-2.75, -1.65]$) and upper floor stairwell void protection.
  - S4 Two Independent Characters: Solo vs Couple mode switching via Tab, keys 1/2/3, HUD switcher pills, 3D raycast click selection, pulsing ground ring halo, and dynamic camera follow focus.
  - S5 Generic Interactions: Grand piano interactive chord playback (`audioEngine.playInteractiveChord`), fireplace warm toggle with sine flicker, master bed procedural lying down pose (`applyLiePose`), and seating IK.
  - All test reports, test matrix rows, and architectural decisions updated.
- **Verification**:
  - `html-validate index.html`: 0 errors.
  - `node --check` on all JS files: 0 syntax errors.
  - HTTP Server: All assets responding with HTTP 200 OK.


## Session 2026-10-30: Grand Pavilion Single-Floor Transformation (40 Artworks)
- **Goal**: Resolve staircase and second-floor drop-down collision glitch, eliminate 2-floor complexity, expand collection to 40 artworks, and arrange them in boutique themed salon rooms (The Pavilion of Rooms).
- **Execution**:
  1. Replaced 2-floor structure with a seamless single-floor pavilion ($28\text{m} \times 28\text{m}$, $Y = 0$).
  2. Implemented 7 interconnected boutique salons: Grand Rotunda, Fireside Winter Salon, Music Conservatory, Library Reading Nook, Monolith Sculpture Hall, Starlight Glass Orangery, and The Promise Alcove.
  3. Curated and mounted 40 artworks with individual spotlights, frames, and plaques in `js/gallery40.js`.
  4. Updated 2D radar minimap (`js/minimap.js`) with salon names and golden artwork blips.
  5. Enhanced modal carousel to loop through all 40 artworks with `< Prev` and `Next >` navigation.
  6. Verified zero drop-down bugs, full locomotion on $Y = 0$, live dual-browser WebSocket multiplayer synchronization, and Studio 40-artwork editing.

## Session 2026-10-30 — Current code/UI context refresh

- User requested understanding/documentation before the next task. Reviewed current
  first-party runtime, Node/Python servers, UI/CSS, gallery/config data and test/docs history.
- Current baseline is `f7cb938`: single-floor seven-salon pavilion, 40 artworks, local
  Three.js, Node/`ws` movement relay, character selection, minimap, carousel and photo tool.
- Updated architecture/map, docs index, guide/spec notes, decisions, TODO, progress,
  bug ledger and test matrix. Historical decisions/reports preserved and labelled.
- Fresh syntax checks (14 files) and `npm test` passed. Chrome entry, 40 Studio cards,
  carousel and photo modal observed. Doorway collider and underlying artwork click
  problems reproduced. Network relay connected, but shared-room peers prevented an
  isolated ownership/convergence pass. Details: `../reports/CURRENT_STATE_2026-10-30.md`.
- No application-code, dependency, asset, test-suite or ignore-rule changes; no commit/push.
  New review script/screenshots are under ignored scratch/reports paths. Docs/tests are
  also ignored and remain local. Awaiting the user's next implementation task.

## Session 2026-11-05: Step 3 — Seating Pipeline Rebuild & Avatar Loading Resilience
- **Goal**: Implement Step 3 of the Production Hardening plan (SEAT-01, SEAT-02, SEAT-03 client integration, and AV-01 avatar resilience).
- **Completed**:
  1. **AV-01 (Avatar Resilience)**:
     - Separated character animations in `src/avatars/avatarWorld.js` into `REQUIRED_CLIPS = new Set(['idle', 'walk', 'run', 'jump', 'sit'])` and optional emote/locomotion clips.
     - Replaced strict `Promise.all` with `Promise.allSettled` and safe fallbacks so missing optional emote clips never abort character initialization.
     - Added 15-second timeout on model loading (`loadModelWithTimeout`) to prevent infinite hangs.
  2. **SEAT-01 (Unscaled Real-Meter Seating Registry)**:
     - In `src/game/room/placedItems.js`, derived runtime seat anchors from the spawned, scaled, and surface-aligned model's final `Box3` world bounds (`baseCenterX`, `baseMinY`, `baseCenterZ`).
     - Rotated seat offsets by model yaw and attached unscaled anchor objects to room group.
     - Exported `registerRuntimeSeat`, `unregisterRuntimeSeat`, `clearRuntimeSeats`, `getRuntimeSeats`.
     - In `src/avatars/seatRegistry.js`, updated `buildSeatRegistry(roomKey)` to read from runtime seat anchors first, with layout fallback using unscaled real-meter offsets (fixing scale-collapse bug).
     - Documented in `src/game/room/artifactRegistry.js` that all seat definitions are in final real-world meters relative to model base center.
     - Added `?debug=seats` visualizer (cyan sphere at cushion height, yaw direction arrow) and HUD display.
  3. **SEAT-02 (Seated Locomotion, Third-Person Orbit & Safe Stand-up)**:
     - In `src/engine/engine.js`, implemented `setSeated(seat | null)`, `isSeated()`, `getSeatedSeat()`, `onStandRequested(fn)`.
     - Suspended WASD/Arrow/Space locomotion, vertical velocity, gravity, and obstacle push while seated.
     - Maintained mouse look yaw/pitch orbiting seated avatar.
     - Stand-up places player 0.7m in front of seat along yaw with obstacle and room boundary safety clamping.
     - Pressing movement keys while seated triggers stand-up first (preventing slide while seated).
  4. **Multiplayer Seating Integration**:
     - In `src/avatars/multiplayer.js`, connected `sit_ok`, `stand_ok`, `stand`, `trySit`, and `standUp` to `engineApi.setSeated()`.
  5. **Verification**:
     - Added automated unit test suite `tests/seats.test.mjs` verifying meter-scale integrity, runtime registry, fallback, nearest seat selection, and 0.7m stand-up math (5/5 tests passing).
     - Ran `tests/server_protocol.test.mjs` (all tests passing).
     - Executed full 2-player headless browser Playwright test `tests/check_avatar_controls.py` (passed 100%).
     - Ran `npm run build` (34 modules compiled in 3.26s, 0 errors).

## Session 2026-11-05: Step 4 — Layout Data, Navigation & Dead Code Cleanup
- **Goal**: Implement Step 4 of the Production Hardening plan (DATA-01, DATA-02, DATA-03, NAV-01, CLEAN-01, UX-01 mobile notice).
- **Completed**:
  1. **DATA-01 (Layout Fixes & Rotation Normalization)**:
     - Supported `rotationDeg` in `src/game/room/placedItems.js:parseTransform`, auto-converting to radians with `THREE.MathUtils.degToRad`.
     - Added warning when `|rotationY| > 2π` radians.
     - Updated `src/data/museumLayout.json`: fixed bookcase to `rotationDeg: 90` and fixed fireside potted plant scale from `0.010` to `1.5` with `sinkY: 0.001`.
     - Created `scripts/validate_layout.mjs` (validating asset paths, transforms, rotation sanity, and clearances).
  2. **DATA-02 (Furnish Empty Salons)**:
     - Populated all 5 previously empty salons (`music`, `library`, `paris`, `orangery`, `alcove`) in `museumLayout.json` with seating GLB models and chandeliers.
     - Enforced door clearance (sofas placed at $Z = 1.5\text{m}$, $> 5.5\text{m}$ clear of South entrance door) and artwork separation.
  3. **DATA-03 (Photo Checker & Manifest)**:
     - Created `scripts/check_photos.mjs` validating all 7 salon folders across all 61 photo slots. Audit confirmed 61/61 photo assets are present on disk.
     - Added `"check": "node scripts/validate_layout.mjs && node scripts/check_photos.mjs"` to `package.json`.
  4. **NAV-01 (Explicit Room-Key Mapping)**:
     - Exported `ROOM_KEY_TO_TITLE` and `TITLE_TO_ROOM_KEY` in `src/data/coupleMuseum.js`.
     - Updated `goToRoom(roomKey)` in `src/main.js` to look up titles via `ROOM_KEY_TO_TITLE`. Invalid keys log an error and stay put without falling back blindly to Fireside.
  5. **CLEAN-01 (Dead Code Removal)**:
     - Removed obsolete scripts `scripts/inspect_glb.js` and `scripts/move_v3_studio.mjs`.
     - Removed unused imports (`saveArtworkSizes`, `resetArtworkSizes`, `DEFAULT_ARTWORK_SIZES`) and `studio-build-mode` check in `src/main.js`.
     - Cleaned legacy admin studio comments from `placedItems.js`.
  6. **UX-01 (Mobile Device Notice)**:
     - Detected coarse pointer touch devices (`matchMedia('(pointer: coarse)')`).
     - Displayed advisory card on entrance ticket: "Best experienced on a computer with a keyboard and mouse" with "Continue anyway" dismissal.
  7. **Verification**:
     - `npm run check` passed 100% (19 placed items across 7 rooms valid, 61/61 photos present).
     - `npm test` passed 100% (6/6 tests).
     - `npm run build` compiled 34 modules in 3.96s with 0 errors.

## Session 2026-11-05: Step 5 — Hosting & Operations, Environment Config & Verification
- **Goal**: Implement Step 5 of the Production Hardening plan (OPS-01, deployment documentation, and automated test suite coverage).
- **Completed**:
  1. **OPS-01 (Unified WS URL & Environment Configuration)**:
     - Exported unified `WS_URL` and `sameOriginWs()` from `src/net/wsClient.js`, reading `import.meta.env.VITE_WS_URL` with same-origin fallback.
     - Updated `src/avatars/multiplayer.js` to share `WS_URL`.
     - Created `.env.example` documenting `PORT`, `HOST`, `MUSEUM_PASSCODE`, `ALLOWED_ORIGINS`, `TRUST_PROXY`, `LOG_LEVEL`, and `VITE_WS_URL`.
     - Verified static asset caching rules in `server.js` (`dist/assets/*` immutable 1-year cache; `index.html` no-cache; media 24h cache).
     - Verified `/healthz` returning `{ ok: true, peers, uptime }` and `/api/config` returning `{ passcodeRequired, maxPlayers, protocol }`.
  2. **Deployment Documentation**:
     - Created `docs/DEPLOY.md` detailing PM2, NSSM Windows service installation, Cloudflare Tunnel (`cloudflared`) configuration for HTTPS/WSS, pre-flight checks, and rollback procedure.
  3. **Automated Test Suite Expansion**:
     - Created `tests/layout.test.mjs` verifying 7 salon keys, global ID uniqueness, asset disk presence, numeric transforms, and seating presence.
     - Created `tests/emotes.test.mjs` verifying consistent 1-4 shortcuts and metadata.
     - Configured `npm test` to run all test suites (`tests/*.test.mjs`).
  4. **Verification**:
     - `npm test`: 10/10 tests passed across all 4 test suites (`emotes.test.mjs`, `layout.test.mjs`, `seats.test.mjs`, `server_protocol.test.mjs`).
     - `npm run check`: 100% pass (layout and 61/61 photos valid).
     - `npm run build`: 34 modules compiled in 3.91s with 0 errors.


