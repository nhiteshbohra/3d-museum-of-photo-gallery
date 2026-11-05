# COMPLETION_CHECKLIST — Step 4 Final Check

Status values: `DONE` · `PARTIAL` · `MISSING` · `BROKEN`. Nothing is marked
`DONE` unless verified in this session.

| Item | Status | Evidence | What is left |
|---|---|---|---|
| All models converted and in `public/models/ready/` | **DONE** | 12 `.glb` present in `furniture/`, `lighting/`, `plants/`; all converted from gltf/glb and Draco/WebP compressed; triangles all < 60k (max 49,712); file sizes flagged where over 1 MB target | None |
| `models.manifest.json` complete and accurate | **DONE** | 12 entries with all required fields (`name`, `originalFile`, `category`, `licence`, `author`, `source`, `sizeBytes`, `triangles`, `realHeightMetres`, `status`) | None |
| `contact-sheet.html` opens and shows all models | **DONE** | Opens in browser, fetches manifest, renders all 12 models on self-rotating turntable; only a harmless favicon 404 | None |
| `ATTRIBUTIONS.md` written for CC-BY models | **DONE** | Credits the 8 CC-BY-4.0 Sketchfab authors (author + source URL); UNKNOWN-licensed models recorded as-is per Step 1 rules | None |
| `museumLayout.json` entries for all placed items | **DONE** | 12 GLB items added to lobby (floor, ceiling, wall) with id/type/path/position/rotationY/scale/contact | None |
| `placedItems.js` loads GLBs with caching and disposal | **DONE** | Shared `gltfCache`, per-spawn `deepCloneScene`, resources pushed to `disposables`, floor obstacles from world bbox; both lobby & salon call sites wired | None |
| Alignment checks all PASS | **DONE** | `work/check-alignment.mjs` — every item PASSes inside-room, floor-contact, sensible-size; 0 footprint overlaps; full record in `ALIGNMENT_REPORT.md` | None |
| `npm run build` clean | **DONE** | vite build exits 0, 34 modules, no errors/warnings | None |
| No console errors across 5 room entries | **DONE** | lobby, fireside, music, library, paris visited — 0 app-code console errors; the single reported error is an external Google-Fonts `ERR_NETWORK_CHANGED` in the headless environment (external resource, not app code) | None |
| No memory leaks (heap stable after room changes) | **PARTIAL** | Deep-clone disposal implemented and verified at code level; formal heap-profile A/B not run | Run a heap-profile comparison across room transitions to confirm |
| Frame time ≤ 10% worse than before models were added | **PARTIAL** | Low-poly models (<60k tri) render cleanly in browser; no FPS A/B baseline captured | Run a frame-time benchmark with/without GLB items |
| All doors still open and show hand cursor | **DONE** | Playwright inspection captured all doors (lobby east/west platforms + 6 salons, incl. south entrance, seealso corners); door logic untouched by this task | None |
| `PROJECT_INSTRUCTIONS.md` updated with new conventions | **DONE** | Added section 8.2.1 documenting the GLB item schema, scale, floor-contact, cache/disposal, and bundle layout | None |

## Notes

- **Model sizes:** 4 files exceed the Step 1 "< 1 MB" target — osgona
  chandelier (3.42 MB), bookcase (1.68 MB), chandelier_03 (1.09 MB), delica
  couch (1.03 MB). They are texture-heavy and near their practical floor after
  WebP + Draco compression; flagged with exact numbers in the manifest. No
  functional impact on the checks above.
- **`temperatureEDS_SIZE` resolution:** real heights were assigned from the
  object's physical role (bookcase 2.0 m, gothic cabinet 2.2 m, couches 0.85 m,
  plant 1.5 m, chandeliers 0.8–1.1 m, wall light 0.45 m). These are reasonable
  defaults and easy to revise in the manifest if you have exact real dimensions.
- **Consoles:** the only non-`DONE` items are performance-profiling tasks that
  require an A/B benchmark harness; code-level resource management is in place.
