# AGENT TEAM PLAYBOOK

> Context note, 30 October 2026: use [current architecture](../architecture/ARCHITECTURE.md),
> [review](../reports/CURRENT_STATE_VITE_2026-10-30.md) and the user's current task to choose
> scope. The active app is now Vite/src first-person rooms, not the earlier pavilion or
> house. The latest task is context/documentation only. No code edits until explicit user
> permission; the continuous implementation loop below is not current authorization.
### Instructions for the Lead Agent: Run a Senior Developer Team of Sub-Agents to Build, Test, Fix and Improve "Our Home"

| | |
|---|---|
| **Companion document** | `OUR_HOME_3D_PROJECT_SPEC.md` (the source of truth for *what* to build) |
| **This document** | *How* the agent team works: roles, loop, verification, bug handling, feature ideation |
| **Audience** | The Lead Agent (you), and every sub-agent you spawn |
| **Existing code** | The `js.zip` prototype (Three.js, one room, Maya and Ethan, procedural piano) |

---

## 0. READ THIS FIRST

You are the **Lead Agent (Engineering Director)**. You do not write most of the code yourself. You **spawn sub-agents**, each playing a specific senior role, give them precise tasks, collect their results, verify the results **on a live running screen**, and keep the project moving through one continuous loop:

```
   PLAN → BUILD → RUN LIVE → TEST EVERY FEATURE → FIND PROBLEMS → FIX → RE-TEST
     ▲                                                                    │
     └────────── IDEAS: think of new features, add them, repeat ◀─────────┘
```

**Non-negotiable rules**

1. **Nothing is "done" until you have seen it work on the live screen.** Reading code and saying "this should work" does not count. Run the app, interact with it, take screenshots, and look at them.
2. **Test every feature, every time.** After each change, re-test the changed feature **and** everything that could have broken because of it (regression).
3. **Fix problems immediately.** Do not stack up broken things. A failing feature blocks new work in the same area.
4. **Keep thinking of improvements.** After each cycle, the team proposes new features or polish, ranks them, and builds the best ones.
5. **Write everything down** in the project log files (Section 9). A future agent with no memory must be able to continue exactly where you stopped.
6. **Be honest.** If something does not work, say so in the log. Never mark a test as passed unless you actually ran it.
7. **Follow the spec.** `OUR_HOME_3D_PROJECT_SPEC.md` defines the product. You may add to it, but never silently contradict it. Record any deviation in `DECISIONS.md`.

---

## 1. THE TEAM (SUB-AGENTS TO SPAWN)

Spawn each role as a separate sub-agent with a clear brief. Roles can run **in parallel** when their work does not overlap. Every sub-agent must act like a **senior engineer**: pragmatic, careful, test-minded, and willing to push back on a bad plan.

| # | Sub-agent | Seniority | Owns | Must deliver |
|---|---|---|---|---|
| 1 | **Tech Lead / Architect** | Principal | Architecture, folder structure, code standards, tech decisions, merging order | Working skeleton, module boundaries, `DECISIONS.md`, code review verdicts |
| 2 | **Gameplay & Movement Engineer** | Senior | Locomotion, collision, stairs, camera rig, state machine | Walking that feels real, stairs without glitches, no wall clipping |
| 3 | **Animation & Character Engineer** | Senior | Character loading, animation library, retargeting, sit/lie/emote clips, click-to-select, ownership | Both characters controllable, smooth cross-fades, no foot sliding |
| 4 | **Interaction Systems Engineer** | Senior | Interaction points, sit/lie/piano/doors/lamps, shared actions | Data-driven interactions that work on every object |
| 5 | **Environment / 3D Engineer** | Senior | House geometry (procedural or GLB), furniture, lighting, day/night, colliders and navmesh | Beautiful two-floor decorated house within performance budget |
| 6 | **Network / Backend Engineer** | Senior | Server, rooms, invite links, sync, interpolation, reconnection, persistence | Two browsers see each other move smoothly in real time |
| 7 | **UI/UX Engineer** | Senior | HUD, lobby, menus, chat, emote wheel, minimap, mobile UI, design system | Professional, elegant, responsive UI matching the spec |
| 8 | **Audio Engineer** | Mid-Senior | Music, ambience, footsteps, playable piano, mixer | Rich spatial audio, no autoplay errors |
| 9 | **QA Lead (Live Tester)** | Senior | **Runs the app live**, executes the feature test matrix, writes bug reports with screenshots | `TEST_REPORT.md`, `BUGS.md`, pass/fail per feature |
| 10 | **Performance Engineer** | Senior | FPS, draw calls, memory, load time, asset compression | Budget reports vs. spec Section 20 |
| 11 | **Product & Creative Director** | Senior | Looks at the live screen as a *couple* would, judges beauty, emotion, polish; **proposes new features** | `IDEAS.md` ranked list, polish requests |
| 12 | **Security & Reliability Reviewer** | Senior | Input validation, uploads, rate limits, error handling, reconnect edge cases | Security review notes, fixes list |

**Team size rule:** You do not have to run all 12 at once. Start with 1, 2, 3, 5, 9 (the core path to something walkable). Add the others when their area becomes relevant. Never let QA (9) go idle for long: testing runs continuously beside development.

### 1.1 How to brief a sub-agent

Every task you hand to a sub-agent must contain:

```
ROLE:        who they are (from the table above)
GOAL:        one clear outcome, in one sentence
CONTEXT:     which spec sections apply (e.g. "Spec §9.4 Stairs"), which files exist
TASK LIST:   numbered, concrete steps
ACCEPTANCE:  how we will know it works (observable on screen)
CONSTRAINTS: performance budget, naming rules, do-not-touch files
OUTPUT:      files changed, a short report, how to run/verify it
```

### 1.2 What every sub-agent report must contain

```
WHAT I DID:        short list
FILES CHANGED:     paths
HOW TO VERIFY:     exact steps to see it on screen
KNOWN ISSUES:      anything incomplete or suspicious (be honest)
SUGGESTIONS:       ideas noticed while working
```

If a report says "works" without "how to verify", send it back.

---

## 2. THE MASTER LOOP

Run this loop **continuously**. One pass is a **Cycle**. Number your cycles (Cycle 1, Cycle 2, ...) in `PROGRESS.md`.

```
┌───────────────────────────────────────────────────────────────────┐
│ STEP 1  PLAN        Pick the next slice of work (Section 3)       │
│ STEP 2  ASSIGN      Spawn / brief the right sub-agents            │
│ STEP 3  BUILD       Sub-agents implement; Tech Lead reviews       │
│ STEP 4  RUN LIVE    Start the app. See it on screen. (Section 4)  │
│ STEP 5  TEST        QA runs the full matrix (Section 5)           │
│ STEP 6  TRIAGE      Log every problem (Section 6)                 │
│ STEP 7  FIX         Fix bugs, highest severity first              │
│ STEP 8  RE-TEST     Re-run failed tests + regression              │
│ STEP 9  REVIEW      Creative Director reviews the live screen     │
│ STEP 10 IDEATE      Team proposes new features (Section 7)        │
│ STEP 11 RECORD      Update logs (Section 9), commit               │
│ STEP 12 REPEAT      Go to Step 1                                  │
└───────────────────────────────────────────────────────────────────┘
```

**Loop discipline**

- **Never skip Step 4 and 5.** The most common failure is building several things and never running them.
- **Small cycles beat big ones.** A cycle should add one coherent slice (for example "stairs + floor switching"), not half the project.
- **A cycle is only complete** when its Exit Check (Section 3) is satisfied **on the live screen**, or when blocked items are logged with a clear reason.
- **If the same bug fails to be fixed in 3 attempts,** stop, have the Tech Lead and one other senior sub-agent diagnose the root cause together, and write the finding in `DECISIONS.md` before trying again. Do not keep applying the same kind of patch.

---

## 3. BUILD ORDER (WHAT TO WORK ON, IN ORDER)

Follow the phases in the spec (Section 25). Each slice below has an **Exit Check** that must be satisfied live before moving on.

| Slice | Contents | Lead sub-agents | Exit Check (verify live) |
|---|---|---|---|
| **S0 Skeleton** | Vite + TypeScript project, port prototype files into the new structure, local dev server, loading screen working | Tech Lead, UI | App opens in browser, loading bar works, no console errors |
| **S1 Grey-box house** | Two floors, rooms, staircase, correct proportions, simple colliders | Environment, Gameplay | You can see the whole house from a debug fly-camera; stairs look right |
| **S2 Walking** | Input, camera rig, locomotion, collision, ground snapping | Gameplay | Character walks in all rooms, slides along walls, never falls through floor |
| **S3 Stairs** | Ramp collider, floor detection, stair animation, camera under ceiling | Gameplay, Animation | Walk up and down 20 times, run, reverse mid-stair: no glitch, no stuck, correct floor |
| **S4 Two characters** | Independent characters, click-to-select, ring and name tag, solo-mode switching | Animation | Click each character: control switches, camera glides, other one stays idle |
| **S5 Interactions** | Interaction points, HUD prompt, sit/stand, lie, doors, lamps | Interaction | Sit on every seat, lie on bed, toggle every lamp and door |
| **S6 Real animations** | Authored sit/lie/activity clips, idle variations, run, turns | Animation | No T-pose, no sliding feet, no snapping between states |
| **S7 Networking** | Server, rooms, invite link, sync, interpolation, reconnect | Network | Two browser windows: move one, the other sees smooth motion |
| **S8 Shared actions** | Dance together, hug, sit together, hold hands, invites | Interaction, Network | Invite, accept, both play in sync; cancel works from either side |
| **S9 Final environment** | Decorated rooms, materials, lighting, day/night, garden, balcony | Environment | Every room looks beautiful and decorated; no empty areas |
| **S10 UI polish** | Lobby, HUD, chat, emotes, minimap, settings, mobile layout | UI | Every screen in spec §14.2 reviewed at desktop and phone sizes |
| **S11 Audio** | Music zones, footsteps, ambience, playable piano | Audio | Hear footsteps per surface, piano notes reach the partner window |
| **S12 Memory features** | Gallery, plaque, memory wall, photo mode | UI, Environment | Add a memory in one window, see it appear in the other |
| **S13 Performance** | Compression, culling, quality presets | Performance | Meets spec §20 budgets; Low preset runs smoothly |
| **S14 Hardening** | Security review, error states, soak test | Security, QA | 30-minute two-player session, no desync, no memory growth |
| **S15 Continuous improvement** | Ideas backlog (Section 7) | All | Ongoing |

**Placeholder rule:** if a real asset (final house model, authored animation) is not available yet, build with a **good procedural stand-in** so the feature can still be tested live. Log the placeholder in `PROGRESS.md` under "Placeholders to replace". Never leave a feature untestable just because art is missing.

---

## 4. LIVE-SCREEN VERIFICATION PROTOCOL (MOST IMPORTANT SECTION)

"Check in the live screen" means the agent team **actually runs the app and looks at it**. Do this every cycle.

### 4.1 Start the app

1. Install dependencies and start the dev server (and the game server once it exists).
2. Open the app in a **real browser engine**. Preferred: **Playwright** driving Chromium (also run WebKit and Firefox at least once per slice). Use a **headed** browser when a GPU window is available; otherwise headless with software WebGL (`--use-gl=swiftshader` / `--enable-unsafe-swiftshader`) and accept lower FPS.
3. Always capture the **browser console**. Any `error` is a bug. Warnings must be reviewed.

### 4.2 Look at the screen

For every feature you test:

1. **Drive it** with real input (keyboard presses, mouse clicks, touch emulation), not by calling internal functions.
2. **Take screenshots** before, during and after. Save in `qa/screenshots/<cycle>/<feature>_<step>.png`.
3. **Actually view the screenshots** (open the image files and examine them). Describe what you see in the test report: is the character where expected, is the pose correct, is the UI readable, is anything clipped, stretched, black, or missing?
4. For motion (walking, stairs, sitting, dancing), capture a **sequence of frames** (for example one every 150 ms for 3 s) and inspect them for foot sliding, popping, T-poses and clipping.
5. Record short **video** when possible (Playwright `recordVideo`) for movement bugs that stills cannot show.
6. Read **numeric state** too: expose a debug object (`window.__debug`) with character positions, current state, floor index, FPS, draw calls, ping. Compare numbers against expectations (for example, "after stairs, `floorIndex === 1` and `y ≈ 3.2`").

### 4.3 Required debug tooling (build this early, in S0–S2)

The Tech Lead must ensure these exist, because they make live testing possible:

| Tool | Purpose |
|---|---|
| `window.__debug` | State inspector: positions, state machine, interaction occupancy, FPS, tris, draw calls, memory, network stats |
| `?debug=1` URL flag | Shows an on-screen debug panel, collider wireframes, navmesh, interaction radii, axes |
| Fly camera toggle | See the whole house from outside, check proportions and decor |
| Teleport / spawn commands | `__debug.teleport('maya','upstairs_landing')` so tests can reach any room fast |
| Time control | Set time of day instantly to test lighting |
| Fake latency / packet loss | Simulate bad networks for multiplayer testing |
| Seeded determinism | Option to fix randomness (idle variations) so screenshots can be compared |
| Screenshot helper | One call to capture canvas + UI at a named checkpoint |

### 4.4 Two-player live test setup

From S7 onward, every cycle includes a **two-window test**:

1. Launch two independent browser contexts (two Playwright contexts, or two windows).
2. Window A creates a room and copies the invite link. Window B joins through it.
3. Perform actions in A, **screenshot both windows at the same moment**, and verify B shows the same thing (position, pose, seat, lamp state, chat, emote).
4. Repeat with roles swapped.
5. Run the same with simulated 150 ms latency and 5 percent packet loss.
6. Kill B's connection for 10 seconds and restore it: B must resume in the correct state.

### 4.5 Mobile live test

Each slice that touches input or UI is also tested with **mobile emulation** (for example iPhone 14 and a mid-range Android viewport, touch enabled, device pixel ratio 2–3), in both portrait and landscape: joystick, camera drag, buttons, safe areas, readable text, no overlapping elements.

### 4.6 What counts as "seen working"

A feature is **seen working** only if the test report contains:

- the exact steps taken,
- at least one screenshot (or frame sequence) that was actually examined,
- the observed result described in words,
- the console log status (clean, or listed errors),
- the debug values that confirm it (when applicable).

---

## 5. THE FEATURE TEST MATRIX (QA LEAD RUNS THIS EVERY CYCLE)

QA maintains `TEST_MATRIX.md`. After any change, run **all rows that exist**; at minimum run the rows for the changed area plus a **smoke test** of the entire path (load, enter, walk, sit, stairs, second character).

Result values: **PASS**, **FAIL**, **PARTIAL**, **BLOCKED**, **NOT BUILT**. Never leave blank.

### 5.1 Smoke test (run after every build, takes under 3 minutes)

| # | Check |
|---|---|
| 1 | App loads, no console errors, loading bar reaches 100 percent |
| 2 | Enter button works, intro finishes or can be skipped |
| 3 | Character walks with WASD, camera follows |
| 4 | Character walks into a wall: stops or slides, does not pass through |
| 5 | Character climbs stairs to the upper floor and returns |
| 6 | Character sits on a chair and stands up |
| 7 | Click second character: control switches |
| 8 | HUD prompts appear and disappear correctly |
| 9 | FPS above the target for the current device preset |
| 10 | (After S7) a second window sees the first character move |

### 5.2 Full matrix (grouped; expand rows as features are built)

**A. Loading and start**
- Progress bar matches real asset loading; start button disabled until ready.
- Slow network (throttled): UI stays responsive; no blank screen.
- WebGL unsupported: friendly error page.
- Audio starts only after the first user gesture; no autoplay errors.

**B. Movement**
- Walk, run, stop, start, change direction, diagonal movement.
- Speed matches constants; animation speed matches movement (no sliding).
- Turning has weight; 180-degree turn looks natural.
- Corners: no sticking; sliding along walls works.
- Furniture collision on every large piece.
- Cannot leave the house bounds; cannot fall through floors.
- Walk in all rooms on both floors.
- Click-to-walk: reaches target, handles stairs, cancels on input.

**C. Stairs**
- Up and down at walk speed, run speed (capped), reverse mid-stair.
- Feet land on steps (visual check using frame sequence).
- Floor index flips at the right spot; minimap and ambience follow.
- Camera never shows the inside of the ceiling or floor.
- Two characters on the stairs at the same time: no blocking or glitches.
- Headroom: character head never intersects the stair underside.

**D. Camera**
- Orbit, zoom, limits; smooth damping.
- Walls and ceilings fade or clamp when they would block the view.
- Tight rooms: camera pulls in without clipping through walls.
- Photo mode: free camera, UI hidden, capture works.

**E. Characters**
- Both load, correct scale (about 1.7 m), correct facing, textures present.
- Idle variations play; breathing visible.
- Click-to-select works from any distance and angle; ring and name tag show on the active one.
- Switching characters mid-walk, mid-sit, mid-stairs: no teleporting, no stuck states.
- Every selectable model passes the model checklist.

**F. Interactions (one row per interaction point, built from the scene data)**
- HUD prompt appears at the right distance and direction.
- Character aligns to the seat, with hips on the cushion and legs not through tables.
- Enter animation, loop and exit animation all play.
- Exit places the character on a valid floor spot.
- Occupied points show as unavailable; the next free one is offered.
- Lamps, doors, fireplace, TV, fridge, piano, books, plants, mirror each work.
- Cancel works through movement, Q, and the mobile Stand button.

**G. Shared actions**
- Invite pops up on the other window; accept and decline both work; 10 s timeout works.
- Dance together is synchronised within 100 ms (check by screenshotting both windows at a marked time).
- Hug, hold hands, sit together, lie together, toast.
- Either player can cancel; both return to normal control.
- Partner disconnects mid-action: action ends cleanly.

**H. Multiplayer**
- Create room, invite link, join, QR, copy and share buttons.
- Position, rotation and animation sync smoothly (no teleporting, no rubber-banding) at 0, 100, 200 and 400 ms latency.
- Reconnection restores state, including seat and room objects.
- Third client is rejected with a clear message.
- Server restart: room recovers from persistence.
- Rate limiting works; malformed messages are dropped, not crashing the server.

**I. Communication**
- Chat send, receive, speech bubble, unread indicator, long text, emoji, HTML injection attempt (must be escaped).
- Emote wheel: each emote plays and shows on the partner's screen.
- Voice: connect, mute, speaking indicator, denied microphone permission handled.

**J. UI**
- Every screen in spec §14.2: layout, spacing, typography, contrast, no overflow.
- Desktop at 1280, 1440, 1920 widths; tablet; phone portrait and landscape.
- Keyboard focus visible; Tab order sensible; Escape closes modals.
- No overlapping elements at any size; safe areas respected on phones.
- Loading, empty, error and disconnected states for every panel.
- Animations smooth; reduced-motion respected.

**K. Environment and visuals**
- Every room decorated, nothing floating, nothing intersecting, no z-fighting, no missing textures.
- Lighting reads well in every room; lamps on and off look right.
- Day/night cycle: dawn, noon, dusk, night all look good; window light matches.
- Gallery artworks show images; fallback art shows when no image.
- Garden and balcony views look complete from all angles the player can reach.

**L. Audio**
- Music crossfades between rooms; ambience loops without clicks.
- Footsteps match the surface and speed; partner's footsteps are positional.
- Piano notes: local and remote, no stuck notes after disconnect.
- Volume sliders and mute work.

**M. Memory features**
- Upload image (JPEG, PNG, WebP, large, wrong type, HEIC on iOS): correct handling.
- Memory appears live in the partner's window; persists after reload.
- Artwork overlay: next, previous, swipe, close.
- Photo mode: filters, timer, capture quality, save, pin to wall.

**N. Performance**
- FPS, frame time, draw calls, triangles, texture memory against spec §20.
- Low, Medium, High presets each behave as specified.
- 30-minute soak: memory stays flat, no FPS decay.
- Load time on throttled 4G.

**O. Security and robustness**
- Chat and caption XSS attempts, oversized messages, spam.
- Upload of non-image or oversized files.
- Direct URL guessing of room IDs.
- Console errors during every scenario above: zero tolerated.

---

## 6. BUG HANDLING (FIND → LOG → FIX → VERIFY)

### 6.1 Bug report format (QA writes this in `BUGS.md`)

```
BUG-###  [Severity] [Area]  Short title
Found in:   Cycle N, build/commit
Steps:      1. ...  2. ...  3. ...
Expected:   ...
Actual:     ...
Evidence:   screenshot/video path(s), console output, __debug values
Frequency:  always / sometimes (x of y tries)
Owner:      sub-agent role
Status:     OPEN → IN PROGRESS → FIXED (awaiting re-test) → VERIFIED → CLOSED
```

### 6.2 Severity

| Level | Meaning | Rule |
|---|---|---|
| **S1 Blocker** | Crash, cannot enter, character stuck permanently, falls out of the world, desync that never recovers, data loss | Stop everything else and fix now |
| **S2 Major** | Feature does not work, obvious visual break (T-pose, clipping through floor), UI unusable on a supported device | Fix before the cycle ends |
| **S3 Minor** | Small visual glitch, awkward but working behaviour, polish issue | Fix this cycle or the next; never forget it |
| **S4 Trivial** | Cosmetic nitpick | Batch with other work |

### 6.3 Fix procedure

1. **Reproduce first** on the live screen. If you cannot reproduce it, say so and gather more evidence; do not guess.
2. **Find the root cause**, not the symptom. Write one sentence on the cause in the bug entry.
3. **Fix** with the smallest correct change. Avoid unrelated refactors in the same commit.
4. **Add a regression test** (unit, e2e, or a row in the test matrix) so it cannot return silently.
5. **Re-run live**: the original steps, then the surrounding feature tests, then the smoke test.
6. **Only QA can mark a bug VERIFIED**, and only after seeing the fix on screen. The developer who fixed it cannot close it.
7. Mark `CLOSED` with the commit and the verifying screenshot path.

### 6.4 Common problems to hunt on purpose (do not wait for them to appear)

- Character sinks into or floats above the floor on stairs; pops when the ground height changes.
- Character gets stuck between furniture and wall or in the stair corner.
- Seated character legs go through the table; hips not on the cushion; wrong facing.
- Stand-up places the character inside furniture or outside the house.
- Feet sliding at low speed or during turns; animation reset flicker on state change.
- T-pose for one frame after loading or switching clips.
- Camera clips through walls, shows the ceiling's backface, or jitters while following.
- Remote character jitters, teleports, or slides after a lag spike.
- Interaction prompt flickers between two nearby points.
- Two players grab the same seat; both think they own it.
- UI overlaps the joystick or buttons on small phones; text unreadable over bright scenes.
- Memory growth over time (geometries, textures, mixers not disposed).
- Audio plays twice, or never after tab switch; piano notes stuck.
- Anything that works only in Chrome and not in Safari or Firefox.

---

## 7. CONTINUOUS IMPROVEMENT: THINK OF NEW FEATURES AND ADD THEM

The project does not stop when the spec is complete. After every cycle (and always after a slice's Exit Check), run an **Ideation Round**.

### 7.1 How to ideate

1. **Creative Director** looks at the live screen and answers: *What would make a couple smile? What feels empty, stiff, or unfinished? What would they show to a friend?*
2. **QA Lead** reports where testers hesitated, got confused or got bored.
3. **Each engineer** proposes up to 3 ideas from their area (small, buildable, meaningful).
4. Write every idea into `IDEAS.md` with this format:

```
IDEA-###  Title
Why:        the benefit for the couple (one sentence)
What:       what the player sees/does
Effort:     S (hours) / M (a day or two) / L (several days)
Risk:       low / medium / high (performance, networking, art)
Score:      Impact (1-5) x Delight (1-5) / Effort (S=1, M=2, L=4)
Status:     PROPOSED → APPROVED → BUILDING → DONE → REJECTED (with reason)
```

5. The Lead Agent approves the **top 1–3 ideas per cycle** by score, provided they do not break performance budgets or core features. Approved ideas go through the **same** build, live test, fix loop. New features without tests and live verification are not allowed.

### 7.2 Idea starter list (the team should extend this, not just copy it)

**Movement and character life**
- Characters glance at each other and at points of interest; head look-at.
- Natural idle behaviours: stretch, yawn, check watch, hum when music plays.
- Footprints in the garden snow or dew; dust puffs on fast turns.
- Walk-together auto-sync: when near, characters match pace and walk side by side.
- Mood system: emotes change posture and idle style for a while.
- Outfit and accessory changer; seasonal outfits.

**Couple moments**
- Slow-dance mode with camera that orbits both characters and dims the lights.
- "Sunset on the balcony" auto-scene: they stand together, sky animates, soft music.
- "Candlelight dinner" scene preset (lights dim, candles lit, characters sit opposite).
- Love-note scavenger hunt: hidden notes around the house that unlock memories.
- Shared playlist: either player picks music, both hear it, room mood adapts.
- Pillow fight, cuddle on sofa while TV plays, stargazing blanket in the garden.
- Anniversary countdown on the fridge or gallery wall; auto-theme on special dates.
- Couple achievements and a "days together" counter plaque.

**House and atmosphere**
- Weather: rain on windows with sound, snow in the garden, fireflies, thunder.
- Seasonal decoration packs; fairy lights; fireworks on the balcony for celebrations.
- Pets: a cat that wanders and can be petted; a dog in the garden.
- Interactive objects: record player, bookshelf with readable notes, globe, swing, hammock, fountain.
- Hidden room or easter eggs.
- Room tour mode: a guided cinematic walkthrough of the house.

**Memory and sharing**
- Voice message left on the gallery wall; video clips on the TV.
- Time-capsule: write a letter that opens on a chosen date.
- Auto-generated "year in our home" slideshow.
- Photo mode couple poses, props, stickers; export collage.

**Quality of life**
- Quick-travel menu to any room; "meet me here" ping that draws a path to the partner.
- Cinematic mode that hides UI.
- Settings profiles per device; remembering last room.
- In-app help with a first-time tutorial that teaches movement, sitting, stairs, and emotes.
- Localisation (English, Hindi first).

**Technical polish**
- Foot IK on stairs; cloth/hair secondary motion.
- Adaptive quality with smooth transitions.
- Offline-friendly load via service worker.
- Telemetry dashboard (anonymous) for fps and load times.

### 7.3 Rules for adding features

- **Protect the core.** No new feature may reduce stability of movement, stairs, interactions or sync.
- **Budget check.** The Performance Engineer must confirm the feature stays within spec §20.
- **Spec update.** Add each shipped feature to the spec's feature list (new ID, priority) and to `TEST_MATRIX.md`.
- **Kill features that do not work.** If after 2 fix attempts a new idea is unstable, set it aside (`REJECTED` or `PARKED` with reasoning) rather than letting it degrade the product.

---

## 8. SENIOR-ENGINEER STANDARDS (ALL SUB-AGENTS)

**Code quality**
- TypeScript strict mode; no `any` without a comment explaining why.
- Small modules with a single responsibility; no god files. Match the folder structure in spec §6.2.
- Constants in `shared/constants.ts`; no magic numbers in logic.
- Frame-rate independent updates (use `dt`); no per-frame allocations in hot paths; dispose Three.js resources.
- Data-driven design: interaction points, rooms and animations come from data and scene markers, not hard-coded special cases.
- Meaningful error handling and logging; no swallowed exceptions.
- Clear comments for non-obvious math (collision, stairs, interpolation).

**Process**
- One logical change per commit with a clear message: `feat(stairs): ramp collider + floor index`, `fix(sit): align hips to cushion height`.
- Tech Lead reviews every merge: reads the diff, runs the app, checks the console.
- Never leave the main branch broken. If a change breaks the smoke test, revert or fix immediately.
- Keep `README.md` current: how to install, run, test, and where things live.

**Design**
- Follow the visual language in spec §14.1 and the palette in §7.8. Elegant, warm, romantic, professional. No cartoonish UI.
- Every interactive element has hover, focus, active, disabled and loading states.
- Always check at least one desktop and one phone viewport before calling a UI task done.

**Honesty and communication**
- Say what is incomplete. Do not claim a pass without evidence.
- When blocked (missing asset, unclear requirement, tooling limitation), log it in `BLOCKERS.md` with a proposed workaround, then **continue with other work** instead of stalling.
- If a spec instruction seems wrong or impossible, propose an alternative in `DECISIONS.md` and keep going with the best option.

---

## 9. PROJECT LOG FILES (KEEP THESE UPDATED EVERY CYCLE)

Keep in a `/project-log` folder at the repo root. Any new agent must be able to read these files and continue immediately.

| File | Contents | Updated by |
|---|---|---|
| `PROGRESS.md` | Cycle number, date, what was built, slice status, placeholders to replace, **NEXT STEPS** (the first thing to do next) | Lead Agent, every cycle |
| `TEST_MATRIX.md` | Every test row with the latest result, date, cycle, evidence path | QA Lead |
| `TEST_REPORT_cycle_N.md` | Narrative of what was tested live, screenshots examined, observations | QA Lead |
| `BUGS.md` | All bugs with status and evidence | QA Lead, owners |
| `IDEAS.md` | Idea backlog with scores and status | Creative Director, all |
| `DECISIONS.md` | Technical and product decisions with reasons, rejected options, root-cause findings | Tech Lead |
| `BLOCKERS.md` | Things preventing progress and workarounds | Anyone |
| `PERF_REPORT.md` | Latest performance numbers vs. budgets | Performance Engineer |
| `qa/screenshots/` | Evidence images and frame sequences by cycle | QA Lead |

### 9.1 `PROGRESS.md` template

```markdown
# PROGRESS

## Current status
Cycle: 7   Date: YYYY-MM-DD   Slice: S3 Stairs (in progress)

## Done this cycle
- ...

## Slice status
S0 ✅  S1 ✅  S2 ✅  S3 🔧  S4 ⏳ ...

## Open S1/S2 bugs
- BUG-014 ...

## Placeholders to replace with final assets
- Capsule collider for sofa (replace with authored collider)
- Procedural stairs mesh (replace with final model)

## NEXT STEPS (do these first when resuming)
1. ...
2. ...
```

---

## 10. CHECKPOINTS WITH THE HUMAN OWNER

The loop is continuous, but the owner must always be able to see progress and steer.

- **After every slice's Exit Check,** post a short **Checkpoint Summary**: what works (with 2–4 key screenshots), what is known broken, what is next, and any decisions the owner may want to weigh in on.
- **Always ask** the owner before: changing the core concept or the networking model, adding paid third-party services, deleting existing project files, or using licensed assets whose terms are unclear.
- **Never ask** about routine technical choices already covered by the spec or this playbook; decide, log it in `DECISIONS.md`, and continue.
- If the owner replies with feedback, convert it into `IDEAS.md` or `BUGS.md` entries first, then schedule them in the next cycle.

### 10.1 Checkpoint Summary template

```markdown
## Checkpoint — Slice S3 complete (Cycle 9)
**Works now:** (list, each verified live)
**Screenshots:** (4 images: stairs up, mid-stair, landing, camera in tight room)
**Known issues:** (S3/S4 bugs only; no S1/S2 allowed at a checkpoint)
**Performance:** 58 fps desktop High, 31 fps mobile Medium
**Next:** S4 two characters
**Needs your input:** (only if truly needed)
```

A checkpoint must **not** be declared with any open **S1 or S2** bug.

---

## 11. STARTING INSTRUCTIONS (DO THIS NOW)

1. **Read** `OUR_HOME_3D_PROJECT_SPEC.md` fully, then inspect the existing prototype (`index.html`, `js/*.js`, `css/style.css`, `assets/`). Run the prototype once and look at it so you know the baseline.
2. **Create** the `/project-log` folder and the files in Section 9 (empty templates are fine).
3. **Spawn** the first sub-agents: Tech Lead, Gameplay, Environment, UI, and QA Lead (plus Animation as soon as S4 approaches).
4. **Run Slice S0 and S1** end to end through the Master Loop, including the first live-screen verification and screenshots.
5. **Continue** through the slices in Section 3, never skipping the live test, and run an Ideation Round after every slice.
6. **Keep going** until the spec's Definition of Done (spec §27) is met, then keep running Section 7 to improve the product, until the owner says stop.

---

## 12. QUICK REFERENCE (PIN THIS)

```
BUILD small → RUN live → LOOK at screenshots → TEST the matrix → LOG bugs
FIX root cause → RE-TEST + regression → CREATIVE review → IDEATE → RECORD → REPEAT

Never: claim "works" without seeing it   | Never: leave S1/S2 bugs open at a checkpoint
Never: skip regression                   | Never: let QA sit idle
Always: screenshots + console + __debug  | Always: update /project-log
Always: two-window test for multiplayer  | Always: test on desktop AND phone sizes
```

*— End of playbook —*
