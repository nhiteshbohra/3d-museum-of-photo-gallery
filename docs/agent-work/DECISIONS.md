# 3D Museum — Architectural & Policy Decisions

**Branch:** `fix/production-hardening`  
**Coordinator:** Engineering Lead  

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

## 3. Mobile Optimization Targets (Milestone F)

1. **52 MB Sofa Replacement:**
   - The high-poly sofa model will be optimized with Draco/meshopt compression and a compact mobile LOD variant referenced in `museumLayout.json`.
2. **Adaptive DPR:**
   - Cap default mobile DPR to 1.5 with fallback to 1.0 on low-end devices, with manual override in settings.
3. **Photo Cache LRU:**
   - Bounded LRU cache of 20 textures with explicit `.dispose()` of geometries and materials on room unloading.
