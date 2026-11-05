# Current source and UI: Vite museum

Reviewed 30 October 2026 at HEAD `2f4ebd1`, including the user's existing uncommitted
src/main.js changes. Scope: understand the updated implementation, refresh Markdown,
then wait for the next task. No application code, dependency, ignore rule, asset or
existing test was edited. No commit/push was made.

## Active application

`index.html` loads `/src/main.js`; Vite resolves its CSS and npm Three.js imports.
The UI says OUR MUSEUM / A Sanctuary for Maya & Ethan. The user's current diff removes
the language picker and changes the footer to Crafted by Hitesh Bohra. It is preserved.

This is a first-person lobby and gallery system. Door navigation replaces the active
room, rather than walking through the former seven-salon/40-frame pavilion. The lobby
has elevated platforms, two seven-step stairs, railings, benches, plants, a welcome
board and six category portals.

| Theme | Source content |
|---|---|
| Fireside Winter Memories | Four generated illustrations and narrative |
| Music & Classical Melodies | Four generated illustrations and narrative |
| The Library & Reading Nook | Four generated illustrations and narrative |
| Masterpiece Paris Romance | Four generated illustrations and narrative |
| The Glass Orangery | Four generated illustrations and narrative |
| The Secret Promise Alcove | Four generated illustrations and narrative |

The titles describe content. They do not establish physical fireplaces, piano, library
systems or secret passages. The six records use the same gallery constructor. Galleries
show a central title/thumbnail column, up to four east-wall images, west-wall narrative,
recent trail and previous/lobby/related navigation. The source also supports optional video.

## UI and controls

| State | Current behavior |
|---|---|
| Welcome/unlocked | Blurred scene, dark overlay, title/subtitle, Click to play, controls and footer |
| Playing | Pointer-lock first-person camera, crosshair and contextual clickable/loading cursor |
| Movement | WASD/arrows, Shift sprint, Space jump; Escape unlocks |
| Interaction | Click nearby portals/pickables, maximum interaction range 2.25 m |
| Navigation | `?exhibit=` / `?language=`, history, recent-trail board and random exhibit action |
| Narrow viewport | Overlay wraps; no active touch joystick/mobile camera flow |

There is no active avatar selector, Maya/Ethan third-person view, Studio, photo tool,
carousel, minimap or client WebSocket connection. `src/avatars/characters.js` retains
the independent controllers, retargeted animation, sit/lie/dance helpers, but current
main/engine imports do not initialize them. The server retains a relay independently.

## Data, rendering and server

- Built-in themes generate 24 canvas PNG illustrations; customer upload/edit UI is absent.
- Unknown titles load Wikipedia/Wikimedia text, thumbnail and media, then related titles
  separately. `main.js` patches up to six related portals after the initial room load.
- Visit trail uses `linkwalk:trail:v1`, stores 30 entries and displays the last three.
- Language URL selection exists; persistence fails because declared
  `language_key_from_local_storage` is not the `LANGUAGE_PERSIST_KEY` used by caught helpers.
- Wiki memory caches are language-partitioned. Persisted
  `linkwalk:galleryCache:v2:<language>` entries have 24-hour load-time filtering and an
  80-entry persistence cap. Memory lacks comparable bounds; media HEAD checks still run
  on revisit. This does not establish offline operation.
- Room replacement disposes old resources; deferred texture work checks cancellation.
- Installed dependencies: Three.js 0.182.0, Vite 7.3.7, ws 8.22.0.
- `npm run dev` is Vite. `npm run build` writes dist; `npm run preview` previews it.
  `npm start` serves dist first per file, then repository files, with a retained ws relay.
  Build before using Node serving; raw source imports need Vite. Existing dist may lag edits.

## Verification performed

| Check | Result / limit |
|---|---|
| First-party syntax | All 11 src JavaScript files plus server.js and vite.config.js pass node --check |
| Production build | Passed `npm run build -- --outDir scratch/context-refresh-vite/build`; existing dist preserved |
| Legacy config test | Fails ENOENT for removed js/config.js; not an active config regression |
| npm tests | No test script currently declared; not reported as passing |
| Fresh Chrome source entry | Isolated Vite server on 127.0.0.1:5175; overlay/canvas observed |
| Pointer lock | Clicking overlay locked the scene canvas |
| Movement smoke | W changed rendered pixels; no numeric position/debug-API assertion available |
| Six local themes | Each query opened with visible canvas and pointer lock; no uncaught page errors |
| Narrow capture | 390 px viewport, 390 px document width; not physical mobile testing |
| Language storage | Expected key remained absent, consistent with source helper mismatch |

Evidence: [screenshots and observations](context-vite-2026-10-30/). Welcome, lobby,
gallery-1 and narrow-welcome screenshots were visually inspected. Other theme captures
are retained. The read-only observation helper was created under ignored scratch before
the user's subsequent explicit no-code-edit reminder; no existing code was changed.

The native browser bridge was unavailable; installed Chrome/Playwright produced captures.
No external encyclopedia exhibit, complete portal route, video playback, physical phone,
Safari/Firefox, sustained GPU performance or multiplayer behavior was certified.

## Findings recorded, not fixed

See [bugs](../tracking/BUGS.md) and [TODO](../tracking/TODO.md). Source concerns include
language persistence, unguarded trail writes, held keys on focus loss, uncapped frame delta,
limited error feedback, media HEAD cancellation/timeouts and server safety. These are not
new implementation tasks. Previous PAV findings must not be assumed reproduced here.

Legacy config/Studio/multiplayer checks target removed modules, pages and debug APIs.
The current verify_museum helper has limited overlay/canvas assertions; its title does
not prove all movement or content. Multiplayer helpers cannot certify this active client.

## Coverage and documentation

The review covered all first-party src modules in full, CSS, entry HTML, server/Vite/package
configuration, lock versions, QA scripts, legacy tests and the Markdown set. Source reading
was divided using the existing playbook. Third-party node_modules internals, generated
bundles, binary asset internals and historical scratch code were not line-by-line audited.

Updated map/architecture, index, guide/spec notes, TODO, bugs, test matrix, progress,
blockers, performance note, decision/session records and QA tool documentation. Historical
decisions/reports remain; new entries supersede old current-state claims. Documentation
is ignored by the existing Git rules and remains local. Future tasks should re-read touched
modules and append material decisions with context, alternatives/reason and evidence.
