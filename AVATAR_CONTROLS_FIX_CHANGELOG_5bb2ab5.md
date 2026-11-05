# 3D Museum — Avatar Controls Fix: Change Log & Implementation Guide

**Purpose:** Accompany `Avatar_Controls_Fix_5bb2ab5.zip` when handing it to a developer or coding agent.

**Target repository:** `nhiteshbohra/3d-museum-of-photo-gallery`  
**Target branch:** `fix/production-hardening`  
**Source version inspected:** commit `5bb2ab5fcda06d2f167ef02f160de0916164c5e5` (November 5, 2026)  
**Change type:** Focused avatar input, movement, and UI interaction patch — **not** a complete replacement of the museum or 3D model assets.

> **Status:** This document describes the changes the accompanying patch **will apply if its source checks pass**. It does **not** mean that those changes have been applied to your Windows project or pushed to GitHub. The core movement-mathematics tests were rerun and passed 7/7 in the test environment. Full museum, WebGL, mobile, and two-person multiplayer testing still must be done on the actual project.

## 1. Why the patch was made

The avatar review found these code-level problems:

1. **Forward/backward controls appear reversed in some camera views.** Movement used the base `yaw` even when Free Orbit or Front View visually pointed in a different direction.
2. **The avatar can turn around when stopping.** The idle-facing target used `yaw + Math.PI`, producing a possible 180-degree turn.
3. **Backward movement is visually confusing.** The body could rotate toward the reverse travel vector rather than staying oriented as expected for backward stepping.
4. **W+D could unexpectedly sprint.** The old sprint condition included input length `> 1.2`, and a diagonal input can exceed that threshold.
5. **Movement keys can stick.** Input could remain cached when pointer lock or window focus was lost.
6. **Residual horizontal velocity could persist** through room spawns, camera teleports, and seating transitions.
7. **Opening/closing the Gestures drawer interrupts desktop movement** because opening unlocks the pointer, while closing did not request it back.
8. **HUD clicks could activate 3D scene interactions** because world clicking was handled by a window-level mouse listener.

## 2. Exact files the ZIP contains

| ZIP path | Type | Purpose |
|---|---|---|
| `apply_avatar_fixes.py` | Patch installer | Checks source patterns, backs up existing files, writes replacements, performs JS syntax checks. |
| `src/avatars/motionMath.js` | **New source module** | Shared pure functions to compute movement vector, facing yaw, and angle smoothing. |
| `tests/avatar_motion_contract.test.mjs` | **New test file** | Seven independent tests of movement and rotation math. |
| `README.md` | Instructions | Installation, verification, rollback, and known limitations. |

**Files modified in your checkout by the installer:**

- `src/engine/engine.js` — movement, input handling, body-facing, momentum reset, and UI-click isolation.
- `src/main.js` — gesture panel closing behavior.

**Files not replaced or modified by this patch:** Character model GLBs, animation GLBs, textures, multiplayer server logic, invitation/passcode data, gallery content, and the rest of the UI design.

## 3. Detailed changes in `src/engine/engine.js`

### A. Camera-relative movement

**Before:** W/A/S/D movement calculations used the engine's base `yaw`, even when the displayed camera had an independent `cameraYawOffset` in Free Orbit/Front View.

**After:** The movement conversion uses `computeDesiredMovement()` from `src/avatars/motionMath.js`, passing `yaw`, `cameraYawOffset`, camera mode, normalized input, and sprint state.

**Intended behavior:** W moves in the visible camera's forward direction, S in the opposite direction, and A/D strafe relative to the displayed view, including when the camera is facing the avatar from the front. The camera-relative behavior is an intentional design decision and should be tested against your preferred control scheme.

### B. Separate moving direction from body-facing direction

**Before:** The avatar's target yaw was based on velocity while moving, but changed to `yaw + Math.PI` when idle, often making the character turn suddenly. Moving backward could make the model turn around.

**After:** `calculateFacingYaw()` selects a target angle based on the movement/view context and preserves the previous facing angle when idle. `smoothAngle()` interpolates through the shortest angular path.

**Intended behavior:** A character does not spontaneously turn 180 degrees when W is released, and backward movement does not automatically reverse its body direction.

### C. Fix diagonal sprint

**Before:** Sprint was enabled when Shift was pressed **or** diagonal input magnitude exceeded `1.2`.

**After:** The patch sets sprint based only on Shift input. Movement direction is normalized so diagonal walking is not faster than straight-line walking.

### D. Clear stale keyboard input

**Added:** Guard conditions that ignore keyboard movement before entering the museum, while the Gestures drawer is open, or while typing into form controls. `clearMovementKeys()` clears held inputs, pending jump state, and horizontal movement velocity when the browser loses focus or pointer lock is lost on desktop.

**Intended behavior:** No unexpected movement after leaving an input field, switching windows, or using the gesture menu.

### E. Reset horizontal momentum on transitions

**Added:** `currentVelX` and `currentVelZ` resets in spawn/teleport paths and seating/standing transitions; spawn and camera-position changes also reset `avatarBodyYaw` to the expected viewing yaw.

**Intended behavior:** No uncontrolled sliding after a door transition, teleport, sit-down, or stand-up.

### F. Isolate HUD clicks from 3D interactions

**Added:** An early guard to `onMouseDown` that processes world clicks only when their event target is the 3D canvas.

**Intended behavior:** Clicking a Gestures button or overlay will not accidentally click artwork, doors, or interactive objects behind it.

## 4. Changes in `src/main.js`

The existing right-side Gestures drawer already releases pointer lock when opened. The patch adds an attempt to call `requestPlay()` after it closes, if the user has entered the museum, is on desktop, the photo lightbox is closed, and the pointer is unlocked.

**Expected result:** Closing the drawer with its button or G should help restore keyboard/mouse movement.

**Browser caveat:** Pointer-lock APIs require an appropriate user gesture and can be refused by a browser. The real-browser QA must verify closing by G, the Close button, and Escape. If automatic lock fails, the UI should clearly instruct users to click the 3D scene to resume.

## 5. New module: `src/avatars/motionMath.js`

The module provides three reusable mathematical helpers:

| Function | Responsibility |
|---|---|
| `computeDesiredMovement(...)` | Maps input axes into world-space movement with the chosen camera direction, speed, and sprint state. |
| `calculateFacingYaw(...)` | Determines the avatar's target body orientation without an idle reversal or automatic backward turn. |
| `smoothAngle(...)` | Smooths body rotation, accounting for the ±π angle boundary. |

This separates movement mathematics from rendering code and makes it independently testable without loading the entire WebGL museum.

## 6. Tests executed and results

The new test file `tests/avatar_motion_contract.test.mjs` was executed in Node.js. **Result: 7 passed, 0 failed.**

| Test | Result |
|---|---|
| W forward, S backward, A left, D right at yaw 0 | PASS |
| Diagonal input does not sprint unless Shift is active | PASS |
| Front/Free Orbit movement uses visible camera direction | PASS |
| Idle avatar does not reverse 180 degrees | PASS |
| Backward input preserves intended body-facing direction | PASS |
| Rotation wraps smoothly across ±π | PASS |
| Zero input produces zero desired speed | PASS |

**Not yet verified in this environment:** Production Vite build after applying this patch to your complete local checkout; Playwright/WebGL screenshot or actual avatar pose; model-native forward axis; animation retargeting; touch movement behavior on a real phone; and two-browser, authenticated, networked avatar synchronization. Existing museum tests must be rerun after applying.

## 7. How to apply on Windows

**Prerequisites:** Keep your current checkout and back up any uncommitted work. This package is designed for the specified source version and refuses to patch if required patterns are missing or altered.

1. Extract `Avatar_Controls_Fix_5bb2ab5.zip` to a temporary folder.
2. Open PowerShell in that folder.
3. Run:

```powershell
python .\apply_avatar_fixes.py "F:\projects\3dmuseum"
```

On success, the installer modifies the two existing source files and adds the new math module and its test. It also saves the previous versions in `F:\projects\3dmuseum\.avatar_fix_backup\`.

**Do not force the script if it reports `PRECHECK FAILED`.** That indicates the code has changed from the revision for which the patch was built. It should be rebased onto the newer source.

## 8. Verification commands after applying

From your project directory:

```powershell
cd F:\projects\3dmuseum
node --test tests/avatar_motion_contract.test.mjs
npm run check
npm test
npm run models:verify
npm run build
node tests/two_client_test.mjs
```

Then test in **real desktop and mobile browsers** with both Maya and Ethan:

- W, S, A, D, each alone, with both rear Follow and Front/Free Orbit views.
- Release W and S: character should not rotate unexpectedly.
- W+D without Shift must not sprint; Shift+W must sprint.
- Move the camera 90°/180° and check visual travel direction.
- Open the right-side Gestures menu with G or the button; close it with G, Close, and Escape; verify movement resumes.
- Click gesture controls and verify no doors or artwork activate behind the UI.
- Move through room doors; sit on a sofa; stand; verify no drifting/sliding.
- Two independent users must see accurate remote positions, body orientation, seating and animations.
- Verify responsive layouts, touch joystick, and icons at phone/tablet/desktop viewport sizes.

## 9. Rollback

If the patch causes regressions, restore the saved originals:

- `.avatar_fix_backup/engine.js` → `src/engine/engine.js`
- `.avatar_fix_backup/main.js` → `src/main.js`

Then remove the two newly added files if this patch introduced them:

- `src/avatars/motionMath.js`
- `tests/avatar_motion_contract.test.mjs`

Keep the backup folder out of version control. Inspect `git diff` before committing.

## 10. Known remaining tasks — **not fixed by this ZIP**

1. Inspect real `man.glb` and `woman.glb` skeleton orientation, root transforms, skinning, and native forward axes. If a rig is rotated, correct its **visual rig pivot** only after measuring it; do not blindly rotate all models 180°.
2. Inspect all animation clips for compatibility, foot sliding, reversed tracks, and root motion.
3. Integrate walk-start, walk-stop, step-back, turn-in-place, and realistic seated transition animation state machines as separate work.
4. Verify dynamic gesture panel content, icon sizes, mobile overlap and keyboard accessibility visually.
5. Test two-player presence, movement, emotes and seating through the real WebSocket server, using separate authenticated browsers.
6. Profile large model/texture loading and room-transition latency independently.

## 11. Instructions to the coding agent

> Apply the accompanying ZIP to the target museum checkout only after checking the current Git commit and source compatibility. Preserve all existing gallery content, approved gesture assets, character models, private invite/security behavior, two-person multiplayer logic, and museum design. Run the listed checks, inspect every changed file, and visually verify W/S/A/D, Front View, camera follow, idle body yaw, joystick, sofa actions and both character rigs. Report failures separately. Do not declare the entire avatar system fixed based solely on seven pure-math test passes. Provide the exact diff and before/after results.

---

**Summary:** This package is a narrow repair for **movement and controls**. It is not a complete avatar-model re-rigging or full visual QA pass.
