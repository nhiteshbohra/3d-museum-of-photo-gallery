# 3D Museum — Architectural & Policy Decisions

**Branch:** `fix/production-hardening`  
**Current HEAD SHA:** `36ad81302a50f190768b86e3d37a061d7a2f9d24`  
**Coordinator:** Antigravity Engineering Lead  

---

## 1. Authentication & Session Invariants (Milestone B)

1. **Server Authoritative Security:**
   - The server is the sole authority for private letters, photos, and WebSocket session admission. Client UI display flags (`inviteRequired`) must fail closed: if unverified, no private assets or sockets can be accessed.
2. **Single Unified UI State Machine:**
   - The authentication UI must transition through explicit, mutually exclusive states:
     - `UNAUTHENTICATED`: Passcode input active, button labeled "Verify Pass".
     - `VERIFYING`: Input locked, button labeled "Verifying…", spinner active.
     - `VERIFIED`: Status shows "✦ Pass Verified: Welcome, [Recipient] ✦", button becomes "Enter Sanctuary →", input displays "✦ Active Session ✦" (never raw passcodes).
     - `STARTING`: Button disabled as "Entering…", `#entrance-loading` unhidden with progress bar, 3D engine compiles shaders.
     - `IN_SANCTUARY`: Character setup rendered, "ENTER SANCTUARY" enables full 3D entrance.
3. **Elimination of Dual Handlers (AUTH-NEW-01):**
   - A single click event listener attached to `redeemBtn` inspects the UI state. When in `UNAUTHENTICATED`, it executes redemption. When in `VERIFIED`, it initiates `startMuseumExperience()`. It never re-submits a redemption request when clicking to enter.
4. **No Secrets in DOM Inputs (AUTH-NEW-02):**
   - `checkAuthSession()` must never inject `'290512'` or any other secret/passcode into DOM inputs. It displays verified status text and masks the input field cleanly.
5. **No Clapped Emotes or Excluded Gestures:**
   - Maintain exclusion of non-approved gestures; only verified 20 clips from the approved library are exposed in the gesture drawer.

---

## 2. Photo Fitting & Frame Presentation (Milestone D)

1. **Aspect-Fit contain Policy:**
   - Photos must never be cropped or distorted.
   - The backplate, decorative slot outline (`slot.outlineObject`), and pick surface must adapt proportionally to the fitted dimensions `(frameW, frameH)` with `0.08m` frame padding.
2. **Fixed East Wall:**
   - The 5-photo east wall configuration in every room must be preserved without collapse.

---

## 3. Mobile Optimization & Memory Architecture (Milestones M3 & M4)

### ADR-01: Curved Sofa Draco/WebP Dual-Asset Optimization & Distance LOD Pipeline (MOB-P0-01)
- **Status:** APPROVED & VERIFIED
- **Context:**
  The uncompressed curved sofa GLB model in the lobby was 51.98 MB (51,976,104 bytes), containing 15 uncompressed PNG textures and 150k+ vertices. On mobile connections (3G/4G) and constrained mobile RAM, this caused 10-15s entrance freezes and browser tab crashes.
- **Decision:**
  1. Primary Model: Optimize `public/models/ready/furniture/3d_pbr_curved_sofa.glb` using `@gltf-transform/cli optimize` with Draco geometry compression (vertex, normal, texcoord quantization) and WebP 2048px textures.
  2. Distance LOD Model: Generate `public/models/ready/furniture/lod/3d_pbr_curved_sofa_lod.glb` using Draco compression and WebP 1024px textures for distant viewing.
  3. Geometric Parity Invariant: Strict invariant that both primary and LOD models preserve the exact bounding box of the uncompressed original: `[-4.24407, 0, -4.24407]` to `[4.24407, 1.46614, 4.24407]` to 15 decimal places.
  4. Anchor Drift Invariant: Derived seating anchors (`sofa_seat_1` through `sofa_seat_4`) in `placedItems.js` must experience 0.000000m drift.
  5. Local Draco Decoders: Draco decoder WASM and wrapper scripts (`draco_decoder.wasm`, `draco_decoder.js`, `draco_wasm_wrapper.js`) are served locally from `public/models/ready/draco/` without any external CDN dependence.
- **Consequences:**
  - Primary model reduced from 51.98 MB to 6.13 MB (88.21% size reduction, exceeding >=85% target).
  - LOD model generated at 1.40 MB (97.32% size reduction, exceeding >=95% target).
  - Seating positions for Maya and Ethan remain 100% stable with zero drift.

### ADR-02: Dynamic Mobile DPR Capping and GPU Fill-Rate Protection (MOB-P0-02)
- **Status:** APPROVED & VERIFIED
- **Context:**
  Modern mobile smartphones feature 3x or 3.5x Retina displays (e.g., iPhone 14 Pro, Samsung Galaxy S23). Rendering Three.js WebGL scenes at native DPR on mobile devices requires rendering over 8-12 million fragments per frame, causing massive fill-rate bottlenecks, thermal throttling, rapid battery drain, and GPU context loss.
- **Decision:**
  Implement dynamic `getTargetPixelRatio()` in `src/engine/engine.js`:
  ```javascript
  function getTargetPixelRatio() {
    const isMobile = typeof window !== 'undefined' && (
      (typeof window.innerWidth === 'number' && window.innerWidth <= 768) ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
      ('ontouchstart' in window)
    );
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    return Math.min(dpr, isMobile ? 1.5 : 2);
  }
  ```
  - Mobile viewports (width <= 768px or touch capable) are capped at `1.5 max DPR`.
  - Desktop viewports remain capped at `2.0 max DPR`.
  - Integrated into engine startup and re-evaluated inside `resize()` event handlers to handle mobile orientation changes and split-screen mode.
- **Consequences:**
  - Cuts GPU fragment shading workload by over 50% on 3x screens while preserving retina-sharp visual clarity.
  - Zero degradation to desktop fidelity. Verified across unit and adversarial test suites.

### ADR-03: 35-Texture Bounded LRU Cache & Multi-Tier In-Flight Lifecycle Hooks (MOB-P1-04)
- **Status:** APPROVED & VERIFIED
- **Context:**
  Previously, `loadedPhotoTextureCache` was an unbounded Map causing monotonic memory growth across salon visits. An initial fix bounded the cache to 25 items, but triggered a race condition: calling eviction immediately upon texture download judged textures for incoming rooms as unused before `job.onLoad` mounted them to room meshes, prematurely disposing active art (60 premature disposal events). Additionally, 25 items was smaller than the 30 photos required for 3 fully resident rooms (`MAX_CACHED_ROOMS = 3`).
- **Decision:**
  1. Capacity Expansion: Expand `MAX_CACHED_PHOTO_TEXTURES = 35` to cleanly hold 3 cached rooms (up to 30 photos) + current room margin.
  2. Multi-Tier In-Flight Protection:
     - `inFlightTextures`: Set of textures currently downloading/decoding.
     - `inFlightPromises`: Map of URLs to pending download promises (deduplicating concurrent requests).
     - `textureUrlMap`: WeakMap mapping texture instances to source URLs.
  3. Comprehensive Active Reference Checks (`isTextureInUse`):
     - Protects any texture in `currentRoom.disposables`, mesh materials in `currentRoom.group`, or pending in `currentRoom.deferredTextureLoads`.
     - Protects textures in all cached rooms in `roomCache` (`disposables`, mesh materials, or `deferredTextureLoads`).
     - Protects textures in `inFlightTextures` or `inFlightPromises`.
  4. Scoped Eviction Hooks:
     - Texture eviction (`evictExcessPhotoTextures()`) is hooked only to room eviction (`evictExcessRooms()`) and uncached transitions in `loadRoom()`. It never runs mid-flight during texture batch download.
  5. Leak-Free Engine Teardown:
     - On `engine.stop()`, all remaining cached textures are explicitly purged and disposed (`tex.dispose()`), leaving 0 alive textures.
- **Consequences:**
  - 0 premature texture disposals across 50-room and 100-room transitions, rapid toggles, out-of-order downloads, and deduplication stress tests.
  - 0 memory leaks across long visitor sessions.

---

## 4. Multi-Agent Governance & Verification Discipline

1. **Role Separation & No Self-Certification:**
   - Every defect must be independently reproduced before patching.
   - Code changes must be reviewed and tested by independent reviewers and adversarial challengers before any gate can pass.
2. **Adversarial Integrity:**
   - No mock test returns, no skipped assertions (`.skip()`), and real execution proof on live servers and browser runtimes.
