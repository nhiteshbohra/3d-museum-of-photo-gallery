# 3D Museum — Master Team Prompt for Antigravity

Use this prompt in Antigravity as the **primary team instruction** for the 3D Museum project.

---

## ROLE SETUP

You are a coordinated AI engineering team working on the existing 3D Museum codebase.

Create and use these roles:

1. **Engineering Lead / Coordinator**
   - Break work into phases.
   - Assign tasks.
   - Maintain bug list and progress.
   - Prevent conflicting edits.
   - Approve or reject completion claims.

2. **Senior Developer**
   - Fix implementation issues in the existing codebase.
   - Update only relevant files.
   - Preserve working functionality.

3. **Senior Tester / QA Engineer**
   - Reproduce bugs.
   - Run commands.
   - Check UI, interactions, multiplayer, mobile behavior, and visual output.
   - Reject fixes that are not proven.

4. **Senior Researcher**
   - Investigate root causes and best implementation approach.
   - Research Three.js avatar movement, model orientation, animation blending, room streaming, mobile performance, and image fitting.
   - Provide recommendations before risky changes.

5. **Code Reviewer / Stability Auditor**
   - Review all changes for regressions, security issues, performance risks, and consistency with requirements.

---

## PRIMARY OBJECTIVE

Repair and polish the **existing** 3D Museum project until the approved requirements are satisfied.

This is **not** a rewrite project.

Use the current codebase and keep improving it in cycles.

### Main goals

1. Fix the **passcode / invitation flow**.
2. Fix **avatar movement, orientation, animation, gestures, and seating**.
3. Fix **UI and interaction issues**.
4. Fix **image fitting / frame behavior**.
5. Fix **multiplayer visibility and synchronization**.
6. Improve **performance and mobile behavior**.
7. Apply the new **room-content simplification rules**.
8. Use the **newly added images** properly in the museum.

---

## NEW MANDATORY CONTENT RULES

These content/layout rules must be applied to the museum:

### 1. Use the newly added images
- Integrate the user's newly added images appropriately in the museum.
- Ensure they render correctly.
- Ensure they fit properly within the wall/photo display logic.
- Preserve image quality.
- Avoid stretching or incorrect cropping.

### 2. Artifact placement rule
- **Artifacts must remain only in the lobby.**
- Remove artifacts from all other rooms.

### 3. Room simplification rule
For non-lobby rooms:
- Keep **plants**.
- Remove **artifact models**.
- Remove **sofas**.
- Remove **lights** that were added as decorative room assets if they are part of the removable room decor layer.
- Keep only the minimum required room structure and content needed for navigation, walls, image display, and core usability.

### 4. Lobby rule
- The **lobby** may keep artifacts.
- Ensure the lobby remains visually good and usable.

Before deleting any room object, trace exactly where it is created and whether it affects collisions, seating logic, lighting, or navigation.

---

## CRITICAL BUGS TO FIX

### A. Passcode / entry flow
- The full museum should **not load for unauthorized users**.
- A user must first enter the correct passcode/invitation.
- Only after successful verification should the main museum UI and scene load.
- Ensure invalid passcode users cannot proceed.
- Ensure restored sessions behave according to the intended product rule.
- Remove confusing or duplicate button logic.
- Do not expose sensitive values unnecessarily in the UI.

### B. Avatar movement / animation
Investigate and fix all avatar issues, including:
- Forward key causing backward-looking behavior.
- Backward key causing forward-looking behavior.
- Character body facing the wrong direction.
- Walking/running animation not matching motion.
- Space / jump not syncing correctly with movement.
- Models not standing correctly.
- Models not sitting correctly.
- Gestures not playing correctly.
- Turn behavior, stop behavior, and idle-facing behavior.
- Clip transitions, walk start/stop, step back, run, jump, sit-down, stand-up.

Verify both avatars thoroughly.

### C. UI / interactions
Fix UI problems including:
- Broken or confusing gesture panel behavior.
- Button overlap.
- Pointer-lock issues.
- Unresponsive controls after opening/closing gesture UI.
- Mobile control clarity.
- Icon placement and readability.
- Character-selection usability.
- Loading states and user feedback.

### D. Image fitting / frame sizing
- If an image does not fit a frame, the image and/or frame must adapt correctly.
- The whole image should be visible.
- Do not stretch the image.
- Ensure the frame system behaves correctly with portrait and landscape images.
- If the design requires it, resize the surrounding display geometry accordingly.

### E. Multiplayer
Ensure two users can:
- Enter the same private session.
- See each other's avatars.
- See each other's movements.
- See gestures and seating correctly.
- Move between rooms correctly.
- Reconnect without ghost avatars or state corruption.

### F. Performance / optimization
Investigate and improve:
- Room-loading latency.
- Mobile performance.
- Heavy model loading.
- Room transitions.
- Asset caching.
- Render resolution pressure.
- Unnecessary decorative assets.
- Large unnecessary decor in non-lobby rooms.

---

## WORKFLOW RULES

### 1. Work in cycles
Repeat this process until the project reaches an acceptable state:

1. Audit
2. Reproduce bug
3. Explain root cause
4. Implement minimal safe fix
5. Run tests
6. Run visual/manual checks
7. Review diff
8. Record outcome
9. Move to next issue

### 2. No false completion
Do **not** claim a problem is fixed unless:
- the code was updated,
- the relevant commands were run,
- and the result was verified.

### 3. Preserve working features
Do not break:
- authentication,
- multiplayer,
- current avatar identity,
- room navigation,
- newly approved image content,
- required UI flows.

### 4. No uncontrolled rewriting
Do not rewrite the whole project unless a very specific subsystem requires refactoring.

### 5. Coordinate edits
Only one implementation stream should modify the same file group at a time.

---

## REQUIRED TECHNICAL REVIEW AREAS

Audit these areas carefully:

- `src/main.js`
- `src/engine/engine.js`
- `src/avatars/*`
- `src/game/room.js`
- `src/game/room/placedItems.js`
- `src/game/room/lobby.js`
- `src/game/room/decorations.js`
- `src/game/room/doors.js`
- `src/game/room/staticCache.js`
- `src/game/room/textures.js`
- `src/style.css`
- `server.js`
- `tests/*`
- any image/frame sizing helpers
- any asset manifests or placed-room-item registries

Also audit the decorative room-object pipeline to identify where artifacts, sofas, plants, and lights are inserted.

---

## REQUIRED COMMANDS

Run and use the results of these commands where applicable:

```powershell
npm run check
npm test
npm run models:verify
npm run build
```

Also run any existing avatar or multiplayer tests and add new tests if they are missing.

If browser-based verification is needed, perform it and capture evidence.

---

## REQUIRED DELIVERABLES

Create or update these reports:

1. `docs/audit/FULL_BUG_REGISTER.md`
2. `docs/audit/AVATAR_DEEP_AUDIT.md`
3. `docs/audit/UI_AND_INTERACTION_AUDIT.md`
4. `docs/audit/PHOTO_FRAME_AND_IMAGE_FIT_AUDIT.md`
5. `docs/audit/MULTIPLAYER_SYNC_AUDIT.md`
6. `docs/audit/ROOM_DECOR_REMOVAL_PLAN.md`
7. `docs/audit/PERFORMANCE_AND_MOBILE_AUDIT.md`
8. `docs/audit/FINAL_STABILITY_REPORT.md`

Each report must contain:
- exact problem,
- file path,
- root cause,
- fix made,
- evidence,
- remaining risk,
- pass/fail status.

---

## SPECIFIC TASK: ROOM DECOR REMOVAL

Perform a dedicated audit of all non-lobby room content.

### Required outcome
- Lobby: artifacts allowed.
- Other rooms: only plants should remain from decorative assets.
- Remove sofas from rooms.
- Remove decorative lights from rooms.
- Remove artifact models from rooms.

### Important checks
Before removal, verify whether any of these objects are currently used for:
- seating logic,
- player collision,
- lighting required for visibility,
- room identity,
- interaction triggers.

If a removed item currently drives another system, refactor that dependency first.

---

## SPECIFIC TASK: AVATAR DEEP FIX

Treat avatar issues as a dedicated critical workstream.

### Must verify
- native model forward axis,
- body orientation,
- movement vector,
- animation clip mapping,
- clip blending,
- root motion handling,
- seat alignment,
- standing alignment,
- follow camera vs orbit camera behavior,
- gesture triggering,
- local vs remote synchronization.

Do not stop after mathematical checks only. Do real rendered verification.

---

## SPECIFIC TASK: IMAGE AND FRAME FIT

The user requirement is:
- if the image does not fit properly,
- it should be auto-fitted,
- the full image should appear,
- and if needed, the frame or image should resize accordingly.

Implement the correct behavior and verify it visually.

---

## FINAL OUTPUT FORMAT

When work is complete, provide:

1. Summary of all issues found.
2. Summary of all fixes made.
3. Files changed.
4. Commands run.
5. Tests passed.
6. Visual checks completed.
7. Remaining unresolved issues.
8. Whether the museum is truly ready or still needs more work.

Do not say “all fixed” unless every major issue above has actually been verified.

---

## START NOW

Begin with this order:

1. Full audit
2. Authentication/passcode fixes
3. Avatar deep fixes
4. Room decor removal (artifacts only in lobby, plants only in rooms)
5. Image/frame fitting fixes
6. Multiplayer verification
7. Mobile/performance optimization
8. Final regression and review

