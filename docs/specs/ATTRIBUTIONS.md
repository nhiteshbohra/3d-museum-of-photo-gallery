# Attributions

## 3D Characters (avatars)

The avatar characters were provided by the user in this project as archive
`archive/museum_avatar_studio_complete_v3/` (the "Complete Museum Avatar Studio V3").
As of this run, the two characters in use are from the V4 studio pack (characters
preserved from the earlier packs):

| File | Source | Licence / notes |
|---|---|---|
| `public/models/ready/characters/woman.glb` | `archive/museum_avatar_studio_complete_v4/assets/woman.glb` | Rigged humanoid, **embedded `walk` + `run` animations**. Licence to be confirmed by the owner. |
| `public/models/ready/characters/man.glb` | `archive/museum_avatar_studio_complete_v4/assets/man.glb` | Rigged humanoid, **embedded `walk` + `run` animations**. Licence to be confirmed by the owner. |

## Realism / PBR texture maps (per character)

Copied from `archive/museum_avatar_studio_complete_v4/assets/<sex>-*.png|jpg` into
`public/models/ready/characters/textures/<sex>/`. Applied best-effort at load time:

| Map | File |
|---|---|
| Albedo / colour | `<sex>-realism-v2.png` |
| Normal (micro detail) | `<sex>-micro-normal.png` |
| Roughness | `<sex>-roughness.png` |
| Auxiliary masks (not applied at runtime) | `<sex>-masks.png`, `<sex>-enhanced.jpg` |

These were programmatically derived by the studio build (not captured skin/hair PBR scans),
per its QA report.

> Note: these are the only characters in use. All other avatar files (older
> `female.glb`/`male.glb`, `.vrm` samples, non-rigged copies) were removed.
>
> Confirm exact licence terms before public/commercial deployment.

## Animation clips

The V4 pack ships **21 animation-only GLB clips per character** (42 total), copied into
`public/models/ready/characters/animations/<sex>/`. They are **procedurally generated**
(not motion capture), per the package manifest. V4 replaces `walk_start`, `walk_stop`,
`step_back`, `turn_in_place`, and `idle_weight_shift` with fuller-body clips, and
**reintroduces** a real `clap` clip.

Wired clip map (matches the V3 manifest `available` list):

| Logical | File | Notes |
|---|---|---|
| idle | `idle_weight_shift.glb` | |
| walk / run | `walk.glb` / `run.glb` | |
| jump | `jump.glb` | |
| wave | `wave.glb` | |
| dance | `energetic_dance.glb` | casual_dance also available |
| clap | `clap.glb` | real clip (V4) — near-contact hand distance ~0.03–0.05 m |
| sit / sitDown / standUp | `seated_idle.glb` / `sit_down.glb` / `stand_up.glb` | |
| point | `step_back.glb` | **substitute** — a `point` clip is not shipped in the V3 pack |
| extras (available, not wired) | nod_yes, shake_head_no, turn_in_place, turn_head_left/right, walk_start, walk_stop, sit_high/low_chair, step_back | |

V4 manifest explicitly excludes: blink_subtle, breathing_idle, cheer, laugh,
look_at_art, point, stretch, talk_gestures, thumbs_up, use_phone, yawn.

Known limitations (from the V4 README/QA):
- Clips are procedural, not motion captured; feet sliding / natural sitting/dancing not proven.
- Clap hand-contact QA uses wrist/hand bone positions, not mesh palm collision.
- Sit contact is approximated; seat height is positioned in Three.js.
- The V3 studio provides `idle_weight_shift` (not a breathing idle); soft idle breathing is
  handled by the weight-shift clip plus code-driven bob.
