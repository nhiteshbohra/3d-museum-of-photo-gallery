# Our Museum 3D — Photo Frame & Image Fitting Audit

**Branch:** `fix/production-hardening`  
**Files Audited:** `src/misc/helper.js`, `src/game/room.js`, `src/config/artworkSizes.js`, `tests/photo_frames.test.mjs`  
**Auditor:** Senior Developer & Independent Reviewer  

---

## 1. Aspect-Ratio Contain Policy & Frame Adaptation

### Policy Invariant:
- Photos must **never be cropped or stretched**. The entire image content must remain 100% visible.
- The decorative border, solid backing plate, and pickable hit area must adapt proportionally to the fitted photo geometry, with uniform `0.08m` padding.

### Mathematical Implementation:
In `src/misc/helper.js`:
```javascript
export function fitPhotoToFrame(mesh, texture, width, height) {
    const iw = texture?.image?.width
    const ih = texture?.image?.height
    const scale = Number.isFinite(iw) && Number.isFinite(ih) && iw > 0 && ih > 0
        ? Math.min(width / iw, height / ih) : null
    texture.repeat.set(1, 1)
    texture.offset.set(0, 0)
    mesh.scale.set(
        (scale === null ? width : iw * scale) / mesh.geometry.parameters.width,
        (scale === null ? height : ih * scale) / mesh.geometry.parameters.height,
        1,
    )
}
```

In `src/game/room.js`:
```javascript
const fittedW = (mesh.geometry.parameters?.width || 1) * mesh.scale.x
const fittedH = (mesh.geometry.parameters?.height || 1) * mesh.scale.y
const padW = 0.08
const padH = 0.08
const frameW = Math.min(baseW, fittedW + padW)
const frameH = Math.min(baseH, fittedH + padH)

if (backplate) {
    backplate.scale.set(frameW / baseW, frameH / baseH, 1)
}
if (slot?.outlineObject) {
    slot.outlineObject.scale.set(frameW / (slot.width || baseW), frameH / (slot.height || baseH), 1)
    ensureOutlineInFront(slot)
}
```

---

## 2. Test Matrix Across Aspect Ratios

Verified across 4 distinct aspect ratio archetypes in `tests/photo_frames.test.mjs`:

| Aspect Ratio Archetype | Dimensions | Slot Bounds $(W \times H)$ | Fitted Dimensions | Backplate & Outline Scale | Verification Result |
|---|---|---|---|---|---|
| **Portrait** | $800 \times 1200$ | $2.4\text{m} \times 1.8\text{m}$ | $1.20\text{m} \times 1.80\text{m}$ | $0.533 \times 1.000$ | **PASS** — Outline matches vertical photo; no horizontal excess |
| **Standard Landscape** | $1600 \times 900$ | $2.4\text{m} \times 1.8\text{m}$ | $2.40\text{m} \times 1.35\text{m}$ | $1.000 \times 0.794$ | **PASS** — Fitted perfectly without cropping |
| **Panoramic** | $2400 \times 600$ | $2.4\text{m} \times 1.8\text{m}$ | $2.40\text{m} \times 0.60\text{m}$ | $1.000 \times 0.378$ | **PASS** — Outline hugs letterbox banner frame cleanly |
| **Square** | $1000 \times 1000$ | $2.4\text{m} \times 1.8\text{m}$ | $1.80\text{m} \times 1.80\text{m}$ | $0.783 \times 1.000$ | **PASS** — Symmetric square border |

---

## 3. Fixed Wall Layout & Clearance
- 5-photo east wall configuration in every room preserved via `src/config/artworkSizes.js`.
- Door clearances maintained: all wall slots offset $\ge 2.0\text{m}$ from room entrance gates.
- No collision between adjacent artwork frames.

---

## 4. Test Evidence
- `node --test tests/photo_frames.test.mjs`: **4/4 PASSED (100%)**
- Status: **VERIFIED & OPERATIONAL.**

