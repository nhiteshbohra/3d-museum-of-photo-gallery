# Character and home repair — 30 October 2026

The reported shared movement and floor penetration were reproduced and fixed. This is
a repaired local prototype; the complete product specification remains unfinished.

## Findings

| Severity | Location | Defect | Result |
|---|---|---|---|
| High | controls.js | Selection still moved/animated the shared parent | Independent controller, state, speed, floor, camera and proximity |
| High | characters.js | Donor skeleton axes differ, including 180-degree leg bind rotations | All-joint bind-space retargeting, preserved offsets, refreshed skinned bounds |
| High | controls.js / environment.js | Stair descent blocked, upper landing deck missing | Ramp clearance, descent limits and landing geometry corrected |
| High | characters.js / main.js | Furniture actions moved/posed both avatars and guessed return positions | Selected actions, actual pelvis anchors and safe return positions |
| High | studio.js / ui.js | Imported strings interpolated into HTML | Escaped text/attributes and raster image validation |
| High | config.js | Malformed plaque/artwork input crashed initialization | Schema-shaped merge at input boundaries |
| Medium | environment.js | Kitchen opening blocked; major furniture lacked correct colliders | Doorway split, sofa/table/bench bounds and safe spawns |
| Medium | controls.js | Resting camera could show a dark wall/bed | Pelvis framing and clearer front camera angle |
| Medium | studio.js / ui.js / audio.js | False save success, incorrect subdirectory links, duplicate timer | Error reporting, relative URLs, idempotent audio start |
| Medium | style.css / controls.js | Narrow HUD overflow, no touch look | Responsive HUD, touch look and contextual mobile action |

Visual changes: sage/linen/walnut/brass palette, cushions, plants, furniture detail,
softer textures with correct color space, welcome screen, character identity, focus
outlines and reduced-motion support. Existing stylized models were retained.

## Verification

Baseline and final: every `js/*.js` module passes `node --check`. There was no package
build/lint/test pipeline. Historical PASS claims were not accepted as a baseline.

Final runnable checks both pass:

```text
node tests/config-check.mjs
python project-log/check_runtime.py
```

The runtime check needs the server (`python -m http.server 8080 --bind 127.0.0.1`)
and the preinstalled Python Playwright/Chrome. It uses isolated browser storage.

Verified actual keyboard switching/movement; stationary unselected avatar; grounded idle
and 60 walking animation samples per model; stairs up/down; seat pelvis alignment;
horizontal lying; safe stand; every existing interaction handler (all seats, both bed
anchors, piano chord, fireplace, plaque, artwork and balcony); local dance start/stop;
invalid config recovery; imported-text injection resistance; Studio save/reload and
share link; narrow touch-enabled HUD. No uncaught JavaScript exceptions occurred.

Fresh skin bounds put idle feet about 0.02 m above the floor and heights around 1.67 /
1.78 m. A sampled view rendered 157 calls / 19,971 triangles. This is not an FPS benchmark.

Screenshots visually reviewed: `initial-home.png`, `living.png`, `bedroom.png`, `mobile.png`,
`studio.png`, `seated-fixed.png`, `lying.png`. Early screenshots record failed iterations.

## Scope and remaining work

Reviewed the client modules, both HTML entry points, stylesheet, bundled skeleton
metadata, context files and applicable spec/playbook sections. No source deletion,
dependency installation, commit or push. Source files were already untracked; `.git`
is read-only here and audit branch creation failed, so no tracked diff summary is available.

The native/browser UI bridge was unavailable. The installed Chrome test runner rendered
the app and screenshots were inspected. The loopback server remains running on port 8080.

Handler tests do not prove every possible approach route to every furniture anchor.
Physical touch, Safari/Firefox, audible quality and sustained hardware FPS need hands-on
checks. Seat foot support is simplified; stairs use a ramp without foot IK; small props
do not all have colliders. Runtime still depends on existing CDNs.

Still absent: online rooms/ownership/sync/reconnect, chat/voice, shared-action invitations,
navmesh walking, model picker, photo mode/minimap, day/night, doors/light switches,
baked lighting and spatial room ambience. Piano plays a generated chord rather than an
individual keyboard. Local dance is not remote synchronization.

Next manual pass: explore every room on target hardware, approach furniture from several
sides, orbit near walls, use joystick and touch look together, and listen to piano/mute.
Root TODO and context documents were updated to reflect these limits.
