# 3D Model Asset Inventory

## 1. Overview & Classification Criteria
This inventory provides a comprehensive audit of all 3D model assets associated with the **Our Museum 3D** project.

Assets are strictly classified into:
1. **USED**: Actively loaded and required by runtime code, layout configurations, avatar animations, or scene rendering. (Location: **`public/models/ready/`**)
2. **UNUSED**: Proven unreferenced in active code for now, or superseded by newer assets. (Location: **`archive/models/`**)
3. **CATALOG-ONLY**: Registered in the optional catalog specification without on-disk binary assets.

---

## 2. Active Model Assets in `public/models/ready/` (52 Files — 83.43 MB)

| Model | Current Path | Referenced By | Status | Action |
|---|---|---|---|---|
| `man.glb` | `public/models/ready/characters/man.glb` | `src/avatars/avatarWorld.js`, `src/data/characters.json`, `server.js` | USED | Keep in Ready |
| `woman.glb` | `public/models/ready/characters/woman.glb` | `src/avatars/avatarWorld.js`, `src/data/characters.json`, `server.js` | USED | Keep in Ready |
| `walk.glb` (man) | `public/models/ready/characters/animations/man/walk.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.walk`) | USED | Keep in Ready |
| `run.glb` (man) | `public/models/ready/characters/animations/man/run.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.run`) | USED | Keep in Ready |
| `jump.glb` (man) | `public/models/ready/characters/animations/man/jump.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.jump`) | USED | Keep in Ready |
| `wave.glb` (man) | `public/models/ready/characters/animations/man/wave.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.wave`), `emotes.js` | USED | Keep in Ready |
| `casual_dance.glb` (man) | `public/models/ready/characters/animations/man/casual_dance.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.casual_dance`) | USED | Keep in Ready |
| `energetic_dance.glb` (man) | `public/models/ready/characters/animations/man/energetic_dance.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.dance`) | USED | Keep in Ready |
| `nod_yes.glb` (man) | `public/models/ready/characters/animations/man/nod_yes.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.nod_yes`) | USED | Keep in Ready |
| `shake_head_no.glb` (man) | `public/models/ready/characters/animations/man/shake_head_no.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.shake_head_no`) | USED | Keep in Ready |
| `sit_down.glb` (man) | `public/models/ready/characters/animations/man/sit_down.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.sit_down`) | USED | Keep in Ready |
| `seated_idle.glb` (man) | `public/models/ready/characters/animations/man/seated_idle.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.seated_idle`) | USED | Keep in Ready |
| `stand_up.glb` (man) | `public/models/ready/characters/animations/man/stand_up.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.stand_up`) | USED | Keep in Ready |
| `sit_high_chair.glb` (man) | `public/models/ready/characters/animations/man/sit_high_chair.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.sit_high_chair`) | USED | Keep in Ready |
| `sit_low_chair.glb` (man) | `public/models/ready/characters/animations/man/sit_low_chair.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.sit_low_chair`) | USED | Keep in Ready |
| `idle_weight_shift.glb` (man) | `public/models/ready/characters/animations/man/idle_weight_shift.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.idle_weight_shift`) | USED | Keep in Ready |
| `turn_in_place.glb` (man) | `public/models/ready/characters/animations/man/turn_in_place.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.turn_in_place`) | USED | Keep in Ready |
| `turn_head_left.glb` (man) | `public/models/ready/characters/animations/man/turn_head_left.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.turn_head_left`) | USED | Keep in Ready |
| `turn_head_right.glb` (man) | `public/models/ready/characters/animations/man/turn_head_right.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.turn_head_right`) | USED | Keep in Ready |
| `walk_start.glb` (man) | `public/models/ready/characters/animations/man/walk_start.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.walk_start`) | USED | Keep in Ready |
| `walk_stop.glb` (man) | `public/models/ready/characters/animations/man/walk_stop.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.walk_stop`) | USED | Keep in Ready |
| `step_back.glb` (man) | `public/models/ready/characters/animations/man/step_back.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.step_back`) | USED | Keep in Ready |
| `walk.glb` (woman) | `public/models/ready/characters/animations/woman/walk.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.walk`) | USED | Keep in Ready |
| `run.glb` (woman) | `public/models/ready/characters/animations/woman/run.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.run`) | USED | Keep in Ready |
| `jump.glb` (woman) | `public/models/ready/characters/animations/woman/jump.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.jump`) | USED | Keep in Ready |
| `wave.glb` (woman) | `public/models/ready/characters/animations/woman/wave.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.wave`), `emotes.js` | USED | Keep in Ready |
| `casual_dance.glb` (woman) | `public/models/ready/characters/animations/woman/casual_dance.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.casual_dance`) | USED | Keep in Ready |
| `energetic_dance.glb` (woman) | `public/models/ready/characters/animations/woman/energetic_dance.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.dance`) | USED | Keep in Ready |
| `nod_yes.glb` (woman) | `public/models/ready/characters/animations/woman/nod_yes.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.nod_yes`) | USED | Keep in Ready |
| `shake_head_no.glb` (woman) | `public/models/ready/characters/animations/woman/shake_head_no.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.shake_head_no`) | USED | Keep in Ready |
| `sit_down.glb` (woman) | `public/models/ready/characters/animations/woman/sit_down.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.sit_down`) | USED | Keep in Ready |
| `seated_idle.glb` (woman) | `public/models/ready/characters/animations/woman/seated_idle.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.seated_idle`) | USED | Keep in Ready |
| `stand_up.glb` (woman) | `public/models/ready/characters/animations/woman/stand_up.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.stand_up`) | USED | Keep in Ready |
| `sit_high_chair.glb` (woman) | `public/models/ready/characters/animations/woman/sit_high_chair.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.sit_high_chair`) | USED | Keep in Ready |
| `sit_low_chair.glb` (woman) | `public/models/ready/characters/animations/woman/sit_low_chair.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.sit_low_chair`) | USED | Keep in Ready |
| `idle_weight_shift.glb` (woman) | `public/models/ready/characters/animations/woman/idle_weight_shift.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.idle_weight_shift`) | USED | Keep in Ready |
| `turn_in_place.glb` (woman) | `public/models/ready/characters/animations/woman/turn_in_place.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.turn_in_place`) | USED | Keep in Ready |
| `turn_head_left.glb` (woman) | `public/models/ready/characters/animations/woman/turn_head_left.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.turn_head_left`) | USED | Keep in Ready |
| `turn_head_right.glb` (woman) | `public/models/ready/characters/animations/woman/turn_head_right.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.turn_head_right`) | USED | Keep in Ready |
| `walk_start.glb` (woman) | `public/models/ready/characters/animations/woman/walk_start.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.walk_start`) | USED | Keep in Ready |
| `walk_stop.glb` (woman) | `public/models/ready/characters/animations/woman/walk_stop.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.walk_stop`) | USED | Keep in Ready |
| `step_back.glb` (woman) | `public/models/ready/characters/animations/woman/step_back.glb` | `src/avatars/avatarWorld.js` (`CLIP_FILES.step_back`) | USED | Keep in Ready |
| `3d_pbr_curved_sofa.glb` | `public/models/ready/furniture/3d_pbr_curved_sofa.glb` | `src/data/museumLayout.json` (Fireside & Star Lounge) | USED | Keep in Ready |
| `furniture_bookcase.glb` | `public/models/ready/furniture/furniture_bookcase.glb` | `src/data/museumLayout.json` (Memory Hall) | USED | Keep in Ready |
| `furniture_chinese_commode.glb` | `public/models/ready/furniture/furniture_chinese_commode.glb` | `src/data/museumLayout.json` (Gallery Corridor) | USED | Keep in Ready |
| `furniture_gothiccabinet.glb` | `public/models/ready/furniture/furniture_gothiccabinet.glb` | `src/data/museumLayout.json` (Fireside & Library) | USED | Keep in Ready |
| `scene.gltf` (sofa 1) | `public/models/ready/furniture/furniture_sofa_1_3dx/scene.gltf` | `src/data/museumLayout.json` (Paris Salon) | USED | Keep in Ready |
| `scene.bin` (sofa 1 binary) | `public/models/ready/furniture/furniture_sofa_1_3dx/scene.bin` | Direct dependency of `scene.gltf` | USED | Keep in Ready |
| `lighting_chandelier_01.glb` | `public/models/ready/lighting/lighting_chandelier_01.glb` | `src/data/museumLayout.json` (Grand Entrance) | USED | Keep in Ready |
| `lighting_chandelier_03.glb` | `public/models/ready/lighting/lighting_chandelier_03.glb` | `src/data/museumLayout.json` (Upper Promenade) | USED | Keep in Ready |
| `lighting_chandelier_osgona.glb` | `public/models/ready/lighting/lighting_chandelier_osgona.glb` | `src/data/museumLayout.json` (Main Atrium) | USED | Keep in Ready |
| `plants_monstera.glb` | `public/models/ready/plants/plants_monstera.glb` | `src/data/museumLayout.json` (Veranda & Sunroom) | USED | Keep in Ready |

---

## 3. Safely Archived Assets in `archive/models/` (33.27 MB — Excluded from Git)

| Model | Archive Path | Reason for Archiving | Size | Reversible Command |
|---|---|---|---|---|
| `set_sofa_v.001.glb` | `archive/models/furniture/set_sofa_v.001.glb` | Superseded by curved sofa | 32.95 MB | `npm run models:restore` |
| `lighting_chandelier_osgona.glb` (LOD) | `archive/models/lod/lighting/lighting_chandelier_osgona.glb` | Unused LOD copy | 244.7 KB | `npm run models:restore` |
| `clap.glb` (man) | `archive/models/characters/animations/man/clap.glb` | Unapproved emote | 33.7 KB | `npm run models:restore` |
| `clap.glb` (woman) | `archive/models/characters/animations/woman/clap.glb` | Unapproved emote | 33.7 KB | `npm run models:restore` |
| `_studio/` | `archive/models/characters/_studio/` | Dev/studio tooling folder | ~50 KB | Manual or manifest |

---

## 4. Summary & Invariants
- **100% Active in `ready`**: Every single `.glb`, `.gltf`, and `.bin` file in `public/models/ready/` is actively loaded by code.
- **0% Unused in Git**: No unused 3D models are staged or tracked in Git.
- **100% Preserved Locally**: Zero files were deleted; all archived assets can be brought back anytime with `npm run models:restore`.
