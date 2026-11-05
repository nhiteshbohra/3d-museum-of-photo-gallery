# Current application and UI review

Historical pavilion snapshot. Superseded by the later
[Vite/source review](CURRENT_STATE_VITE_2026-10-30.md) at HEAD `2f4ebd1`.
Do not apply its current-feature, test-pass or path claims to the replacement src app.

Reviewed 30 October 2026 at Git HEAD `f7cb938`. Purpose: understand the user's newer
implementation and refresh documentation before the next task. No runtime fixes,
dependency changes, asset changes, commits or pushes were made.

## What the app is now

The Pavilion of Rooms replaces the earlier two-storey residence. It has seven named
salons: Grand Rotunda, Fireside Winter Salon, Music Conservatory, Library Reading Nook,
Monolith Sculpture Hall, Starlight Glass Orangery and The Promise Alcove. Walking uses
one Y=0 plane; there are no stairs or upper rooms. The front courtyard remains.

`gallery40.js` defines 40 frames; the dedication plaque adds one interactive mesh.
`config.js` defines 40 customization slots. `environment.js` builds geometry, materials,
walls, furniture, lights, room spawns and eight interaction points. Its `createWall()`
registers the same wall as a camera obstacle and a 2D movement collider.

## UI and user flow

| Screen | Current controls and behavior |
|---|---|
| Welcome | Green/dark translucent overlay, serif title, partner names, dedication copy, Maya/Ethan/Together selection cards, loading status and Come inside button |
| Museum | Full-screen WebGL, title/music button, top-right role/presence pill and camera button, salon minimap, Ethan name tag, contextual E prompt, bottom character/action/dance controls |
| Movement | WASD/arrows, Shift run, mouse drag orbit, touch joystick and touch orbit, Tab/1/2/3 selection, click character/artwork |
| Artwork | Photo X of 40, Previous/Next buttons and arrow keys, artwork/caption/signature, Back/Close/Escape |
| Photo | Polaroid-style canvas preview with names/date/title, PNG download and Close; modal presence verified, complete image quality/download not certified |
| Studio | Separate customer selector/New/Delete, Experience, Dedication, 40 Artworks and Share/Export tabs; upload/remove, captions, explicit save, preview, copy link and JSON backup/import |

The character cards select the two existing models or both; they are not an alternate
model/outfit picker. Sitting is procedural with immediate anchor placement; ankle
rotation and head tracking do not establish full foot IK. The current scene has no bed
interaction even though lying helpers remain exported. Piano plays a generated chord,
and fireplace toggles a flickering light. Sample video is reference-only; no runtime cinema.

## Data and networking

- Native ESM; Three.js/addons are local under `js/vendor/`. Google Fonts and Studio's
  Tailwind script remain external, so the full experience is not entirely offline.
- `server.js` uses Node HTTP plus `ws` on default port 8080. `server_sync.py` is the
  older separate 8081 relay. No build step, frontend framework or server database exists.
- `network.js` sends JSON transforms/state about every 33 ms over WebSocket and
  BroadcastChannel. Remote transforms use exponential damping. Reconnect retries exist.
- The browser joins fixed room `our-home`; roles are client-selected, not locked by the
  server. Private invite rooms, identity/capacity validation and authoritative seat locks
  are not implemented. Local interaction callers do not call `broadcastInteraction()`.
- Recipient storage key is `3d_museum_config_v3_pavilion`. Studio keys remain
  `museum_customers_store_v1` / `museum_active_customer_id`. `#cfg=` takes precedence;
  images/config travel in the link. This is not durable server-hosted customer content.

## Checks performed in this review

| Check | Result and limits |
|---|---|
| Git/source baseline | Working tree clean before review; latest three commits describe single-floor/cache/stair removal |
| Syntax | `node --check` passed all 13 first-party JS modules plus `server.js` |
| `npm test` | Passed the config validation/escaping/image/storage checks; not a full gameplay suite |
| Live entry | Existing localhost:8080 served current pavilion; avatars loaded and entry worked in Chrome |
| Runtime inventory | 7 rooms, 40 artworks, 41 interactive meshes, 40 defaults and 8 interaction points |
| Carousel | Opened first artwork; Next changed counter from Photo 1 of 40 to Photo 2 of 40 |
| Photo | Preview modal and PNG data URL created; closing exposed an unexpectedly opened artwork overlay |
| Studio | All 40 slot cards rendered in the Gallery tab |
| Doorway probe | With other overlays closed, avatar at [0,0,4.6] attempting courtyard exit stopped at Z=4.945 before portal Z=5.5 |
| Network | WebSocket connected. Ethan's observed positions matched within about 0.00005 m across contexts; Maya differed in the shared room. Other existing peers were present, so this is not an isolated sync pass |
| Console | No uncaught page exceptions during this smoke review; this does not certify all resource/console paths |
| Rendering sample | 45 scene lights, 220 draw calls and 37,526 triangles at one captured viewpoint; no sustained FPS/GPU-memory benchmark |

Fresh screenshots and observations are in [context-2026-10-30](context-2026-10-30/).
The supporting script is `scratch/context_review_20261030.py`; browser storage is
isolated, but the server room is shared with other clients. Existing screenshots/tests
were preserved. Mobile capture is a narrow viewport, not a physical touch-device pass.

## Open findings, not fixed in this task

See [bug ledger](../tracking/BUGS.md). Priorities include lintel collision, photo/HUD
input isolation, role/room validation, static-server hardening, plaque config mismatch,
old reset-storage key, and obsolete tests. Teleport screenshots do not prove all rooms
are reachable by walking. Existing historical claims of complete IK, binary/Hermite
sync, zero dependencies, private rooms and 100% feature coverage exceed the implementation.

## Review coverage and documentation handling

Traced every first-party runtime module, Node/Python servers, both HTML entry points,
stylesheet, registries/defaults, current test scripts and documentation history. Third-party
vendor implementation, `node_modules`, binary asset internals and every scratch migration
script were not line-by-line audited. The old specs/chaos review remain reference plans;
their embedded prompts are not new implementation authorization. No external reference
site, Safari/Firefox or physical mobile behavior was verified.

Current architecture, map, TODO, progress, decision/session records and guide/index notes
now distinguish current behavior from historical plans. Every subsequent material decision
belongs in `docs/tracking/DECISIONS.md`. `.gitignore` currently excludes docs/tests/review
artifacts; all documentation changes remain local under that existing preference.
