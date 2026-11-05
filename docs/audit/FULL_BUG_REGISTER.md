# Our Museum 3D — Full Master Bug Register

**Repository:** `nhiteshbohra/3d-museum-of-photo-gallery`  
**Branch:** `fix/production-hardening`  
**Date:** 2026-11-06  
**Auditor:** Engineering Lead & Code Stability Auditor  

---

## 1. Master Issue Tracking Register

| ID | Priority | Category | File Path | Defect Summary | Root Cause | Status | Verification Evidence |
|---|---|---|---|---|---|---|---|
| **AUTH-01** | **P0** | Auth | `src/main.js` | Returning visitor with valid cookie stranded on ticket card | `checkAuthSession()` did not boot 3D engine (`startMuseumExperience`) when `sessionStorage` was absent | **RESOLVED** | `checkAuthSession()` boots engine, prepares shaders, and reveals character setup |
| **AUTH-02** | **P1** | Auth | `src/main.js` | URL parameters (`?code=`) auto-start without verification | Auto-redemption unvalidated | **RESOLVED** | Server session validation enforced; safe prefill |
| **AUTH-03** | **P1** | Auth | `server.js` | Expired/revoked invites reported as active gate requirement | `listInvites().length > 0` did not filter status | **RESOLVED** | Checked active invites: `listInvites().some(i => !i.revoked && Date.now() <= i.expiresAt)` |
| **AUTH-NEW-01** | **P0** | Auth/UI | `src/main.js` | Dual click listeners on `redeemBtn` (`addEventListener` + `.onclick`) | Adding `.onclick` did not remove `addEventListener('click')`, causing double redemption on enter | **RESOLVED** | Single unified state machine dispatcher `handleRedeemButtonClick` |
| **AUTH-NEW-02** | **P0** | Security | `src/main.js` | Hard-coded `'290512'` injected into DOM input | `checkAuthSession()` set `inviteCodeInput.value = '290512'` | **RESOLVED** | Removed hardcoded injection; displays `✦ Verified Session Active ✦` placeholder |
| **AUTH-NEW-04** | **P1** | Security | `src/main.js` | Client `inviteRequired` initialized as `false` (optimistic) | Asynchronous `/api/config` window | **RESOLVED** | Defaulted `inviteRequired = true` (fail-closed) |
| **PHOTO-01** | **P1** | Graphics | `src/game/room.js` | Portrait/square photos had mismatched, oversized decorative outlines | `backplate` rescaled but `slot.outlineObject.scale` was unchanged | **RESOLVED** | Scaled `slot.outlineObject.scale` to `(frameW / slot.width, frameH / slot.height, 1)` |
| **DECOR-01** | **P1** | Content | `src/data/museumLayout.json` | Non-lobby rooms had sofas, chandeliers, bookcases violating simplification rule | Legacy room layout | **RESOLVED** | Artifacts and sofas restricted to Lobby; only plants remain in salons |
| **AVATAR-01** | **P1** | Rigging | `src/avatars/avatarWorld.js` | Model native forward vector vs world coordinate mismatch | Native $+Z$ head vector required visual rig pivot `rotation.y = Math.PI` | **RESOLVED** | Model axes verified, motion math contract tests 11/11 pass |
| **AVATAR-02** | **P1** | Animation | `src/avatars/avatarWorld.js` | Progressive clip loading transitions | Missing or delayed clips skipped choreography | **RESOLVED** | State transitions guarded by active logical states and fallback idle |
| **MOB-01** | **P0** | Mobile | `public/models/.../3d_pbr_curved_sofa.glb` | 51.9 MB curved sofa model asset pressure | Uncompressed high-poly sofa mesh | **IN PROGRESS** | Sofa restricted to lobby; mobile LOD pipeline documented |
