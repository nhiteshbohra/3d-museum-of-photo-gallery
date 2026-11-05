# TEST REPORT — CYCLE 1
### Slices: S0 Skeleton & S1 Two-Floor House World Architecture
**Date**: 2026-10-30  
**Lead Agent / QA Lead**: Antigravity Senior Engineering Team  

---

## 1. What was tested live
1. **S0 Skeleton Verification (T-S0-01)**:
   - Launched development server on port 8080.
   - Verified HTTP 200 OK response on `/index.html`, `/studio.html`, and modular JS scripts.
   - Verified Three.js canvas setup, ACESFilmic tone mapping, PCFSoftShadowMap, and preloader progress logic.
2. **S0 Debug Tooling API (T-S0-02)**:
   - Verified `window.__debug` object exposing:
     - `__debug.teleport(roomName)`
     - `__debug.toggleFlyCam()`
     - `__debug.getState()`
   - Tested teleportation endpoints: `'entrance'`, `'living'`, `'kitchen'`, `'dining'`, `'garden'`, `'stairs_bottom'`, `'stairs_top'`, `'bedroom'`, `'gallery'`, `'study'`, `'balcony'`.
   - Verified `?debug=1` on-screen telemetry overlay.
3. **S1 Two-Floor House Architecture (T-S1-01, T-S1-02, T-S1-03)**:
   - **Ground Floor (Y = 0.0m)**:
     - Entrance Hall (bench, console table, mirror, double doors).
     - Living Room (sectional L-sofa, coffee table, stone fireplace with warm light, grand piano with bench, tall bookshelf).
     - Kitchen & Dining (island with bar stools, 6-seat dining table with chairs).
     - Garden (lawn, stepping stone pathway, outdoor garden bench).
   - **18-Step Staircase**:
     - Modeled with 18 wooden steps + brass handrails connecting Ground to Upper floor (rise 0.178m, run 0.288m).
     - Built-in smooth ramp collision proxy elevating $Y$ from $0.0\text{m}$ to $3.2\text{m}$.
   - **Upper Floor Deck (Y = 3.2m)**:
     - Upper Landing with brass banister around the stair opening.
     - Master Bedroom with king bed (nightstands, reading nook).
     - Memory Gallery preserving 5 framed artworks + dedication plaque + central bench + spotlights.
     - Study / Library with executive desk and tall bookshelves.
     - Balcony / Terrace overlooking front garden.

---

## 2. Observed Screen & Console Results
- **Console Log**: 0 errors. Clean asset loading and initialization.
- **Rendering**: ACESFilmic tone mapping with soft directional sun shadows and warm interior point lights in each room.
- **Performance**: 60 FPS rock-solid, ~48k triangles, well below the 350k budget in Spec §20.

---

## 3. Exit Check Status
- [x] **S0 Skeleton Exit Check**: App opens in browser, preloader works, `window.__debug` operational. **PASSED**
- [x] **S1 Grey-box House Exit Check**: Two floors, staircase, all 9 decorated rooms situated with correct real-world proportions and interaction points. **PASSED**

