# TEST MATRIX — OUR HOME 3D

## Active Vite review — later review, 30 October 2026

| ID | Scenario | Result | Evidence / limit |
|---|---|---|---|
| SRC-T01 | Syntax: 11 src JS plus server and Vite config | PASS | node --check; review snapshot |
| SRC-T02 | Production build without overwriting existing dist | PASS | Scratch output; 16 modules transformed |
| SRC-T03 | Welcome and pointer lock | OBSERVED | Fresh Chrome canvas locked after click |
| SRC-T04 | Six built-in themes | OBSERVED | Visible canvas and pointer lock; no uncaught page errors |
| SRC-T05 | W input smoke | OBSERVED | Pixels changed; not a numeric movement assertion |
| SRC-T06 | Narrow welcome layout | OBSERVED | 390 px document/viewport; no physical mobile test |
| SRC-T07 | Legacy config regression | FAIL / OBSOLETE TARGET | Removed js/config.js causes ENOENT |
| SRC-T08 | External wiki/video/routes/multiplayer/hardware | NOT VERIFIED | No current certification |

Evidence: ../reports/CURRENT_STATE_VITE_2026-10-30.md. Historical PASS rows below apply
to earlier versions, not the active src application. No npm test script currently exists.

## Historical pavilion matrix

## Current pavilion review — 30 October 2026

| ID | Scenario | Result | Evidence |
|---|---|---|---|
| PAV-T01 | Syntax of 13 runtime modules plus server | PASS | `node --check` |
| PAV-T02 | Config/image/escaping/storage checks | PASS | `npm test` |
| PAV-T03 | Load and enter museum | PASS | Fresh Chrome screenshot; no uncaught exception |
| PAV-T04 | Runtime registry and Studio counts | PASS | 7 rooms, 40 artworks/defaults/cards, 41 interactive meshes |
| PAV-T05 | Carousel first-to-next navigation | PASS | Photo 1 of 40 → Photo 2 of 40 |
| PAV-T06 | Photo modal lifecycle without underlying actions | FAIL | Artwork overlay opened underneath; PAV-004 |
| PAV-T07 | Walk from rotunda through front portal | FAIL | Z clamped to 4.945; PAV-001 |
| PAV-T08 | Isolated multiplayer ownership and convergence | NOT ESTABLISHED | Relay connected; shared room contained other peers and Maya conflict |
| PAV-T09 | Hardware/mobile/cross-browser and all walking routes | NOT RUN | Narrow viewport only |

Details/screenshots: `../reports/CURRENT_STATE_2026-10-30.md`. Earlier rows and repair
reports below are historical; they do not replace the current findings.

Current verification is in `TEST_REPORT_repair.md`. Rows below are historical reports,
not independently established baselines: independent movement, hips-only retargeting,
stairs and camera claims were disproved during the 2026-10-30 repair. Do not infer
online sync, playable individual piano keys or universal zero clipping from those rows.

| ID | Feature | Spec Ref | Test Scenario | Status | Last Tested | Cycle | Evidence / Notes |
|---|---|---|---|---|---|---|---|
| T-S0-01 | Skeleton Load | §6.1 | App launches without console errors, preloader finishes | PASS | 2026-10-30 | 1 | Console clean, 100% loaded |
| T-S0-02 | Debug API | §4.3 | `window.__debug` exists and returns state | PASS | 2026-10-30 | 1 | Teleport, flycam, state working |
| T-S1-01 | Two-Floor House | §7.2 | Ground floor (Y=0) and Upper floor (Y=3.2) rendered | PASS | 2026-10-30 | 1 | Verified live, 2 floors rendered |
| T-S1-02 | Room Layout | §7.3 | Entrance, living, kitchen, dining, bed, gallery, study | PASS | 2026-10-30 | 1 | All 9 zones verified |
| T-S1-03 | Staircase Geometry | §7.5 | 18 steps rise to 3.2m with ramp proxy | PASS | 2026-10-30 | 1 | 18 steps with ramp collider |
| T-S2-01 | Locomotion | §9.1 | Smooth walk, acceleration, turn inertia | PASS | 2026-10-30 | 2 | Smooth velocity, slerp turn |
| T-S2-02 | Wall Collisions | §9.3 | Character slides along walls, no penetration | PASS | 2026-10-30 | 2 | AABB circle projection sliding |
| T-S3-01 | Stair Climbing | §9.4 | Climb up/down without jitter, correct floor level | PASS | 2026-10-30 | 2 | Ramp formula with side containment |
| T-S4-01 | Dual Characters | §8.1 | Maya and Ethan independent; Tab/click switches control | PASS | 2026-10-30 | 2 | Tab/1/2/3, HUD pill, ground ring |
| T-S5-01 | Seating System | §10.2 | Sit on sofa, bench, dining chair, bed edge | PASS | 2026-10-30 | 2 | Procedural sitting on all seats |
| T-S5-02 | Piano Playable | §10.5 | Play notes on grand piano with audio | PASS | 2026-10-30 | 2 | RomanticAudioEngine chord |
| T-S5-03 | Fireplace Hearth | §10.3 | Toggle fireplace with dynamic flicker | PASS | 2026-10-30 | 2 | Toggle light + sine flicker loop |
| T-S5-04 | Bed Relaxation | §10.4 | Lie down on master bed | PASS | 2026-10-30 | 2 | Procedural lying pose applyLiePose |
| T-S8-01 | Synchronized Dance | §11.1 | Couple dances in sync with romantic piano | PASS | 2026-10-30 | 1 | Dance pill & Samba dance clip |
| T-S9-01 | Camera Obstacle Clamp | §9.3 | Camera raycast clamps at 0.45m, zero wall clip | PASS | 2026-10-30 | 3 | Zero black screen, camera stays in room |
| T-S12-01 | 18 Artworks Enclosure | §12.1 | All 18 picture frames rendered with spotlights | PASS | 2026-10-30 | 3 | 19 interactive meshes verified live |
| T-S12-02 | Artwork Modal Click | §12.2 | Click artwork opens full inspection modal | PASS | 2026-10-30 | 3 | Inspected "The Snowy Whispers" |
| T-S6-01 | Lifelike Standing Up | §10.2 | Standing up from seat resets Y without hitch | PASS | 2026-10-30 | 3 | Floor 0 cleanly maintained |
| T-S6-02 | Mixamo Upright Retargeting | §8.1 | Premultiply Xbot keyframes by native rest quat | PASS | 2026-10-30 | 4 | Characters stand 100% upright |
| T-S9-02 | PBR Parquet & Plaster Textures | §7.2 | Procedural herringbone oak, plaster, marble, rugs | PASS | 2026-10-30 | 4 | Rich texture maps applied |
| T-S9-03 | Coffered Ceiling Lighting | §7.2 | Upward ambient fill + emissive warm glow | PASS | 2026-10-30 | 4 | Coffered panels clearly visible |
| T-S12-03 | 18 Impressionist Paintings | §12.1 | All 18 frames render unique fine-art canvases | PASS | 2026-10-30 | 4 | Stars, moons, chalets rendered |
| T-S7-01 | Multiplayer Live Sync | §13.1 | Dual browsers sync Maya & Ethan live movement via WebSocket | PASS | 2026-10-30 | 5 | Tab 1 moves Maya 0.70m -> Tab 2 updates to 0.70m in real-time |
| T-S10-02 | Radar Minimap HUD | §10.6 | 2D architectural blueprint with live partner blips & heading | PASS | 2026-10-30 | 5 | Minimap renders walls, frames, and live blips |
| T-S12-04 | Polaroid Souvenir Tool | §12.3 | In-game camera renders custom Polaroid keepsake with PNG export | PASS | 2026-10-30 | 5 | High-res PNG card rendered with dedication & download |
