# Dead Code, Redundant Logic, and Production Asset Inventory

**Repository:** `nhiteshbohra/3d-museum-of-photo-gallery`  
**Branch:** `fix/production-hardening`  
**Audit Date:** 2026-11-05  

---

## 1. Executive Summary

This inventory documents all dead code, redundant logic, orphaned files, unused assets, and development artifacts identified across the codebase.
Every item has been traced using static analysis, repository-wide reference searching, bundler dependency analysis, and test suite inspection.

---

## 2. Complete Candidate Inventory Table

| No. | File Path & Line | Symbol / Asset Name | Reason Unnecessary | Known Callers / References | Dynamic Access Possible? | Classification | Impact | Regression Tests Required |
|---|---|---|---|---|---|---|---|---|
| **1** | `tools/copy_v3.mjs` (L1-42) | `tools/copy_v3.mjs` | Obsolete one-time migration script from `archive/museum_avatar_studio_complete_v3` to `public/models/ready/characters`. | None. Zero references in repo. | No | **SAFE TO ARCHIVE** | -42 lines, cleaner repository root. | `npm run check`, `npm run models:verify` |
| **2** | `public/models/ready/contact-sheet.html` (L1-198) | `contact-sheet.html` | Development turntable preview page loading external CDN Three.js v0.160. Copied to production `dist/` by Vite as an unprotected page. | None at runtime. Unreferenced by app code. | Yes (direct URL navigation if served) | **SAFE TO ARCHIVE** | Prevents 7.1 KB development page in production `dist/`. | `npm run build`, `npm run check` |
| **3** | `public/models/ready/_diag.html` (L1-12) | `_diag.html` | Development diagnostic fetch probe for `furniture_bookcase.glb`. Copied to production `dist/`. | None. Zero references in app code. | Yes (direct URL navigation) | **SAFE TO ARCHIVE** | Eliminates development diagnostic file in production `dist/`. | `npm run build`, `npm run check` |
| **4** | `src/config/artworkSizes.js` (L7-53) | Commented block `DEFAULT_ARTWORK_SIZES` | 46 lines of redundant commented-out duplicate configuration block. | None. Commented out. | No | **SAFE TO REMOVE** | Reduces source file size, improves readability. | `npm test`, `npm run check` |
| **5** | `src/config/artworkSizes.js` (L138-145) | `saveArtworkSizes` | Exported function for persisting custom artwork sizes to localStorage. Never imported or called. | None across entire repository. | No | **SAFE TO REMOVE** | Reduces bundle size and unused exports. | `npm test`, `npm run check` |
| **6** | `src/config/artworkSizes.js` (L150-165) | `resetArtworkSizes` | Exported function for resetting sizes to factory defaults. Never imported or called. | None across entire repository. | No | **SAFE TO REMOVE** | Reduces bundle size and unused exports. | `npm test`, `npm run check` |
| **7** | `src/data/coupleMuseum.js` (L3-131, L136-147) | `createMemoryCanvas` & `IDENTICAL_PHOTOS` | Generates 10 huge HTML5 canvases (1200x850) and base64 PNG data URLs on module load. Actual salon wall photos are loaded from `/photos/` via `localPhotoPath()`. | `IDENTICAL_PHOTOS` in `coupleSalons` (L155, L164, etc.) | No | **REFACTOR** | Saves ~15-25 MB runtime heap and eliminates CPU canvas rendering during page startup. | `node scripts/check_photos.mjs`, `npm test` |
| **8** | `src/data/coupleMuseum.js` (L223-225) | `TITLE_TO_ROOM_KEY` | Exported reverse lookup dictionary. Never imported or called anywhere. | None. Only `ROOM_KEY_TO_TITLE` is imported. | No | **SAFE TO REMOVE** | Reduces dead export footprint. | `npm test`, `npm run check` |
| **9** | `src/game/room/staticCache.js` (L67-86, L155, L168) | `noPhotoTexSmall` | 512x512 canvas placeholder texture created and disposed in staticCache, but never referenced by any mesh. All meshes use `noPhotoTex`. | None outside `staticCache.js`. | No | **SAFE TO REMOVE** | Saves one 512x512 CanvasTexture GPU/heap allocation per session. | `npm test`, `npm run check` |
| **10** | `src/game/room/artifactRegistry.js` (L65-75) | `hasArtifact`, `getAllArtifacts`, `getArtifactsByCategory` | Unused exported helper functions. Placed items use `findArtifactByPath` and `getArtifact`. | None across entire repository. | No | **SAFE TO REMOVE** | Cleaner registry interface. | `npm test`, `tests/seats.test.mjs` |
| **11** | `src/game/room/placedItems.js` (L72-102) & `src/engine/engine.js` (L1411) | `updateDebugSeatsHud` | Debug seat HUD called every frame at 60 FPS in `engine.js`. Instantiates `new URLSearchParams(...)` on every frame, generating continuous garbage collection pressure. | `engine.js` line 1411. | No (URL search param query) | **REFACTOR** | Eliminates 60 object allocations per second in main render loop. | `npm test`, `npm run check` |
| **12** | `src/game/room/placedItems.js` (L104-112) | `setRuntimeLayout`, `getRuntimeLayout` | Exported runtime layout setters/getters. Never imported or referenced in project. | None. Layout is loaded via `museumLayout.json`. | No | **SAFE TO REMOVE** | Eliminates dead module functions. | `npm test`, `scripts/validate_layout.mjs` |
| **13** | `src/net/wsClient.js` (L223-225) | `netPong` | Exported function to send `{ t: 'pong' }`. Client never sends pong in Protocol v2 (server responds to client ping). | None. Never imported or called. | No | **SAFE TO REMOVE** | Eliminates dead protocol method. | `tests/server_protocol.test.mjs` |
| **14** | `src/main.js` (L665) | `emotesBar` | DOM query for `#mobile-emotes-bar`. Element does not exist in HTML template (replaced by gesture drawer). | None (unused variable). | No | **SAFE TO REMOVE** | Eliminates null selector query on initialization. | `npm test`, `npm run check` |
| **15** | `src/style.css` (L880-897) | `.mobile-emote-item`, `.mobile-emote-item:active` | CSS styling rules for the non-existent mobile emotes bar. | None. No matching DOM elements. | No | **SAFE TO REMOVE** | Reduces CSS bundle size (-18 lines). | `npm run build`, `npm run check` |
| **16** | `src/main.js` (L939-975, L1256-1279) | Duplicate keyboard event listeners | Two separate `window.addEventListener('keydown')` handlers in `main.js`. Lines 960-975 handle Digit1-3 which duplicates `multiplayer.js` listener, causing double emote triggering. | Event dispatch loop. | No | **REFACTOR** | Consolidates keydown handlers and prevents duplicate emote calls. | `tests/emotes.test.mjs`, `tests/two_client_test.mjs` |
| **17** | `src/main.js` (L440-505, L851, L1135, L1192, L1452) | Excessive background prebuilding queue | `queuePrebuildSalons(coupleCategories)` queues ALL 6 salons sequentially on every room change, exceeding `MAX_CACHED_ROOMS = 4` and causing continuous compile and eviction thrashing. | `main.js` room transition handlers. | No | **REFACTOR** | Prevents background compile freezes and GPU cache eviction churning. | `npm test`, `npm run check` |
| **18** | `src/main.js` (L1361-1363, L1389) | `window.__engineApi`, `window.__multiplayer`, etc. | Global debug/harness attachments. | Extensively referenced by test suites (`tests/check_*.py`, `tests/e2e_*.py`). | Yes | **MUST KEEP** | Required for automated regression test harnesses. | All automated tests |
| **19** | `src/avatars/avatarWorld.js` (L72, L76-82) | Unused secondary animation clips (`stepBack`, `walkStart`, `walkStop`, etc.) | Animation clips defined in `CLIP_FILES` that are not triggered by active gameplay controls. | Streamed lazily after 4 seconds; tested by character setup. | Yes | **MUST KEEP** | Kept for character asset compatibility and test assertions. | `tests/check_character_setup.py` |
| **20** | `package.json` | `devDependencies`: `@gltf-transform/*`, `draco3dgltf` | Offline GLB optimization and DRACO compression CLI tools. | Used for offline model pipeline and archive management. | No | **MUST KEEP (DEV)** | Zero impact on production bundle (not imported by client code). | `npm run models:verify` |

---

## 3. Classification Summary

- **SAFE TO REMOVE:** 8 candidates
- **REFACTOR:** 4 candidates
- **SAFE TO ARCHIVE:** 3 candidates
- **MUST KEEP:** 5 candidates
- **UNCERTAIN:** 0 candidates
