# 3D Museum — Model Pipeline & Placement Task

## Context
- Project: `f:\projects\3dmuseum`
- Models folder: `f:\projects\3dmuseum\3d model\`
- Placement is controlled **only** through `src/data/museumLayout.json` — no admin UI.
- Read `PROJECT_INSTRUCTIONS.md` and `MUSEUM_ARTIFACT_PLACEMENT_PLAN.md` before starting.
- Report in plain words. **Stop after every step and wait for my "go" before continuing.**

---

## STEP 1 — Normalise My Models

**Source folder:** `f:\projects\3dmuseum\3d model\`

Rules:
- **Never touch the original folder.** Work on copies only.
- Unzip every `.zip`. Find the model inside (`.glb`, `.gltf` + `.bin` + textures, `.fbx`, `.obj`, etc.).
- Convert everything to `.glb`. Use `gltf-transform`, `FBX2glTF`, or `assimp`. Install any tool you need. Tell me about every file that fails and why.
- Optimise every model:
  - Draco or meshopt compression
  - Textures ≤ 2048 px
  - Strip unused data
  - Target: **< 1 MB** and **< 60 k triangles**. Flag anything that exceeds these limits with exact numbers.
- Set the pivot to **bottom-centre**, front facing **+Z**. Record the real-world height in metres. If you cannot determine the real size, mark it `NEEDS_SIZE` and ask me.
- Rename to `category_name.glb` (lowercase, underscores, no spaces).
- Read every README / licence file that came with the model:
  - If missing → `UNKNOWN`
  - If NonCommercial or NoDerivatives → `DO NOT USE`
  - If CC-BY → record author, source URL, and licence text for ATTRIBUTIONS.md

**Output to `public/models/ready/`:**

```
public/models/ready/
  furniture/
  lighting/
  plants/
  models.manifest.json      ← one entry per model
  ATTRIBUTIONS.md           ← CC-BY credits only
  contact-sheet.html        ← rotating turntable viewer
```

**`models.manifest.json` fields per model:**
`name`, `originalFile`, `category`, `licence`, `author`, `source`, `sizeBytes`, `triangles`, `realHeightMetres`, `status`

**`contact-sheet.html`:**
Every model on a self-rotating turntable (Three.js inline, no server needed).
Each card shows: name · file size · triangle count · height · licence.
Tell me exactly how to open it.

**→ STOP. I will review and tell you which models to place.**

---

## STEP 2 — Load Models from the Layout File

Extend `src/game/room/placedItems.js` so it can load GLB files listed in `museumLayout.json`.

Required fields in `museumLayout.json` per item:
```json
{
  "type": "glb",
  "path": "models/ready/furniture/furniture_bookshelf.glb",
  "room": "lobby",
  "position": { "x": 0, "y": 0, "z": 0 },
  "rotationY": 0,
  "scale": 1.0
}
```

Rules:
- Use a **shared GLTFLoader cache** — if the same path is used twice, load once and reuse.
- **Dispose** all loaded geometries, materials, and textures when the room changes.
- Floor items must register a **collision obstacle** so the player cannot walk through them.
- **No new admin or editing UI** of any kind.

**→ STOP. Wait for my "go".**

---

## STEP 3 — Layout & Alignment

I will describe where I want things in plain English, e.g.:
> *"Lobby: ficus in the north-east corner, two chandeliers above the centre, bench facing the masterpiece painting."*

You will:

1. **Convert** my description into `museumLayout.json` entries using model names from the manifest.
2. **Choose positions** using the real room bounds, door clearances, and obstacle data from the code — not guesses. Ask me if anything is unclear.
3. **Scale** each model using its recorded `realHeightMetres`.
4. **Run automated checks** and print PASS / FAIL for each item:

| Check | Limit |
|---|---|
| Floor contact (not floating, not sunken) | ≤ 1 cm gap |
| Wall items flush with wall | ≤ 1 cm gap |
| No overlap with artwork frame or plaque | 0 overlap |
| Wall lights away from frames | ≥ 1.5 m |
| Clearance around every door | ≥ 2.0 m |
| Fully inside the room | 100 % |
| No overlap with other items | 0 overlap |
| Walkway between floor items | ≥ 0.8 m |
| Real lights per room | ≤ 8 |
| Sensible real-world size | ± 20 % of real height |

5. **Take Playwright screenshots** of every placed item: front, 45°, side, top. Look at them. Fix anything wrong: floating, clipping, wrong size, wrong facing, black faces, flipped textures.
6. **Write `ALIGNMENT_REPORT.md`**: PASS / FAIL table for every item, with a description of any fix made.

After that, when I say *"move the bench 20 cm left"* or *"turn the lamp to face the door"*, you edit `museumLayout.json`, re-run checks, and show a new screenshot.

**→ STOP. Wait for my layout description.**

---

## STEP 4 — Final Check

Write `COMPLETION_CHECKLIST.csv` **and** `COMPLETION_CHECKLIST.md`.

One row per item:

| Item | Status | Evidence | What is left |
|---|---|---|---|

Status values: `DONE` · `PARTIAL` · `MISSING` · `BROKEN`

**Cover every item below. Do not mark DONE unless you have verified it:**

- [ ] All models converted and in `public/models/ready/`
- [ ] `models.manifest.json` complete and accurate
- [ ] `contact-sheet.html` opens and shows all models
- [ ] `ATTRIBUTIONS.md` written for CC-BY models
- [ ] `museumLayout.json` entries for all placed items
- [ ] `placedItems.js` loads GLBs with caching and disposal
- [ ] Alignment checks all PASS
- [ ] `npm run build` — clean, 0 errors
- [ ] No console errors across 5 room entries
- [ ] No memory leaks (heap stable after room changes)
- [ ] Frame time ≤ 10 % worse than before models were added
- [ ] All doors still open and show the hand cursor
- [ ] `PROJECT_INSTRUCTIONS.md` updated with any new conventions

**→ STOP. Deliver the checklist.**

---

## Standing Rules (all steps)

- Follow `PROJECT_INSTRUCTIONS.md` at all times.
- No audio added.
- No dead code or leftover `console.log` / debug statements.
- No blocky cuboid furniture (Constraint 3.2).
- No text in photo lightboxes (Constraint 3.3).
- Doors: 6.0 m click reach, 0.50 m walk-through radius — never break these.
- If anything conflicts or is unclear, stop and ask me **one short question**.
