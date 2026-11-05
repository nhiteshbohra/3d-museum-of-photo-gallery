# 3D Museum — Issue Register

**Repository:** `nhiteshbohra/3d-museum-of-photo-gallery`  
**Branch:** `fix/production-hardening`  
**Base Audit SHA:** `893e0c3011d8b32375ad337064116f8d64bad160`  
**Lead Coordinator:** Antigravity Engineering Lead  

---

## Active Issues Register

| ID | Sev | Title | Affected Files | Status | Owner | Acceptance Criteria |
|---|---|---|---|---|---|---|
| **AUTH-NEW-01** | **P0** | Dual click handlers on verification button (`addEventListener` + `.onclick`) | `src/main.js` | OPEN | Senior Developer | Single unified UI state machine (`UNVERIFIED`, `VERIFYING`, `VERIFIED`, `STARTING`, `IN_SANCTUARY`) with a single click dispatcher; no redundant redemption requests or race conditions. |
| **AUTH-NEW-02** | **P0** | Hard-coded `'290512'` injected into readonly input in `checkAuthSession()` | `src/main.js` | OPEN | Senior Developer | Zero hard-coded codes injected into the DOM. Existing authenticated sessions display verified status text and clean placeholder without exposing passcodes in input value. |
| **AUTH-NEW-03** | **P1** | Entangled experience startup flow between button click and automatic session check | `src/main.js` | OPEN | Senior Developer | Explicit deterministic startup flow: verification unhides loading, compiles scene, and transitions smoothly into avatar selection / sanctuary entry. |
| **AUTH-NEW-04** | **P1** | Async `inviteRequired` client flag could permit loose display assumptions | `src/main.js`, `server.js` | OPEN | Senior Developer | Server remains strict authority. Client UI initializes fail-closed until config and auth status resolve. |
| **AVATAR-01** | **P1** | Character GLB native forward axes and visual rig rotation verification | `src/avatars/avatarWorld.js`, `public/models/ready/characters/*.glb` | IN REVIEW | Senior Researcher | Measure local head-front vector, root/hip orientation for both `man.glb` and `woman.glb`; confirm heading accuracy across 8 directions in rear/front/orbit views. |
| **AVATAR-02** | **P1** | Asynchronous animation clip transitions and fallback state machine | `src/avatars/avatarWorld.js` | OPEN | Senior Developer | Deterministic transitions when clips load progressively; prevent frozen gestures, foot sliding, or chair snapping. |
| **PHOTO-01** | **P1** | Aspect-adaptive frame, outline, backplate and pick surface synchrony | `src/game/room.js`, `src/misc/helper.js` | VERIFIED | Senior Developer | Aspect-ratio fitting (portrait, landscape, panorama, square) rescales backing plate, slot outline, and pick surface proportionally across all 7 galleries. |
| **MOB-P0-01** | **P0** | 51.9 MB curved sofa model (`3d_pbr_curved_sofa.glb`) lacks compact mobile LOD | `public/models/ready/furniture/3d_pbr_curved_sofa.glb`, `src/data/museumLayout.json`, `src/game/room/placedItems.js` | OPEN | Senior Developer | Inspect with `gltf-transform`, optimize geometry/textures, generate compact LOD variant, preserve dimensions and seat anchor coordinates. |
| **MOB-P0-02** | **P0** | Uncapped DPR (up to 2.0) on high-density mobile screens causes GPU fillrate bottlenecks | `src/engine/engine.js`, `src/avatars/characterSetup.js` | OPEN | Senior Developer | Implement adaptive DPR tiering with performance hysteresis and optional manual quality selector. |
| **MOB-P0-03** | **P0** | High-resolution avatar texture PNGs (~18.7 MB) loaded synchronously | `src/avatars/avatarWorld.js` | OPEN | Senior Developer | Profile decode overhead; optimize textures / caching while preserving visual quality on Maya and Ethan. |
| **MOB-P1-04** | **P1** | Unbounded `loadedPhotoTextureCache` Map in `engine.js` | `src/engine/engine.js` | OPEN | Senior Developer | Implement ownership-aware, memory-budgeted LRU cache with bounded concurrency and proper texture disposal. |
| **MOB-P1-05** | **P1** | Up to 3 fully resident rooms cloned in memory without progressive disposal | `src/engine/engine.js` | OPEN | Senior Developer | Budget resident rooms based on quality tier; safe asset reference counting. |
| **MOB-P1-06** | **P1** | Multiple requestAnimationFrame loops and per-frame nametag DOM projections | `src/engine/engine.js`, `src/avatars/multiplayer.js` | OPEN | Senior Developer | Consolidate animation loops; throttle offscreen DOM projection calculations. |
| **MOB-P1-07** | **P1** | Touch controls and responsive drawer layout on small viewports (320-390px) | `src/style.css`, `src/main.js` | OPEN | Senior Developer | Responsive touch controls, drawer buttons $\ge 44$px, no overlapping joystick or blocked interactions. |
| **MOB-P2-08** | **P2** | Continuous 20 Hz WebSocket position packets even when idle | `src/avatars/multiplayer.js` | OPEN | Senior Developer | Adaptive network updates: broadcast on delta during movement, drop to heartbeat rate when idle. |
| **MOB-P2-09** | **P2** | Eager monolithic client bundle parse before authentication | `src/main.js`, `vite.config.js` | OPEN | Senior Developer | Dynamic import / code splitting of heavy 3D engine after server session validation. |
