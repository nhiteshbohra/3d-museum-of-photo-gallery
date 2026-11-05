# PROGRESS — Implementation Milestone Tracker

**Current Baseline:** 05 November 2026  
**Active Phase:** Grand Luxury Museum — Single Floor with 6 Salons, 3D GLB Models & Live Multiplayer

---

## 1. Executive Milestone Summary

| Milestone Slice | Status | Core Verification / Evidence |
|---|---|---|
| **S0: Skeleton & Architecture** | ✅ COMPLETE | Vite multi-entry build (`index.html` & `admin.html`), `server.js` |
| **S1: Single-Floor Grand Museum** | ✅ COMPLETE | Grand Lobby + 6 Salons (`fireside`, `music`, `library`, `paris`, `orangery`, `alcove`) |
| **S2: Locomotion & Collision** | ✅ COMPLETE | WASD + mouse look, 15 cm triangle collision footprints, door walk-through |
| **S3: 61 Exhibition Artworks** | ✅ COMPLETE | 1 Lobby Masterpiece + 10 artworks/room × 6 salons, auto-fit, no-text lightbox |
| **S4: Artwork Sizing Architecture** | ✅ COMPLETE | `artworkSizes.js` (schema v3), live resizer HUD in admin mode |
| **S5: Fast Door Transitions** | ✅ COMPLETE | Cached door plaque canvases, 6m raycast reach, return-to-door continuity |
| **S6: 3D GLB Model Pipeline** | ✅ COMPLETE | 12 models normalized in `public/models/ready/`, Draco/WebP, manifest, attributions |
| **S7: Spatial Alignment Pass** | ✅ COMPLETE | Zero overlaps, $\le 1\text{cm}$ floor gap, $\ge 2.0\text{m}$ door clearance, $\ge 1.5\text{m}$ art clearance |
| **S8: Local Avatar & 3rd-Person Cam** | ✅ COMPLETE | Local avatar follow camera, WASD locomotion, V3 rig calibration, cloned skeletons |
| **S9: Live 3D Multiplayer Relay** | ✅ COMPLETE | Node WebSocket relay, 2-player cap, position clamping, rate limiting, assigned IDs |
| **S10: Social Interactions** | ✅ COMPLETE | Emote menu (1-4), chat bubbles (120 chars), seat registry with occupancy lock |
| **S11: Entrance Gate & Progress Bar** | ✅ COMPLETE | Gated on `engine.ready`, 0–100% progress bar, Enter hidden until assets compiled |

---

## 2. Completed Phase Breakdown

### Phase 1: Clean Foundation & Dual Entry Architecture
- Decoupled public visitor entry (`index.html`) from curator administration (`admin.html`).
- Purged all legacy two-floor, cinema, and navigation trail whiteboard code.
- Implemented persistent top control bar with audio toggle (`M`) and fullscreen toggle (`F`).
- Created high-contrast obsidian noir / 24k gold door plaques and eliminated transition lag via `doorPlaqueTextureCache`.

### Phase 2: Sizing Control & Salon Harmonization
- Centralized artwork dimensions in `src/config/artworkSizes.js` across East Wall, North Masterpiece, South Gate, Center Partition, and West Board.
- Added live in-game resizer drawer in admin mode with instant in-place room reload.
- Tuned proportions and bumped storage schema to `v3`.

### Phase 3: 3D GLB Asset Pipeline & Spatial Placement
- Converted downloaded models into Draco/WebP-compressed GLBs in `public/models/ready/`.
- Cataloged metadata into `models.manifest.json` and generated `contact-sheet.html` turntable viewer.
- Extended `placedItems.js` to load from `src/data/museumLayout.json` with shared GLTFLoader cache and room disposal.
- Replaced whole-model bounding boxes with 15 cm triangle-based collision footprints.
- Removed marked procedural fixtures and adopted normalized Osgona chandelier and Monstera plants.

### Phase 4: Local Avatar Locomotion & Live Multiplayer
- Rendered selected avatar (Maya or Ethan) with smooth third-person follow camera.
- Calibrated V3 rig unit mismatch and restored missing joint rotation tracks in partial animation clips.
- Integrated WebSocket relay on port 8080 with 2-player capacity, position clamping, and message sanitization.
- Implemented DOM screen-projected chat bubbles, seat registry with mutual occupancy locking, and emote menu (1-4).

---

## 3. Remaining Verification Slices

- **Slice V1: Live Two-Browser Visual Verification**: Real-time validation of two real browser windows walking, emoting, and sitting together.
- **Slice V2: Benchmark Profiling**: A/B frame-time and heap-allocation profiling across 5 room transitions.
- **Slice V3: Remote Cloud Hosting Setup**: Reverse-proxy / WebSocket pass-through setup for production domain deployment.
