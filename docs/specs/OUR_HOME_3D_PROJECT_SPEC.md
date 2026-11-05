# OUR HOME — 3D Multiplayer Couple's House & Museum

> Current-state note, 30 October 2026: this is the original two-floor product vision.
> The source has since changed twice: first a pavilion, now a Vite/Three.js first-person
> lobby and dynamically replaced couple/Wikipedia galleries. The active entry does not
> initialize avatars or networking. See [current architecture](../architecture/ARCHITECTURE.md)
> and [decisions](../tracking/DECISIONS.md). Preserve those updates; this document's
> targets and historical assumptions are not evidence of current runtime behavior.
### Complete Project Specification & Developer Handoff Document

| | |
|---|---|
| **Document version** | 1.0 |
| **Date** | 30 October 2026 |
| **Project type** | Browser-based, real-time 3D multiplayer experience (desktop + mobile) |
| **Based on** | Existing prototype "Our Museum" (Three.js, single room, two characters Maya & Ethan) |
| **Audience** | Project manager, 3D artists, front-end / gameplay developers, back-end developer, UI/UX designer, QA |

---

## TABLE OF CONTENTS

1. [Project Vision](#1-project-vision)
2. [Key Decisions & Assumptions](#2-key-decisions--assumptions)
3. [Audit of the Existing Prototype](#3-audit-of-the-existing-prototype)
4. [Complete Feature List (Priority Matrix)](#4-complete-feature-list-priority-matrix)
5. [Technology Stack](#5-technology-stack)
6. [System Architecture & Folder Structure](#6-system-architecture--folder-structure)
7. [The House — World Design](#7-the-house--world-design)
8. [Characters](#8-characters)
9. [Movement, Collision, Stairs & Camera](#9-movement-collision-stairs--camera)
10. [Interaction System](#10-interaction-system)
11. [Shared Couple Actions](#11-shared-couple-actions)
12. [Multiplayer & Networking](#12-multiplayer--networking)
13. [Communication: Chat, Emotes, Voice](#13-communication-chat-emotes-voice)
14. [UI / UX Design](#14-ui--ux-design)
15. [Lighting, Atmosphere & Day/Night](#15-lighting-atmosphere--daynight)
16. [Audio](#16-audio)
17. [Memory Features: Gallery, Photo Mode, Decorate Mode](#17-memory-features-gallery-photo-mode-decorate-mode)
18. [Customization, Config & Studio](#18-customization-config--studio)
19. [Asset Pipeline](#19-asset-pipeline)
20. [Performance Budgets & Optimization](#20-performance-budgets--optimization)
21. [Security, Privacy & Data](#21-security-privacy--data)
22. [Accessibility & Browser Support](#22-accessibility--browser-support)
23. [Testing & QA Plan](#23-testing--qa-plan)
24. [Deployment & DevOps](#24-deployment--devops)
25. [Development Roadmap (Phases)](#25-development-roadmap-phases)
26. [Risks & Mitigations](#26-risks--mitigations)
27. [Definition of Done](#27-definition-of-done)
28. [Appendix A — Data Schemas & Message Formats](#appendix-a--data-schemas--message-formats)
29. [Appendix B — Animation Catalog](#appendix-b--animation-catalog)
30. [Appendix C — Asset Checklist](#appendix-c--asset-checklist)

---

## 1. Project Vision

**One sentence:** A beautiful, romantic, fully explorable two-floor 3D home where two people — each on their own device — control two characters in real time, walk realistically through the house, sit on furniture, climb stairs, perform context-aware activities together, and share memories.

**Experience goals**

- **Realistic movement.** Walking must feel natural: acceleration, turning inertia, proper stair climbing with feet landing on steps, smooth sitting and standing.
- **Alive, decorated home.** Every room is richly furnished, lit warmly, and feels lived-in.
- **Two real people, one shared space.** Both players see each other move and act in real time with no visible jitter.
- **Context-aware actions.** Characters do different things depending on what is near them: chair → sit, bed → lie down, piano → play, stairs → climb.
- **Professional couple-oriented UI.** Elegant, minimal, romantic. Not a game HUD full of clutter.
- **Memory keeping.** The house doubles as a museum of the couple's memories (artworks, photos, notes).

**Target users:** Couples (long-distance especially), friends, and customers who order a personalised experience as a gift (the existing "studio" workflow).

---

## 2. Key Decisions & Assumptions

These were open questions in discussion. The assumptions below are what this document is written for. **If any assumption is changed, the sections marked ⚠ must be revised.**

| # | Topic | Assumption used in this document | Impact if changed |
|---|---|---|---|
| A1 | Connection model | **Online play through a private invite link / 6-character room code.** Two players on different devices and networks. | ⚠ §12, §24 |
| A2 | Players per room | Exactly **2 players**, 2 characters. Architecture should allow up to 4 later (spectators / guests). | §12 |
| A3 | House concept | **Ground floor = living home** (living room, kitchen, dining, entrance). **Upper floor = bedroom, study, and the memory gallery/museum.** Plus terrace/balcony and a small garden. | §7 |
| A4 | Characters | Default **Maya** (`Claire.glb`) and **Ethan** (`Aj.glb`). Character picker lets players choose other bundled models. | §8 |
| A5 | Platform | Browser only (Chrome, Edge, Safari, Firefox). Desktop and mobile. No native app. | §22 |
| A6 | Solo / practice mode | A single user can enter alone: clicks either character to switch control; the other stays idle (or follows a light AI wander). Satisfies "user can click on the character". | §8, §12 |
| A7 | Server authority | **Client-authoritative movement with server validation** (2 trusted users, low cheating risk). Server owns room state, ownership locks, shared-action handshakes, persistence. | §12 |
| A8 | Monetisation | Out of scope. The studio (order management) is kept as an internal/admin tool. | §18 |

---

## 3. Audit of the Existing Prototype

The delivered ZIP (`js.zip`, 39 MB) contains a working single-room prototype. Developers must read this section before starting so reuse vs. rewrite decisions are clear.

### 3.1 Current file inventory

```
index.html            Main app shell (start screen, HUD, overlays)
studio.html           Admin "Museum Studio" (Tailwind-based customer order manager)
css/style.css         ~930 lines — start screen, HUD, modals, joystick, customizer
js/config.js          Default config, image compression, localStorage + URL-hash persistence
js/environment.js     Scene, renderer, lights, 24×24 m room, bench, artworks, plaque
js/characters.js      GLB loading, procedural sit clip, animation cross-fading
js/controls.js        Keyboard, mouse-orbit, joystick, locomotion, proximity checks
js/ui.js              HUD wiring, modals, customizer drawer, speech bubble, name tag
js/audio.js           Procedural romantic piano (WebAudio oscillators + delay)
js/main.js            Entry, loader, main loop
js/studio.js          Studio logic
assets/               Aj, Claire, Michelle, Soldier, Xbot, avaturn, brunette, readyplayer.me (.glb)
```

### 3.2 What is reusable

| Item | Verdict | Notes |
|---|---|---|
| Loading screen + start screen design | **Reuse & restyle** | Gold on dark, Cormorant Garamond + Inter. Keep brand feel. |
| `audio.js` procedural piano | **Reuse** | Also expose as a *playable* piano (§10). |
| `sanitizeClip()` in `characters.js` | **Reuse concept** | Locks hips X/Z drift so code drives movement. Keep this approach (no root motion). |
| Mixamo bone naming (`mixamorig_*`) | **Keep** | All animation retargeting assumes Mixamo skeleton naming. |
| `config.js` (compression, deepMerge, hash/localStorage) | **Reuse & extend** | Extend with house/room data and server persistence. |
| `studio.html` / `studio.js` | **Reuse as admin tool** | Needs server-backed storage instead of localStorage. |
| Joystick + HUD CSS | **Rework** | Must support two-character logic and new HUD. |

### 3.3 What must be rebuilt

| Item | Reason |
|---|---|
| `environment.js` (single 24 m square room) | Replace with a two-floor house loaded from a GLB, with colliders. |
| `characters.js` shared `coupleGroup` | Both characters currently move together. Each needs independent state, owner, camera. |
| `controls.js` locomotion | No collision, no ground height, no stairs, no per-character control. |
| Sit logic | Currently hard-wired to one bench; must be generic via interaction points. |
| Networking | Does not exist. |
| Animation set | Only idle/walk/dance exist. See Appendix B for the full list. |

### 3.4 Known technical notes from the prototype

- Three.js **r160** via import-map from unpkg. For production, **bundle locally** (do not depend on a CDN at runtime).
- Models are large (Aj 6.4 MB, Claire 5.1 MB, avaturn 13.8 MB). Compression is mandatory (§20).
- Animation clips are borrowed from `Xbot.glb` / `Michelle.glb` and applied to other skeletons. This works only because all are Mixamo-compatible. Keep that constraint, or retarget properly.
- Config is stored in `localStorage` and URL hash — fine for the prototype, not for a multi-user product.

---

## 4. Complete Feature List (Priority Matrix)

Legend: **P0** = must ship in v1.0 · **P1** = should ship in v1.0 · **P2** = post-launch / nice-to-have

### 4.1 World & Environment

| ID | Feature | Priority |
|---|---|---|
| W-01 | Two-floor house with entrance hall, living room, kitchen, dining, staircase, upper landing, bedroom, study, memory gallery | P0 |
| W-02 | Terrace/balcony (upper) and garden (ground) | P1 |
| W-03 | Fully decorated interiors (rugs, plants, curtains, lamps, art, bookshelves, fireplace) | P0 |
| W-04 | Baked lighting / lightmaps for the interior | P0 |
| W-05 | Day/night cycle with window light and automatic lamp switching | P1 |
| W-06 | Special-date themes (birthday, anniversary, winter, Valentine) | P2 |
| W-07 | Ambient audio per room (clock ticking, fireplace, birds in garden) | P1 |
| W-08 | Interactive doors (open/close), curtains, lights switches | P1 |

### 4.2 Characters & Movement

| ID | Feature | Priority |
|---|---|---|
| C-01 | Two independent characters, each with its own owner | P0 |
| C-02 | Click a character to take control (solo mode) / lock ownership (online) | P0 |
| C-03 | Realistic walk with acceleration, deceleration, turning inertia | P0 |
| C-04 | Walk ↔ run blending (hold Shift / joystick magnitude) | P0 |
| C-05 | Wall & furniture collision with sliding | P0 |
| C-06 | Stair climbing up/down with correct floor-height and foot alignment | P0 |
| C-07 | Click-to-walk (pathfinding on navmesh) in addition to WASD | P1 |
| C-08 | Foot IK on stairs and uneven surfaces | P2 |
| C-09 | Character picker (choose model, name, outfit tint) | P1 |
| C-10 | Idle variations (look around, stretch, shift weight) so idle never looks frozen | P1 |
| C-11 | Head look-at toward the other character or an object of interest | P2 |

### 4.3 Interactions

| ID | Feature | Priority |
|---|---|---|
| I-01 | Generic interaction-point system (proximity → prompt → action) | P0 |
| I-02 | Sit on chair / bench / sofa / dining chair / stool | P0 |
| I-03 | Lie on bed, sit on bed edge | P0 |
| I-04 | Climb stairs (automatic via locomotion) | P0 |
| I-05 | Play piano (playable notes, shared audio) | P1 |
| I-06 | Watch TV, read book, look through window/telescope, cook, drink coffee, water plants, look at artwork | P1 |
| I-07 | Open/close doors, toggle lamps | P1 |
| I-08 | Use balcony railing (lean), sit outside | P2 |

### 4.4 Couple / Shared

| ID | Feature | Priority |
|---|---|---|
| S-01 | Invite popup → accept/decline for shared actions | P0 |
| S-02 | Dance together (synchronised) | P0 |
| S-03 | Hug, hold hands (walk together), wave | P1 |
| S-04 | Sit together on sofa/bench (auto positioned side by side) | P0 |
| S-05 | Emote wheel + floating emoji + speech bubbles | P1 |
| S-06 | Follow-me mode (partner auto-walks next to you) | P2 |

### 4.5 Multiplayer & Communication

| ID | Feature | Priority |
|---|---|---|
| N-01 | Create room → invite link / code → partner joins | P0 |
| N-02 | Real-time position/rotation/animation sync with interpolation | P0 |
| N-03 | Reconnection and session resume | P0 |
| N-04 | Text chat | P1 |
| N-05 | Voice chat (WebRTC) | P1 |
| N-06 | Presence (online/offline, ping indicator) | P1 |
| N-07 | Persistent room (house state, memories, decorations saved) | P1 |

### 4.6 Memory & Personalisation

| ID | Feature | Priority |
|---|---|---|
| M-01 | Gallery of framed artworks with images, titles, quotes (from existing prototype) | P0 |
| M-02 | Dedication plaque (existing) | P0 |
| M-03 | Photo mode (free camera, hide UI, filters, save PNG) | P1 |
| M-04 | Memory wall / guest book (add photos + notes during session) | P1 |
| M-05 | Decorate mode (place/move/rotate furniture and frames) | P2 |
| M-06 | Studio admin tool for managing customer orders | P1 |

### 4.7 UI, Platform & Quality

| ID | Feature | Priority |
|---|---|---|
| U-01 | Cinematic loading + lobby screen | P0 |
| U-02 | Context HUD (action prompts, name tags, partner status) | P0 |
| U-03 | Minimap with floor toggle | P1 |
| U-04 | Settings (graphics quality, volume, controls, language) | P1 |
| U-05 | Mobile touch controls (joystick + camera drag + action buttons) | P0 |
| U-06 | Graphics quality presets (Low / Medium / High / Auto) | P0 |
| U-07 | Localisation support (EN first; Hindi and others later) | P2 |

---

## 5. Technology Stack

| Layer | Choice | Reason |
|---|---|---|
| 3D engine | **Three.js (latest stable at project start; r160 in prototype)** | Already in use; huge ecosystem. |
| Language | **TypeScript** (strict) | Shared types between client and server prevents protocol bugs. |
| Build tool | **Vite** | Fast dev server, easy asset handling, code splitting. |
| UI layer | **Vanilla TS + CSS variables** or **Preact** for HUD | Keep bundle small; avoid heavy frameworks over the canvas. |
| Physics / collision | **three-mesh-bvh** (static world raycasts + capsule collision) | Excellent performance for static interiors; no full physics engine required. *Alternative:* Rapier (WASM) if dynamic objects are added (decorate mode). |
| Navigation | **three-pathfinding** (navmesh) or **recast-navigation-js** | Click-to-walk. |
| Animation | Three.js `AnimationMixer` + custom state machine | Already in use. |
| Asset compression | **Draco** (geometry), **KTX2/Basis** (textures), **meshopt** optional | Cut GLB sizes by 70–90%. |
| Realtime server | **Node.js 20+ with Socket.IO** (alt: **Colyseus**) | Rooms, reconnection, simple API. Colyseus is the better pick if team wants built-in state sync. |
| Voice | **WebRTC** (peer-to-peer) + **coturn** (STUN/TURN) | Signalling through the same server. |
| Database | **PostgreSQL** (rooms, memories, orders) + **S3-compatible storage** (images) | Persistence for rooms and uploaded photos. |
| Cache / presence | **Redis** (optional, needed only when scaling to multiple server instances) | Socket.IO adapter. |
| Hosting | Static front-end on **CDN** (Cloudflare Pages / Netlify / Vercel); server on a VPS or container platform (Fly.io, Render, Railway, AWS) | WebSocket-capable, low latency. |
| 3D authoring | **Blender 4.x** (house, furniture) → glTF 2.0 | Industry standard; baked lightmaps. |
| Animation source | **Mixamo** + custom clips in Blender | Matches current rig naming. |
| Testing | **Vitest** (unit), **Playwright** (e2e, two browser contexts for multiplayer) | |
| CI/CD | GitHub Actions | |

---

## 6. System Architecture & Folder Structure

### 6.1 High-level architecture

```
┌────────────────────────── CLIENT (Browser) ──────────────────────────┐
│  UI Layer (HUD, lobby, chat, menus)                                  │
│        │                                                             │
│  Game Core ─ Input ─ Camera Rig ─ Character Controllers (local)      │
│        │             │                                               │
│  World (house GLB, colliders, navmesh, lights, interaction points)   │
│        │                                                             │
│  Network Client ── Interpolator ── Remote Character Proxy            │
│        │                                                             │
│  Audio Engine (music, ambience, 3D spatial sfx, piano, voice)        │
└──────────┬───────────────────────────────────────────────┬───────────┘
           │ WebSocket (Socket.IO)                         │ WebRTC (voice)
┌──────────▼───────────────────────────┐        ┌──────────▼───────────┐
│  GAME SERVER (Node.js)               │        │  TURN/STUN (coturn)  │
│  Rooms · Ownership · Shared-action   │        └──────────────────────┘
│  handshakes · Chat · Persistence API │
└──────────┬───────────────────────────┘
           │
┌──────────▼───────────┐   ┌─────────────────────┐
│  PostgreSQL          │   │ Object storage (S3) │
│  rooms, memories,    │   │ uploaded photos     │
│  orders, configs     │   └─────────────────────┘
└──────────────────────┘
```

### 6.2 Repository layout (monorepo)

```
our-home/
├─ package.json                 (workspaces)
├─ packages/
│  ├─ shared/                   Shared TypeScript types + constants
│  │   ├─ protocol.ts           All network message types (see Appendix A)
│  │   ├─ interactions.ts       Interaction type enums
│  │   └─ constants.ts          Speeds, tick rates, limits
│  ├─ client/
│  │   ├─ index.html
│  │   ├─ public/
│  │   │   ├─ assets/
│  │   │   │   ├─ house/        house.glb, colliders.glb, navmesh.glb, lightmaps/
│  │   │   │   ├─ characters/   *.glb (Draco compressed)
│  │   │   │   ├─ animations/   shared animation GLBs
│  │   │   │   ├─ furniture/    individual props (decorate mode)
│  │   │   │   ├─ audio/        music, ambience, sfx
│  │   │   │   └─ ui/           icons, fonts
│  │   └─ draco/ , basis/       decoders
│  │   └─ src/
│  │       ├─ main.ts
│  │       ├─ core/             Game loop, state, event bus, config
│  │       ├─ world/            houseLoader, colliders, navmesh, lighting, dayNight, doors
│  │       ├─ characters/       CharacterController, StateMachine, AnimationLibrary, picker
│  │       ├─ input/            keyboard, mouse, touch/joystick, gamepad (P2)
│  │       ├─ camera/           CameraRig (follow, orbit, collision, photo mode)
│  │       ├─ interaction/      InteractionPoint, InteractionManager, actions/*
│  │       ├─ network/          NetClient, Interpolator, RoomService, VoiceService
│  │       ├─ audio/            AudioEngine, Piano, SpatialAudio
│  │       ├─ ui/               hud/, lobby/, chat/, emoteWheel/, minimap/, settings/, modals/
│  │       ├─ memory/           gallery, memoryWall, photoMode
│  │       ├─ decorate/         decorate mode (P2)
│  │       └─ utils/
│  ├─ server/
│  │   └─ src/
│  │       ├─ index.ts
│  │       ├─ rooms/            RoomManager, Room, ownership
│  │       ├─ handlers/         move, action, sharedAction, chat, rtcSignal
│  │       ├─ persistence/      db.ts, memories repo, rooms repo
│  │       ├─ api/              REST: upload, orders, health
│  │       └─ validation/       message schema validation (zod)
│  └─ studio/                   Admin tool (evolved from studio.html)
├─ tools/
│  ├─ asset-pipeline/           Scripts: gltf-transform optimise, KTX2, Draco
│  └─ blender/                  Export scripts, naming validators
├─ docs/
└─ .github/workflows/
```

### 6.3 Main loop (client)

```
each frame:
  dt = clock.getDelta()
  input.update()
  localCharacter.update(dt)        // movement, collision, stairs, state machine
  interactionManager.update()      // nearest point → HUD prompt
  remoteCharacter.update(dt)       // interpolate from snapshot buffer
  mixers.update(dt)                // both characters
  cameraRig.update(dt)
  dayNight.update(dt)
  audio.update(listener)
  net.flushOutgoing()              // at fixed 15–20 Hz, not every frame
  renderer.render()
```

All gameplay code must be **frame-rate independent** (use `dt`). Network sending runs on a fixed-interval timer.

---

## 7. The House — World Design

### 7.1 Design principles

- **Romantic, warm, premium.** Warm white and honey wood, soft gold accents, deep green plants, muted rose/terracotta textiles. Matches the existing gold-and-dark brand.
- **Real-world proportions.** Doors 2.1 m high × 0.9 m wide; ceiling 3.0–3.2 m; stair rise 0.18 m, run 0.28 m; corridors ≥ 1.2 m so two characters can pass.
- **Every room has a purpose** with at least 2 interaction points and a focal point.
- **Sightlines.** From the entrance, the staircase and living room are visible, inviting exploration.

### 7.2 Overall dimensions

| Parameter | Value |
|---|---|
| Footprint | approx. 18 m × 13 m (house) + garden 14 m × 8 m |
| Floors | 2 (Ground: Y = 0.0 m, Upper: Y = 3.2 m) |
| Floor-to-floor height | 3.2 m (ceiling clear height 2.95 m) |
| Wall thickness | 0.2 m exterior, 0.12 m interior |
| Unit scale | **1 Blender unit = 1 metre**, Y-up on export, character height ≈ 1.7 m |

### 7.3 Ground floor layout (schematic)

```
 ┌──────────────────────────────────────────────────────────┐
 │                       GARDEN (outside)                    │
 │  [Bench under tree]   [Fire-pit chairs]   [Flower beds]   │
 ├───────────────┬───────────────────┬──────────────────────┤
 │  KITCHEN      │   DINING AREA     │   LIVING ROOM        │
 │  island,      │   6-seat table,   │   L-sofa, armchairs, │
 │  stools,      │   pendant lamp,   │   fireplace, TV,     │
 │  counters     │   sideboard       │   piano, bookshelf   │
 ├───────────────┴────┬──────────────┴──────────────────────┤
 │  POWDER ROOM       │   ENTRANCE HALL                     │
 │  (decor only)      │   console table, mirror, bench,     │
 │                    │   coat rack, STAIRCASE (to upper)   │
 └────────────────────┴─────────────────────────────────────┘
```

### 7.4 Upper floor layout (schematic)

```
 ┌──────────────────────────────────────────────────────────┐
 │                BALCONY / TERRACE                          │
 │      [2 chairs + small table]  [railing, string lights]   │
 ├───────────────┬──────────────────────┬───────────────────┤
 │ MASTER BEDROOM│  MEMORY GALLERY      │  STUDY / LIBRARY  │
 │ king bed,     │  (museum hall)       │  desk, armchair,  │
 │ nightstands,  │  5+ framed artworks, │  bookshelves,     │
 │ wardrobe,     │  dedication plaque,  │  globe, window    │
 │ reading nook  │  spot-lit, bench     │  seat             │
 ├───────────────┴──────────────────────┴───────────────────┤
 │  UPPER LANDING — stair arrival, railing, loveseat        │
 └──────────────────────────────────────────────────────────┘
```

> The Memory Gallery on the upper floor carries over the five artworks + plaque from the prototype (`config.js`). Artwork wall slots map to the existing IDs 1–5.

### 7.5 Staircase specification (critical)

| Parameter | Value |
|---|---|
| Type | Straight run with mid landing (L-shape) **or** U-shape — final choice by architect; **must fit within 5 m × 2.6 m** |
| Total rise | 3.2 m |
| Step rise | 0.178 m → **18 steps** (17 risers + landing) |
| Step run (tread) | 0.28 m |
| Width | 1.2 m (two characters can pass) |
| Handrails | Both sides, visible, no collision on rail itself (collision on stringer/walls) |
| Collision proxy | **Modeled as a smooth ramp** in the collision mesh (see §9.4) so capsule movement is stable; visual mesh keeps the real steps |
| Headroom | ≥ 2.1 m clear at every step |
| Trigger volumes | Bottom-of-stairs and top-of-stairs volumes switch the "current floor" for UI/minimap and ambient audio |

### 7.6 Room-by-room specification

Every room lists **required furniture**, **interaction points**, **atmosphere**, and **minimum polycount budget** (visual mesh, excluding characters).

#### 7.6.1 Entrance Hall (Ground)
- **Furniture:** console table with vase, wall mirror, bench (sittable), coat rack, shoe cabinet, runner rug, pendant light, framed photos.
- **Interactions:** Sit on bench, look in mirror (character turns, adjusts hair), open/close front door, toggle hall light.
- **Atmosphere:** warm yellow light, wooden floor, first impression of luxury.

#### 7.6.2 Living Room (Ground)
- **Furniture:** large L-shaped sofa (4 seats), 2 armchairs, coffee table, large rug, TV unit + TV, fireplace with mantel, grand/upright **piano** with bench, tall bookshelf, floor lamps, curtains, indoor plants.
- **Interactions:** Sit on sofa (seat slots 1–4), sit on armchairs (2), watch TV (sit + lean back), play piano (sit at piano bench), take book from shelf and read, toggle fireplace, toggle lamps, dance zone (rug clear area).
- **Atmosphere:** fire glow, warm lamps, window light by day.

#### 7.6.3 Dining Area (Ground)
- **Furniture:** 6-seat wooden table with candles and flowers, 6 chairs, sideboard, pendant chandelier, wine rack.
- **Interactions:** Sit at any chair (6 slots), eat/drink animation, light candles (toggle).
- **Special:** "Candlelight dinner" scene preset that dims lights and lights candles (P2).

#### 7.6.4 Kitchen (Ground)
- **Furniture:** island with 3 stools, counters, stove, sink, fridge, shelves with jars, hanging plants, coffee machine.
- **Interactions:** Sit on stool (3), cook at stove, make coffee, open fridge, wash dishes (P2).

#### 7.6.5 Garden (Ground, outside)
- **Furniture:** bench under tree, 2 fire-pit chairs, flower beds, stepping-stone path, fence, string lights, small fountain or bird bath.
- **Interactions:** Sit on bench, sit at fire pit, water plants, look at stars (lie on lawn blanket P2).
- **Atmosphere:** day/night cycle most visible here; fireflies at night (particles, low cost).

#### 7.6.6 Upper Landing
- **Furniture:** loveseat, side table, plant, framed art, railing overlooking the entrance hall.
- **Interactions:** Sit on loveseat (2 seats), lean on railing.

#### 7.6.7 Master Bedroom (Upper)
- **Furniture:** king bed with pillows and throw, 2 nightstands with lamps, wardrobe, dresser with mirror, reading nook armchair, rug, curtains, string lights.
- **Interactions:** Sit on bed edge (2 slots), lie on bed (2 slots side by side), read in nook, toggle bedside lamps, open wardrobe (cosmetic), look in dresser mirror.
- **Atmosphere:** very warm, low light, cosy.

#### 7.6.8 Memory Gallery (Upper) — the "museum"
- **Furniture:** 5+ framed artwork slots (extendable to 12), spot lights per frame, central bench (2 seats), dedication plaque on feature wall, polished floor, subtle rope-barrier posts (cosmetic).
- **Interactions:** Inspect artwork (opens overlay with image, title, tag, quote, signature — same as prototype), inspect plaque, sit on bench, **add memory** (opens upload UI; P1), dance zone.
- **Atmosphere:** museum lighting, soft reverb ambience, piano music louder here.

#### 7.6.9 Study / Library (Upper)
- **Furniture:** desk with lamp and laptop, leather armchair, floor-to-ceiling bookshelves, rolling ladder (cosmetic), globe, window seat with cushions.
- **Interactions:** Sit at desk, read book, sit in window seat, spin globe (P2).

#### 7.6.10 Balcony / Terrace (Upper)
- **Furniture:** 2 lounge chairs, small table with drinks, railing, string lights, plants.
- **Interactions:** Sit (2), lean on railing and look at view, toast with drinks (shared).
- **Atmosphere:** skybox view with distant skyline/hills; stars at night.

### 7.7 Furniture requirement master list

| Category | Items | Sit slots | Notes |
|---|---|---|---|
| Seating | Sofa (L), armchairs ×4, dining chairs ×6, bar stools ×3, benches ×4, loveseat, window seat, desk chair, garden chairs ×2, balcony chairs ×2 | ~35 | Each seat has `seatPoint`, `facingDir`, `exitPoint` |
| Sleeping | King bed | 2 lie, 2 sit | Lie slots left/right |
| Surfaces | Dining table, coffee table, island, desk, nightstands ×2, console, sideboard | — | Collision colliders |
| Storage | Bookshelves ×3, wardrobe, dresser, shoe cabinet, wine rack | — | |
| Appliances | TV, fridge, stove, sink, coffee machine, fireplace | — | Interactive |
| Instruments | Piano + bench | 1 | Playable |
| Lighting | Pendants, floor lamps, table lamps, wall sconces, string lights, candles | — | Toggleable lamps need emissive swap + light |
| Soft goods | Rugs, curtains, cushions, throws | — | Alpha-tested, no transparency sorting issues |
| Decor | Plants, vases, frames, mirrors, globe, books, flowers | — | Instanced where repeated |
| Architecture | Doors ×8 (animated), windows ×10, railings, stair | — | |

### 7.8 Visual style and materials

- **PBR materials** (glTF metal-rough). Texture sets: baseColor, normal, ORM (occlusion-roughness-metal packed). 1024–2048 px; floors and walls tile.
- **Baked lightmaps** (Blender Cycles) for static lighting, 1024–2048 per room group. Dynamic lights only for: lamps that toggle, fireplace flicker, and character-related rim lights.
- **Palette:** background `#121318` (from prototype), gold `#E8D0A9`, ivory `#F5EFE6`, warm wood `#B07A4A`, forest `#2F4A3A`, rose `#C9808A`.
- **Decals/details:** skirting boards, crown moulding, door frames, light switches — these small details are what makes it feel "real"; they are required in the art brief.

### 7.9 Level data authoring (how artists mark up the scene)

Artists must name objects in Blender with prefixes. The loader reads these at runtime:

| Prefix | Meaning | Example |
|---|---|---|
| `COL_` | Collision mesh (invisible, static) | `COL_Wall_Living_01` |
| `NAV_` | Navmesh mesh | `NAV_Ground`, `NAV_Upper` |
| `SIT_` | Seat point empty (see §10) | `SIT_Sofa_01_A` |
| `LIE_` | Lie-down point | `LIE_Bed_Left` |
| `INT_` | Generic interaction empty | `INT_Piano`, `INT_TV`, `INT_Fridge` |
| `DOOR_` | Door pivot (rotates on interaction) | `DOOR_Front` |
| `LAMP_` | Lamp mesh + child light empty | `LAMP_Floor_Living` |
| `ART_` | Artwork slot (id in custom prop) | `ART_01` … `ART_12` |
| `TRG_` | Trigger volume (floor change, room enter, ambience) | `TRG_StairBottom`, `TRG_Room_Kitchen` |
| `SPAWN_` | Spawn point | `SPAWN_Maya`, `SPAWN_Ethan` |
| `CAM_` | Fixed camera hints (cutscenes, photo spots) | `CAM_Intro_01` |

Custom properties on empties (exported as glTF `extras`) carry parameters, e.g. `{"type":"sit","slots":4,"anim":"sit_sofa","facing":[0,0,1]}`.

---

## 8. Characters

### 8.1 Roster

| Character | Default model | Role in UI |
|---|---|---|
| Maya | `Claire.glb` | Player slot A |
| Ethan | `Aj.glb` | Player slot B |

Additional selectable models (already in repo): `Michelle.glb`, `brunette.glb`, `readyplayer.me.glb`, `avaturn.glb`, `Soldier.glb`, `Xbot.glb`. Each must pass the **Character Asset Checklist** (Appendix C) before being offered.

### 8.2 Requirements for any character model

- Humanoid skeleton with **Mixamo bone names** (`mixamorig_Hips`, `…Spine`, `…LeftUpLeg`, etc.).
- Height normalised to **1.70 m ± 0.1** at import (scale in code, not in file).
- ≤ 40,000 triangles per character after optimisation (target 25k).
- Textures ≤ 2048 px, KTX2 compressed.
- Facing **+Z** in rest pose.
- Blendshapes (optional): `blink`, `smile` for expression polish.

### 8.3 Character ownership & click-to-control

**Online mode**
1. Lobby shows both characters in a showroom with names. Player 1 (room creator) clicks a character to claim it; the server locks that character to that player.
2. Partner joins via link and automatically gets the other character (or can swap if both agree).
3. During play, each client controls **only its own character**; the other character is driven by network data.

**Solo / practice mode**
1. A user enters alone. Both characters are present.
2. **Clicking a character takes control of it** (raycast pick). A glowing ring + name tag shows the active one. The previous character switches to idle (or light AI wander if enabled).
3. Switching is allowed any time; camera smoothly transitions to the new character.

**Selection feedback:** ring decal on the floor, name tag with gold underline, camera glide (0.6 s ease). Hover cursor changes to a pointer over characters.

### 8.4 Character controller (per character)

Each `CharacterController` owns:

```
id, owner (playerId | null), root (Object3D), mixer, actions{}, state (StateMachine),
position, velocity, heading, groundY, floorIndex (0|1),
capsule {radius:0.3, height:1.7, stepHeight:0.35},
activeInteraction | null, seatedAt | null
```

### 8.5 Animation state machine

States and allowed transitions (see Appendix B for clip list):

```
                      ┌──────────┐
          ┌──────────▶│  IDLE    │◀─────────────┐
          │           └────┬─────┘              │
          │   move input   │                    │ stand-up complete
          │           ┌────▼─────┐         ┌────┴─────┐
          │           │ LOCOMOTION│        │ STANDING │
          │           │ walk/run/ │        │   UP     │
          │           │ turn/stairs│       └────▲─────┘
          │           └────┬─────┘              │
          │   interact     │                    │ exit
          │           ┌────▼─────┐         ┌────┴─────┐
          └───────────┤ ENTERING │────────▶│ SEATED / │
            cancel    │ (align + │ complete│ LYING /  │
                      │ sit-down)│         │ ACTIVITY │
                      └──────────┘         └──────────┘
        SHARED_ACTION (dance, hug, hold hands) overlays IDLE/LOCOMOTION
```

- Cross-fade duration default **0.25–0.35 s**; sit/stand 0.4 s.
- **Locomotion blend space:** idle ↔ walk ↔ run by speed; stairs-up / stairs-down chosen when the character's ground-normal slope is above threshold *and* the character is inside a stair trigger or `onStairs` flag.
- **Root motion is disabled.** Movement is driven by code (as in the prototype with `sanitizeClip`). Animation playback speed is scaled to movement speed to avoid foot sliding (`timeScale = speed / clipNominalSpeed`).

### 8.6 Character abilities summary

Walk, run, turn in place, climb/descend stairs, sit (chairs, sofas, stools, benches, bed edge), lie down (bed), play piano, cook, drink, read, watch TV, open doors, toggle lights, dance (solo and shared), wave, hug, hold hands, clap, point, think, laugh (emote), inspect artwork, lean on railing, idle variations.

### 8.7 Name tags & indicators

- Floating name tag above each head (DOM overlay, projected to screen).
- Colour-coded: Maya = rose, Ethan = gold (configurable).
- Ownership badge: "You" / partner name.
- Partner connection state icon (green = online, amber = reconnecting, grey = offline).
- Speech bubble and emoji float above head (≤ 4 s).

---

## 9. Movement, Collision, Stairs & Camera

### 9.1 Input mapping

| Action | Desktop | Mobile | Gamepad (P2) |
|---|---|---|---|
| Move | W A S D / Arrows | Left virtual joystick | Left stick |
| Run | Shift (hold) | Joystick pushed to edge | Left stick full + RT |
| Look / orbit camera | Right-mouse drag (or left drag on empty space) | Right-half screen drag | Right stick |
| Zoom | Mouse wheel | Pinch | — |
| Interact / confirm | **E** or click on prompt | Tap action button | A |
| Cancel / stand up | **Q** or move | Tap "Stand" | B |
| Emote wheel | **G** (hold) | Tap emote button | Y |
| Chat | **Enter** | Tap chat icon | — |
| Photo mode | **P** | Menu button | — |
| Click-to-walk | Left-click on floor | Tap floor | — |
| Switch character (solo) | Click character or **Tab** | Tap character | — |

### 9.2 Locomotion model

- Target velocity = input direction (camera-relative) × speed. Walk 1.4 m/s, run 3.2 m/s (tunable constants in `shared/constants.ts`).
- **Acceleration** 8 m/s², **deceleration** 10 m/s². Smooth velocity change avoids robotic starts/stops.
- **Turning:** heading lerps toward movement direction using angular speed ≈ 540°/s walk, 360°/s run; sharp turns (> 120°) at speed trigger a short slow-down.
- **Walk should look "very real":** animation speed matched to velocity, slight forward lean while running, subtle head stabilisation, no sliding. Idle breathing always active.

### 9.3 Collision

- **Method:** capsule-vs-triangle collision against a merged static BVH built from all `COL_*` meshes (three-mesh-bvh).
- **Algorithm per frame:** (1) propose new position; (2) sweep capsule; (3) resolve penetration; (4) slide along surface tangent; (5) snap to ground using downward raycast; (6) clamp max step-up to 0.35 m.
- Furniture colliders are simplified boxes/capsules — **never** use the visual mesh for collision.
- Character-vs-character: soft collision (push apart) with a radius of 0.3 m each; no hard blocking. Seated characters are ignored.
- Doors: closed doors have colliders; open doors disable their collider.

### 9.4 Stairs (most failure-prone feature — dedicated dev + test time)

1. **Collision proxy:** stairs use a **smooth ramp collider** with the same slope as the visual steps. The visual steps are decorative.
2. **Ground snap:** downward ray from the capsule base finds `groundY`; character Y follows with critical damping (so it glides rather than pops).
3. **Floor detection:** `floorIndex` determined by `groundY` thresholds and trigger volumes (`TRG_StairTop` / `TRG_StairBottom`).
4. **Animation:** blend into `stairs_up` / `stairs_down` clips when the ramp slope is detected; foot cadence matched to step spacing (0.28 m run → step frequency computed from speed).
5. **Foot IK (P2):** two-bone IK on legs to place feet on the nearest step surface.
6. **Edge cases to test:** reversing direction mid-stair, running on stairs (cap speed to 1.8 m/s on stairs), collision with the stringer, second character on the same stair, camera passing through ceiling.
7. **Prevent falling:** upper-floor holes (stairwell) have invisible barrier colliders; railing colliders block the drop.

### 9.5 Click-to-walk (P1)

- Click/tap on a floor point → raycast to `NAV_` mesh → path via navmesh (stairs included as navmesh connectivity) → character follows path with the same locomotion model.
- Cancel by any manual input. A subtle gold ring at destination.
- Click on an interaction object → walk to its approach point, then auto-trigger the action.

### 9.6 Camera rig

| Mode | Behaviour |
|---|---|
| **Follow (default)** | Third-person, distance 3.2 m (zoom 1.5–6 m), pitch limits −10° to 60°, smooth damping 0.12 s. |
| **Auto-frame in tight rooms** | Camera pulls closer when walls are behind it (raycast from character head toward camera; clamp distance). |
| **Floor-aware** | When on upper floor, ceiling is **never** blocking: camera clamp below ceiling height, or ceiling meshes fade out when the camera is above the character's floor. |
| **Interaction camera** | Optional subtle lowered/closer framing while seated or at the piano. |
| **Photo mode** | Free-fly camera, FOV slider, depth of field, filters, hides UI. |
| **Cinematic intro** | Scripted path from garden → entrance, ~6 s, skippable. |
| **Partner spectate (P2)** | Toggle to view from partner's character. |

**Transparent walls/occlusion:** when a wall or prop lies between camera and character, fade it (dither or opacity 0.25) rather than cutting the view.

---

## 10. Interaction System

### 10.1 Concept

Every interactable object in the house exposes one or more **Interaction Points**. A point defines *where* a character stands/sits, *how they face*, *which animation plays*, *what the HUD says*, and *what happens* on start/stop.

### 10.2 Interaction point data model

```ts
interface InteractionPoint {
  id: string;                 // "sofa_living_01_seatA"
  type: 'sit' | 'lie' | 'use' | 'door' | 'toggle' | 'inspect' | 'piano';
  label: string;              // HUD text: "Sit on sofa"
  position: Vec3;             // where the character root will be placed (seat/lie/stand point)
  rotationY: number;          // facing
  approachPoint: Vec3;        // where to walk to before auto-enter (click-to-walk)
  exitPoint: Vec3;            // where to place the character when leaving
  radius: number;             // trigger radius (default 1.2 m)
  animIn?: string;            // 'sit_down'
  animLoop: string;           // 'sit_idle_sofa'
  animOut?: string;           // 'stand_up'
  occupiedBy: PlayerId | null;
  sharedSlotGroup?: string;   // seats on same sofa share a group for "sit together"
  requires?: { floor?: 0|1 };
  props?: { attach: string, bone: string }[]; // e.g. book in hand, cup
  audio?: string;
}
```

### 10.3 Runtime flow

1. Each frame, `InteractionManager` finds the nearest **free** point within radius **and** within the character's forward cone (± 80°).
2. HUD shows the prompt: `[E] Sit on sofa`. If multiple points are in range, show the nearest, with Tab/scroll to cycle (desktop) or the largest button (mobile).
3. On confirm: send `interact_start` to the server (online) → server marks `occupiedBy` → broadcasts.
4. Character **enters**: auto-walk to `approachPoint` (0.6 s), rotate to `rotationY`, play `animIn`, snap hips to `position`, loop `animLoop`.
5. While interacting, movement input is ignored except **cancel** (move key or Q/B/tap Stand).
6. On exit: play `animOut`, teleport/glide to `exitPoint`, clear `occupiedBy`.

**Sitting detail (improves on the prototype's single procedural pose):**
- Seat height per furniture type (`chair 0.45 m`, `sofa 0.42 m`, `stool 0.65 m`, `bench 0.45 m`, `bed 0.5 m`) stored on the point; hips are lowered using a smooth tween.
- Use **authored sit clips** (sit_down, sit_idle, stand_up) instead of the procedural clip, with variants: upright, relaxed/lean-back, legs crossed, hands in lap.
- Prevent legs clipping through tables: furniture has a `legClearance` flag; if a table is in front, use the "tucked" variant.

### 10.4 Interaction catalog

| Object | Type | Action animation | Extra behaviour |
|---|---|---|---|
| Chair / stool / bench / sofa seat | sit | sit_down → sit_idle → stand_up | Variants by furniture; seat slots tracked |
| Bed edge | sit | sit_bed_edge | |
| Bed (lie) | lie | lie_down → lie_idle → get_up | 2 slots, side by side; lamps toggle allowed while lying |
| Piano | piano | sit_piano + piano_play_loop | Keyboard keys / on-screen keys play notes; partner hears them (§16) |
| TV | use | sit + watch_loop | TV screen shows video/looping texture; shared audio |
| Bookshelf | use | take_book → read_loop | Book prop attached to hand |
| Desk | sit | sit_desk + type_loop | Laptop screen texture |
| Kitchen stove | use | stir_loop | Particle steam; sizzle audio |
| Coffee machine | use | make_coffee → drink_loop | Cup prop |
| Fridge | use | open_fridge | Door animates |
| Fireplace | toggle | kneel_light | Fire on/off, light flicker |
| Lamp | toggle | reach_toggle | Light on/off |
| Door | door | open_door | Door pivot rotates 90°, collider toggles |
| Window / telescope | use | look_out | Camera slight zoom |
| Artwork | inspect | look_at_art | Opens artwork overlay (prototype feature) |
| Plaque | inspect | look_at_art | Opens plaque overlay |
| Balcony railing | use | lean_railing | |
| Plants | use | water_plants | Watering can prop, droplets |
| Mirror | use | check_mirror | |
| Garden fire pit | toggle/sit | sit_fire + warm glow | |

### 10.5 Conflict handling

- A point can only be occupied by one character (except `shared` groups).
- If the partner takes the nearest seat first, the HUD shows the next-nearest free point.
- Server is the arbiter: `interact_start` may be rejected with `occupied`; the client rolls back the animation within 100 ms.

---

## 11. Shared Couple Actions

Shared actions require both characters, a handshake, and synchronised playback.

| Action | Requirement | Behaviour |
|---|---|---|
| **Dance together** | Within 3 m of each other | A sends invite → B sees "Ethan wants to dance 💃 [Accept] [Decline]" → on accept, characters move to dance anchor (midpoint) and play paired dance clips with offset; music tempo can switch. |
| **Hug** | Within 1.5 m | Face each other, paired hug clip, hearts particle. |
| **Hold hands / walk together** | Within 1.5 m | Leader controls; follower auto-follows on the leader's side, hands linked (IK or paired clips). Either can break by pressing Cancel. |
| **Sit together** | Adjacent seats on same `sharedSlotGroup` | When one sits, HUD offers partner a "Join" prompt; seats chosen automatically side-by-side. |
| **Lie together** | Bed | Both lie on left/right slots. |
| **Toast** | Both holding drinks (balcony/dining) | Glass clink sound + particle. |
| **Wave / blow kiss / clap / heart** | None | Solo emotes visible to the partner. |
| **Follow me (P2)** | Any distance | Partner's character auto-paths to stand near you. |

**Handshake protocol:** `shared_invite` → `shared_accept | shared_decline | shared_timeout (10 s)` → server sends `shared_start{ actionId, anchor, startTime }` with a **server timestamp** so both clients start at the same moment (use clock offset estimated during connection). End with `shared_end`.

**Important:** during a shared action both characters' transform control is taken by the action script (to guarantee perfect alignment), then returned on end.

---

## 12. Multiplayer & Networking

### 12.1 Room lifecycle

1. **Create room:** Player 1 opens the site → "Create our home" → server returns `roomId` (e.g., `ABX-492`) and invite URL `https://ourhome.app/r/ABX492`.
2. **Invite:** Share via copy link, WhatsApp, system share sheet (Web Share API on mobile), or QR code.
3. **Join:** Player 2 opens the link → enters name → joins. Both see each other's characters.
4. **Resume:** Closing the tab keeps the room alive for **24 h** (server keeps state; can be extended to permanent for paid/customer rooms). Returning players use their stored `playerToken` to reclaim their character.
5. **Leave / end:** Explicit "Leave" frees the seat; room persists until expiry.

### 12.2 Authority model

- **Movement:** client-authoritative. Server clamps with sanity checks (max speed 5 m/s, no teleports > 3 m between updates unless a valid interaction/teleport event, position must be inside the house bounds).
- **Interactions & shared actions:** **server-authoritative** (ownership of seats, handshake timing).
- **Scene state** (lamps on/off, doors open, fireplace, decorations, memories): server-owned, replicated to clients.

### 12.3 Update rates & smoothing

| Item | Rate |
|---|---|
| Client → server transform | **15–20 Hz** (send only when changed; 5 Hz when idle) |
| Server → client broadcast | 15–20 Hz |
| Interpolation delay | **100–120 ms** (render remote character slightly in the past) |
| Extrapolation cap | 250 ms, then freeze + "reconnecting" |
| Ping | every 2 s; shown in UI settings |

**Interpolator:** buffer snapshots `{t, pos, rotY, state, speed, floor}`; render at `now − 110 ms`; use Hermite/linear position interpolation, slerp rotation. **Animation is not streamed bone-by-bone**; only the *animation state + parameters* (`state`, `speed`, `interactionId`, `emote`), and the remote client plays the matching clip locally. This keeps bandwidth to ~2 KB/s.

### 12.4 Protocol (summary — full schemas in Appendix A)

Client → Server: `join_room`, `claim_character`, `move`, `interact_start`, `interact_end`, `shared_invite`, `shared_response`, `emote`, `chat`, `toggle_object`, `memory_add`, `rtc_signal`, `ping`.

Server → Client: `room_state`, `peer_joined`, `peer_left`, `peer_state`, `interact_result`, `object_state`, `shared_start`, `shared_end`, `emote`, `chat`, `memory_added`, `rtc_signal`, `error`, `pong`.

All messages validated with **zod** schemas from `packages/shared`. Unknown or malformed messages are dropped and counted (rate-limit abusers).

### 12.5 Reconnection

- Client keeps `playerToken` and `roomId` in `sessionStorage` + `localStorage`.
- On disconnect: show "Reconnecting…" banner; retry with exponential backoff (0.5 s → 8 s, jitter).
- Server marks the character `away` (character stays in place with an idle "waiting" pose) for **60 s**; if the player returns, they resume exactly where they were, including the active interaction.
- After 60 s, the character stays idle at last position (still reserved); the partner sees "Ethan is offline" until they return.

### 12.6 Persistence

- **Persisted per room:** player names, chosen models, last positions (optional), lamp/door states, decorations, memories (images + captions), settings.
- **Transient:** current animation, shared action state.
- Save on change (debounced 2 s) + on last-player-leave.

### 12.7 Scaling & ops

- A single Node instance comfortably handles hundreds of 2-player rooms (traffic is tiny). Use **sticky sessions** + Redis adapter if horizontally scaled.
- Region: choose closest to primary audience (India + global). For long-distance couples across continents, consider a second region and room-to-region assignment at creation.
- Rate limits: ≤ 30 messages/s per socket, ≤ 5 chat messages / 5 s, image upload ≤ 5 MB each, ≤ 50 memories per room (configurable).

---

## 13. Communication: Chat, Emotes, Voice

### 13.1 Text chat (P1)
- Slide-up panel, last 100 messages kept, system messages for events ("Maya sat on the sofa").
- Messages also appear as speech bubbles above the character for 5 s.
- Profanity filter optional (setting). Emoji picker included.

### 13.2 Emote wheel (P1)
- Hold **G** (or tap button): radial menu with 8 emotes — wave, heart, laugh, clap, kiss, thumbs up, think, cry-happy.
- Plays a short full-body or upper-body animation + floating emoji above head. Emotes can play while walking (upper-body mask) where it makes sense.

### 13.3 Voice chat (P1)
- WebRTC peer-to-peer, Opus audio, signalling through `rtc_signal` messages.
- **coturn** TURN server required for ~15–20 % of connections that cannot go direct.
- Push-to-talk **or** open-mic toggle; mute button; speaking indicator ring on the partner's name tag; per-user volume slider.
- Optional: spatial voice (volume drops with distance) — default **off** for couples; they probably want to hear each other everywhere.
- Mic permission UX: explain *why* before the browser prompt; never block the app if denied.

---

## 14. UI / UX Design

### 14.1 Design language

- **Mood:** an elegant boutique-hotel / gallery feel. Calm, spacious, romantic, never childish.
- **Typography:** Headings **Cormorant Garamond** (serif, light/regular/italic), UI text **Inter**. (Same as prototype.)
- **Colours (CSS variables):**
  ```
  --bg: #121318;           --panel: rgba(18,19,24,0.72);
  --gold: #E8D0A9;         --ivory: #F5EFE6;
  --rose: #C9808A;         --text: #EDE8E0;
  --muted: #9A958C;        --success: #7FB89A;   --warn: #E3B15C;   --danger: #D9707A;
  ```
- **Surfaces:** frosted-glass panels (backdrop blur 16–24 px), 1 px hairline borders `rgba(232,208,169,0.18)`, 16 px radius, soft long shadows.
- **Motion:** 200–350 ms ease-out; panels fade + 8 px slide; no bouncing. Respect `prefers-reduced-motion`.
- **Iconography:** single consistent line-icon set (e.g., Lucide) — **no emoji in controls** (emoji only in chat/emotes).

### 14.2 Screen inventory

| # | Screen | Contents |
|---|---|---|
| 1 | **Landing / Start** | Title, subtitle "From Ethan • To Maya", animated loading bar with real asset progress, "Create our home" and "Join with code" buttons, solo mode link. |
| 2 | **Lobby / Character select** | Showroom with both characters on a plinth; click to claim; name fields; partner status; invite link + QR + copy/share buttons; "Enter home" enabled when ready (or solo). |
| 3 | **Intro cinematic** | Camera fly-in, skip button. |
| 4 | **In-game HUD** | See 14.3. |
| 5 | **Interaction prompt** | Pill near bottom-center: key badge + verb ("E · Sit on sofa"). |
| 6 | **Shared-action invite modal** | Partner avatar, message, Accept/Decline with 10 s radial timer. |
| 7 | **Artwork / plaque inspect overlay** | Full-bleed image, title, tag, quote, signature (reuse prototype). Next/prev arrows between artworks. |
| 8 | **Emote wheel** | Radial menu. |
| 9 | **Chat panel** | Left drawer, message list, input, emoji. |
| 10 | **Minimap** | Top-right, floor toggle (G/1/2), dots for players, markers for rooms. |
| 11 | **Settings** | Graphics (Low/Med/High/Auto, shadows, resolution scale), audio (master, music, sfx, voice), controls (invert Y, sensitivity), accessibility, language, "Leave room". |
| 12 | **Photo mode** | Hides HUD; shows filter strip, FOV/DoF sliders, capture button, gallery of saved photos. |
| 13 | **Memory wall / add memory** | Upload image, caption, date, choose frame slot. |
| 14 | **Decorate mode (P2)** | Catalogue drawer, gizmo, save/undo. |
| 15 | **Disconnect / reconnect states** | Non-blocking banners and a full overlay if > 60 s. |
| 16 | **Error / unsupported browser** | Friendly WebGL-not-supported page. |

### 14.3 In-game HUD layout

```
┌──────────────────────────────────────────────────────────────┐
│ [Our Home ▾]                    [partner: Ethan ● 42ms] [🎵][⚙]│  top bar
│                                                   ┌────────┐ │
│                                                   │MINIMAP │ │
│                                                   │ F1 F2  │ │
│  (chat unread dot)                                └────────┘ │
│                                                              │
│                  [E] Sit on sofa     ← interaction prompt    │
│                                                              │
│  [💬 Chat] [😊 Emotes G] [🎤 Mic] [📷 Photo]       [Action ▸]│  bottom
│                                           (mobile: joystick) │
└──────────────────────────────────────────────────────────────┘
```

- HUD auto-hides after 6 s of no input in cinematic view (setting), reappears on movement of mouse.
- Contextual action button (mobile) changes label with the nearest interaction.

### 14.4 Mobile UX specifics
- Landscape strongly recommended; portrait supported with adapted layout (joystick bottom-left, buttons right).
- Touch targets ≥ 48 px; safe-area insets respected (`env(safe-area-inset-*)`).
- Prevent browser gestures (pull-to-refresh, double-tap zoom) on the canvas.
- Auto quality: drop to Low if average frame time > 28 ms for 5 s.
- Keep screen awake (Wake Lock API) while in-game.

### 14.5 UX copy tone
Warm, short, human. Examples: "Waiting for Maya to join…", "Ethan wants to dance with you", "Your memory has been hung in the gallery."

---

## 15. Lighting, Atmosphere & Day/Night

- **Static light:** baked lightmaps for all rooms (sun + interior lights). Cycles bake at 1024–2048 per atlas.
- **Dynamic lights budget:** max **6 active real-time lights** at once (forward renderer): fireplace flicker, 2–3 nearest lamps, character rim. Lamps farther away are emissive-only.
- **Shadows:** single directional shadow (sun, 2048 map on High, 1024 Medium, off on Low) covering the player area (follow-camera shadow frustum). Contact shadow blob under characters on Low.
- **Image-based lighting:** one HDRI environment map for reflections and fill (indoor + outdoor).
- **Post-processing (High/Medium only):** subtle bloom on emissives, SSAO (optional), ACES tone mapping (already used), mild vignette, colour grade LUT per time of day. All optional by quality preset.
- **Day/night cycle:**
  - Real-time clock mode (matches each player's local time) **or** accelerated 20-minute cycle (setting).
  - Sky gradient + sun/moon position, window light colour/intensity, exterior fog colour, lamp auto-on at dusk, stars and fireflies at night, interior mood shift.
  - Because the room has two players in different time zones, use **a room-level time** (either fixed by room settings or synchronised from the server) so both see the same lighting.
- **Special-date themes (P2):** swap decoration sets and light colours (fairy lights, flowers, balloons) on specified dates.
- **Volumetric hints:** fake light shafts (additive planes) near windows in the gallery; subtle dust particles. Use cheaply.

---

## 16. Audio

| Layer | Details |
|---|---|
| **Music** | Existing procedural piano score (reuse `audio.js`) + optional licensed/original tracks. Per-room music zones with crossfades (gallery louder, bedroom softer). |
| **Ambience** | Per-room loops: fire crackle, clock ticking, kitchen hum, birds/wind in garden, night crickets. |
| **Footsteps** | Surface-based (wood, tile, carpet, stairs, grass), triggered by animation foot events; volume scaled by speed. Remote character footsteps are **3D positional**. |
| **Interaction SFX** | Sit/stand cloth, door open/close, lamp switch, drawer, glass clink, page turn, cooking sizzle. |
| **Playable piano** | Keys A–K row = white keys, W-E-T-Y-U row = black keys (desktop); on-screen 2-octave keyboard on mobile. Notes are broadcast as `piano_note{note, velocity, t}`; both players hear them (low latency tolerance ~150 ms). Uses the existing oscillator voice or sampled piano (sampled recommended for realism). |
| **Voice** | WebRTC stream, separate mixer channel. |
| **Mixer** | Master → Music / Ambience / SFX / Voice buses, each with volume slider; ducking music −6 dB when voice is active. |
| **Autoplay policy** | Audio context starts on the first user gesture (the Enter button), as in the prototype. |

---

## 17. Memory Features: Gallery, Photo Mode, Decorate Mode

### 17.1 Gallery & plaques (carry-over, P0)
- Artworks 1–5 from `config.js`: *Centerpiece (Main Wall), North Gallery Left/Right, West Wing Wall, East Wing Wall* — retained, but placed in the upper-floor Memory Gallery. System must support **up to 12 slots**.
- Each artwork: image (uploaded, compressed client-side to ≤ 1200 px JPEG using the existing `compressImage`), title, tag, quote, signature.
- Fallback procedural art (`createFallbackArtCanvas`) if no image uploaded.
- Inspect overlay with keyboard (←/→) and swipe navigation.

### 17.2 Memory wall / guest book (P1)
- Either player can **add a memory** during the session: pick photo → caption → date → slot. The frame appears on the wall live for both players.
- Images stored in object storage; URL referenced in DB. Server validates MIME type, size, and strips EXIF location data.
- Delete/edit allowed by either player (confirmation).

### 17.3 Photo mode (P1)
- Press **P**: UI hides, free camera or "couple pose" camera preset (both characters framed).
- Controls: FOV, depth-of-field, exposure, filters (Warm, Noir, Film, Soft), vignette, timer (3/5/10 s) so both can pose.
- **Pose picker:** a handful of couple poses (arm around shoulder, back-to-back, side hug) — shared actions using paired clips.
- Capture: renders at 2× resolution to PNG; offers Save and "Pin to memory wall".

### 17.4 Decorate mode (P2)
- Owner-only toggle. Catalogue of props (frames, plants, lamps, rugs, chairs). Place by raycast to floor/walls; rotate in 15° steps; delete; undo/redo.
- Placement validated on server (inside bounds, no collider overlap).
- Props instanced; saved as `{propId, position, rotationY, scale}` in room state.

---

## 18. Customization, Config & Studio

### 18.1 Per-room configuration (evolved from `DEFAULT_CONFIG`)

```jsonc
{
  "museumTitle": "Our Home",
  "partnerFrom": "Ethan",
  "partnerTo": "Maya",
  "characters": { "maya": {"model":"Claire","tint":"#C9808A"}, "jack": {"model":"Aj","tint":"#E8D0A9"} },
  "speechBubble": "i love you maya ❤️",
  "plaque": { "tag":"A PERMANENT COLLECTION", "title":"For Maya", "quote":"…", "sign":"Love, Ethan" },
  "artworks": [ { "id":1, "name":"…", "title":"…", "tag":"…", "quote":"…", "sign":"…", "imageUrl":null } ],
  "theme": { "timeMode":"realtime|fixed|cycle", "fixedTime":"20:00", "season":"default|winter|spring", "specialDate":null },
  "music": { "track":"piano_default", "volume":0.28 },
  "decorations": []
}
```

### 18.2 Studio (admin tool) — P1
- Evolve `studio.html` into a protected web app (`packages/studio`) with login.
- Features: create/edit/delete **customer rooms** (multi-customer management, as in the prototype), upload artworks, set plaque text, choose characters/theme, preview, generate **share link**, duplicate room, order status, export/import JSON.
- Data moves from localStorage to the server DB; images to object storage.
- Role-based access: Admin (all), Operator (manage orders).

---

## 19. Asset Pipeline

### 19.1 Folder naming and conventions
- Lowercase, snake_case filenames; versioned suffix only in source files (`house_v012.blend`), not in runtime assets.
- glTF 2.0 binary (`.glb`), Y-up, metres, applied transforms, no negative scales.

### 19.2 Pipeline steps

```
Blender (source .blend)
   │  export glTF (naming prefixes, extras)
   ▼
tools/asset-pipeline  ──  gltf-transform:
   • dedupe, prune, weld, simplify (if needed)
   • Draco / meshopt geometry compression
   • textures → KTX2 (UASTC for normals, ETC1S for colour)
   • generate collision BVH-ready merged mesh (COL_) → colliders.glb
   • generate navmesh → navmesh.glb
   ▼
public/assets/…  →  CDN (cache-busted by content hash)
```

### 19.3 Animation pipeline
1. Download clips from **Mixamo** (FBX, "without skin", 30 fps) for: idle variants, walk, run, turn-left/right, stairs up/down, sit variants, stand-up, lie-down, get-up, wave, clap, laugh, dance (several), hug, drink, read, type, stir, open door, etc.
2. Clean in Blender: loop points, foot-contact alignment, remove root motion (keep Y bounce), bake to bone names `mixamorig_*`.
3. Export to a single **`animations.glb`** (clips only) or per-category GLBs; load once, reuse on every character through `AnimationMixer` (same as the current `Xbot.glb` approach).
4. Paired shared actions (hug, dance together, hold hands) must be authored as **two clips with a shared anchor** — Blender, or purchased paired packs.
5. Add **animation events** (foot contact, hand-grab, prop attach) via named empties/markers read at load time.

### 19.4 Character pipeline
- Check scale, orientation, bone names, material count (≤ 4), mesh count (≤ 3).
- Compress textures; strip unused morph targets and animations from the character GLB (clips live in the shared file). Expected **size: ≤ 1.5 MB per character** after optimisation (currently 5–14 MB).

---

## 20. Performance Budgets & Optimization

### 20.1 Budgets (High preset, mid-range laptop / flagship phone)

| Metric | Desktop target | Mobile target |
|---|---|---|
| Frame rate | 60 fps | 30 fps stable (60 on high-end) |
| Draw calls | ≤ 250 | ≤ 120 |
| Triangles on screen | ≤ 1.2 M | ≤ 350 k |
| Characters | 2 × ≤ 40 k tris | 2 × ≤ 25 k tris |
| Texture memory | ≤ 400 MB | ≤ 150 MB |
| Initial download (critical) | ≤ 15 MB | ≤ 12 MB |
| Total assets | ≤ 60 MB (streamed) | ≤ 40 MB |
| Time-to-interactive | ≤ 6 s on 50 Mbps | ≤ 12 s on 4G |
| Realtime lights | ≤ 6 | ≤ 3 |
| Network | ≤ 5 KB/s per client (excluding voice/uploads) | same |

### 20.2 Techniques (mandatory)
- Draco/meshopt + KTX2 compression; mipmaps; anisotropy 4–8.
- **Instancing** for repeated props (books, plates, plants); static batching of the house by material.
- **Frustum + room-based culling**: use `TRG_Room_*` / portal volumes to hide rooms not visible (especially other floor).
- **Level of detail** for small props and distant furniture.
- **Lazy loading:** load ground floor + characters first, stream upper floor and garden after the Enter button.
- Cap pixel ratio (≤ 2 desktop, ≤ 1.5 mobile) with dynamic resolution scaling.
- Shadow map follows the character; update shadow at 30 Hz on Medium.
- Avoid per-frame allocations (`new Vector3` in loops); pool objects; dispose geometry/materials/textures on unload.
- Skinned mesh updates only when visible; mixers paused for off-screen remote characters.
- Web Workers for navmesh queries and image compression.
- Service Worker caching of static assets for repeat visits.

### 20.3 Quality presets

| Setting | Low | Medium | High |
|---|---|---|---|
| Resolution scale | 0.75 | 1.0 | 1.0–1.25 |
| Shadows | blob only | 1024 | 2048 + soft |
| Post FX | off | bloom | bloom + SSAO + LUT |
| Dynamic lights | 2 | 4 | 6 |
| Texture size | 512–1024 | 1024 | 2048 |
| Particles | minimal | normal | full |
| Reflections | none | static probe | probe + SSR (optional) |

---

## 21. Security, Privacy & Data

- **Transport:** HTTPS/WSS only; HSTS; TURN over TLS where possible.
- **Room access:** Room IDs are unguessable (≥ 10 chars random, base32). Optional **room password** and **owner approval** when a third client attempts to join. Exactly two player seats enforced server-side.
- **Authentication:** Players are anonymous with a signed `playerToken` (JWT) for the session; Studio/admin uses real login (email + password or OAuth) with rate-limiting and 2FA optional.
- **Input validation:** zod schemas on all messages and REST payloads; reject oversize payloads; sanitise chat/captions (strip HTML, escape on render — never `innerHTML` with user text).
- **Uploads:** accept JPEG/PNG/WebP only; verify magic bytes; max 5 MB; re-encode server-side (strip EXIF GPS); virus scan hook optional; store behind signed URLs.
- **Privacy:** photos and chat belong to the room; no analytics on private content. Clear **delete my room / delete all data** function. Voice is peer-to-peer and never recorded by the server.
- **Compliance:** privacy policy and terms; cookie banner only if non-essential cookies are used; GDPR/DPDP-style export & delete on request.
- **Abuse:** rate limits, report/block, profanity filter option; server logs avoid personal content.
- **Dependency hygiene:** lockfile, Dependabot, pinned versions; no runtime dependency on third-party CDNs.

---

## 22. Accessibility & Browser Support

### 22.1 Support matrix
| Browser | Version | Notes |
|---|---|---|
| Chrome / Edge | latest 2 | Primary target |
| Safari (macOS/iOS) | 16.4+ | Test voice (WebRTC) and audio autoplay carefully; KTX2 fallback |
| Firefox | latest 2 | |
| Mobile | iOS 16+, Android 10+ with WebGL2 | Min 3 GB RAM recommended |

WebGL2 required; provide a graceful "unsupported" screen. (WebGPU renderer is an optional future upgrade — not for v1.)

### 22.2 Accessibility
- All HUD controls keyboard-focusable with visible focus rings; ARIA labels on buttons.
- Colour contrast ≥ 4.5:1 for text over panels.
- Options: reduced motion, larger UI scale (100/125/150 %), subtitles for voice not required but **chat is the fallback**, toggle camera shake/head-bob.
- Remappable keys (P2).
- Don't rely on colour alone to show state (icons + text).

---

## 23. Testing & QA Plan

### 23.1 Automated
- **Unit (Vitest):** interpolator, state machine transitions, collision math, interaction selection, message validators, config merge.
- **Integration:** server room lifecycle, ownership locking, reconnection, rate limits.
- **E2E (Playwright):** two browser contexts join one room; assert partner appears, seat conflict resolution, shared-action handshake, reconnect after forced socket close.
- **Performance CI:** headless run reporting draw calls/tris/memory against budgets; fail the build on regression > 10 %.
- **Asset validator (CI):** checks naming prefixes, scale, bone names, polycount, texture sizes, missing colliders for each `SIT_`/`INT_` point.

### 23.2 Manual QA checklist (excerpt)
- [ ] Walk every corridor and room: no clipping through walls/furniture; no stuck corners.
- [ ] Stairs: walk up/down at walk speed, run, reverse mid-stair, both characters at once; arrive on the correct floor; camera never inside ceiling.
- [ ] Sit on **every** seat in the house; stand up lands on a valid floor spot; no leg clipping through tables.
- [ ] Two players attempting the same seat: only one succeeds; other sees feedback.
- [ ] Shared dance: both start in sync (± 100 ms); cancel works for either player.
- [ ] Network: 150 ms latency, 5 % packet loss, and 2 s outage scenarios (Chrome throttling / `tc netem`).
- [ ] Reconnect during an interaction restores the same pose.
- [ ] Piano notes heard by partner; no stuck notes on disconnect.
- [ ] Voice: both directions, mute, device change, Safari.
- [ ] Photo mode capture quality and UI hidden.
- [ ] Memory upload (HEIC → JPEG handling on iOS), large image, wrong file type.
- [ ] Day/night transitions look correct; lamps on at dusk.
- [ ] Mobile: orientation change, background/foreground, low battery mode, notch safe areas.
- [ ] Memory leaks: 30-minute soak test; heap stable.

### 23.3 Devices to test
iPhone 12/15, mid-range Android (e.g., Snapdragon 7-series), low-end Android (4 GB), MacBook Air M1, Windows laptop with integrated GPU, desktop with discrete GPU.

### 23.4 Acceptance criteria — "walk feels real"
Subjective gate reviewed by the art director and 5 external testers:
1. No visible foot sliding at walk and run.
2. Starts/stops feel natural (no snapping).
3. Turning has weight; no instant 180°.
4. Stairs look like stairs (feet on steps, no hovering or sinking > 3 cm).
5. Sitting/standing aligns to the furniture within 2 cm and 5°.

---

## 24. Deployment & DevOps

| Item | Spec |
|---|---|
| Environments | `dev` (local), `staging` (auto-deploy from `main`), `production` (manual promote with tag) |
| Client hosting | Static hosting + CDN with Brotli, immutable caching for hashed assets, `Cache-Control: no-cache` for `index.html` |
| Server hosting | Docker container; 1 vCPU / 1 GB RAM to start; auto-restart; health check `/healthz` |
| Database | Managed PostgreSQL with daily backups, 7-day retention |
| Object storage | S3-compatible bucket, private, signed URLs, lifecycle rules |
| TURN | coturn on a small VM with a public IP; credentials rotated via time-limited TURN REST API |
| CI/CD | GitHub Actions: lint → typecheck → unit → build → asset validation → e2e → deploy |
| Monitoring | Sentry (client + server errors), uptime check, server metrics (rooms, sockets, msg rate), client telemetry for fps and load time (**anonymous, opt-out**) |
| Logging | Structured JSON logs, no message content |
| Domains | `ourhome.app` (example), `studio.ourhome.app`, `api.ourhome.app`, `turn.ourhome.app` |

---

## 25. Development Roadmap (Phases)

Estimate assumes a team of: 1 tech lead / gameplay dev, 1 front-end/UI dev, 1 back-end dev, 1 3D environment artist, 1 character/animation artist (part-time), 1 UI/UX designer (part-time), 1 QA (from phase 3). **Total ≈ 20–24 weeks to v1.0.** Durations are indicative.

### Phase 0 — Foundations (Week 1–2)
- Repo, Vite + TypeScript monorepo, CI, coding standards.
- Port prototype into the new structure (loader, audio, config).
- Finalise art direction, house floor plans, and UI design system (Figma).
- Decide networking stack (Socket.IO vs Colyseus).
- **Deliverables:** running skeleton, design kit, approved floor plans, technical design review.
- **Exit:** a character walks in an empty grey-box scene with the new project structure.

### Phase 1 — Grey-box house + core movement (Week 3–6)
- Grey-box two-floor house with correct dimensions and staircase.
- Collision (BVH), ground snapping, stairs, camera rig, input (desktop + mobile joystick).
- Locomotion state machine (idle/walk/run/turn/stairs) with first animation set.
- **Exit:** character walks anywhere in the grey-box, climbs stairs without glitches, camera never clips. *Gate: stairs QA pass.*

### Phase 2 — Interaction system + second character (Week 6–9)
- `InteractionPoint` data model, marker loading from glTF, HUD prompt.
- Sit/stand (several variants), lie on bed, doors, toggles.
- Two independent characters, click-to-select, solo-mode switching.
- Authored sit and activity animations; piano (local).
- **Exit:** both characters can be controlled (one at a time) and interact with all grey-box props.

### Phase 3 — Multiplayer core (Week 8–12, overlapping)
- Server: rooms, join links, ownership, validation, persistence skeleton.
- Client: NetClient, interpolation, remote character proxy, presence, reconnect.
- Interaction arbitration and shared-action handshake (dance, sit together).
- Lobby UI, invite link, QR.
- **Exit:** two real people on two devices move and interact in the grey-box house with smooth sync at 150 ms RTT. *Gate: network QA pass.*

### Phase 4 — Final art integration (Week 10–16, overlapping)
- Final house model, textures, lightmaps, furniture, decor, gallery, balcony, garden.
- Replace grey-box colliders and markers with final ones; navmesh; click-to-walk.
- Final animation set incl. paired animations; footstep and ambience audio.
- Day/night cycle, lamp toggles, fireplace, particles.
- **Exit:** the full house looks and plays as designed at target quality on desktop.

### Phase 5 — Couple features & UI polish (Week 14–19)
- Chat, emote wheel, voice chat, speech bubbles.
- Minimap, settings, photo mode, memory wall + uploads, plaque/artwork overlays (restyled).
- Mobile UX pass, quality presets, auto-quality, accessibility pass.
- Studio admin tool on the server DB.
- **Exit:** feature-complete (all P0 + P1).

### Phase 6 — Optimisation, QA, hardening (Week 19–22)
- Performance to budgets on all test devices; memory soak tests.
- Full manual QA, bug-bash with external testers, network chaos tests, security review.
- Analytics, error monitoring, legal pages.
- **Exit:** release candidate meeting §27.

### Phase 7 — Launch & post-launch (Week 22–24 and ongoing)
- Production deployment, load test, soft-launch with a small group of couples.
- Fix-forward, monitor metrics.
- **P2 backlog:** decorate mode, foot IK, follow-me, special-date themes, gamepad, localisation, more characters/outfits, extra houses.

### Milestone summary

| Milestone | Week | Demonstrates |
|---|---|---|
| M1 — Walk | 6 | Grey-box house, stairs, movement |
| M2 — Interact | 9 | Sit/lie/piano/doors, two characters |
| M3 — Together | 12 | Two people online, shared actions |
| M4 — Beautiful | 16 | Final art in-engine |
| M5 — Feature complete | 19 | All P0 + P1 |
| M6 — Release candidate | 22 | Stable, optimised, tested |
| M7 — Launch | 24 | Public |

---

## 26. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stairs + collision produce jitter / stuck characters | High | High | Ramp collision proxy; capsule sweep; early dedicated prototype (Phase 1 gate); camera + ceiling tests |
| Animation retargeting / foot sliding with different models | High | Med | Standardise on Mixamo skeleton; timeScale from speed; validate each model with checklist |
| Paired animations (hug, dance) look misaligned | Med | Med | Anchor-based playback; author clips together; allow ± small IK correction; fall back to individual "close-dance" clips |
| Mobile performance | High | High | Strict budgets; baked lighting; KTX2; auto-quality; test on low-end devices from Phase 1 |
| Large download time | Med | Med | Compression targets; stream upper floor after entry; service worker cache |
| Network latency across continents | Med | Med | Interpolation; region choice; client-authoritative movement; only state sync, not bones |
| Voice (WebRTC) fails behind strict NATs | Med | Med | Deploy TURN; text chat fallback |
| iOS Safari quirks (audio, WebRTC, memory limits) | High | Med | Test early and weekly on real iPhones; limit texture sizes |
| 3D art takes longer than planned | Med | High | Start with kit-bash approach (modular walls/props), purchase licensed furniture packs where quality is equal; stage rooms by priority (living room, bedroom, gallery first) |
| Scope creep (decorate mode, themes, etc.) | High | Med | P2 items strictly post-launch; change-control with PM sign-off |
| Content/legal (music, models, textures licence) | Med | High | Track licences in `docs/licenses.md`; verify Mixamo/ReadyPlayerMe/Avaturn terms for commercial use; use procedural or licensed music only |
| Abuse of photo upload | Low | Med | Validation, size limits, re-encode, report tools |

---

## 27. Definition of Done

**A feature is done when:**
1. It meets the acceptance criteria in this document.
2. Unit/e2e tests exist and pass in CI.
3. It runs within performance budgets on the target devices.
4. It works on desktop (Chrome, Safari, Firefox) and mobile (iOS Safari, Android Chrome).
5. It has been reviewed (code + design) and merged to `main`.
6. Error states and edge cases (disconnect, partner absent, denied permissions) are handled.
7. Copy and UI are signed off by design.

**The project v1.0 is done when:**
- [ ] All **P0** and **P1** features in §4 are complete and verified.
- [ ] Two players on different devices/networks can create/join a room via link and play together smoothly for 60 minutes without desync or crash.
- [ ] Every seat/bed/interaction in the house works and is conflict-safe.
- [ ] Stairs, walking, and sitting pass the "feels real" criteria (§23.4).
- [ ] Performance budgets met on the defined device list.
- [ ] Security review passed; no critical or high open bugs.
- [ ] Studio admin tool can create and deliver a customer room end-to-end.
- [ ] Documentation delivered: README, architecture doc, asset guide, runbook.

---

## APPENDIX A — Data Schemas & Message Formats

(TypeScript; live in `packages/shared/protocol.ts`. Use zod for runtime validation.)

### A.1 Core types

```ts
type PlayerId = string;
type CharacterId = 'maya' | 'jack';           // keep ids; display names come from config
type Vec3 = [number, number, number];

type AnimState =
  | 'idle' | 'walk' | 'run' | 'turn' | 'stairs_up' | 'stairs_down'
  | 'sit_down' | 'sit' | 'stand_up' | 'lie_down' | 'lie' | 'get_up'
  | 'activity'        // piano, read, cook, etc. (see interactionId / clip)
  | 'shared'          // dance together, hug...
  | 'emote';

interface CharacterSnapshot {
  t: number;                 // server time (ms)
  char: CharacterId;
  pos: Vec3;
  rotY: number;              // radians
  speed: number;             // m/s (for blend + timeScale)
  state: AnimState;
  floor: 0 | 1;
  interactionId?: string;
  clip?: string;             // for 'activity' / 'emote'
  sharedId?: string;
}
```

### A.2 Client → Server

```ts
type C2S =
  | { type: 'join_room'; roomId: string; name: string; playerToken?: string }
  | { type: 'claim_character'; char: CharacterId }
  | { type: 'move'; snap: Omit<CharacterSnapshot,'t'|'char'>; seq: number }
  | { type: 'interact_start'; pointId: string }
  | { type: 'interact_end'; pointId: string }
  | { type: 'shared_invite'; action: 'dance'|'hug'|'hold_hands'|'toast' }
  | { type: 'shared_response'; inviteId: string; accept: boolean }
  | { type: 'shared_cancel'; sharedId: string }
  | { type: 'emote'; id: string }
  | { type: 'chat'; text: string }                       // ≤ 280 chars
  | { type: 'toggle_object'; objectId: string; on: boolean }
  | { type: 'piano_note'; note: number; velocity: number; down: boolean }
  | { type: 'memory_add'; slot: number; title: string; caption: string; uploadId: string }
  | { type: 'rtc_signal'; to: PlayerId; data: unknown }
  | { type: 'ping'; t: number };
```

### A.3 Server → Client

```ts
type S2C =
  | { type: 'room_state'; room: RoomState; you: PlayerId; serverTime: number }
  | { type: 'peer_joined'; player: PlayerPublic }
  | { type: 'peer_left'; playerId: PlayerId; reason: 'left'|'timeout' }
  | { type: 'peer_state'; snap: CharacterSnapshot }       // 15–20 Hz
  | { type: 'interact_result'; pointId: string; ok: boolean; reason?: 'occupied'|'too_far'|'invalid' }
  | { type: 'interact_update'; pointId: string; occupiedBy: PlayerId | null }
  | { type: 'object_state'; objectId: string; on: boolean }
  | { type: 'shared_invite'; inviteId: string; from: PlayerId; action: string; expiresAt: number }
  | { type: 'shared_start'; sharedId: string; action: string; anchor: Vec3; rotY: number; startAt: number }
  | { type: 'shared_end'; sharedId: string }
  | { type: 'emote'; from: PlayerId; id: string }
  | { type: 'chat'; from: PlayerId; text: string; ts: number }
  | { type: 'piano_note'; from: PlayerId; note: number; velocity: number; down: boolean }
  | { type: 'memory_added'; memory: Memory }
  | { type: 'rtc_signal'; from: PlayerId; data: unknown }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong'; t: number; serverTime: number };
```

### A.4 Persistent models

```ts
interface RoomState {
  roomId: string;
  config: RoomConfig;                          // see §18.1
  players: PlayerPublic[];                     // max 2
  objects: Record<string, boolean>;            // lamps, doors, fireplace
  interactions: Record<string, PlayerId|null>; // occupancy
  memories: Memory[];
  decorations: Decoration[];
  createdAt: number; expiresAt: number | null;
}
interface PlayerPublic { id: PlayerId; name: string; char: CharacterId; online: boolean; }
interface Memory { id: string; slot: number; title: string; caption: string; imageUrl: string; date: string; by: PlayerId; }
interface Decoration { id: string; propId: string; pos: Vec3; rotY: number; scale: number; }
```

### A.5 SQL tables (PostgreSQL, indicative)

```sql
rooms(id text pk, config jsonb, state jsonb, created_at timestamptz, expires_at timestamptz, owner_token_hash text);
players(id uuid pk, room_id text fk, name text, char text, token_hash text, last_seen timestamptz);
memories(id uuid pk, room_id text fk, slot int, title text, caption text, image_key text, taken_on date, by_player uuid, created_at timestamptz);
orders(id uuid pk, customer_name text, room_id text fk, status text, notes text, created_at timestamptz, updated_at timestamptz);
admin_users(id uuid pk, email text unique, password_hash text, role text);
uploads(id uuid pk, room_id text, key text, mime text, bytes int, created_at timestamptz);
```

### A.6 Key constants (`shared/constants.ts`)

```ts
export const WALK_SPEED = 1.4;       // m/s
export const RUN_SPEED = 3.2;
export const STAIR_MAX_SPEED = 1.8;
export const ACCEL = 8; export const DECEL = 10;
export const CAPSULE_RADIUS = 0.3; export const CAPSULE_HEIGHT = 1.7; export const STEP_HEIGHT = 0.35;
export const NET_SEND_HZ = 20; export const NET_IDLE_HZ = 5; export const INTERP_DELAY_MS = 110;
export const INTERACT_RADIUS = 1.2; export const INTERACT_CONE_DEG = 80;
export const RECONNECT_GRACE_MS = 60_000; export const ROOM_TTL_MS = 24*60*60*1000;
export const SHARED_INVITE_TIMEOUT_MS = 10_000;
export const MAX_CHAT_LEN = 280; export const MAX_MEMORIES = 50; export const MAX_UPLOAD_BYTES = 5*1024*1024;
```

---

## APPENDIX B — Animation Catalog

Priority: **A** = needed for Phase 1–2, **B** = Phase 4–5, **C** = polish/P2. All clips at 30 fps, Mixamo skeleton, no root motion.

| Group | Clip name | Loop | Priority | Notes |
|---|---|---|---|---|
| Locomotion | `idle_01`, `idle_02` (look around), `idle_03` (shift weight), `idle_breathe` | ✔ | A/B | Random variation every 8–15 s |
| | `walk` | ✔ | A | nominal speed 1.4 m/s |
| | `run` | ✔ | A | nominal 3.2 m/s |
| | `turn_left_90`, `turn_right_90`, `turn_180` | ✘ | B | Turn-in-place |
| | `stairs_up`, `stairs_down` | ✔ | A | nominal 0.9 m/s along slope |
| | `walk_hold_hands` (paired) | ✔ | B | |
| Sitting | `sit_down_chair`, `sit_idle_chair`, `stand_up_chair` | – | A | Upright |
| | `sit_idle_relaxed`, `sit_idle_cross_legs` | ✔ | B | Variants |
| | `sit_down_sofa`, `sit_idle_sofa_lean`, `stand_up_sofa` | – | A | |
| | `sit_stool`, `sit_bench`, `sit_bed_edge` | ✔ | A | |
| | `sit_desk`, `type_loop` | ✔ | B | |
| Lying | `lie_down_bed`, `lie_idle_bed`, `get_up_bed` | – | A | Left/right mirrored |
| Activities | `piano_sit`, `piano_play_loop` | ✔ | B | |
| | `watch_tv_loop` | ✔ | B | |
| | `read_book_loop`, `take_book` | ✔ | B | Book prop |
| | `cook_stir_loop`, `make_coffee`, `drink_loop`, `eat_loop` | ✔ | B | Props: spoon, cup, fork |
| | `open_door`, `open_fridge`, `toggle_switch`, `light_fire_kneel` | ✘ | B | |
| | `water_plants`, `check_mirror`, `lean_railing`, `look_window`, `look_at_art` | ✔/✘ | B/C | |
| Emotes | `wave`, `clap`, `laugh`, `heart_hands`, `blow_kiss`, `thumbs_up`, `think`, `cry_happy` | ✘ | B | Upper-body masks where possible |
| Dance | `dance_solo_01..03` | ✔ | A | Existing prototype dance can be one of these |
| Shared (paired) | `dance_pair_a/b`, `hug_a/b`, `toast_a/b`, `pose_couple_01..04_a/b` | ✔/✘ | B | Authored with shared anchor |

---

## APPENDIX C — Asset Checklist

### C.1 3D Environment (artist)
- [ ] House exterior + interior modular kit (walls, floors, ceilings, doors, windows, trim)
- [ ] Staircase (visual) + ramp collision proxy
- [ ] All furniture in §7.7 (LOD0 + LOD1 for large pieces)
- [ ] Garden: terrain, fence, tree, bench, fire pit, beds, path
- [ ] Balcony set + skybox/HDRI
- [ ] Baked lightmaps per room group
- [ ] `COL_`, `NAV_`, `SIT_`, `LIE_`, `INT_`, `DOOR_`, `LAMP_`, `ART_`, `TRG_`, `SPAWN_`, `CAM_` empties placed and named (§7.9)
- [ ] 12 artwork frames with UV for image texture
- [ ] Props that attach to hands: book, cup, spoon, watering can, wine glass

### C.2 Characters & animation
- [ ] Maya, Ethan optimised GLB (≤ 1.5 MB each) — Mixamo skeleton verified
- [ ] 4+ additional selectable characters passing validation
- [ ] `animations.glb` with all **A** priority clips, then **B**, then **C**
- [ ] Paired clips with anchors
- [ ] Footstep/animation event markers

### C.3 Audio
- [ ] Music: main theme, gallery theme, bedroom theme (or procedural + samples)
- [ ] Ambience loops ×8
- [ ] Footstep sets (wood, tile, carpet, stairs, grass) ×4 variations each
- [ ] Interaction SFX ×25
- [ ] Piano samples (88 keys or 3 velocity layers over 4 octaves)

### C.4 UI / Design
- [ ] Figma design system (colours, type, components, motion specs)
- [ ] All 16 screens in §14.2 for desktop, tablet, mobile portrait + landscape
- [ ] Icon set, logo, favicon, OG image for link sharing
- [ ] Emote icons, loading illustration

### C.5 Documentation (developers)
- [ ] `README.md` — setup, scripts, environment variables
- [ ] `docs/architecture.md` — updated diagrams
- [ ] `docs/asset-guide.md` — export rules, naming, validation, how to add furniture/seat
- [ ] `docs/protocol.md` — generated from `shared/protocol.ts`
- [ ] `docs/runbook.md` — deploy, rollback, incident response
- [ ] `docs/licenses.md` — third-party asset and code licences

---

### Final note to the development team

The prototype proves the *look and feel* (romantic gallery, gold-on-dark UI, two Mixamo characters, procedural piano). This project turns it into a **real shared place**. The three things that will decide success, in order, are:

1. **Stairs and walking that feel real** (Phase 1 — do not move on until they do).
2. **A generic interaction system** driven by data authored in Blender (so adding a new chair or room never needs code changes).
3. **Smooth, reliable two-player sync** with graceful reconnection.

Everything else is polish layered on those three foundations. Please raise any ambiguity in this document with the project owner **before** Phase 1 begins.

*— End of document —*
