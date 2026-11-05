# Project Map & Developer Guide (CLAUDE.md)

**Baseline Date:** 05 November 2026  
**Project:** Our Museum 3D (`3dmuseum`) — Photorealistic Virtual Museum & Memorial Sanctuary  
**Tech Stack:** Three.js r182 (ESM), Vite 7, Node.js HTTP/WebSocket (`ws` 8), Vanilla JavaScript.

---

## 1. Quick Start & Execution Commands

```powershell
npm install               # Install dependencies (Three.js, Vite, ws)
npm run dev               # Start Vite development server (port 5173/5174)
npm run build             # Compile production build to dist/ (zero errors required)
npm run preview           # Preview compiled production build
npm start                 # Start production Node.js HTTP + WebSocket server (port 8080)
```

### Entry Points
- **Production Visitor Experience**: `http://localhost:8080/` or `index.html` (pure guest experience, character selection, 3D avatar exploration, live 2-player multiplayer, 0 editing tools).
- **Curator Admin Studio**: `http://localhost:8080/admin` or `admin.html` (golden `✦ ADMIN STUDIO ✦` badge, `[R]` Live Resizer HUD, placement tools, export).

---

## 2. Controls & Interaction Scheme

| Action | Key / Input | Notes |
|---|---|---|
| **Move** | `W` `A` `S` `D` / Arrow Keys | Third-person avatar navigation with camera follow |
| **Look** | Mouse Movement | Free camera rotation during pointer lock |
| **Sprint** | `Shift` + Move | Accelerates locomotion speed |
| **Jump** | `Space` | Local avatar jump animation & vertical arc |
| **Interact / Sit** | `E` | Sits on nearest available armchair/sofa/bench or stands up |
| **Emote Menu** | `1` (Wave), `2` (Dance), `3` (Clap), `4` (Point) | Trigger animation clips; movement cancels |
| **Chat** | `Enter` | Opens chat prompt; max 120 chars; `Enter` sends, `Esc` closes |
| **Enlarge Artwork** | Left Click on artwork (up to 14m) | Opens full-screen lightbox modal (pure image, zero text) |
| **Door Navigation** | Left Click on door (up to 6m) or walk within 0.5m | Transitions smoothly between Lobby and Salons |
| **Audio Toggle** | `M` | Toggles ambient classical synth soundscape |
| **Fullscreen** | `F` | Toggles browser fullscreen mode |
| **Live Resizer** | `R` (Admin mode only) | Toggles live in-game artwork dimension sliders |
| **Unlock Cursor** | `Esc` | Releases pointer lock / dismisses modals |

---

## 3. Directory Layout & Module Responsibilities

```
3dmuseum/
├── index.html                   # Public visitor entry point
├── admin.html                   # Curator Studio entry point
├── server.js                    # Node.js HTTP static server & WebSocket multiplayer relay
├── vite.config.js               # Multi-page Vite/Rollup build configuration
│
├── src/
│   ├── main.js                  # App bootstrap, UI overlay, character modal, lightbox
│   ├── style.css                # Luxury glassmorphic styling, progress bar, HUD
│   │
│   ├── engine/
│   │   └── engine.js            # Three.js render loop, camera follow, picking, physics
│   │
│   ├── avatars/
│   │   ├── characterSetup.js    # Character GLB/clip loading, V3 rig calibration
│   │   ├── avatarWorld.js       # Avatar lifecycle, AnimationMixer crossfades, name tags
│   │   ├── multiplayer.js       # Multiplayer orchestrator, 20Hz sync, emote triggers
│   │   ├── chat.js              # DOM chat bubbles projected in screen space
│   │   └── seatRegistry.js      # World-space seat anchors with occupancy locking
│   │
│   ├── net/
│   │   └── wsClient.js          # WebSocket client with auto-reconnect & queueing
│   │
│   ├── game/
│   │   ├── room.js              # Salon generator, walls/floors, 10-slot salon layout
│   │   └── room/
│   │       ├── lobby.js         # Grand Lobby rotunda, directory monument, platforms
│   │       ├── doors.js         # Classical moldings, cached obsidian/gold plaques
│   │       ├── placedItems.js   # GLB model spawner, shared loader cache, disposal
│   │       ├── artifactRegistry.js # Decor metadata, seat offsets, variant definitions
│   │       ├── decorations.js   # Procedural luxury furnishings (fireplace, rugs)
│   │       ├── textures.js      # Procedural linen-plaster, parquet bump maps
│   │       └── staticCache.js   # Shared texture cache
│   │
│   ├── config/
│   │   └── artworkSizes.js      # Default artwork dimensions (schema v3)
│   └── data/
│       ├── characters.json      # Character roster definition (Maya & Ethan)
│       ├── museumLayout.json    # GLB model placement coordinates and scales
│       └── coupleMuseum.js      # Curated salon metadata, memories, 60 artworks
│
├── public/
│   ├── models/ready/
│   │   ├── furniture/           # Normalized furniture GLB models
│   │   ├── lighting/            # Chandeliers & sconces GLB models
│   │   ├── plants/              # Potted plant & Monstera GLB models
│   │   ├── draco/               # Draco decompression WebAssembly decoders
│   │   ├── characters/          # Maya & Ethan GLBs, 21 animations, realism textures
│   │   ├── models.manifest.json # Complete metadata for all 3D assets
│   │   ├── ATTRIBUTIONS.md      # Creative Commons author credits
│   │   └── contact-sheet.html   # Turntable 3D asset inspection gallery
│   └── photos/                  # 61 curated high-resolution artwork slots
│
├── docs/                        # Complete project documentation hub
│   ├── README.md                # Documentation master index
│   ├── architecture/            # ARCHITECTURE.md, CLAUDE.md
│   ├── tracking/                # DECISIONS.md, SESSION_LOG.md, TODO.md, PROGRESS.md
│   ├── specs/                   # PROJECT_INSTRUCTIONS.md, ATTRIBUTIONS.md
│   ├── prompts/                 # REWRITTEN_PROMPT.md, discipline prompts
│   └── reports/                 # ALIGNMENT_REPORT.md, MULTIPLAYER_REPORT.md, etc.
│
└── tests/                       # Verification test suite (Node & Playwright scripts)
```

---

## 4. Context Discipline & Core Working Rules

- **Strict User Authorization**: Never execute git commits or push to remote without explicit user command.
- **5-File Context System**: Always keep these core documentation files synchronized after every meaningful change:
  1. `docs/architecture/CLAUDE.md` (Project conventions & cheatsheet)
  2. `docs/architecture/ARCHITECTURE.md` (System design & data flow)
  3. `docs/tracking/DECISIONS.md` (Append-only Architectural Decision Records)
  4. `docs/tracking/SESSION_LOG.md` (Chronological work logs)
  5. `docs/tracking/TODO.md` (Active backlog & verified task statuses)
- **Zero-Obstruction Mandate**:
  - Minimum $1.5\text{m}$ clearance from artwork frames.
  - Minimum $2.0\text{m}$ open clearance around all doorways.
  - Zero blocky cuboids — all furniture must feature organic, curved geometry.
- **Lightbox Rule**: The enlarged artwork modal must remain 100% pure image (zero titles, descriptions, or instructional text).
- **Verification Rule**: Every visual or spatial change must be validated through automated inspection or visual review before closing turns.
