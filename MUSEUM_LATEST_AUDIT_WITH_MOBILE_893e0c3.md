# Our Museum 3D — Latest Code Recheck + Mobile Optimization Integration

**Audit date:** 2026-11-06  
**GitHub repository:** `nhiteshbohra/3d-museum-of-photo-gallery`  
**Branch:** `fix/production-hardening`  
**Reviewed HEAD:** `893e0c3011d8b32375ad337064116f8d64bad160`  
**Comparison base:** `9df1a937e2a950d894f453e6f6fdcb16a0513ba0`  
**Additional user input:** `MUSEUM_MOBILE_OPTIMIZATION_AUDIT(1).md` (originally audits `08a0f805`)

## Evidence scope

- Read the latest branch metadata/tree, the two-commit compare, and relevant latest source files through GitHub connector.
- Read the uploaded mobile optimization audit and reconciled its suggestions with the newer branch.
- **Did not** independently execute `npm test`, `npm run check`, `npm run models:verify`, WebGL screenshot tests, Android/iPhone performance tests, or two-person real-browser testing on HEAD. Repository documents claiming PASS are developer-generated reports rather than evidence from an independently executed current session.
- Private deployment photos are not present in the public GitHub tree; actual photo traffic and memory use are unmeasured.

## Most important results

| ID | Priority | Location | Current evidence | Corrective action and acceptance |
|---|---|---|---|---|
| AUTH-NEW-01 | P0 | `src/main.js` `redeemBtn.addEventListener('click', redeemInviteCode)` and new `redeemBtn.onclick` | **Confirmed dual click handlers**: an already verified button is relabeled `Enter Sanctuary →`, but its existing `addEventListener` still runs `redeemInviteCode` when clicked; the new `.onclick` starts the museum. This can produce redundant redemption requests/races. | Implement one explicit UI state machine (`unverified`/`verifying`/`verified`/`starting`/`entered`) with a single click dispatcher. Never re-redeem when clicking Enter; test double clicks and failed HTTP. |
| AUTH-NEW-02 | P0 | `src/main.js` `checkAuthSession()` | A returning authenticated session inserts **hard-coded `290512`** into a read-only field even when that is not the credential used. This is misleading and publicly exposes a passcode-looking value. | Do not insert secrets, dummy codes, or stored passcodes. Show `Existing session verified` without revealing credential. Explicitly decide whether every new visit requires manual code entry or valid cookies can resume. |
| AUTH-NEW-03 | P1 | `src/main.js` `redeemInviteCode()` and `checkAuthSession()` | Both paths ultimately call `startMuseumExperience()` after successful verification; `onclick` points to the same call. UI change appears not to enforce a separate user Enter gesture as claimed. | If a separate Enter is required, don't call startup until that action is clicked; add browser assertions for fresh, cookie, expired and URL-invite paths. |
| AUTH-NEW-04 | P1 | `src/main.js`, server `/api/config` | Client initializes `inviteRequired = false` and populates it asynchronously; client-side `enterMuseum()` only checks `inviteRequired && !inviteRedeemed`. Server restricts private APIs/photos, but avoid treating an async display flag as an authorization boundary. | Server-side auth is authoritative; UI must fail closed until auth state is known. Browser-test that unauthenticated HTML cannot expose protected media/API/WS and no Three.js heavy boot starts before valid auth. |
| AVATAR-01 | P1 | `src/avatars/avatarWorld.js` | Visual rig root now rotated `Math.PI`; existing motion math and state machine remain. This may fix model forward axis but has not been independently confirmed with real rendered GLBs/clip playback. | Measure character local head-front direction, hip/root transforms, 8-way movement and real browser screenshots/video for **both** models. Verify wave, dance, reverse, jump, sit, stand, turns and multiplayer. |
| AVATAR-02 | P1 | `src/avatars/avatarWorld.js` `_loadAnimations` / `_applyBaseAnim` | Progressive clip loading with event-driven transitions. Missing or delayed clips can skip choreography; behavior depends on `currentAction`, `transitionAction` and `currentBaseLogical`. | Build deterministic state-transition tests and visual test when a clip resolves late; prevent repeated reset/interrupted emotes, model foot sliding and snapping to chair. |
| PHOTO-01 | P1 | `src/game/room.js` `placePhotoInSlot()` | The newest code now rescales the photo backing and `slot.outlineObject` to fitted image dimensions, correcting the former mismatch for this wall-photo path. | Validate all **other** photo paths (center column, special placements, placeholders) and click bounds; show portrait/landscape/panorama screenshots at each salon. Avoid border overhang and frame collisions. |
| MOB-P0-01 | P0 mobile | `public/models/ready/furniture/3d_pbr_curved_sofa.glb`, `src/data/museumLayout.json`, `src/game/room/placedItems.js` | 51,976,104-byte sofa remains in repository. Report notes no configured `lodPath` entries in layout. | Inspect with `gltf-transform`, create verified compact mobile variant and actual LOD references, preserve dimensions/seat anchors and render quality; benchmark transfer/parse/GPU memory. |
| MOB-P0-02 | P0 mobile | `src/engine/engine.js`, `src/avatars/characterSetup.js` | Both renderers use `antialias: true` and `setPixelRatio(Math.min(devicePixelRatio,2))`. | Add tested low/balanced/high adaptive DPR with hysteresis and user override. Measure real mobile frame times; preserve DOM HUD quality. |
| MOB-P0-03 | P0 mobile | `src/avatars/avatarWorld.js`, character texture PNGs | High-resolution character textures and CPU canvas recolor present; audit lists eight PNGs totaling ~18.72 MB. | Profile decode and color-change overhead; consider lower-res/KTX2 and caching; ensure both rigs/appearance preserve visual fidelity. |
| MOB-P1-04 | P1 mobile | `src/engine/engine.js` `loadedPhotoTextureCache` | Unbounded `Map`; skipped disposal for cached textures; `Promise.all` launches room photo jobs concurrently. | Implement ownership-aware, memory-budgeted LRU, bounded decode/fetch concurrency and separate frame/detail resolution. Test 50 room changes and no private-photo regression. |
| MOB-P1-05 | P1 mobile | `src/engine/engine.js`, `src/game/room/placedItems.js` | Up to 3 fully built cached rooms; `deepCloneScene` clones geometry/materials/textures; room load still `await renderer.compileAsync(scene,camera)`. | Limit fully resident rooms per quality tier, ref-count safe shared assets, progressive model compilation/placement; profile cold/cached transitions. |
| MOB-P1-06 | P1 mobile | `src/engine/engine.js`, `src/avatars/multiplayer.js`, `src/avatars/characterSetup.js` | Multiple rAF loops and per-frame screen projection of remote nametags/chat; character selection has independent renderer. | Merge where safe or throttle noncritical DOM work, pause hidden states, dispose selection renderer and test long sessions. |
| MOB-P1-07 | P1 mobile | `src/main.js`, `src/style.css` | Touch joystick, camera swipe, Jump/Sit/Orbit/Front/Chat/Gestures exist; no current real-phone screenshots in this independent check. | Real devices: 320/360/375/390 widths, landscape, safe areas, 2-touch, virtual keyboard, no blocked controls or swallowed input. |
| MOB-P2-08 | P2 mobile | `src/avatars/multiplayer.js` | Network state sent ~20 Hz whenever connected (even idle). | Send on change while moving, reduced idle rate with separate heartbeat; verify smoothing, 30s reconnect grace, two peers. |
| MOB-P2-09 | P2 mobile | `src/main.js` imports | Static imports of engine/multiplayer still eager. Game engine instantiation is delayed, but bundle parse/download may begin before authentication. | Split light passcode UI into separate entry chunk; dynamic import game after server session validation; server-side access remains mandatory. |

## Not yet verified in this audit

- Physical rendering/lighting of Maya and Ethan, native GLB skeleton alignment, foot-contact and walk/run stride-speed matching.
- Every gesture on each avatar, late clip load, sit/stand transitions on each sofa, and 2-browser animation synchrony.
- Correctness of all image frames in real scenes, at all sizes and with real private photos.
- Pixel-perfect mobile layout, low-end phone FPS, power, thermal and memory behavior, A/B speed results.

## Implementation prompt to give coding agent

> You are performing a production-hardening regression repair on `nhiteshbohra/3d-museum-of-photo-gallery`, branch `fix/production-hardening`. **First assert HEAD equals or supersedes `893e0c3` and compare source before edits.** Read this audit and the user's `MUSEUM_MOBILE_OPTIMIZATION_AUDIT(1).md`. **Do not rebuild the project from scratch; keep all seven galleries, real private photos, appearance settings, approved gesture exclusions, two-player session, seats, and design intact.**
>
> 1. Fix the auth button's dual click listeners, remove fake/hard-coded code display, implement clear auth/enter state machine. Test fresh unauthorized, valid cookie, expired/revoked invite, manually entered invitation, URL invite, double click, wrong code, API/photo/WS unauthorized access. Follow explicit policy for cookie restoration; never rely solely on JS UI state for authorization.
> 2. Inspect both GLBs and all animation clips for native forward-axis/rig scaling, hips/pelvis root motion, foot sliding, vertical offsets and arm/leg deformation. Execute browser W/S/A/D, 8-way, sprint, idle, jump, seated and emote tests, including remote avatars in two actual browsers; capture side/rear/front video/screenshot evidence.
> 3. Verify proportional photo-frame fitting including decorative outline, backplate, photo hit mesh and special column/photo contexts, portrait/square/landscape/panorama, without cropping. Add tests proving frame bounds do not intersect doors or adjacent art.
> 4. **Baseline actual mobile performance before optimization**. Measure low-end Android and iPhone: network waterfall and MB, cached/cold entrance, GLB decode/upload, renderer.info calls/textures/geometries, median FPS, p95 frame time, cold and cached room switches, 10-minute heat/memory and 50 navigation cycles. State device/browser and limitations.
> 5. Optimize largest mobile cost first: 52 MB sofa with tested LOD variant, bounded DPR and quality tiers, avatar texture decode and recolor, photo cache LRU/concurrency, safe geometry sharing and progressive rooms, offscreen/DOM frame work, mobile gesture/joystick touch layout, idle WS send rate, and light authentication-only frontend chunk.
> 6. For each change preserve a baseline and before/after measurement; use strict staged commits, rollback notes and regressions. Do not claim performance improvements without measured A/B evidence.
> 7. Run and attach raw logs of `npm run check`, `npm test`, `npm run models:verify`, `npm run build`, `node tests/two_client_test.mjs`, browser auth tests, two-browser live animation tests, and physical Android/iOS layout/thermal tests. Report FAIL/BLOCKED explicitly; don't mark blocked checks PASS.
> 8. Final deliverables: changed-file inventory, bug register with P0/P1/P2, model/animation validation evidence, responsive screenshots, performance before/after table, security regression log, and commit list.

## Recommended performance gates (provisional, must measure)

- Target low-end Android median FPS ≥30 and p95 frame time ≤50ms for representative route; no ordinary locomotion freeze >200ms.
- Keep memory/resource count bounded over 50 room transitions and 20 join/leave cycles.
- No loss of private-photo security or gesture/seat/multiplayer correctness.
- Do not promise reductions in bytes, speed or frame time without measured tests.
