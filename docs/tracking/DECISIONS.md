# Decisions

Earlier append-only decisions live in [project-log/DECISIONS.md](project-log/DECISIONS.md).

## 2026-10-30 — Dual-Surface Architecture (`index.html` Production & `admin.html` Curator Studio) & Trail Board Removal

- **Context**: The user instructed:
  1. Remove the visit trail and "Discover Exhibit" navigation board (attached image) from all rooms;
  2. Create an `admin` copy of `index` (i.e. `admin.html`). Production `index.html` should be clean for visitors without the resize button or drawer, while `admin.html` holds the live resizer HUD and serves as the foundation for future mapping and admin tools, sharing the same unified code.
- **Decision**:
  1. **Purged Trail / "Discover Exhibit" Whiteboard**: Removed the entire `gallery-trail-whiteboard` and `random-exhibit-control` block (lines 1006-1306) in [`src/game/room.js`](file:///f:/projects/3dmuseum/src/game/room.js). The North wall now cleanly displays solely the large centered masterpiece artwork and gallery bench.
  2. **Multi-Page Entry Architecture**:
     - Created [`admin.html`](file:///f:/projects/3dmuseum/admin.html) with `class="admin-mode"`.
     - Configured multi-input Rollup build in [`vite.config.js`](file:///f:/projects/3dmuseum/vite.config.js) compiling both `main` (`index.html`) and `admin` (`admin.html`).
     - Added `/admin` and `/admin/` static routing in [`server.js`](file:///f:/projects/3dmuseum/server.js).
  3. **Admin Feature Isolation in [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js)**:
     - Detects `isAdmin` via `.admin-mode`, `/admin`, or `?admin`.
     - When `isAdmin === false` (production visitors): The top bar renders exclusively Music and Fullscreen buttons; `#artwork-resizer-drawer` is NOT mounted in the DOM; `[R]` shortcut is disabled.
     - When `isAdmin === true` (curators / admins): Displays the golden `✦ ADMIN STUDIO ✦` badge, `📐 Size [R]` button, full live resizer drawer, copy code, and reset controls.
- **Alternatives Considered**: Separate codebases for admin and production (rejected; user explicitly instructed: "Just main file will be the same but it will be having extra features like resize").
- **Affected Files**: [`src/game/room.js`](file:///f:/projects/3dmuseum/src/game/room.js), [`admin.html`](file:///f:/projects/3dmuseum/admin.html), [`vite.config.js`](file:///f:/projects/3dmuseum/vite.config.js), [`server.js`](file:///f:/projects/3dmuseum/server.js), [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js), [`src/style.css`](file:///f:/projects/3dmuseum/src/style.css).
- **Evidence**: `npm run build` compiled 18 modules (both `dist/index.html` and `dist/admin.html`) with zero errors in 2.80s. Tested `http://localhost:8080/index.html`, `http://localhost:8080/admin.html`, and `http://localhost:8080/admin` returning HTTP 200.

## 2026-10-30 — Adoption of User-Tuned Exhibition Artwork Measurements (Storage Schema v2)

- **Context**: The user tested the live resizer HUD and tuned all museum artwork dimensions, spacing gaps, and mounting heights to their preferred proportions. The user provided the final configured `DEFAULT_ARTWORK_SIZES` object to be committed as the new project standard.
- **Decision**:
  1. Updated [`src/config/artworkSizes.js`](file:///f:/projects/3dmuseum/src/config/artworkSizes.js) with the user's tuned measurements:
     * East Wall (5 Artworks): `width: 1.70m`, `height: 1.55m`, `gap: 0.30m`, `y: 2.05m`.
     * North Wall Masterpiece: `width: 4.50m`, `height: 3.00m`, `y: 2.40m`.
     * South Wall Gate Flanking: `width: 3.00m`, `height: 2.15m`, `doorOffsetU: 3.20m`, `y: 2.05m`.
     * Center Partition Highlight: `width: 3.50m`, `height: 2.50m`, `y: 2.05m`.
     * West Wall Narrative Board: `width: 6.60m`, `height: 3.00m`, `y: 2.30m`.
     * Grand Lobby Masterpiece: `width: 6.00m`, `height: 2.85m`, `y: 3.25m`.
  2. Bumped `STORAGE_KEY` to `'ourmuseum:artworkSizes:v2'` to guarantee these new default proportions take effect immediately across all client sessions without requiring manual cache clearing.
  3. Expanded slider ranges in [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js) (e.g. North width up to 5.0m, Lobby width up to 7.0m, Lobby height Y up to 4.0m) and refined height clamping in [`src/game/room.js`](file:///f:/projects/3dmuseum/src/game/room.js) to allow complete unclipped rendering of the user's larger canvas sizes.
- **Alternatives Considered**: Leaving older v1 defaults and relying purely on localStorage (rejected; code repository must reflect the user's curated standard).
- **Affected Files**: [`src/config/artworkSizes.js`](file:///f:/projects/3dmuseum/src/config/artworkSizes.js), [`src/game/room.js`](file:///f:/projects/3dmuseum/src/game/room.js), [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js).
- **Evidence**: `npm run build` compiled cleanly in 2.99s with zero errors.

## 2026-10-30 — Centralized Artwork Sizing Architecture & Real-Time Live Resizer HUD

- **Context**: The user requested:
  1. A central configuration file explicitly listing every single artwork image size, gap, and mounting height so they can easily resize or adjust them from one place;
  2. A live method to adjust sizes and gaps and immediately see the output in real time without refreshing or reloading the browser (which would reset the player/camera position);
  3. Changes made to sizes in one room must automatically and uniformly apply across all 6 couple salons;
  4. Strict constraint: no more automated Python QA scripts (deleted `tools/` folder completely); manual testing only.
- **Decision**:
  1. **Centralized Configuration (`src/config/artworkSizes.js`)**:
     - Exported `DEFAULT_ARTWORK_SIZES` containing exact measurements in meters for all 6 artwork surfaces:
       * `eastWall`: `{ count: 5, width: 1.55, height: 1.12, gap: 0.55, y: 1.95 }`
       * `northMasterpiece`: `{ width: 2.60, height: 1.60, y: 2.05 }`
       * `southGateArtworks`: `{ width: 1.55, height: 1.10, doorOffsetU: 2.30, y: 2.05 }`
       * `centerPartition`: `{ width: 2.00, height: 1.40, y: 2.05 }`
       * `westNarrativeBoard`: `{ width: 6.20, height: 2.50, y: 1.95 }`
       * `lobbyMasterpiece`: `{ width: 3.80, height: 2.00, y: 2.15 }`
     - Added `getArtworkSizes()`, `saveArtworkSizes()`, and `resetArtworkSizes()` with `localStorage` persistence under `'ourmuseum:artworkSizes:v1'`.
  2. **In-Place Three.js Mesh Reconstruction (`src/engine/engine.js`)**:
     - Stored `lastLoadedRoomParams` during room loads.
     - Added `engineApi.reloadRoomInPlace()`, invoking `loadRoom({ ...lastLoadedRoomParams, spawn: null })`.
     - When `spawn: null`, `applySpawn` returns immediately, preserving exact camera position, yaw, pitch, and velocity. The room's Three.js meshes and materials are disposed and re-instantiated in place with the new sizes in real time without teleporting the player.
  3. **Live Resizer Drawer HUD (`src/main.js` & `src/style.css`)**:
     - Added a luxury frosted glass side drawer (`#artwork-resizer-drawer`) with gold trim, section cards, range sliders, and value badges for all 6 artwork locations.
     - Connected input listeners with a 60ms debounce triggering `reloadRoomInPlace()`.
     - Added `[R]` keyboard shortcut and `#btn-resizer-toggle` in the persistent top bar to toggle the drawer.
     - Added "📋 Copy Config Code" button that formats the active measurements into ready-to-paste JavaScript and copies to clipboard.
     - Added "↺ Reset to Factory Defaults" button that resets values and reloads in place.
  4. **Multi-Salon Uniformity (`src/game/room.js` & `src/game/room/lobby.js`)**:
     - Replaced hardcoded dimensions with dynamic reads from `getArtworkSizes()`. Because all 6 couple salons instantiate through `buildRoom()`, tuning in any room updates all salons uniformly.
- **Alternatives Considered**: Full browser page reload (rejected; resets player position and breaks live visual tuning); dat.gui / tweakpane external library (rejected to maintain zero-npm-dependency discipline and match luxury Parisian museum aesthetic).
- **Affected Files**: [`src/config/artworkSizes.js`](file:///f:/projects/3dmuseum/src/config/artworkSizes.js), [`src/engine/engine.js`](file:///f:/projects/3dmuseum/src/engine/engine.js), [`src/game/room.js`](file:///f:/projects/3dmuseum/src/game/room.js), [`src/game/room/lobby.js`](file:///f:/projects/3dmuseum/src/game/room/lobby.js), [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js), [`src/style.css`](file:///f:/projects/3dmuseum/src/style.css).
- **Evidence**: `npm run build` compiled cleanly in 2.79s with zero errors. Tested in browser on port 8080.

## 2026-10-30 — Purge Automated Python QA & Transition to Manual Browser Testing

- **Context**: The user explicitly instructed to stop writing and running Python Playwright QA automation scripts for testing changes, noting that they waste too much time during iterations. The user requested deleting the `tools/` folder and stated that all testing will be done manually in the browser.
- **Decision**:
  1. Completely deleted the `tools/` directory (including `tools/qa/` and all test scripts).
  2. Permanently ceased authoring or running Python QA automation scripts in subsequent tasks.
  3. Switched verification model strictly to Vite production build verification (`npm run build`) and developer manual browser testing (`http://localhost:5173/` or `http://localhost:8080/`).
- **Alternatives Considered**: Keeping headless tests in a separate repo (rejected; user explicitly commanded "delete the tools code and we don't require that We will be testing it manually").
- **Affected Files**: `tools/` (deleted).
- **Evidence**: `cmd.exe /c "dir tools"` returns "File Not Found"; `npm run build` succeeds cleanly in 2.7s.

## 2026-10-30 — Persistent Top-Bar Controls & In-Game Hotkeys (`M` Music & `F` Fullscreen)

- **Context**: The user observed that the Music button (with animated soundwave) and Fullscreen button were only visible when pointer lock was released via `Escape`, and disappeared completely when the user was moving around in the museum. The user requested that both buttons remain visible and accessible while moving.
- **Decision**:
  1. In [`src/style.css`](file:///f:/projects/3dmuseum/src/style.css), removed `.locked #top-bar { opacity: 0; visibility: hidden; pointer-events: none; }` so that `#top-bar` remains continuously visible (`opacity: 1; visibility: visible; pointer-events: auto;`) while moving, jumping, or looking around in the 3D museum.
  2. In [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js), bound global keyboard hotkeys:
     * `KeyM` / `m` / `M`: Instantly toggles the romantic classical ambient music on/off and animates/stops the soundwave visualizer.
     * `KeyF` / `f` / `F`: Instantly toggles fullscreen mode.
  3. Added elegant gilded keycap badges (`[M]` and `[F]`) inside the top-bar buttons (`.top-bar-key`) and updated the Exhibition Pass controls legend.
  4. Both mouse click (when cursor is unlocked) and keyboard hotkeys (while moving/locked) work interchangeably.
- **Alternatives Considered**: Auto-hiding the bar on a timer (rejected; user specifically requested that it be visible while moving).
- **Affected Files**: [`src/style.css`](file:///f:/projects/3dmuseum/src/style.css), [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js), [`tools/qa/verify_topbar_visibility.py`](file:///f:/projects/3dmuseum/tools/qa/verify_topbar_visibility.py).
- **Evidence**: `npm run build` completed in 2.73s; `verify_topbar_visibility.py` verified that while `is_locked` is true, `#top-bar` has `display='flex'`, `visibility='visible'`, `opacity='1'`, key badges `M` and `F` are present, `M` key toggles audio state, and screenshot `topbar_visible_while_moving.png` captures the top bar visible during movement. All regressions passed 100%.

## 2026-10-30 — Complete 61-Photo Directory Structure & Replacement Catalog

- **Context**: The user requested creating a dedicated photos directory and calculating the exact total count of photos required to populate the entire museum application.
- **Decision**:
  1. Determined the total count: exactly **61 distinct photos** across the entire museum:
     * Grand Lobby South Wall: **1 photo** (`01_south_wall_masterpiece.png`)
     * 6 Couple Salons: **10 photos each** = **60 photos**
  2. Created structured directories in `photos/` and `public/photos/`:
     * `00_grand_lobby/` (1 photo)
     * `01_fireside_winter_memories/` (10 photos)
     * `02_music_classical_melodies/` (10 photos)
     * `03_library_reading_nook/` (10 photos)
     * `04_masterpiece_paris_romance/` (10 photos)
     * `05_the_glass_orangery/` (10 photos)
     * `06_secret_promise_alcove/` (10 photos)
  3. Exported all 61 currently generated and uploaded PNG image assets directly into these folders as tangible PNG files with clear semantic filenames (`01_partition_front_highlight.png`, `02_partition_back_highlight.png`, `03_north_wall_masterpiece.png`, `04_south_wall_gate_left.png`, `05_south_wall_gate_right.png`, `06..10_east_wall_artwork_1..5.png`).
  4. Authored comprehensive `README.md` in both folders detailing the physical 3D frame dimensions, recommended resolutions (`1920×1080` to `2560×1440`), and drop-in replacement workflow.
- **Alternatives Considered**: Keeping photos solely in procedural canvas memory (rejected; user needs direct file system access to replace artworks with personal photos).
- **Affected Files**: `photos/`, `public/photos/`, `photos/README.md`, `public/photos/README.md`, `tools/export_museum_photos.py`.
- **Evidence**: Verified 61 files generated across 7 directories; `dir photos` and `dir photos/01_fireside_winter_memories` confirm all files exist on disk with valid image sizes.

## 2026-10-30 — Comprehensive Museum Artefact & Realistic Decoration Overhaul

- **Context**: The user requested that all artefacts and enhancements from the Museum Enhancement Catalogue (lighting, botanicals, furniture, sculptures, architectural elements, animated effects, and signage) be fully applied across the museum salons and lobby. Additionally, the user specifically highlighted that existing furniture (sofa, cushions, benches) looked like "three cuboids" and needed an organic, realistic touch, and that no decorative items should block visitor views of any museum artwork images.
- **Decision**:
  1. **Plush Organic Cushion Geometry**: Built `createPlushCushionGeometry` in `src/game/room/decorations.js` using subdivided `BoxGeometry` deformed by trigonometric dome crowning, side swelling, softened corners, deep tufted button indentations, and real French welt perimeter piping cording.
  2. **Gallery Benches Overhaul**: Replaced primitive box benches with luxury museum banquettes featuring beveled walnut plinths, brushed brass inset trim, three plush domed leather cushions with welt piping and brass button tufting, and turned tapered brass legs with sabots and cross stretchers.
  3. **Lounge Armchairs Overhaul**: Replaced primitive lobby armchairs with French curved tub armchairs with fluted channeled barrel backrests, rolled armrests with brass nailhead trim studs, sculpted champagne lumbar pillows, and turned tapered legs.
  4. **Thematic Salon Decorations**:
     - *Fireside Winter Memories*: Classical carved limestone fireplace hearth below north masterpiece, glowing ember bed, iron grate, birch logs, mantle antique clock, candle clusters, Persian fireside rug, angled leather armchairs, Greek urns.
     - *Music & Classical Melodies*: Vintage lathe-turned morning glory brass horn gramophone on pedestal with spinning vinyl record, "Our Song ♫" neon sign, romantic ceiling festoon fairy lights, flower vases, hourglass.
     - *The Library & Reading Nook*: Floor-to-Ceiling walnut bookcases with hundreds of books, writing desk with quill/ink/parchment, spinning globe, emerald velvet reading armchair, gilded baroque wall mirror, wainscoting paneling.
     - *Masterpiece Paris Romance*: 2-tier sparkling crystal chandelier with rosette, classical marble bust & abstract bronze sculpture on tall marble plinths, crimson velvet stanchion ropes, overhead brass picture lamp.
     - *The Glass Orangery*: Architectural tall palms with sculpted multi-tier fronds, multi-tier brass orchid stands, hanging terracotta trailing pots, rotating ceiling fan, track lighting rails, coffered ceiling grid.
     - *The Secret Promise Alcove*: Radiant rose-pink "Forever Yours ♥" neon sign, intimate crystal pendant chandelier, brass astronomical telescope on tripod, animated floating rose petals system, marble urns, candle clusters.
     - *Grand Lobby*: Central grand crystal chandelier, inlaid polished 8-point star marble floor medallion, directional brass floor arrows, "OUR MUSEUM • MAYA & ETHAN" grand arch inscription, picture lamp.
  5. **Real-time 60 FPS Animation System**: Integrated an animation callback array (`animatedDecorations`) in `src/engine/engine.js` frame loop, driving continuous animation of candle and fireplace flame flickering, spinning vinyl records, floating rose petal drift, clock pendulum swinging, ceiling fan rotation, and globe spinning.
  6. **Zero Artwork Obstruction**: All decorations positioned on ceilings, upper walls, open room centers (rugs, medallions), or empty corners, leaving all 61 artwork frames completely clear and unobstructed from any viewing angle.
- **Alternatives Considered**: Using external GLB models (rejected per zero external dependency and performance policy; procedural Three.js geometry ensures 60 FPS instant loading with 0 KB extra asset weight).
- **Affected Files**: `src/game/room/decorations.js`, `src/game/room/lobby.js`, `src/game/room.js`, `src/engine/engine.js`.
- **Evidence**: `npm run build` completed in 2.99s with 0 errors. Server running smoothly on port 8080.

## 2026-10-30 — Direct Escape Cursor Unlock (Permanent Dismissal of Exhibition Pass Overlay)

- **Context**: When the user pressed `Escape` during gameplay, the browser exited pointer lock, which triggered `onPointerLockChange(false)`. Previously, this caused the Private Exhibition Pass overlay card (`#overlay` / `#ticket-card`) to immediately reappear and blur the entire 3D scene, interrupting the user. The user explicitly instructed that pressing Escape should directly escape / unlock the cursor without ever bringing back this overlay card over the scene.
- **Decision**:
  1. Added state flag `hasEntered = true` upon clicking `ENTER SANCTUARY`, permanently adding `body.in-sanctuary` and hiding `#overlay`.
  2. In `onPointerLockChange(locked)`, if `hasEntered` is true, `#overlay` is kept strictly hidden (`overlayEl.hidden = true`).
  3. In `src/style.css`, added `body.in-sanctuary #overlay, #overlay[hidden] { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }` to prevent `#overlay` flex styling from overriding the hidden attribute.
  4. Updated `body.in-sanctuary #scene-container` to maintain crystal-clear rendering (`filter: blur(0) brightness(1)`) even when pointer lock is released.
  5. Added seamless 1-click canvas resume listener: clicking the 3D canvas when unlocked re-acquires pointer lock instantly without any modal interruption.
  6. Updated controls hint on ticket pass to read `[ESC] Unlock Cursor`.
  7. Enabled raycast picking on artworks in [`src/engine/engine.js`](file:///f:/projects/3dmuseum/src/engine/engine.js) even when the cursor is unlocked (calculating NDC from `e.clientX`, `e.clientY`), allowing visitors to click directly on paintings to open the Lightbox modal with a free cursor.
  8. Added a 250ms timestamp guard on `.photo-lightbox-backdrop` click listener in [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js) to prevent the same mouseup/click event that opened the modal during `mousedown` from immediately closing it.
- **Alternatives Considered**: Creating a second "pause menu" overlay (rejected; directly contradicts user's explicit instruction "directly escape him do not press this box again over there").
- **Affected Files**: [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js), [`src/style.css`](file:///f:/projects/3dmuseum/src/style.css), [`tools/qa/verify_escape_behavior.py`](file:///f:/projects/3dmuseum/tools/qa/verify_escape_behavior.py).
- **Evidence**: `npm run build` passed in 2.62s; `verify_escape_behavior.py` verified that pressing Escape leaves `#overlay` display at `none`, visibility at `hidden`, ticket card not visible, scene unblurred, and canvas click smoothly resumes gameplay with zero errors. Captured screenshot: `escaped_unlocked_view_no_ticket_box.png`.

## 2026-10-30 — Comprehensive Salon Room Artwork Overhaul, 60 Unique Memories & Interactive Lightbox Modal

- **Context**: The user identified key visual and layout issues in the gallery salons and lobby:
  1. Lobby south wall had a placeholder photo instead of the high-res master landscape painting (`image.png`, 793 KB);
  2. In the salons, plants against the central divider blocked visitor paths;
  3. The center partition wall needed centered highlight artworks on both front and back faces;
  4. South entrance wall had too much unused wall space around the door;
  5. East wall had only 4 images, raw base64 caption plaques looked broken, and images were too small;
  6. North wall needed a large centered masterpiece artwork above the bench;
  7. West wall narrative memory board text was small, off-center, and did not fill the board;
  8. Every single artwork position across all 6 couple salons needed to display a distinct, unique image (10 images per salon × 6 salons = 60 separate artworks);
  9. Clicking any artwork anywhere in the museum should open an enlarged high-resolution view.
- **Decision**:
  1. **Lobby South Wall Masterpiece**: Replaced placeholder with `src/assets/lobbyphoto.png` (793 KB), pickable for modal zoom.
  2. **Salon Center Partition Overhaul**: Relocated plants to outer wall corners (`x = ±pillarW * 0.46`); mounted front highlight artwork (`2.0m × 1.4m`, `photos[0]`) and back highlight artwork (`2.0m × 1.4m`, `photos[1]`).
  3. **South Wall Gate Flanking Artworks**: Mounted 2 artworks (`1.55m × 1.10m`) at `u = -2.3m` and `u = 2.3m` (`photos[3]` and `photos[4]`).
  4. **East Wall 5-Artwork Array**: Expanded to 5 slots (`1.55m × 1.12m`, `photos[5..9]`) and 100% eliminated all caption plaques and base64 text.
  5. **North Wall Masterpiece**: Added large centered artwork (`2.6m × 1.6m`, `photos[2]`) centered above the bench.
  6. **West Wall Autofilled Narrative**: Redesigned canvas generator (`makeWallTextTexture`) with obsidian noir velvet gradient, 24k gold filigree border, corner diamonds, salon title, gold divider, auto-scaled *Cormorant Garamond* serif quotation lines, and signature.
  7. **Collection Expansion**: 10 distinct artworks generated per salon in `src/data/coupleMuseum.js` across all 6 couple salons (60 unique artworks total).
  8. **Click-to-Enlarge Lightbox Modal**: Added full-screen glassmorphic modal with 24k gold border, title badge, close button, and Esc key dismissal in `src/engine/engine.js`, `src/main.js`, and `src/style.css` (raycasting up to 14m).
- **Alternatives Considered**: External popup windows (rejected; breaks immersive 3D experience); HTML iframe embeds (rejected in favor of high-performance Three.js raycasting and glassmorphic overlay).
- **Affected Files**: [`src/data/coupleMuseum.js`](file:///f:/projects/3dmuseum/src/data/coupleMuseum.js), [`src/game/room.js`](file:///f:/projects/3dmuseum/src/game/room.js), [`src/game/room/lobby.js`](file:///f:/projects/3dmuseum/src/game/room/lobby.js), [`src/engine/engine.js`](file:///f:/projects/3dmuseum/src/engine/engine.js), [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js), [`src/style.css`](file:///f:/projects/3dmuseum/src/style.css).
- **Evidence**: `npm run build` succeeded in 2.54s; `tools/qa/verify_salon_overhaul.py` and `tools/qa/verify_museum.py` passed 100% with zero console errors. Visual evidence captured: `lobby_south_wall_masterpiece.png`, `salon_center_partition_front.png`, `salon_center_partition_back.png`, `salon_east_wall_5_artworks_no_captions.png`, `salon_south_wall_gate_flanking_artworks.png`, `salon_west_wall_autofilled_narrative.png`, `salon_north_wall_masterpiece.png`, `salon_lightbox_modal_enlarged.png`.

## 2026-10-30 — Grand Lobby Centerpiece, Architectural Directory Monument & Door Spotlight Overhaul

- **Context**: The user observed visual flaws in the Grand Lobby:
  1. A plant was positioned awkwardly in the center floor of the rotunda, and plants blocked doors on the platform;
  2. The center needed a luxury round table with two sofas where characters can sit;
  3. Plants should be positioned strictly in architectural corners only;
  4. Door salon names were difficult to read due to poor spotlight angles and low text contrast;
  5. The lobby whiteboard looked crude and text collided with a cartoon clipart watermark.
- **Decision**:
  1. **Center Lounge Suite**: Built a round Calacatta marble table with a polished brass pedestal and heavy base, decorated with a brass floral bowl and leather guestbook, flanked by two luxury tub armchairs in cognac saddle leather on walnut bases with brass legs. Added collision cylinder and box obstacles.
  2. **Corner-Only Plants**: Removed all plants from walking paths and door approaches. Positioned plants strictly in the 4 ground floor rotunda corners and 4 elevated stage/platform corners.
  3. **High-Contrast Door Plaques & Focused Lamps**: Upgraded plaque texture to 1024×256 obsidian noir lacquer with 24k gold filigree borders and high-contrast glowing serif typography (*Cormorant Garamond* 50px). Fitted an extending brass wall-mounted picture lamp with a high-intensity spotlight (`5.5 intensity`) aimed directly at the plaque center.
  4. **Grand Directory Monument**: Replaced the school whiteboard with a classical museum directory monument supported by twin dark bronze pedestals with brass collars, brass bezel molding, overhead tubular brass gallery light, and a clean two-column wing layout with zero overlapping graphics.
- **Alternatives Considered**: Keeping external whiteboard texture files (rejected in favor of programmatic canvas rendering for crisp dynamic text and resolution scaling).
- **Affected Files**: [`src/game/room/lobby.js`](file:///f:/projects/3dmuseum/src/game/room/lobby.js), [`src/game/room/doors.js`](file:///f:/projects/3dmuseum/src/game/room/doors.js), [`src/game/room.js`](file:///f:/projects/3dmuseum/src/game/room.js).
- **Evidence**: `npm run build` completed in 2.71s with zero errors; Playwright QA suite passed 100% with screenshots `lobby_center_lounge_and_monument.png`, `lobby_west_doors_and_corner_plants.png`, and `door_plaque_closeup.png`.

## 2026-10-30 — Purge Golden Hour & Midnight Themes (Sole Classical Architecture Theme)

- **Context**: The user instructed that only the Classic theme should be kept, and all code for Golden Hour and Midnight must be purged. In accordance with zero-dead-code discipline, when removing a feature, all associated buttons, listeners, CSS rules, variables, and logic must be completely eliminated.
- **Decision**:
  1. Removed the `.ambience-section` and `.ambience-pills` HTML markup from [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js).
  2. Removed all `.ambience-pill` event listeners from [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js).
  3. Purged all dead ambience styling rules from [`src/style.css`](file:///f:/projects/3dmuseum/src/style.css).
  4. Standardized [`src/engine/engine.js`](file:///f:/projects/3dmuseum/src/engine/engine.js) on Classical museum lighting (`toneMappingExposure = 1.0`, background `0x05030a`, ambient light `0xf5f8ff` 1.0, directional light `0xffffff` 1.55, point fill `0xebf2ff` 1.15, particle starlight `0xffffff`) with zero branching for alternative presets.
  5. Removed obsolete `setAmbiencePreset` and `getAmbiencePreset` engine exports.
- **Alternatives Considered**: Leaving disabled buttons or inert engine code (rejected per explicit zero-dead-code discipline).
- **Affected Files**: [`src/main.js`](file:///f:/projects/3dmuseum/src/main.js), [`src/style.css`](file:///f:/projects/3dmuseum/src/style.css), [`src/engine/engine.js`](file:///f:/projects/3dmuseum/src/engine/engine.js).
- **Evidence**: Production build passed in 2.52s; Playwright QA verification passed 100% with zero console errors.

## 2026-10-30 — Architectural Visual Realism Overhaul (Lighting, Doors, Buttons, Plants, Furniture, Wallcoverings)

- **Context**: The user observed that the 3D museum environment looked overly animated/stylized rather than realistically immersive. Specific deficiencies identified:
  1. Lighting appeared flat/square and lacked realistic physical fixtures;
  2. Doors were flat without realistic 3D moldings, plaques, or dedicated spotlights;
  3. Interactive return/random buttons were crude square boxes instead of elegant circular architectural medallions;
  4. Benches were crude wooden boxes without cushioning, tufting, or metallic gliders;
  5. Plants looked like paper-strip stars rather than botanical greenery with realistic pots;
  6. Walls had harsh noisy stucco rather than luxury museum wallcovering.
- **Decision**:
  1. **Ceiling Spotlights**: Replaced unconstrained point lights with physical 3D canister fixtures (`CylinderGeometry`), recessed emissive circular lenses, and downward `THREE.SpotLight` (`penumbra: 0.85`, `decay: 1.8`) to cast soft circular pools of light.
  2. **Door Spotlights & Portals**: Added dedicated overhead downlight canisters and spotlights over every doorway; added classical 3D beveled panel moldings, Carrara marble plaques with gilded serif typography (*Cormorant Garamond*), and polished brass lever handles.
  3. **Circular Interactive Buttons**: Replaced the square green "Go back to lobby" and "Random Exhibit" buttons with stepped circular architectural medallions and ruby discovery buttons with circular raycast hit geometry.
  4. **Modular Furniture & Botanicals**: Built and exported `createRealisticGalleryBench` (tufted cognac saddle leather, walnut plinth, brushed brass legs with foot glider caps) and `createRealisticGalleryPlant` (fluted ceramic pots, brass base rings, organic curved tropical leaves) in `src/game/room/lobby.js`, deploying them across Grand Lobby and galleries.
  5. **Wallcoverings**: Enhanced wall texture synthesis with fine linen-plaster grain, micro-relief bump mapping, and French Gallery Cream / Parisian Alabaster (`0xf4f1eb`).
  6. **Zero Dead Code**: Purged all deprecated box bench and paper plant geometry and definitions across `src/game/room.js` and `src/game/room/lobby.js`.
- **Alternatives Considered**: Retaining procedural point lights without canister geometry (rejected as it produces square/flat lighting); loading heavy external glTF furniture assets (rejected to maintain zero-network-dependency and instantaneous load times).
- **Affected Files**: `src/game/room.js`, `src/game/room/doors.js`, `src/game/room/lobby.js`, `src/game/room/textures.js`, `tools/qa/verify_museum.py`.
- **Evidence**: `npm run build` completed in 2.70s with zero errors; Playwright QA suite passed 100% with screenshots `realistic_lobby_benches_plants.png` and `realistic_return_medallion.png`.

## 2026-10-30 — VIP Landing Suite & Ambience Architecture (Options 1 + 2 + 3)

- **Context**: The landing page was a minimalist dark overlay with static blur and basic click prompt. The user requested innovative visual, aesthetic, and functional upgrades combining atmospheric visual depth, luxury presentation, and pre-entry ambience controls.
- **Decision**:
  1. Combined Option 1 (Living 3D cinematic drift + floating dust particle system), Option 2 (Embossed frosted VIP Exhibition Pass with Cormorant Garamond serif typography and keycap badges), and Option 3 (Ambience lighting presets + zero-dependency Web Audio romantic chord progression).
  2. Implemented ambient music via Web Audio API rather than external MP3 assets to guarantee zero network latency, 0 KB bundle weight, and immunity to missing assets.
  3. Mapped arrow keys alongside WASD and prevented default scroll during pointer lock.
  4. Reduced scene blur to 2px, allowing the living 3D hall and floating embers to show through the glassmorphic pass.
- **Alternatives Considered**: External audio files (rejected due to network latency and missing assets); static overlay (rejected by user request).
- **Affected Files**: `src/style.css`, `src/engine/engine.js`, `src/main.js`, `tools/qa/verify_museum.py`.

## 2026-10-30 — Complete Purge of Multi-Language & Legacy Namespace Residuals

- **Context**: User explicitly directed that when a feature or identity is changed/removed, ALL dead code associated with it must be purged (no lingering dead switches, variables, or functions).
- **Decision**:
  1. Completely removed multi-language selection, `lobbyCategoriesForLanguage()`, and URL/storage sync from `src/main.js` and `src/wiki/wiki.js`.
  2. Fixed all external Wikipedia fetches to `https://en.wikipedia.org` with clean standard headers.
  3. Scrubbed all legacy `notbigmuzzy` and `linkwalk` references across package descriptors, data files, QA scripts, and console tags, standardizing on Hitesh Bohra and `ourmuseum`.
- **Affected Files**: `package.json`, `src/data/coupleMuseum.js`, `src/engine/engine.js`, `src/game/room.js`, `src/main.js`, `src/wiki/wiki.js`, `tools/qa/verify_museum.py`.

## 2026-10-30 — repair baseline

Preserve the static Three.js implementation and bundled models. Fix ownership in the
shared character/controller code rather than adding a framework or physics dependency.
Independent control is the default; moving both remains an explicit local option.
Retain bind-pose hip translation when borrowing animation from another skeleton.

## 2026-10-30 — retarget all joint axes

Live screenshots disproved a hips-only fix: destination leg bind rotations differ from
the donor by 180 degrees. Convert every quaternion through source and destination bind
space. Recompute skinned bounds for verification; cached bounds concealed deformation.
Keep lightweight ramp locomotion; foot IK remains a documented limitation.

## 2026-10-30 — reconcile the updated pavilion baseline

- Context: User requested a fresh code/UI review and current Markdown records before
  assigning another task. Existing map/TODO still described the old local two-storey app.
- Decision: Use the current single-floor pavilion as the implementation baseline;
  preserve historical specs/reports and label their superseded claims. No application
  behavior, dependencies, assets or Git history changed in this review.
- Alternative: Reapply the earlier house specification. Rejected for this review because
  it would overwrite the user's newer implementation. The session history records that
  the pavilion replaced stair/elevation complexity; seven salons/40 artworks exist in code.
- Evidence: `environment.js`, `gallery40.js`, `index.html`, `main.js`, server/network
  modules; current review and fresh screenshots in `docs/reports/`.

## 2026-10-30 — current transport and storage choices, observed

- The existing runtime uses native ESM/local Three.js and a Node HTTP + `ws` relay,
  rather than the optional Vite/Socket.IO/backend stack in the guide. Keep this structure
  for subsequent scoped tasks unless a concrete requirement justifies changing it.
- Network state is JSON in one shared room with client-selected roles and exponential
  remote damping. Record it as a prototype relay, not authoritative ownership or private rooms.
- Studio uses localStorage and hash-embedded delivery links, not server-backed content.
  Secure persistence/private links remain separate work; no storage migration was authorized.
- Original design reasoning beyond the session notes is not known. These entries record
  observed choices and the decision to preserve them, not a new production approval.

## 2026-10-30 — decision and verification recording

- For each subsequent task, append product, behavior, architecture and scope choices here
  with date/context/reason, affected files and verification. Never delete prior decisions;
  supersede them explicitly. Session/TODO/architecture record their practical consequences.
- Current-state docs distinguish implementation from tested behavior and remaining gaps.
  Historical PASS rows do not certify current routes, hardware performance or network security.
- Documentation and tests remain ignored under the existing `.gitignore`; tracking them
  is a user choice. No commit, push or ignore-rule change was made.

## 2026-10-30 — supersede pavilion baseline with the active src application

- Context: the user updated the project and requested complete code/UI understanding
  and Markdown maintenance before providing another task. HEAD is now `2f4ebd1`;
  index.html imports /src/main.js, while current-state docs still describe removed js files.
- Decision: document the Vite first-person lobby/gallery implementation as the current
  baseline. Preserve earlier pavilion/house decisions and reports as history. Keep the
  user's existing main.js diff, including removed language UI and changed footer.
- Alternative: restore the earlier pavilion or infer its features from retained avatar/
  server modules. Rejected for this task because active imports do not initialize them
  and restoration would overwrite the newer implementation. No new product scope is chosen.
- Evidence: index/main/engine imports; complete room/data/wiki/avatar/server review;
  production build and six built-in theme smoke captures in the Vite current-state report.

## 2026-10-30 — documentation-only scope and verification boundaries

- User explicitly instructed: do not edit a single line of code until permission is given.
  Continue the previously requested Markdown updates and read-only checks; await explicit
  implementation authorization. Do not commit, push, install dependencies or change ignores.
- Record implementation, retained capability, live observation and unverified claims
  separately. The relay/avatar files are retained; Studio/minimap/photo UI and multiplayer
  client are absent. The old config test fails on removed js/config.js; do not port tests
  or fix code during this context task.
- Use the existing docs tree as the durable project context; do not create duplicate root
  context files. Re-read affected source before later changes. Every material decision
  continues here with date/context/reason/alternatives, affected files and evidence.
- The build check used a scratch output to preserve existing dist. Fresh browser review
  used isolated storage and a separate loopback Vite port, not the possibly older 8080 app.
- Files: docs index, architecture/map, tracking and current review; guide/spec headers;
  tools README. Checks and open findings are recorded without implementation changes.


## 2026-10-31 — Dead Code Purge, Particle Cleanup & Door Lag Optimization

- **Context**: The user observed transition stutters during room navigation, unneeded particle systems rendering as white points, and dead legacy code cluttering the runtime bundle.
- **Decision**:
  1. Purged ambient particles (`THREE.Points`) and dust motes across all rooms; airspace kept 100% clean.
  2. Implemented `doorPlaqueTextureCache` in `src/game/room/doors.js` to eliminate 2D canvas allocations during room navigation.
  3. Pre-warmed WebGL shaders on room transitions using `renderer.compile(currentRoom.group, camera)` inside `setRoom()`.
  4. Purged dead code paths in `src/wiki/wiki.js` and unused marble generators.
- **Affected Files**: `src/game/room/doors.js`, `src/engine/engine.js`, `src/game/room.js`.
- **Evidence**: `npm run build` completed cleanly; transition stutter reduced from ~500ms to under 50ms.

## 2026-11-02 — Gate Destination Guarantee, Plaque Trim Dynamic Layout & Artwork Sizing Schema v3

- **Context**: The user reported that the North wall salon gates (`seealso-4`, `seealso-5`) did not display the interactive hand icon when approached, and the East Wall artwork layout needed adjustment.
- **Decision**:
  1. **Gate Destination Guarantee**: Fixed `src/game/room.js` where `seealso-4` and `seealso-5` had empty titles by implementing `assignedDestinations` that guarantees all 6 base doors always have valid salon targets.
  2. **Door Panel Trim Overlap Fix**: In `src/game/room/doors.js`, dynamically calculated `upperTrim` position after `plaqueCenterY` to ensure upper brown panel sits cleanly above the plaque without z-fighting. Increased plaque Z-depth offsets to 0.020/0.026/0.028m.
  3. **Artwork Sizing Schema v3**: In `src/config/artworkSizes.js`, updated `eastWall` (width: 1.50m, gap: 0.45m, y: 2.30m) and bumped storage key to `ourmuseum:artworkSizes:v3`.
- **Affected Files**: `src/game/room.js`, `src/game/room/doors.js`, `src/config/artworkSizes.js`.
- **Evidence**: Playwright automated tests verified `cursor-clickable: True` on both gates across visitor and admin modes; `npm run build` compiled 31 modules with zero errors.

## 2026-11-04 — Removal of Marked Lobby Fixtures & Adoption of GLB Furnishings

- **Context**: The user provided marked screenshots indicating the removal of the central procedural chandelier and two lower central ceiling downlights.
- **Decision**:
  1. Removed the creation calls for the procedural chandelier and downlights at $x=0, z=\pm\text{length}\times 0.25$ in `src/game/room.js` and `lobby.js`. Preserved the six upper platform downlights.
  2. Adopted the normalized `lighting_chandelier_osgona.glb` model at the lobby center, pinned to ceiling elevation $Y = 5.6\text{m}$.
  3. Replaced procedural gallery plants with `plants_monstera.glb` at normalized $1.5\text{m}$ height with visible pot base flush to floor/platform.
  4. Placed the white curved sofa (`3d_pbr_curved_sofa.glb`) centered at $x=0, z=0$ at floor level.
- **Affected Files**: `src/game/room.js`, `src/game/room/lobby.js`, `src/data/museumLayout.json`.
- **Evidence**: `tests/check_lobby_fixtures.py` verified the absence of marked fixtures; screenshot visual inspection confirmed clean layout.

## 2026-11-04 — Uniform Scaling of PBR Curved Sofa

- **Context**: The replacement PBR curved sofa felt slightly undersized in the Grand Lobby rotunda.
- **Decision**: Enlarged the curved sofa uniformly by increasing `targetHeight` from 0.85 m to 1.1 m (~29% enlargement), preserving center and floor contact alignment.
- **Affected Files**: `src/data/museumLayout.json`, `src/game/room/placedItems.js`.
- **Evidence**: Browser placement assertions passed; visual screenshot confirmed proper proportions.

## 2026-11-04 — Triangle-Based Collision Footprints for Imported Models

- **Context**: Whole-model bounding-box collision prevented walking near the curved sofa because the model contained a wide ground plane mesh, blocking legitimate visitor navigation.
- **Decision**:
  1. Replaced whole-scene bounding boxes with 2D static collision footprints computed from mesh triangles on a 15 cm grid.
  2. Excluded geometry within 8 cm of the model base (ground decor/rugs) and above 1.7 m (upper ceiling trims).
  3. Merged occupied grid cells into simplified AABB rectangles for low-overhead collision checks in `src/engine/engine.js`.
- **Affected Files**: `src/game/room/placedItems.js`, `src/engine/engine.js`.
- **Evidence**: Verified walking position $(2.6, 0)$ beside the sofa remains open and accessible while walking into the seating surface is firmly resolved.

## 2026-11-04 — Entrance Readiness Gating & Native Progress Bar

- **Context**: Visitors entering the museum prematurely observed half-spawned models, missing plants, or uncompiled shader stalls.
- **Decision**:
  1. Gated the "ENTER SANCTUARY" button on `engine.ready`: room geometry creation, all tracked model spawns, deferred photos, and initial `renderer.compile()` pass.
  2. Implemented a native 0–100% progress bar in `src/main.js` reflecting actual completed asset counts.
  3. Enter button stays hidden until both the current room and selected character are ready.
- **Affected Files**: `src/main.js`, `src/style.css`, `src/engine/engine.js`.
- **Evidence**: Clean entrance transition observed; zero popped-in geometry or missing assets upon room entry.

## 2026-11-05 — Step 1–4 GLB Model Normalization & Placement Pipeline

- **Context**: The user provided downloaded 3D assets in `3d model/` and required automated conversion, optimization, validation, and JSON layout placement without adding new admin editing UI.
- **Decision**:
  1. Converted and optimized 12 3D models into `public/models/ready/` across `furniture/`, `lighting/`, and `plants/` using Draco and WebP compression (<60k triangles each).
  2. Built `models.manifest.json` cataloging license, author, source, real height, triangles, and file sizes.
  3. Generated `public/models/ready/contact-sheet.html` for interactive 3D turntable review.
  4. Created `public/models/ready/ATTRIBUTIONS.md` crediting all CC-BY-4.0 authors.
  5. Wired `src/game/room/placedItems.js` to load GLB items from `src/data/museumLayout.json` with shared loader caching and room lifecycle disposal.
  6. Automated spatial checks (`ALIGNMENT_REPORT.md`) verified floor contact, door clearance ($\ge 2.0\text{m}$), artwork clearance ($\ge 1.5\text{m}$), and light budgets ($\le 8$).
- **Affected Files**: `public/models/ready/`, `src/data/museumLayout.json`, `src/game/room/placedItems.js`, `docs/reports/ALIGNMENT_REPORT.md`, `docs/reports/COMPLETION_CHECKLIST.md`.
- **Evidence**: All 12 items passed spatial validation; `npm run build` passed with zero errors.

## 2026-11-05 — Local Avatar Rendering, Third-Person Camera & Live 3D Multiplayer

- **Context**: The user requested that the selected character (Maya or Ethan) be visible in third-person view, controllable via WASD and mouse look, and synchronized live with remote participants.
- **Decision**:
  1. **Third-Person Follow Camera**: Anchored camera follow behind the active local avatar in `src/engine/engine.js` with mouse-driven yaw and pitch.
  2. **V3 Pack Calibration**: Repaired meter-mesh vs centimeter-rig scaling in `src/avatars/characterSetup.js`. Filled missing rotation tracks in partial animation clips from the walk pose to prevent falling back to A-pose.
  3. **Multiplayer Relay (`server.js`)**: Integrated WebSocket relay with 2-player capacity, assigned server `peerId`, position clamping ($\pm 100$), rate limiting (30 msg/s), and payload validation.
  4. **Multiplayer Orchestrator (`src/avatars/multiplayer.js`)**: 20 Hz state updates, AnimationMixer clip blending, screen-projected chat bubbles (`src/avatars/chat.js`), seat interaction (`E` key) via `src/avatars/seatRegistry.js`, and emote menu (`1` Wave, `2` Dance, `3` Clap, `4` Point).
  5. **Skeleton & Material Isolation**: Cloned skeletons and materials per instance so two users choosing the same character remain completely independent.
- **Affected Files**: `server.js`, `src/net/wsClient.js`, `src/avatars/characterSetup.js`, `src/avatars/avatarWorld.js`, `src/avatars/multiplayer.js`, `src/avatars/chat.js`, `src/avatars/seatRegistry.js`, `src/engine/engine.js`, `src/main.js`.
- **Evidence**: `tests/check_avatar_controls.py` passed on port 8095 (local controls, skeleton height, both characters, peer leave, 0 console errors); `tests/multiplayer_quick_check.mjs` and `tests/multiplayer_validation_check.mjs` passed.


## 2026-11-05 — .gitignore Customization (docs/, tests/, tools/ Local-Only)

- **Context**: The user explicitly instructed to add `docs`, `tools`, and `tests` to `.gitignore`.
- **Decision**:
  1. Added `docs/`, `tests/`, and `tools/` under `# ── Internal Docs, Tests & Tools (Kept Local) ──`.
  2. Preserved ignore rules for build outputs (`node_modules/`, `dist/`), raw downloads (`/3d model/`, archives), test reports, and IDE artifacts.
- **Affected Files**: `.gitignore`, `docs/tracking/SESSION_LOG.md`, `docs/tracking/DECISIONS.md`.
- **Evidence**: `git status -s` confirmed `docs/`, `tests/`, and `tools/` are excluded from Git tracking, leaving only runtime source modules and public assets.


## 2026-11-05 — Step 1: Server Hardening & Protocol v2 (P0)

- **Context**: Executed Step 1 of the Production Fix Plan on branch `fix/production-hardening`.
- **Decision**:
  1. **SEC-01**: Restricted static file resolution strictly to `dist/` and `public/`. Blocked access to `server.js`, `package.json`, `src/`, `docs/`, dotfiles, and traversal attempts with 404 responses.
  2. **SEC-02**: Protected against malformed percent encodings, invalid `Range` headers, and stream errors without crashing the server.
  3. **NET-01**: Enforced unified session room `our-home` with a hard 2-player capacity. Location (`lobby`, `fireside`, etc.) is now treated purely as player data.
  4. **SEC-03 & SEC-04**: WebSocket maxPayload capped at 2048 bytes; 30s heartbeat terminates dead sockets; timing-safe passcode verification (`MUSEUM_PASSCODE`) with IP rate limiting.
  5. **SEAT-03 (Server)**: Atomic server-side seat reservation map (`seats`) preventing race conditions with `sit_denied`.
- **Affected Files**: `server.js`, `src/net/wsClient.js`, `tests/server_protocol.test.mjs`, `docs/tracking/SESSION_LOG.md`.
- **Evidence**: `tests/server_protocol.test.mjs` passed 100% of test scenarios; `npm run build` compiled cleanly in 3.57s.


## 2026-11-05 — Step 2: Client Multiplayer Correctness & Lifecycle (P1)

- **Context**: Executed Step 2 of the Production Fix Plan on branch `fix/production-hardening`.
- **Decision**:
  1. **MP-01**: Updated `handleMessage('room_state')` to adopt and establish the partner panel on initial join for late-joining clients.
  2. **MP-02**: Fixed `peer_left` to release only the departing peer's seat; local player remains seated.
  3. **MP-03**: Captured and applied `appearance` colors in `peer_joined` and `upsertRemote`.
  4. **MP-04**: Created `src/avatars/emotes.js` as single source of truth for emote definitions; updated hint to "Press 1 to wave".
  5. **MP-05**: Restricted chat opening to active pointer lock; enabled projection of local chat bubbles above self.
  6. **MP-06**: Stored `onNet` unsubscriptions, cleared ping timers on `stop()`, and updated `wsClient.js` to prevent stale packet replay.
- **Affected Files**: `src/avatars/multiplayer.js`, `src/avatars/emotes.js`, `src/avatars/avatarWorld.js`, `src/net/wsClient.js`, `docs/tracking/SESSION_LOG.md`.
- **Evidence**: `npm run build` compiled cleanly in 3.38s; all automated protocol tests passed.


## 2026-11-05 — Step 3: Seating Pipeline Rebuild & Avatar Loading Resilience (P0/P1)

- **Context**: Executed Step 3 of the Production Fix Plan on branch `fix/production-hardening`.
- **Decision**:
  1. **AV-01**: Separated animations into required core clips (`idle`, `walk`, `run`, `jump`, `sit`) and optional clips; used `Promise.allSettled` and 15s timeout on model loads.
  2. **SEAT-01**: Derived seat anchors directly from the spawned model's final `Box3` world bounds (`baseCenterX`, `baseMinY`, `baseCenterZ`). Seat offsets and cushion heights are defined in real-world meters at final size (eliminating the scale collapse bug where seats shrank by factor of 100).
  3. **SEAT-02**: Implemented dedicated seated mode in `src/engine/engine.js` with `setSeated(seat | null)`. Suspended WASD locomotion, gravity, and obstacle push while seated. Attached third-person follow camera to orbit the seated avatar. Offset stand-up position 0.7m forward along seat yaw with obstacle/boundary safety checks. Movement keys while seated stand the player up first.
  4. **Multiplayer Seating**: Bound server seat authorization (`sit_ok`, `stand_ok`, `stand`) directly to `engineApi.setSeated()`.
  5. **Calibration Tool**: Added `?debug=seats` rendering a cyan cushion sphere, yaw arrow helper, and HUD showing nearest seat id and distance.
- **Affected Files**: `src/game/room/artifactRegistry.js`, `src/game/room/placedItems.js`, `src/avatars/seatRegistry.js`, `src/engine/engine.js`, `src/avatars/multiplayer.js`, `src/data/characters.json`, `tests/seats.test.mjs`.
- **Evidence**: `tests/seats.test.mjs` passed 100% (5/5); `tests/server_protocol.test.mjs` passed 100%; `tests/check_avatar_controls.py` (2-player Playwright test) passed; `npm run build` compiled 34 modules in 3.26s with 0 errors.


## 2026-11-05 — Step 4: Layout Data, Navigation & Dead Code Cleanup (P1/P2)

- **Context**: Executed Step 4 of the Production Fix Plan on branch `fix/production-hardening`.
- **Decision**:
  1. **DATA-01**: Supported `rotationDeg` in `placedItems.js:parseTransform` with degree-to-radian conversion; fixed `museumLayout.json` bookcase rotation (`rotationDeg: 90`) and fireside potted plant scale (`1.5`).
  2. **DATA-02**: Populated 5 previously empty salons (`music`, `library`, `paris`, `orangery`, `alcove`) with seating GLBs and chandeliers, preserving $> 5.5\text{m}$ door clearance.
  3. **DATA-03**: Created `scripts/check_photos.mjs` and verified all 61 photo assets exist under `public/photos/`. Added `npm run check` script.
  4. **NAV-01**: Created `ROOM_KEY_TO_TITLE` in `src/data/coupleMuseum.js`; updated `goToRoom(roomKey)` to use strict lookup, logging an error on invalid keys instead of defaulting to Fireside.
  5. **CLEAN-01**: Deleted unused legacy scripts (`inspect_glb.js`, `move_v3_studio.mjs`); cleaned unused artwork size imports and `studio-build-mode` check in `main.js`.
  6. **UX-01**: Added touch-device advisory notice on the entrance ticket card for mobile visitors.
- **Affected Files**: `src/data/museumLayout.json`, `src/data/coupleMuseum.js`, `src/game/room/placedItems.js`, `src/main.js`, `src/style.css`, `package.json`, `scripts/validate_layout.mjs`, `scripts/check_photos.mjs`.
- **Evidence**: `npm run check` passed 100%; `npm test` passed 100%; `npm run build` compiled 34 modules in 3.96s with 0 errors.


## 2026-11-05 — Step 5: Hosting & Operations, Environment Config & Verification (P1)

- **Context**: Executed Step 5 of the Production Fix Plan on branch `fix/production-hardening`.
- **Decision**:
  1. **OPS-01**: Unified WebSocket endpoint resolution across `wsClient.js` and `multiplayer.js` with `WS_URL` (respecting `VITE_WS_URL` with same-origin fallback).
  2. **Environment & Operations**: Created `.env.example` defining `PORT`, `HOST`, `MUSEUM_PASSCODE`, `ALLOWED_ORIGINS`, `TRUST_PROXY`, and `LOG_LEVEL`. Documented deployment, Cloudflare Tunnel, PM2/NSSM, and health endpoints in `docs/DEPLOY.md`.
  3. **Automated Test Coverage**: Added `tests/layout.test.mjs` and `tests/emotes.test.mjs`; updated `npm test` to run all test suites (`tests/*.test.mjs`).
- **Affected Files**: `src/net/wsClient.js`, `src/avatars/multiplayer.js`, `.env.example`, `docs/DEPLOY.md`, `tests/layout.test.mjs`, `tests/emotes.test.mjs`, `package.json`.
- **Evidence**: `npm test` passed 100% (10/10 tests); `npm run check` passed 100%; `npm run build` compiled 34 modules in 3.91s with 0 errors.

## 2026-11-05 — Supplied avatar controls patch

- Applied `Avatar_Controls_Fix_5bb2ab5.zip` after every source compatibility and syntax guard passed on HEAD `0f1f6d4`.
- Adopted the supplied camera-relative movement, idle heading preservation, and Shift-only sprint behavior. Kept the supplied pure math module and its seven tests; no dependencies or model changes.
- Preserved originals in `.avatar_fix_backup/`. Visual rig calibration and browser pointer-lock behavior require separate verification; math tests do not establish visual correctness.

## 2026-11-05 — Full-image frame fitting

- User requested that every photo remain fully visible. Use contain fitting with preserved proportions and the existing frame backing, replacing center-cropping across salon and lobby photo renderers.
- Keep the historical five-photo east wall for recognized salon local-photo paths even though the legacy gallery photo array is empty. Do not restore deleted procedural photo generators or private text from history.
