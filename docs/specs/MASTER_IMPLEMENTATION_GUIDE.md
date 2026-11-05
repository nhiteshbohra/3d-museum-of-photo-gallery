# OUR MUSEUM / OUR HOME — Project-Specific Implementation Guide

> **Current-state note, 30 October 2026, updated for HEAD `2f4ebd1`:** This guide describes
> earlier uploaded source and proposed work. Active `index.html` now loads `/src/main.js`:
> a Vite/Three.js r182 first-person lobby, six curated couple themes and Wikipedia-backed
> gallery navigation. The previous seven-salon/40-artwork pavilion is also historical.
> Avatar code and a Node/ws relay remain, but the active client does not initialize them;
> Studio, minimap and photo-tool UI are absent from this entry. Use
> [current architecture](../architecture/ARCHITECTURE.md),
> [review](../reports/CURRENT_STATE_VITE_2026-10-30.md), and
> [decisions](../tracking/DECISIONS.md) before applying instructions. Vite is installed;
> Socket.IO, secure content storage and full animation/IK remain proposals. No external
> reference-site parity was reverified. User restriction: do not edit code until explicitly
> authorized. The embedded implementation prompt is not permission to start work.

**Prepared:** 30 October 2026  
extracted; not a complete asset bundle)  
**Target:** Retain the existing two-storey romantic house + gallery, dramatically improve visuals and character realism, and add the verified capabilities of Giftvera's *Our Museum* as original code/assets.

> **Evidence levels:** **CODE-CONFIRMED** = visible in the uploaded JavaScript/HTML; **PRODUCT-DOCUMENTED** = publicly described by Giftvera; **UNVERIFIED** = not observed operating in the live WebGL demo. Do not report unverified behavior as implemented or faithfully reproduced. The demo URL could not be operated by the research browser; perform a real browser walkthrough before exact visual-matching work.

## 0. Immediate instructions for Codex / Antigravity

1. Open the **existing project folder** containing `index.html`, `studio.html`, `css/`, and `js/`. **Do not replace it** with a GitHub clone.
2. Create a safety branch: `git init` (only if not already a repo), `git add .`, `git commit -m "Baseline before museum upgrade"`, `git switch -c feature/museum-v2` (configure Git identity if necessary). **Never commit credentials or customer photo data**.
3. Obtain missing assets from the actual project owner. The provided ZIP **does not contain an `assets/` directory** although `js/characters.js` loads `assets/Xbot.glb`, `assets/Michelle.glb`, `assets/Claire.glb`, `assets/Aj.glb`. Request/provide these legally; do not assume they exist.
4. First make the current project load reproducibly and record screenshots and basic interaction tests. Then implement small testable changes, phase by phase.
5. Existing `OUR_HOME_3D_PROJECT_SPEC.md` and `AGENT_TEAM_PLAYBOOK.md` are **planning documents, not evidence features exist**. Reconcile them against running code and this guide. The old spec references a different historical zip with assets and should not be mistaken for the present upload.

## 1. Exact uploaded source inventory and diagnosis

| File | Current purpose | Recommended modification |
|---|---|---|
| `index.html` | Canvas, entrance overlay, top HUD, action buttons, photo inspection, mobile joystick | Redesign entrance and in-game UI; preserve IDs/JS event wiring or migrate deliberately |
| `css/style.css` | Global UI styling | Split into tokens, entrance, HUD, mobile, studio; replace outdated design |
| `js/main.js` | Startup, asset loading, animation loop | Central lifecycle, error UI, progress, diagnostics, frame-time management |
| `js/environment.js` | Two-floor house, gallery furniture, lighting, walls, staircase, plaque, gallery frames, collision metadata | Visual overhaul, PBR materials, physically plausible lights, camera occluders and geometry-backed collision map |
| `js/characters.js` | Two GLB avatars, source animation retargeting, locomotion actions, procedural sitting/lying, dance, active-character switching | Fix rig compatibility, real sit/stand transition, foot placement, layered animations and state machine |
| `js/controls.js` | WASD/arrows, mouse orbit, mobile joystick, acceleration, stairs and AABB obstacles | Keep foundations; improve input filtering, acceleration/deceleration, camera blocking, collision sweep and stairs |
| `js/ui.js` | HUD, interactions, artwork inspection, name tags, customization | Separate UI from game state, add accessible controls/menus and contextual interactions |
| `js/config.js` | 11+ configurable artwork slots, default names/messages, client-side compression, hash/localStorage persistence | Typed schema, server-backed save/load, permission checks, photo limits and migration |
| `js/studio.js` + `studio.html` | Customer configurations, photo uploads, share link generation | Authenticated museum creation workflow, server persistence, asset upload progress, previews |
| `js/audio.js` | Procedural soundtrack and WebAudio controls | Opt-in sound, saved preference, licensed music only |
| `js/textures.js` | Procedural wood/plaster/marble/rug/painting textures | Retain where performant; improve material quality and visual consistency |
| `OUR_HOME_3D_PROJECT_SPEC.md` | Extensive previously written target architecture | Preserve as vision; verify each claim before implementation |
| `AGENT_TEAM_PLAYBOOK.md` | Prior AI team execution plan | Reconcile against new milestone order, make acceptance criteria measurable |

### Critical findings from code

- **CODE-CONFIRMED:** The project currently uses **browser ESM imports from Three.js 0.160.0 via unpkg import map**; there is no supplied `package.json`, lockfile, `node_modules`, test suite, backend, or build pipeline.
- **CODE-CONFIRMED:** `loadAnimations()` in `js/characters.js` loads Xbot and Michelle GLB clips, then `loadAvatars()` loads Claire and Aj. Missing any of these assets prevents a complete reference run.
- **CODE-CONFIRMED:** The existing building is two storeys (`FLOOR_HEIGHT=3.2`), not a blank single-room museum; it has stairs, a bedroom, furnishings, art and bench.
- **CODE-CONFIRMED:** Sitting and lying are currently created by repositioning characters and manually rotating bones in `poseCharacters()`; this can cause popping, seat clipping and implausible transitions.
- **CODE-CONFIRMED:** Input movement already smooths speed and rotation, but sets speed to zero immediately on release; tune proper braking and ensure the animation playback rate matches velocity.
- **CODE-CONFIRMED:** Collision uses a circle-vs-AABB pass against `houseColliders`, suitable as a starting point but limited around angled fixtures, camera and high speeds.
- **CODE-CONFIRMED:** Studio stores records in localStorage and encodes full config in a `#cfg=` URL fragment; this is not a production multi-user content-management backend and potentially makes long, fragile URLs.
- **CODE-CONFIRMED:** Player names and switches ('Together', 'Maya', 'Ethan') exist. **Online multiplayer is not demonstrated** by this archive: no Socket.IO client/server or authoritative rooms implementation was supplied.
- **CODE-CONFIRMED:** There is a gallery photo inspection overlay, speech bubble, audio and in-world proximity interactions. Preserve these.
- **CODE-CONFIRMED:** `js/config.js` includes named artwork entries; count the live layout and inspect `galleryItems` before expanding, avoiding duplicate wall frames.

## 2. Reference site and feature parity

**Reference product:** https://giftvera.com/product/our-museum  
**Interactive demo supplied by owner:** https://museum.giftvera.com/g/demo-museum  
**Source used:** Giftvera public product page as checked 30 October 2026. The interactive page was not operable in the research browser; use a real browser session to inspect screenshots, movement/camera, UI, loading and multiplayer before claiming pixel-level or behavioral fidelity.

| Giftvera feature | Evidence | In uploaded project | Requirement |
|---|---|---|---|
| Walkable browser 3D gallery | Product-documented | Partially: two-floor home/gallery | Improve atmosphere and gallery flow while retaining house concept |
| 6–45 photos, first image centrepiece | Product-documented | Photo slots exist, not verified at 45 | Configurable 6–45 photos, drag reorder, centrepiece first, aspect-aware frames |
| Name + dedication at entrance | Product-documented | Title, names, plaque exist | Beautiful personalized entrance, rich editable dedication |
| Visitors walk together, up to 4 | Product-documented | Not present as network service | Multiplayer rooms, 4 players, avatar identity and sync |
| Text chat and visible names | Product-documented | Single-player name tag only | Room chat + names, mute/block/report if public rooms ever enabled |
| Sit on museum benches | Product-documented | Procedural sitting exists | Realistic sit/stand clips, exact seat anchor, occupancy and multiplayer replication |
| Optional short video on wall screen | Product-documented, 60-second upload limit | No confirmed video screen/upload | User video upload, encode/validate, screen playback and audio UX |
| Shareable private link | Product-documented | Hash config link | Server-generated opaque slug/token, access controls, noindex |
| Edit gift later while link stays same | Product-documented | Browser-only studio | Persistent backend version updates without URL changes |
| Mobile/tablet/desktop | Product-documented | Joystick and responsive hints exist | Thorough cross-device controls, performance budgets, touch camera |
| 3D precise map, model design, key bindings, animations | Unverified from live demo | Some equivalents exist | Record via browser manual inspection, do not invent exact behavior |

**Scope choice:** The user's distinct **romantic two-floor house + museum** should remain, rather than erasing rooms to copy a generic gallery. Add a selectable dedicated gallery-tour route if desired. Recreate capabilities and a comparably polished experience using original branding, geometry, textures, music and licensed assets—do not copy Giftvera's proprietary files/code.

### Mandatory real-browser reference capture

Use Antigravity browser or Codex computer/browser where available. At each step collect screenshot + short observation + test result: product landing, initial load, Enter, movement, turn/zoom, frame close-up, sit/stand, video screen, player join, chat, mobile viewport, exit/reload. Do not perform payments. Mark inaccessible steps **UNVERIFIED**. Create `docs/REFERENCE_VISUAL_AUDIT.md` and `docs/reference-screens/` using screenshots only where permitted. Document UI components, colors, typography, states, loading states, empty/error states and interactions. Avoid copying original artwork/assets.

## 3. First bootstrap: Windows PowerShell

Prerequisites: Git, current Node.js LTS, npm, Chrome/Edge, Blender for animation work. **The uploaded project is a plain static ESM app; npm scripts do not exist yet**. Unzip it, then:

```powershell
cd 'F:\projects\3d-museum'
# Optional once: git init; git add .; git commit -m 'Baseline source'
py -m http.server 8000
# Visit http://localhost:8000/
```

If `py` is unavailable: `python -m http.server 8000`. A server is preferable to opening `index.html` with `file://`, but **missing GLB assets will still break character loading**. Three.js is fetched from unpkg and needs internet unless migrated.

**Recommended after baseline:** introduce Vite without rewriting the entire vanilla Three.js app:

```powershell
npm init -y
npm install three
npm install -D vite
npm pkg set type=module
npm pkg set scripts.dev='vite --host 0.0.0.0'
npm pkg set scripts.build='vite build'
npm pkg set scripts.preview='vite preview'
npm run dev
```

Then migrate imports to local npm `three` (already use bare imports; Vite resolves these), **remove the unpkg import map only after Vite resolves all assets**, retain static `assets/` via appropriate `/public/assets/` placement or update paths, and verify development and production builds. In Vite use `public/assets/Claire.glb` for runtime path `/assets/Claire.glb`. Do not silently break relative URL handling.

### Optional open-source museum research (not a replacement)

```powershell
cd 'F:\projects'
git clone https://github.com/barisulgen/personal-museum.git museum-reference-open-source
cd museum-reference-open-source
npm install
npm run dev
```

Repository: https://github.com/barisulgen/personal-museum — vanilla Three.js gallery with automatic rooms, photo upload, lighting and IndexedDB. **Use only as an architectural reference subject to its license**; retain the user's project as primary codebase. Study its image preprocessing, picture placement and generated rooms. Other libraries: https://threejs.org/ , https://threejs.org/docs/#examples/en/loaders/GLTFLoader , https://www.blender.org/ , https://www.mixamo.com/ , https://socket.io/docs/v4/rooms/ , https://playwright.dev/ . For any 3D model/animation, confirm license, commercial reuse permission and attribution obligations before redistribution.

## 4. Homepage redesign — complete visual specification

Existing `index.html` entrance is a centred title, subtitle, simple description, loading bar and one CTA. Replace with **premium interactive experience intro**, but keep the actual WebGL playable content as the destination.

**Creative direction:** cinematic modern gallery, editorial luxury typography, warm limestone/cream walls, softly lit gold details and near-black text, original visual assets. Avoid ornate, cluttered hearts and generic Bootstrap/stock UI. Make contrast accessible. Maintain a separate high-performance mobile version.

**Proposed page architecture:**

1. **Hero:** original 3D scene preview or optimized prerendered poster; short emotional headline (dynamic museum title), dedication excerpt, clear **Enter the Museum** primary button, **Explore Preview** secondary; subtle animated depth, not constant aggressive motion.
2. **Interactive preview:** 2–3 curated camera views showing gallery, personalised frames and two avatars (if assets loaded); click to preview scenes safely.
3. **How it works:** Upload memories → Customize museum → Invite loved ones → Explore together.
4. **Feature storytelling:** walk together, photo gallery, sit together, optional film, private link; responsive visual cards with actual project screenshots.
5. **Customization CTA:** Create Your Museum, link to the secured Studio; show creation progress or saved draft status.
6. **Accessibility & performance:** reduced-motion setting, keyboard access, contrast, loading states, fallback image if WebGL unsupported.
7. **Footer:** original product branding, privacy and contact info, credits/licenses where needed.

**In-scene HUD redesign:** subtle translucent bottom control panel; context-sensitive **E Interact**, **Sit**, **Stand**, **Photo**, **Chat** actions; player-name chip and connection state; mobile radial actions/joystick; hide authoring controls from recipients. Use design tokens for color, spacing, typography and effects. Entrance UI must work without WebGL.

**Acceptance:** at 360, 390, 768, 1440px widths no clipped controls; desktop keyboard focus works; intro CTA loads scene with actual progress; player can return home without losing unsaved state; snapshots/tests for hero, loading, scene HUD, modal, mobile and error state.

## 5. Characters: realistic locomotion, sitting and interactions

### Why present behavior looks artificial

`js/characters.js:407–450` directly teleports each controller to hard-coded bench/bed coordinates, manually rotates joints, stops actions and readjusts pelvis height. `js/controls.js:270+` controls speed and heading, but has abrupt stop and limited physics response. Fix **transitions**, not merely mesh resolution.

**Recommended avatar asset pipeline:**

1. Keep existing Claire and Aj if legally usable and rigs are compatible. Load separately, inspect scale, bind pose, bone paths, skeleton topology and exported animation clips. Blender can validate A/T pose and feet at floor origin. Do not force Mixamo clip onto incompatible rig without verified retargeting.
2. From https://www.mixamo.com/ download or license compatible Idle, Walk, Run, Turn, Sit Down, Sitting Idle, Stand Up, Dance; ideally matching skeleton. Export FBX, import into Blender, combine and export a single optimized `.glb` per avatar; compression optional after compatibility checks.
3. Use `GLTFLoader` + `AnimationMixer` and a deterministic finite-state machine: `idle`, `startWalk`, `walk`, `run`, `stopWalk`, `turn`, `approachSeat`, `sitDown`, `sitting`, `standUp`, `dance`. Provide separate full-body and upper-body layers only if rig supports them.
4. Preserve root/controller transform separate from visual model; use in-place walk clips initially and match stride speed to translation. Avoid double-moving if exported clips include root motion. Transition via `crossFadeTo()` with appropriate loop and clamp settings.
5. Acceleration and braking: make velocity an actual integrated vector; tune acceleration ~4–8 m/s², deceleration ~6–10 m/s² *as starting values to test*, not absolute guarantees; walking ~1.3–1.7 m/s and running ~2.8–3.6 m/s. Derive animation clip playback speed from measured world displacement; clamp and smooth.
6. Turn smoothing: turn towards movement heading using damped yaw; preserve camera-relative movement but avoid instant facing changes; add turn-in-place at low speed if assets support it.
7. Seat anchors: every chair/bench gets an `InteractionSeat` entity `{id, worldTransform, facing, seatHeight, approachPoint, occupancy}`. Approach via navigation; stop at approach point; rotate toward seat; play SitDown; align hips to target at contact frame; transition to seated idle; block motion; StandUp plays full clip before locomotion re-enables. No position snap during the visible animation.
8. Interaction safety: cancel gracefully if another player occupies seat, character falls off stairs, room changes, or a multiplayer disconnect occurs.
9. Foot IK (optional late-phase): raycast each foot to local floor, clamp pelvis offset and blend IK only when clips are correct. Add stairs support after basic gait passes. Keep collisions from tunneling using swept capsule or physics cast if necessary.
10. Camera: spring-arm-like pivot, damp position, collision raycast/shape-cast between target and desired camera point, maintain minimum distance and avoid clipping through walls, mouse drag/wheel and touch pan/pinch. Recenter behind character if requested, not continuously fighting user orbit.

**Specific initial code edits:** Refactor `poseCharacters()` and `standUp()` in `js/characters.js` into animation-state transitions; refactor `handleLocomotion()` in `js/controls.js` to continuous velocity and animation speed; replace hard-coded bench targets in `js/environment.js`/`interactionPoints` with seat components. Add `js/animationStateMachine.js`, `js/seatInteractions.js`, `js/cameraRig.js` and tests. Keep existing `characters` exports and `activeControl` API working until migration tests pass.

**Animation QA tests:** 10 repeated sit/stand cycles on each chair; no hip snap or foot-through-floor; transitions survive input spam; walking forward/diagonal/backward works; no sliding > visibly acceptable threshold; stairs work for both avatars; no camera-through-wall; mobile gestures do not scroll the page during play; remote player does not jerk after updates.

## 6. Functional components to build

### A. Media gallery / creator

- Image upload (JPEG/PNG/WebP), 6–45 per museum; validate file type/bytes and pixel count; resize/compress on client; store original only if policy requires; generate thumbs; preserve aspect ratio.
- Drag-sort images; position first as centrepiece. Generate frames for different wall dimensions, with collision-free placement. Offer meaningful photo captions and dedicated inspection with zoom/close.
- Optional short video: verify runtime length max 60s, MIME, max size and appropriate transcoding; use an actual `<video>` source through `THREE.VideoTexture` and consent-based audio playback; pause when off-screen.
- Creator UI: name, dedication, signature, photos, video, live preview, save/update/publish. Autosave draft; robust progress/retry/error states.
- Existing studio data migration from browser store into a private backend, opt-in migration, preserving drafts and access.

### B. Multiplayer

- Node.js + Socket.IO server, rooms keyed by high-entropy private identifiers, max 4 active players; server assigns room seat/player identity; enforce unique names if needed.
- Identity/session via signed short-lived token; restrict joins to authorized invite holders; avoid leaking unlisted rooms. Do not trust client-supplied arbitrary room ownership.
- Server validates input packets, world bounds, max speed, action availability and seat occupancy; sequences and server timestamps for movement and states.
- Clients interpolate remote snapshot buffer (e.g. 100 ms behind); reconcile local prediction if implemented; interpolate direction and animation states. Send snapshots at capped rate (e.g. 10–20Hz to start), not every render frame.
- Events: `room:join`, `room:joined`, `player:snapshot`, `player:leave`, `chat:send`, `chat:message`, `seat:request`, `seat:state`, `room:error`. Validate and rate-limit every payload. Sanitize chat in the DOM using textContent.
- Room capacity, reconnection, duplicate-tab join, disconnect grace, scene reload, mute and offline fallback tests mandatory.

### C. Backend/storage

- Suggested: Vite frontend; Node (Fastify/Express) backend; Postgres for museums/players/media metadata; object storage (S3 compatible) for photo/video; Socket.IO for real-time sessions. Make decisions from actual hosting constraints rather than prebuilding a large stack.
- Tables: `museums`, `museum_assets`, `invites`, `museum_versions`, `creator_users`, `room_sessions` (ephemeral presence may stay in memory/Redis). Unique opaque public slug; edit permissions; expiry/visibility support as needed.
- Signed upload URLs, MIME validation and content verification, file limits, cross-origin controls, rate limits, CSP, no secrets in client bundles, no arbitrary blob URLs permitted in persistent content, automatic cleanup policy.

## 7. Ordered execution roadmap and acceptance gates

**Phase 0 — Make baseline reproducible:** restore missing models; fix static asset paths; run via local HTTP; screenshot every key page; record console/network errors. **Gate:** both avatars visible and 3D scene navigable, or asset blockers documented.

**Phase 1 — Visual redesign:** create design tokens and redesigned entrance + HUD; enhance gallery lighting/floor/wall/materials with small measured performance budget. **Gate:** screenshots at desktop/tablet/mobile, consistent navigation and no broken interactions.

**Phase 2 — Character realism:** animation assets, rig validation, state machine, actual sit-down/stand-up, velocity blending, camera collision, improved collision/stairs. **Gate:** character QA checklist passes for both avatars.

**Phase 3 — Personalized gallery:** 6–45 framed photos, first image centrepiece, drag reorder, captions and a 60s optional screen video. **Gate:** create, preview, update and view work, and image memory stays acceptable.

**Phase 4 — Backend:** persistent museum/configuration and media, secure stable shareable links; localStorage migration, private edits. **Gate:** link works in incognito/on a different device without hash-embedded payload.

**Phase 5 — Multiplayer:** server with up to 4 visitors, names, chat, movement and action sync, seat reservations. **Gate:** two devices on separate networks walk/sit/chat together; 5th user gets clear room-full state.

**Phase 6 — Production:** automated tests, profiling, graceful errors, mobile responsiveness, authorization/security/privacy review, deployment. **Gate:** `npm run build`, smoke tests, real Android/iOS checks, browser console clean in critical flows.

### Testing commands (once Vite/test tooling is installed)

```powershell
npm run dev
npm run build
npm run preview
# After Playwright setup:
npx playwright install chromium
npx playwright test
```

Write tests for `start -> load -> enter -> walk -> inspect photo -> sit -> stand -> exit`; in Studio `create -> upload -> reorder -> preview -> publish -> reopen -> edit`; multiplayer `join 2 -> positions move -> seat lock -> chat -> disconnect/rejoin -> reject fifth`.

## 8. Deployment considerations

Use HTTPS for front-end and API. WebSocket backend needs persistent execution (or a managed real-time host); a static-only Vercel deployment by itself is not a replacement for a Socket.IO server. Serve immutable compressed GLB and texture assets via CDN. Consider Draco/Meshopt/KTX2 after verifying device and decode compatibility. Turn on instrumentation for FPS, frame timing, memory footprint, WebGL context loss, asset download failure, connection quality. Set measurable budgets based on actual target devices, not invented claims.

## 9. Copy/paste master prompt for Codex or Antigravity

```text
ROLE: Senior Three.js gameplay engineer + animation technical artist + UI/UX designer + full-stack systems engineer + QA.

INPUTS:
- My current source folder includes index.html, studio.html, css/style.css, js/{main,environment,characters,controls,ui,config,studio,audio,textures}.js, and existing project spec/playbook.
- Read MASTER_IMPLEMENTATION_GUIDE.md FIRST. It contains CODE-CONFIRMED audit findings, Giftvera PRODUCT-DOCUMENTED capabilities, and clearly marked UNVERIFIED live-demo details.
- Reference: https://museum.giftvera.com/g/demo-museum and https://giftvera.com/product/our-museum.

PRIMARY GOAL:
Upgrade MY existing romantic two-storey house + photo museum into an original, premium, personalizable, third-person multiplayer experience with capabilities comparable to Giftvera Our Museum. Improve visual design, realism and stability. Preserve working features and my house/gallery concept. Do NOT discard my code, copy proprietary Giftvera code/assets, or claim features tested when they are not.

MANDATORY INITIAL STEPS:
1. Audit repository and existing docs; list implemented vs broken vs missing features from CODE, not from aspirations in spec.
2. Confirm missing GLB model/animation files. If absent, install licensed replacements or use clearly labeled placeholders; never silently pretend loading is working.
3. Run reproducible baseline, record screenshot + console errors, create a Git branch and baseline tests.
4. With a permitted browser session inspect the reference demo. Record actual verified visuals, controls, interactions, multiplayer and mobile states; leave inaccessible items UNVERIFIED.
5. Produce docs/GAP_ANALYSIS.md with priority, expected result, edited files, dependencies, acceptance tests.

BUILD IN THIS ORDER:
A. Set up reproducible local tooling (Vite optional but recommended) without breaking current ESM modules.
B. Redesign entrance homepage and HUD with a coherent premium design system, responsive layouts and smooth but restrained transitions.
C. Upgrade avatar model pipeline, idle/walk/run, braking and turns, sit-down/sitting/stand-up clips with bench anchor and seat occupancy, camera obstruction handling and stairs; no teleportation while visible.
D. Enhance world visuals/lighting/performance and gallery composition. Keep rooms, paintings, customizer, studio and current user workflows functional.
E. Add 6–45 user photos, centrepiece selection, drag ordering, real persistent content and optional 60-second gallery-screen video.
F. Add secure server storage, stable private invite URLs, edit-existing-museum flow and persistence across browsers.
G. Add 4-player Socket.IO rooms, authoritative identity/seat actions, validated movement, interpolation, names and chat.
H. Build automated Playwright and practical gameplay/mobile QA; fix regressions.

WORK STYLE:
- Work in small reviewable commits, report each changed file and why; do not stop at a static mockup.
- If a feature needs an external model, list exact asset filename/source/license and manual work required.
- No unsafe destructive database/file operations or paid checkout flows without approval.
- No hard-coded credentials, no client-only authorization, no fake network sync, no placeholder claims.
- Every phase must have a runnable build, screenshot or test log and passed acceptance checklist.
- Prioritize actual playability and natural motion over superficial decoration.

DELIVERABLES:
Working project, REFERENCE_VISUAL_AUDIT.md, GAP_ANALYSIS.md, art/animation asset manifest with licenses, BUILD_NOTES.md, README and commands, .env.example, repeatable tests, deployment documentation and production checklist.

START NOW by auditing the source and baseline; then implement Phase 1 and continue in bounded tested increments.
```

## 10. Known blockers and decisions

- **Missing 3D model assets:** user-uploaded archive has no `assets/`; exact gameplay appearance cannot be locally verified from this ZIP alone.
- **Reference demo access:** research browser unable to operate the WebGL URL; detailed live inspection must be done by an agent with an interactive browser or through user screenshots/recording.
- **Backend absence:** persistent multiplayer/store is new scope, not a small frontend patch.
- **Existing spec conflict:** prior specification assumes two players in a shared house, whereas Giftvera documents up to four in a photo museum. Implement 2 primary couple roles but architect room capacity 4; clearly show guest/spectator role and permission rules.
- **Visual identity:** comparable quality and user workflows are the goal, not unauthorized reuse of Giftvera intellectual property.

## Sources checked

- Giftvera Our Museum: https://giftvera.com/product/our-museum
- Giftvera homepage: https://giftvera.com/
- Demo link supplied: https://museum.giftvera.com/g/demo-museum (not accessible in research browser)
- Open source reference: https://github.com/barisulgen/personal-museum
- Three.js: https://threejs.org/docs/
- Socket.IO rooms: https://socket.io/docs/v4/rooms/
- Playwright: https://playwright.dev/
