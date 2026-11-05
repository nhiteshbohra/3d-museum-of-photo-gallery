# PERFORMANCE REPORT — OUR HOME 3D

## Active Vite source — later review, 30 October 2026

No current hardware/FPS/GPU benchmark was performed. Scratch production build succeeded:
16 modules, main JS 616.27 kB (165.52 kB gzip), CSS 4.42 kB; this is transfer output,
not a rendering-performance result. Pavilion counts below are historical and do not
describe the replacement src room engine. See CURRENT_STATE_VITE_2026-10-30.md.

## Pavilion observation — 30 October 2026

Fresh headless Chrome sample at 1440×900: 45 scene lights, 220 render calls and 37,526
triangles. These are one-view counts, not sustained FPS, GPU-memory or physical mobile
measurements. The sampled draw-call count exceeds the historical <150 target below.
Do not reuse the old 42-call/60-FPS claims for the current 40-artwork pavilion.
Evidence: `context-2026-10-30/observations.json` and `CURRENT_STATE_2026-10-30.md`.

## Target Budgets (Spec §20)
- Draw Calls: < 150
- Triangles: < 350k
- Memory: < 250 MB
- Target FPS: 60 FPS (Desktop High), 30+ FPS (Mobile Medium)

## Current Baseline (Cycle 1)
- Triangles: ~48,000 (Low overhead, well within budget)
- Draw Calls: ~42
- Texture Memory: ~35 MB
- Target FPS: 60 FPS rock-solid

