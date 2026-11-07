# Our Museum 3D — Independent Recheck After M10–M12

**Review date:** 2026-11-07  
**Repository:** `nhiteshbohra/3d-museum-of-photo-gallery`  
**Branch:** `fix/production-hardening`  
**Source HEAD inspected:** `0b2ac1229fcfe60fc42060bbdff42a766101c723`  
**Comparison base:** `72a60e4bd378714fd4142aaa64522d3e6e5931dc` (one new commit)

## Evidence and important limitation

The latest commit metadata, changed-file diff, targeted current source and tests, and GitHub tree were inspected through the connected GitHub repository. This reviewer **did not run the current project from a fresh checkout**, an end-to-end 3D browser session, or actual Android/iPhone profiling. Commit has **zero published status contexts and zero GitHub Actions runs** returned by GitHub API. Existing `docs/agent-work/VERIFICATION.md` contains agent-reported test output, which is not an independent rerun. `public/photos/` in accessible repository contains only `README.md`, so actual 75 private photos cannot be independently inspected here. Do not treat source presence as proof of rendered output.

## What changed in the latest commit (confirmed in source)

- **Mobile avatar imagery:** 8 WebP texture files added (sum ≈2.51 MB decimal); `avatarWorld.js` tries `.webp` before falling back to `.png`; texture ownership/disposal changes present.
- **Mobile room memory:** `engine.js` switches `MAX_CACHED_ROOMS` to 1 on mobile, 3 on desktop, with deeper room-object disposal. `placedItems.js` guards against late assets attaching to disposed rooms.
- **Networking:** `multiplayer.js` adds movement delta threshold, 20 Hz active and 1 Hz idle state broadcast; engine `onFrame` callback used rather than a separate multiplayer rAF when available.
- **Authentication-phase bundles:** `startMuseumExperience()` now dynamically imports `three`, engine, and multiplayer. Vite manual chunk assignments added.
- **Race handling:** server character conflict hardening; client closes code 4005 without reconnect and restores selection UI; additional adversarial tests added.
- **Photo audits:** 75-photo wording in `scripts/check_photos.mjs`, public README, and test matrix updated. Frame layout has 3 lobby + 12 per each of six salons.
- **Decor test modifications:** wall sconces are tagged with `contact: 'wall'` and test explicitly checks four per salon.

## Findings that block a confident 95–100% claim

### R-01: Four decorative wall lights per salon contradict user-specified plants-only decorative policy

**Status: Confirmed requirement mismatch / P1 (user requirement).**

`src/game/room.js` around lines 830–865 still calls `spawnGlbItem()` four times per non-lobby room using `models/ready/lighting/antique_wall_light.glb`. `tests/adversarial_salon_lights_m10.test.mjs` explicitly **requires** four wall sconces in each salon. Setting `contact:'wall'` avoids floor collisions but does not remove decorative light models. Earlier user requirement was *artifacts only in lobby, gallery decorative models only plants, remove decorative lights*. Reclassifying sconces as architecture does not satisfy that requirement without explicit user-approved scope change.

**Fix:** Unless user explicitly authorizes sconces, remove the four generated decorative GLB lights per non-lobby salon, keep functional Three.js lighting and wall/photo frame architecture. Update test to assert **zero** non-lobby decorative light models and verify fully loaded scene including asynchronous GLB mounts. Preserve photo layout without collisions.

### R-02: Pre-authentication JavaScript bundle reduction is not yet proven as effective network/download reduction

**Status: Confirmed static dependency / P1 (performance validation).**

`src/main.js` still statically imports `createCharacterSetup` from `./avatars/characterSetup.js` at line 6. `src/avatars/characterSetup.js` statically imports `three` and `OrbitControls`, so the initial entry module's **static dependency graph still includes Three.js**. The reported `main.js` entry chunk shrinking to 56.29 kB is not equivalent to all pre-auth bytes shrinking to 56.29 kB; Rollup may load `vendor-three` for the static character-setup dependency. The code-splitting claim could be true for one chunk but not first-page transferred JS.

**Fix:** Move `createCharacterSetup` behind an import invoked after server-valid authentication; audit other static imports transitively. Capture actual cold unauthed browser waterfall using disabled cache and record all JS assets and decoded/transfer bytes before and after. Prove zero WebGL and no imported heavy Three.js bundle prior to authentication. Do not reduce correctness or avatar UI.

### R-03: Latest 75 real photos are not independently verifiable from accessible GitHub tree

**Status: Environment evidence gap / P1 (deployment verification).**

Only `public/photos/README.md` is tracked and available at this revision; the repository verification report claims `75/75` on the agent's local machine. This may be correct in that environment, but a fresh checkout does not include those private files. Need test with authorized deployment dataset, verify room/slot mapping, no missing images, no wrong orientation, full-image contain and a matching frame; ensure the photos remain protected.

### R-04: Latest full test status is not independently verifiable

**Status: Verification gap / P1.**

GitHub API exposes no status contexts or Actions runs for commit `0b2ac12`. There are many test scripts and agent logs claiming PASS, including adversarial scenarios, but no independent execution was performed in this audit. Attach fresh terminal exit codes and Playwright screenshots/videos tied to exact commit SHA. Include both real-authenticated simultaneous visitors and Android/iOS device profiles.

### R-05: Technical documentation contains inaccuracies

**Status: P2.**

`docs/agent-work/VERIFICATION.md` says latest wall sconces are at `y = 2.65m`, while actual `src/game/room.js` and assertions in `tests/adversarial_salon_lights_m10.test.mjs` specify `y = 2.20m`. Correct the report to match the current code and actual scene, or adjust geometry only if measured visual requirement dictates it. Avoid historic duplicated report sections and tag evidence by SHA/time.

## Release acceptance gates by category

| Category | Gate for 95–100% verification |
|---|---|
| Seven rooms/decor | Check all seven rendered scenes; no unintended furniture, artifacts or decorative light GLBs in six salons, lobby artifacts preserved; all doors/obstacles safe |
| Photos | All 75 authorized files present in production and correct wall slots; image/frame aspect-ratio tests for square, portrait, panorama, landscape; no cropping; all photographs private |
| Avatars | Both male/female rigs verified in GLB/WebGL at idle, WASD, sprint, backward, turn, stairs, jump, 20 relevant clips, sitting and standing; 5-minute repeat tests |
| Multiplayer | Exactly two visitors; unique character claims across tabs; race 2/4 clients; 30-second grace; reject-and-recover without duplicate ghosts; chat/emotes/rooms/seats synced |
| Security | Fail-closed private API and photo URLs; cookies secure/HttpOnly/SameSite as deployed; auth expiry/revoke, prototype pollution/regression, WS origin and session validation |
| UI/mobile | Physical Android Chrome + iPhone Safari; portrait/landscape, safe areas, 320–430px, pointer-lock, touch controls, keyboard open, no blocked buttons |
| Performance | Real cold and warm auth/entry waterfalls, first usable frame, median FPS/p95 frame time, texture/geometry/memory after 50 room switches, 10-minute thermals; use measured thresholds from the roadmap |
| Independent QA | Fresh clean checkout, `npm ci`, `npm run check`, `npm test`, `npm run models:verify`, `npm run build`, targeted stress tests, dual-client browser recordings; no untested PASS labels |

## Commands for the team's fresh checkout

```powershell
git rev-parse HEAD
git status --short
npm ci
npm test
npm run check
npm run models:verify
npm run build
node --test tests/adversarial_salon_lights_m10.test.mjs
node --test tests/adversarial_disconnect_reconnect_loop.test.mjs
node --test tests/adversarial_m11_race_grace.test.mjs
node tests/two_client_test.mjs
python tests/check_avatar_controls.py
python tests/check_character_setup.py
```

Run server-dependent tests on their documented ports; don't call a run PASS if prerequisites were absent. Capture full output and errors; use QA staging credentials and do not expose invitation passcodes in committed reports.

## Antigravity teamwork prompt

> `/teamwork` Review the **current** `fix/production-hardening` HEAD and the independent audit `MUSEUM_INDEPENDENT_RECHECK_0b2ac12_2026-11-07.md`. Assign separate Senior Developer, independent QA, Senior Researcher, and Reviewer tasks. **Do not equate role instructions with actual running agents.** First fix requirement discrepancy: four decorative antique wall lights per salon violate our user-specified gallery plants-only decor policy unless expressly approved; update source and tests accordingly. Next audit static imports: `src/main.js -> src/avatars/characterSetup.js -> three` appears to load Three.js before auth despite lazy game imports. Verify actual browser network waterfall on a cold unverified session, fix if necessary. Align tests/reports with deployed 75 private photos, correct `y=2.65` vs actual `y=2.20` report mismatch. Run complete Node/server/Playwright suites and a real two-visitor, mobile device regression. Independently retest, preserve approvals, do not rewrite unrelated systems, and escalate blockers after three failed fix cycles. Only report 95–100% when all category-specific gates have recent evidence tied to the final commit.

## Honest completion assessment

Source-level engineering progress has increased materially, with all five earlier mobile backlog entries now marked VERIFIED in the project's issue register. But **95% or 100% verified completion cannot be certified**: two source-level concerns (unapproved decorative lights, static Three.js pre-auth dependency), photo deployment availability, and independent browser/performance evidence remain unresolved. Any numeric percentage is at best an approximate subjective estimate, not a measured release score.
