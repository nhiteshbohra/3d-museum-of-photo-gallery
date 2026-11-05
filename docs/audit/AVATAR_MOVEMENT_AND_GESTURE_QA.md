# Avatar Movement, Camera Controls & Gesture Drawer QA Report

**Environment:** Production Hardened  
**Target:** Private 3D Museum of Photo Gallery  
**Branch:** `fix/production-hardening`  

---

## 1. Locomotion Tuning & Motion Physics

To ensure walking and running feel natural and grounded rather than floaty or instant, the locomotion physics in `src/engine/engine.js` were calibrated as follows:

| Parameter | Calibrated Value | Behavior / Effect |
|---|---|---|
| **Base Walk Speed** | `2.4 m/s` | Realistic museum walking pace (~8.6 km/h brisk stroll) |
| **Sprint Multiplier** | `2.0` (`4.8 m/s`) | Smooth sprint transition when holding Shift |
| **Horizontal Acceleration** | `16.0` | Natural ramp-up without sluggish input lag |
| **Horizontal Deceleration** | `16.0` | Eliminates ice-skating drift while maintaining organic stop inertia |
| **Turning Inertia** | `0.15` LERP factor | Avatar mesh smoothly aligns to movement direction instead of snapping |
| **Foot Grounding** | `0.0m` offset | Feet remain flush with gallery floor planes |

---

## 2. Gesture Drawer UI & Placement

Per Phase 3 specifications:
- **Location**: Anchored to the **left side** of the screen (`left: 20px; top: 50%; transform: translateY(-50%)`).
- **Styling**: Premium museum glassmorphic styling with amber/gold accents matching the gallery palette.
- **Pointer Lock Safety**: Opening the gesture drawer via the HUD button automatically calls `document.exitPointerLock()` so the visitor can click emote buttons without mouse lock interference.
- **Approved Gestures**:
  1. `Wave` (Hotkey `1`)
  2. `Dance` (Hotkey `2`)
  3. `Nod` (Hotkey `3`)
- **Offline Playback**: In `multiplayer.js`, `doEmote()` triggers local avatar animation playback even if the network is temporarily disconnected.

---

## 3. Dual Camera Modes QA

1. **Follow Mode (Third-Person Behind)**:
   - Camera follows behind avatar at `height: 2.1m`, `distance: 3.2m`.
   - Smooth collision damping prevents camera from clipping behind salon walls.
   - Pointer-lock pitch and yaw control.
2. **Free 360° Orbit Mode**:
   - Toggled via `C` key or HUD camera toggle.
   - Smooth spherical orbit around avatar center (`[0, 1.4, 0]`).
   - Retains avatar facing direction while viewing artwork or personal appearance.

---

## 4. Mobile & Touch QA

- **Dual Virtual Thumbsticks**:
  - Left joystick: horizontal movement (`WASD` analog equivalent).
  - Right joystick: look / camera orbit.
- **Touch Gesture Drawer**: Drawer toggle button cleanly accessible in mobile portrait and landscape viewports with zero overlap over gallery navigation controls.

