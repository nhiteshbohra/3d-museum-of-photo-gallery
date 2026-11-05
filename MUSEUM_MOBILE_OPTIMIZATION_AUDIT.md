# Our Museum 3D — Mobile Performance Audit & Engineering Roadmap

**Source audited:** `nhiteshbohra/3d-museum-of-photo-gallery`, branch `fix/production-hardening`, commit `08a0f805f5f49c75a401a2ea11f199221fc19859` (as retrieved November 6, 2026).  
**Review type:** Source-level assessment of frontend, Three.js engine, avatar loading, room building, model handling, photo textures, touch input, and WebSocket loop. **No source changes.**  
**Evidence limit:** This is not a benchmark. The private photos are not present in the public repo; no representative Android/iOS WebGL profiling session was executed.

## Architecture understood

- **Server:** Node.js + `ws` (`server.js`); one private two-user session, invitation HTTP API and WebSocket synchronization.
- **Frontend:** Vite and native Three.js; `src/main.js` creates entrance, navigation, UI overlays, virtual joystick and mobile look controls.
- **Rendering:** `src/engine/engine.js` creates WebGL renderer, drives one room and local avatar, manages room LRU cache (maximum 3), photo cache and camera. `src/avatars/multiplayer.js` has a separate animation-frame loop for remote avatars, chat HUD and 20 Hz network sends.
- **Assets:** `src/game/room.js` assembles procedural architecture/photo slots. `src/game/room/placedItems.js` loads and deep-clones placed models, with optional LOD support. `src/avatars/avatarWorld.js` loads male/female rigs, appearance textures, and animation clips. `src/avatars/characterSetup.js` owns another renderer during character selection.
- **Current design goals:** Keep avatar identity, 7 galleries, real images, private invitations, two-user synchronization and existing visual style. Mobile must be useful rather than showing a desktop-only warning.

## Quantified source-asset footprint (GitHub file sizes, not per-visit transfer)

| Asset category | Count | Stored size |
|---|---:|---:|
| `public/models/ready/furniture/3d_pbr_curved_sofa.glb` | 1 | 51.98 MB |
| `man.glb` and `woman.glb` | 2 | 26.07 MB |
| Avatar PNG textures | 8 | 18.72 MB |
| 40 animation GLBs (20 per character) | 40 | 1.17 MB |
| Other GLBs (including 52 MB sofa) | 8 | 58.79 MB |
| All tracked `public/` assets | 69 files | 107.26 MB |

**Critical nuance:** A source file referenced in five galleries is normally downloaded once because `getGltf()` caches the Promise, but `deepCloneScene()` clones the loaded geometry/material/texture resources per active room. Stored size does not equal GPU memory. Real photography (`public/photos/`) is intentionally not tracked, so photo transfer and memory footprint require measurements in the deployment environment.

## Ranked mobile optimization backlog

### MOB-P0-01 — Optimize the 52 MB curved sofa and enable actual LODs
**Files:** `public/models/ready/furniture/3d_pbr_curved_sofa.glb`, `src/data/museumLayout.json`, `src/game/room/placedItems.js`, `scripts/model_manager.mjs`.

- The source GLB is ~52 MB and is referenced in lobby, fireside, music, paris and orangery rooms. LOD code only activates if `itm.lodPath` is supplied; the current layout does not supply those paths.
- Inspect the GLB using `gltf-transform inspect` to identify mesh vs embedded texture contributions. Do not assume Draco alone will fix it.
- Export low/medium/high mesh assets while preserving seat anchors, correct unit scale, front direction and silhouette. Use Draco/Meshopt for geometry when beneficial; compressed/material textures when beneficial. Configure actual `lodPath` or mobile variants, verify bounding boxes and collision proxies.
- Candidate engineering goals, **not guaranteed outcomes**: sofa mobile asset <=3–8 MB if technically feasible; reduce rendered triangles/draw calls significantly; use one shared underlying geometry/material when safe. Measure decoded memory and first-load time.
- Keep raw source in local archive, not the deployed production directory. Validate both sofa seats and the five affected galleries.

### MOB-P0-02 — Adaptive device pixel ratio and rendering quality
**Files:** `src/engine/engine.js` (~L32–35), `src/avatars/characterSetup.js` (~L97–100).

- Both renderers use `antialias: true`, DPR capped at **2**. At DPR 2, the render target has **4× the pixels** of DPR 1; compared with DPR 1.25 it has **2.56× the pixels**.
- Use a runtime quality controller with `low / balanced / high` profiles and gradual GPU-time/frame-time feedback. Start low-end phones with DPR 1.0; balanced 1.25; high 1.5, subject to performance traces. Revisit antialiasing and shadows on low mode. Offer optional user quality override.
- Do not adjust quality every frame or oscillate rapidly: use windowed measurements, hysteresis and clamped steps. Preserve critical text legibility by limiting DPR changes to 3D canvas, not DOM HUD.

### MOB-P0-03 — Reduce avatar texture decoding and CPU recoloring
**Files:** `src/avatars/avatarWorld.js` (~L147–280) and `public/models/ready/characters/textures/`.

- Each character model is ~13 MB. Eight additional PNGs total ~18.72 MB. `applyAppearance()` reads/writes full-resolution canvas pixel buffers and loops over pixels and mask channels; this is expensive on low-end mobile CPUs and duplicates CPU/GPU memory.
- Investigate texture dimensions and real GPU uploads. Generate lower-resolution/mobile variants or KTX2/Basis-compressed GPU textures and register `KTX2Loader.detectSupport(renderer)` appropriately; benchmark decode overhead.
- Avoid per-user full-size duplicate maps unless appearance differs; cache material/texture variants, or consider shader-based color masking after visual QA. Defer cosmetic recolor to idle; never block movement.
- Fix any root/skinning/forward-axis problems before geometric model simplification.

### MOB-P1-04 — Bound photo cache, prioritize visible pictures and decode at needed size
**Files:** `src/engine/engine.js` (~L83–128, ~L1560), `src/game/room.js`, `src/main.js`.

- `loadedPhotoTextureCache` is an unbounded Map; disposal deliberately skips cached textures. Seven galleries can accumulate private photo textures over time. `runDeferredTextureLoads` currently uses `Promise.all` over room jobs (potentially ten concurrent requests) and `preloadTextures` starts requests for all supplied URLs.
- Introduce a **memory-budgeted LRU** rather than an unlimited cache; dispose on eviction only when no current room references a texture. Use reference counts or room ownership. Cancel/ignore stale work without leaking GPU textures.
- Use two levels per photo: 512–1024px in wall frames and higher-resolution source loaded only when the visitor opens a photo. Preserve aspect ratio, never crop the original. Pick actual resolutions after checking physical wall coverage and target screens.
- Limit image fetch/texture upload concurrency (e.g. 2–3 on low-end phones) and prioritize visible wall surfaces; prefetch only adjacent room thumbnails. Keep pictures private behind existing auth.
- Illustrative GPU budget: an uncompressed 2048×2048 RGBA texture takes ~16 MiB **before** mipmap overhead; dozens retained can exceed typical mobile GPU budgets. Actual formats/dimensions vary.

### MOB-P1-05 — Room cache and heavy model lifecycle
**Files:** `src/engine/engine.js` (~L440–650), `src/game/room/placedItems.js` (~L180–220), `src/game/room/staticCache.js`.

- Room LRU currently holds up to **3 fully built rooms**; `deepCloneScene()` separately clones mesh geometry, materials and textures. With one 52 MB shared sofa represented multiple times, the memory/storage handling merits profiling.
- On low tier keep only the current full room plus optionally a lightweight nearby shell. Cache **source asset data**, not many full room GPU instances. Ref-count shared geometry/materials and dispose only at zero references.
- Existing `renderer.compileAsync(scene,camera)` is awaited during every uncached room switch, and `prebuildRoom` runs synchronous build/compile inside an idle callback. Split heavy work into smaller chunks; prioritize scene shell and collision, then visible assets; precompile selectively in idle time rather than forcing every door transition to await shaders.
- Use `renderer.info.render.calls`, `renderer.info.memory.textures`, `renderer.info.memory.geometries`, frame-time traces and browser memory tools before/after 50 transitions.

### MOB-P1-06 — Reduce CPU workload per animation frame
**Files:** `src/engine/engine.js`, `src/avatars/multiplayer.js` (~L553–599), `src/avatars/characterSetup.js` (~L120–155), `src/game/room.js`.

- Engine, multiplayer/UI and character preview have separate rAF loops in different phases. Merge same-scene per-frame work into one engine tick where practical, or throttle off-screen DOM work (chat bubbles, emoji/hints) to 10–15 Hz. Retain smooth avatar interpolation/animation.
- Do not keep a hidden preview renderer running after entering; verify GPU context disposal and cancel rAF.
- Limit dynamic candle/fire/ceiling fan updates on low tier. Avoid temporary Vector3 allocations and full scene raycasting for stable static targets; profile first.
- Pause rendering when document is hidden or not visible and avoid runaway idle timers; maintain heartbeat/reconnect logic correctly.

### MOB-P1-07 — Mobile 3D/UI and gameplay controls
**Files:** `src/main.js` (~L700–870), `src/style.css`, `src/engine/engine.js`.

- Existing left virtual joystick, right swipe-to-look, Jump/Sit/Orbit/Front/Chat/Emotes are present. Test actual phone layouts at 320/360/375/390 CSS widths, both orientations, safe-area notches, keyboard open and two simultaneous touches.
- Ensure `touch-action` and event propagation do not scroll page, click 3D objects, trap joystick state or block other actions. Prevent gesture drawer from covering important buttons. Prefer legible labels and 44 CSS pixel tap targets.
- Don't run expensive scene changes on pinch/drag; decouple camera input from player-facing animation and network state. Check thermal throttling after 10 minutes, not only initial FPS.

### MOB-P2-08 — Multiplayer network and CPU
**Files:** `src/avatars/multiplayer.js` (~L19, ~L553–600), `src/net/wsClient.js`, `server.js`.

- Client sends state at 50 ms interval (20 Hz) while connected, even when idle. Track send-on-change plus low-rate idle heartbeat (e.g. 1–2 Hz state, with a separate connection heartbeat), while retaining 15–20 Hz active movement. Interpolate remote avatar state on rendering frames.
- Throttle remote chat-bubble/nametag DOM projections on low tier. Don't sacrifice correct two-person synchronization or 30-second grace reconnection.

### MOB-P2-09 — Reduce main bundle / bootstrap before authentication
**Files:** `src/main.js` (~L1–9) and entrance boot paths; `src/engine/engine.js`.

- Static imports eagerly include Three.js/engine/multiplayer modules. Load only the minimal password gate first, and dynamically import the game after a successful server-validated invitation/session policy. This reduces parsing/initial boot CPU work and protects the pre-auth experience from unnecessary loading.
- Keep private content protected by the **server**, not only by dynamic imports. Preserve the agreed policy for existing valid sessions vs new manual password entry.

## Device profiles (initial proposals, calibrate with measurements)

| Setting | Low-end Android | Balanced phone | High-end phone |
|---|---|---|---|
| Render DPR cap | 1.0 | 1.25 | 1.5 |
| Goal median FPS | 30 | 30–45 | 45–60 |
| Antialias/shadows | minimal/off | selective | selective high |
| Full room GPU cache | 1 | 1–2 | up to 2–3 if memory permits |
| Visible furniture | low LOD | medium LOD | high near/medium far |
| Photo in-frame | ~512–1024px | ~1024px | ~1024–2048px where needed |
| Gesture clips | loaded on demand | prefetch during idle | prefetch during idle |

The above are **targets and test settings**, not currently achieved measurements. Dynamic resolution is more reliable than hard-coded phone-model detection.

## Acceptance metrics and measurement protocol

Test with **the actual private photo assets** and two authenticated visitors on a reference Android device and iPhone over Wi-Fi and mobile data. Record model type, OS/browser, network speed/RTT, viewport, DPR, device temperature (if available), cache state and connection status.

1. Cold first authenticated entrance: record TTFB, JS download/parse, first visible 3D frame and usable control time separately.
2. Cold first encounter with large sofa, then repeat cached room transition: record network bytes, GLB parse/texture upload and p50/p95 transition time.
3. 10-minute continuous room navigation with a remote avatar: median FPS, p95 frame time, long tasks, memory/texture/geometry counts and battery/thermal changes.
4. Repeat 50 room switches, 20 avatar join/leave cycles and avatar color changes; check no unbounded resource growth or broken textures.
5. Verify all gestures, both cameras, mobile joystick, sofa seats, photo detail, private invitation and 30-second reconnection still behave as before.

**Initial performance gates:** mobile median >=30 FPS, p95 frame time <=50 ms on the chosen low-end reference device; no recurring freezes >200 ms during ordinary walking; first usable cached room switch p95 under 500 ms (tune after baseline). More ambitious 60 FPS only on devices proven capable, not guaranteed across all phones.

## Engineering instructions to agent

> Review this audit and take baseline measurements first. Optimize by highest impact: (1) curved sofa mesh/textures and true LOD, (2) mobile adaptive DPR, (3) avatar texture/appearance pipeline, (4) bounded photo cache, (5) scene resource sharing and progressive room readiness, (6) per-frame CPU work, (7) touch UI, (8) network update strategy, (9) password-first dynamic imports. Create a performance benchmark report with actual request waterfall, compressed bytes, GLB decode timing, shader compilation, CPU long tasks, renderer.info calls/textures/geometries and FPS traces. Keep the museum appearance, approved gestures, character models, seven rooms, private photos, multiplayer and seat locks. Every optimization requires an A/B result on actual Android/iOS hardware plus full regression. No unsupported claims such as “90% faster” or “production-ready” without measurements.

## Official technical references

- Three.js GLTFLoader: https://threejs.org/docs/pages/GLTFLoader.html
- Three.js KTX2Loader: https://threejs.org/docs/pages/KTX2Loader.html
- Three.js cleanup/disposal manual: https://threejs.org/manual/pages/how-to-dispose-of-objects.html
- Three.js responsive rendering guidance: https://threejs.org/manual/pages/responsive.html
