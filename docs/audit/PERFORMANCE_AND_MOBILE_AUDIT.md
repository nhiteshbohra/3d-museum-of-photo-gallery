# Our Museum 3D — Performance & Mobile Optimization Audit

**Branch:** `fix/production-hardening`  
**Files Audited:** `src/engine/engine.js`, `src/avatars/avatarWorld.js`, `src/data/museumLayout.json`, `src/style.css`  
**Auditor:** Senior Researcher & Senior Developer  

---

## 1. Baseline Bottlenecks & Audit Findings

1. **Decor Overload in Non-Lobby Salons:**
   - Previous revisions placed 52 MB curved sofas, chandeliers, and bookcases in every salon.
   - *Resolution:* Implemented Mandatory Content Rules 2, 3, and 4. All artifacts, chandeliers, and sofas are restricted strictly to the Grand Lobby. Non-lobby salons now contain only plants. This eliminates over 300 MB of cumulative asset loading and draw calls during gallery navigation.
2. **51.9 MB Sofa Model (`3d_pbr_curved_sofa.glb`):**
   - The sofa model in `public/models/ready/furniture/3d_pbr_curved_sofa.glb` remains 51.9 MB.
   - It is now spawned **only once in the entire experience** (in the Grand Lobby).
   - In Milestone F, this asset will be processed via `gltf-transform` to produce a compressed/Draco mobile variant with LOD support.
3. **Adaptive DPR (Device Pixel Ratio):**
   - High-density mobile screens ($DPR \ge 3$) can cause severe fillrate bottlenecks on mobile GPUs.
   - Default DPR cap of $\min(devicePixelRatio, 2.0)$ is functional; recommended mobile adaptive tier caps DPR to $1.5$ on mobile screens to preserve 60 FPS while keeping text and UI crisp.
4. **Photo Texture Memory & Streaming:**
   - All 61 local photo textures are streamed on demand as visitors approach galleries.
   - Parallel room prebuilding is capped to 2 adjacent rooms to prevent cache thrashing.
5. **Mobile Touch Layout & Controls:**
   - Touch targets for gestures, camera toggle, jump, and chat meet mobile accessibility guidelines ($\ge 44\text{px}$).
   - Virtual joystick and touch swipe listeners isolated from 3D canvas raycasting.

---

## 2. Test Evidence & Performance Metrics
- Production client bundle: **`827.83 kB`** (gzip: 225.23 kB).
- Vite build time: **4.08 seconds**.
- All 19 placed layout items validated across all 7 rooms.
- Status: **OPTIMIZATION STAGE 1 (DECOR SIMPLIFICATION) COMPLETE; LOD/DPR BACKLOG SCHEDULED.**
