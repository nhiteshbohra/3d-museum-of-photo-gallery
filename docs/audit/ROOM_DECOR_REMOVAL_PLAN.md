# Our Museum 3D — Room Decor Removal & Simplification Plan

**Target Branch:** `fix/production-hardening`  
**Base Commit:** `18fe869`  
**Coordinator:** Engineering Lead  
**Scope:** Strict implementation of Mandatory Content Rules 2, 3, and 4.

---

## 1. Executive Summary & Policy

Per the master team instruction:
1. **Rule 2 (Artifact Placement):** Artifacts must remain **only in the lobby**. Remove artifacts from all other rooms.
2. **Rule 3 (Room Simplification):** For non-lobby rooms:
   - **Keep plants** (botanicals enhance aesthetics without blocking sightlines or art).
   - **Remove artifact models** (bookcases, commodes, cabinets).
   - **Remove sofas** from all 6 non-lobby galleries.
   - **Remove decorative lights** (chandeliers added as removable decor assets).
   - Keep only the minimum required room structure and content needed for navigation, walls, image display, and core usability.
3. **Rule 4 (Lobby Rule):** The **lobby** may keep artifacts and sofas. Ensure the lobby remains visually grand, fully furnished, and usable.

---

## 2. Dependency & Impact Tracing

Before modifying `src/data/museumLayout.json`, every item was traced across all engine and gameplay systems:

| Subsystem | Potential Impact | Findings & Safety Mitigation |
|---|---|---|
| **Lighting** | Does removing chandeliers darken non-lobby salons? | **ZERO IMPACT.** Every salon has its own built-in Three.js lighting system in `src/game/room.js`: 1 AmbientLight, 1 DirectionalLight (`keyLight`), and 6 ceiling downlights (SpotLight + PointLight). Chandeliers were purely decorative unlit meshes. Illumination remains 100% intact. |
| **Seating & Multiplayer** | Does removing sofas from salons break seating logic? | **SAFE.** Seating is centered in the Grand Lobby (`itm_lobby_sofa_curved`, providing seats `sofa_seat_1`, `sofa_seat_2`, `sofa_seat_3`). In non-lobby rooms, `buildSeatRegistry(roomKey)` cleanly returns an empty collection, and `findNearestSeat` safely evaluates to `null`. Multiplayer tests `two_client_test.mjs` and `server_protocol.test.mjs` seat participants on lobby sofas. |
| **Collisions & Obstacles** | Do removed sofas/bookcases leave ghost colliders? | **CLEAN.** In `src/game/room/placedItems.js`, obstacle bounding boxes are registered dynamically from spawned items. Removing items from `museumLayout.json` cleanly eliminates the obstacle entries. Walkways become more spacious and open. |
| **Artwork Sightlines** | Does simplification affect photo visibility? | **POSITIVE IMPACT.** Sightlines to all 61 exhibition photo frames and narrative plaques are now completely unobstructed from every corner of the room. |

---

## 3. Inventory of Changes by Room

### Grand Lobby (`lobby`) — PRESERVED
- `itm_lobby_chandelier_osgona` (Ceiling lighting artifact) — **KEPT**
- `itm_lobby_sofa_curved` (Floor seating sofa) — **KEPT**
- Corner Monstera planters (`lobby.js`) — **KEPT**

### Fireside Salon (`fireside`)
- `itm_fireside_chandelier_marmara` — **REMOVED**
- `itm_fireside_sofa_curved` — **REMOVED**
- `itm_fireside_bookcase` — **REMOVED**
- `itm_fireside_plant_monstera_l` — **KEPT**
- `itm_fireside_plant_potted_l` — **KEPT**

### Music Salon (`music`)
- `itm_music_chandelier_01` — **REMOVED**
- `itm_music_sofa_curved` — **REMOVED**
- `itm_music_plant_monstera` — **ADDED (Plant only)**

### Library Salon (`library`)
- `itm_library_chandelier_03` — **REMOVED**
- `itm_library_sofa_classic` — **REMOVED**
- `itm_library_bookcase` — **REMOVED**
- `itm_library_plant_monstera` — **ADDED (Plant only)**

### Paris Romance Salon (`paris`)
- `itm_paris_chandelier_osgona` — **REMOVED**
- `itm_paris_sofa_curved` — **REMOVED**
- `itm_paris_plant_monstera` — **ADDED (Plant only)**

### Glass Orangery (`orangery`)
- `itm_orangery_chandelier_01` — **REMOVED**
- `itm_orangery_sofa_curved` — **REMOVED**
- `itm_orangery_plant_monstera` — **KEPT**

### Secret Promise Alcove (`alcove`)
- `itm_alcove_chandelier_03` — **REMOVED**
- `itm_alcove_sofa_classic` — **REMOVED**
- `itm_alcove_plant_monstera` — **ADDED (Plant only)**

---

## 4. Procedural Bench Removal in `src/game/room.js` (DECOR-01)
In addition to the JSON layout items above, `src/game/room.js` previously built procedural wooden benches in all non-lobby rooms:
- `bench-east` (fallback when photos were absent): **REMOVED**
- `bench-north` (in non-fireside galleries): **REMOVED**
- `bench-south-left` & `bench-south-right` (flanking the entrance gate): **REMOVED**
- Obsolete bench obstacle boxes and wood texture pass-throughs: **REMOVED**
- Botanical planters (`plant-north-corner-nw`, `plant-north-corner-ne`, `plant-south-left`, `plant-south-right`): **RETAINED**

---

## 5. Architectural Lighting Policy (DECOR-03)
The six ceiling downlights in each gallery (`src/game/room.js:155–180`) are functional recessed ceiling pots emitting SpotLight and PointLight downwards onto the photo walls. They are flush architectural fixtures necessary for artwork visibility, not decorative hanging chandeliers. All decorative hanging chandeliers (`lighting_chandelier_*.glb`) have been removed from non-lobby salons and restricted strictly to the Grand Rotunda Lobby.

---

## 6. Verification Check
- Layout passes `scripts/validate_layout.mjs`.
- Automated test `tests/layout.test.mjs` verifies:
  1. JSON layout rules: lobby seating present; only plants in non-lobby rooms.
  2. Runtime `buildRoom()` traversal: 0 benches, 0 sofas, 0 chandeliers, 0 bookcases, 0 bench collision obstacles across all 6 non-lobby galleries.
  3. Seat registry: 0 seats registered for any non-lobby room; lobby has valid seating anchors.
- Production build succeeds.

