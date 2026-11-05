# Avatar controls patch verification — 2026-11-05

Applied the ZIP according to `AVATAR_CONTROLS_FIX_CHANGELOG_5bb2ab5.md` on HEAD `0f1f6d45bc997ac62957388358692035616d0160`. All installer source guards and syntax checks passed. No pre-existing tracked changes were present.

Changed `src/engine/engine.js` and `src/main.js`; added the supplied `src/avatars/motionMath.js` and `tests/avatar_motion_contract.test.mjs`. Added `.avatar_fix_backup/` to `.gitignore`. The only edits beyond the installer output were indentation and an updated facing comment. Original source files remain in `.avatar_fix_backup/`.

| Check | Before | After |
|---|---|---|
| `npm run check` tests | 10 passed | 17 passed |
| Layout | 19 items across 7 rooms valid | Same |
| Photos | 61/61 present | Same |
| Production build (included in check) | Passed, 35 modules | Passed, 36 modules |
| Supplied motion contract | Not installed | 7/7 passed |
| `npm run models:verify` | Not run separately | All active references resolve; 9 absent catalog-only entries |
| `node tests/two_client_test.mjs` with TEST_PORT=8997 | Not run separately | Passed movement, gesture/cancel, sit, and stand synchronization |

The exact source/test diff is [avatar-controls-fix-5bb2ab5.patch](avatar-controls-fix-5bb2ab5.patch). The full tracked diff is available through `git diff`; the new module and test are untracked until explicitly staged. No commit or push was made.

## Remaining verification

Computer-use discovery returned both `browser access host is unavailable` and `Computer Use native pipe is unavailable`. No visual browser testing was possible through that connection. Automated relay tests do not verify rendered avatar orientation or animation poses.

Test both Maya and Ethan: W/S/A/D in rear and front/orbit views, release movement (especially S during deceleration), diagonal speed, Shift sprint, room transitions, sitting/standing, and mobile joystick. Close Gestures using G, Close, and Escape; check pointer-lock restoration and canvas-click recovery if the browser refuses it. Confirm HUD clicks do not activate objects behind them. Run two authenticated browsers to check rendered remote orientation and animation.

Model rigs, animations, artwork, private data, server authentication, and multiplayer protocol code were unchanged. Existing context docs still describe removed admin entry points and older emote shortcuts; reconciling those descriptions is pending.
