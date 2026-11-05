# BUGS LEDGER — Defect Tracker & Resolutions

**Current Baseline:** 05 November 2026  
**Status Legend:** `RESOLVED` · `OPEN` · `HISTORICAL`

---

## 1. Active Phase Bugs & Resolutions

| Bug ID | Severity | Description | Discovered | Resolution & Evidence | Status |
|---|---|---|---|---|---|
| **BUG-010** | Medium | North wall gates (`seealso-4`, `seealso-5`) did not display the interactive hand icon on hover | 2026-11-02 | Root cause: empty destination title prevented `doorHasTriggerTarget()` from returning true. Fixed by ensuring `assignedDestinations` guarantees valid salon titles for all 6 doors. Verified `cursor-clickable: True` via Playwright. | **RESOLVED** |
| **BUG-011** | Low | Upper brown panel on door frames overlapped plaque molding, causing visual clipping and z-fighting | 2026-11-02 | Dynamically calculated `upperTrim` position after `plaqueCenterY` in `src/game/room/doors.js`; adjusted plaque Z-offsets to 0.020/0.026/0.028 m. | **RESOLVED** |
| **BUG-012** | High | V3 character pack unit mismatch (meter-scale mesh vs centimeter-scale bones) caused animated hips to float ~90m above floor | 2026-11-05 | Calibrated mesh geometry scaling relative to armature in `src/avatars/characterSetup.js` before height normalization. Skeleton heights verified via `check_avatar_controls.py`. | **RESOLVED** |
| **BUG-013** | Medium | Partial animation clips (wave, clap, dance) lacked rotation tracks for untargeted bones, causing character to drop into A-pose/T-pose | 2026-11-05 | In `src/avatars/characterSetup.js`, filled missing bone rotation tracks using the base walk/idle pose rotations. Smooth animations verified. | **RESOLVED** |
| **BUG-014** | High | Whole-model bounding box collision for curved sofa blocked walking in open floor zone due to underlying ground plane mesh | 2026-11-04 | Replaced box collision with 15 cm triangle-based collision footprints, excluding geometry <8 cm and >1.7 m. Position $(2.6, 0)$ confirmed accessible. | **RESOLVED** |
| **BUG-015** | Medium | Room transition stutter (~500 ms) caused by re-rendering 2D canvas textures for all door plaques | 2026-10-31 | Implemented `doorPlaqueTextureCache` in `src/game/room/doors.js` to cache plaque textures by title; pre-warmed shaders via `renderer.compile()`. | **RESOLVED** |
| **BUG-016** | Low | Ambient dust motes (`THREE.Points`) rendered as pixelated white rectangular boxes hovering in 3D airspace | 2026-10-31 | Completely purged all particle systems from room generators; airspace kept 100% clean and clear. | **RESOLVED** |

---

## 2. Open Issues for Tracking

| Bug ID | Severity | Description | Current Status / Mitigation | Status |
|---|---|---|---|---|
| **BUG-020** | Low | Third-person follow camera checks room architecture but lacks low-poly collision proxies for detailed furniture | Camera occludes walls cleanly; large furniture collision proxy recommended for close-quarters framing. | **OPEN** |
| **BUG-021** | Low | Stand-to-sit animation snaps directly to seat cushion position rather than blending through transition clip | Instant snap functions reliably; smooth transitional blend clip recommended in future polish pass. | **OPEN** |

---

## 3. Historical Defect Log (Superseded)

Historical defects from earlier two-floor and pavilion prototypes (PAV-001 through PAV-008) are archived and no longer applicable to the current Vite museum architecture.
