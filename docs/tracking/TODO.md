# TODO — Backlog & Verified Task Ledger

**Current Baseline:** 05 November 2026  
**Status Legend:** `[x]` Completed & Verified · `[ ]` Open / Pending Execution

---

## 1. Recently Completed & Verified

### 1.1 3D GLB Model Pipeline (Steps 1–4)
- [x] Converted and normalized 12 3D models into `public/models/ready/` (`furniture/`, `lighting/`, `plants/`) with Draco geometry compression and WebP textures (<60k triangles each).
- [x] Generated `models.manifest.json` cataloging license, author, source, real height, triangles, and sizes.
- [x] Built `public/models/ready/contact-sheet.html` for interactive 3D turntable model review.
- [x] Created `public/models/ready/ATTRIBUTIONS.md` crediting all CC-BY-4.0 authors.
- [x] Extended `src/game/room/placedItems.js` to load GLB items from `src/data/museumLayout.json` with shared `gltfCache` and room lifecycle disposal.
- [x] Generated `docs/reports/ALIGNMENT_REPORT.md` and `docs/reports/COMPLETION_CHECKLIST.md` passing all spatial checks:
  - Floor contact: $\le 1\text{cm}$ gap.
  - Wall items flush: $\le 1\text{cm}$ gap.
  - Door clearance: $\ge 2.0\text{m}$.
  - Artwork frame clearance: $\ge 1.5\text{m}$.
  - Dynamic light budget: $\le 8$ per room.
- [x] Uniform scaling applied to white curved sofa (`3d_pbr_curved_sofa.glb`, 1.1 m height) and Monstera plants (1.5 m height).
- [x] Procedural lobby fixtures (central chandelier and two lower central downlights) removed per user markings.

### 1.2 Collision & Entrance Flow
- [x] Implemented triangle-based static collision footprints for imported floor models on a 15 cm grid, excluding ground decoration (<8 cm) and upper ceiling trims (>1.7 m), preserving walkable gaps around curved sofas and tables.
- [x] Entrance readiness gating on `engine.ready`: "ENTER SANCTUARY" remains locked until room geometry, GLB model spawns, deferred photos, and initial shader compilation complete.
- [x] Native 0–100% progress bar in `src/main.js` reflecting actual asset completion.

### 1.3 Local Avatar & Third-Person Camera
- [x] Rendered selected character (Maya or Ethan) with engine-driven third-person follow camera.
- [x] Wired WASD locomotion, mouse look, Shift sprint, and Space jump to character AnimationMixer.
- [x] V3 animation pack calibration in `src/avatars/characterSetup.js`: fixed meter-mesh vs centimeter-rig scale mismatch.
- [x] Filled missing rotation tracks in partial animation clips from base walk pose (prevents fallback to A-pose/T-pose).
- [x] Per-instance skeleton and material cloning allowing two users to pick the same character independently.

### 1.4 Live 3D Multiplayer & Social Features
- [x] Node.js WebSocket relay in `server.js` (`/ws` upgrade) with 2-player capacity, position clamping ($\pm 100$), rate limiting (30 msg/s), and server-assigned authentic `peerId`.
- [x] Client orchestrator `src/avatars/multiplayer.js` with 20 Hz state synchronization and AnimationMixer clip crossfades.
- [x] Screen-projected DOM chat bubbles (`src/avatars/chat.js`) with 120-character limit and 5-second fade.
- [x] Interactive seat registry (`src/avatars/seatRegistry.js`) deriving world-space seat anchors from `artifactRegistry.js` + `museumLayout.json` with mutual occupancy locking (`E` key).
- [x] Emote menu: `1` Wave, `2` Dance, `3` Clap, `4` Point.
- [x] Salon navigation synchronization with partner "Go there" notification panel.

### 1.5 Architectural & Interaction Bug Fixes
- [x] Guaranteed all 6 base doors (including North wall `seealso-4`, `seealso-5`) always have valid destination titles, ensuring the interactive hand cursor appears reliably.
- [x] Fixed door panel trim overlap: dynamically positioned `upperTrim` above plaque to eliminate z-fighting; adjusted plaque Z-offsets to 0.020/0.026/0.028 m.
- [x] Adopted tuned East Wall dimensions (width 1.50 m, gap 0.45 m, y 2.30 m) and bumped storage schema key to `ourmuseum:artworkSizes:v3`.
- [x] Fast door plaque canvas texture cache (`doorPlaqueTextureCache`) eliminating canvas allocation during navigation.
- [x] 100% clean airspace: eliminated all `THREE.Points` particle motes and hovering rectangles.

---

## 2. Active Pending Tasks & Backlog

### Avatar controls patch verification (2026-11-05)
- [x] Apply supplied ZIP after compatibility checks; pass 17 tests, layout/photo checks, build, active model references, and two-client movement/gesture/seating synchronization.
- [ ] Verify both rigs visually: W/S/A/D, releasing backward input, diagonal walking versus Shift sprint, Front/Free Orbit, room transitions, sofa stand-up, and joystick.
- [ ] Verify gesture drawer close via G, Close, and Escape in desktop browsers, including pointer-lock refusal and clicking the canvas to resume. Browser/native automation hosts were unavailable during application.
- [ ] Reconcile stale project map/architecture descriptions of admin entry points and old gesture shortcuts with the current source.

### 2.1 Live Two-Browser Verification Pass
- [ ] Conduct live end-to-end verification with two real browser tabs (Maya in Tab A, Ethan in Tab B) walking in the same room.
- [ ] Validate smooth locomotion, emote synchrony, and chat bubble visibility across both windows.
- [ ] Verify seat occupancy lock (avatar sits cleanly on seat, second avatar cannot steal occupied seat).
- [ ] Measure network round-trip latency displayed in the corner HUD chip (`~Nms`).

### 2.2 Performance & Benchmarking
- [ ] Capture A/B frame-time baseline with and without placed GLB models to ensure frame rate degradation is $\le 10\%$.
- [ ] Formal heap profile comparison across 5 consecutive room transitions to verify complete GPU geometry/texture deallocation.

### 2.3 Visual & Control Refinements
- [ ] Third-person camera occlusion against detailed furniture (currently collision-tests against room walls and partition boundaries; low-poly camera proxies recommended for large furniture).
- [ ] Smooth sitting interpolation (procedural blending from standing walk pose into cushion seat anchor).
- [ ] Mobile touch controls (virtual joystick and pinch-to-zoom for smartphone/tablet viewports).

### 2.4 Production Deployment & Hosting
- [ ] Configure production domain / reverse-proxy WebSocket pass-through when migrating from local server (`http://localhost:8080`) to remote cloud host.

### 2.5 Multi-Customer Photo Management (plan/research, no code yet)
- [ ] Review planning doc: `docs/planning/MULTI_CUSTOMER_PHOTO_MANAGEMENT.md`.
- [ ] Phase 1: `--customer` support in `tools/organize_photos.py` + per-customer folder layout + SQLite scaffold.
- [ ] Phase 2: server scoping of `/photos/*` by session customer + `/api/customer/photos` catalog endpoint + two-customer test matrix.
- [ ] Phase 3: admin/import UI, per-customer preview, optional subdomain routing.

### 2.5 Multi-Customer Photo Management (plan/research, no code yet)
- [ ] Review planning doc: `docs/planning/MULTI_CUSTOMER_PHOTO_MANAGEMENT.md`.
- [ ] Phase 1: `--customer` support in `tools/organize_photos.py` + per-customer folder layout + SQLite scaffold.
- [ ] Phase 2: server scoping of `/photos/*` by session customer + `/api/customer/photos` catalog endpoint + two-customer test matrix.
- [ ] Phase 3: admin/import UI, per-customer preview, optional subdomain routing.

### Photo frames (2026-11-05)
- [x] Restore the five east-wall photos in each salon after legacy photo-list removal.
- [x] Preserve full image proportions in salon wall, partition, and lobby frames; verify with regression tests and production build.
- [ ] Visually review all six salon walls and portrait/landscape uploads inside frames in the browser.
