# Our Museum 3D — Gesture & Contextual Interaction Implementation Specification

## Scope and immutable constraints
Target repository: `nhiteshbohra/3d-museum-of-photo-gallery`, branch `fix/production-hardening`. Preserve Maya/Ethan models, existing museum design, one global private session with two visitors, 30-second reconnection grace, approved camera modes, authentication, mobile controls, and server-authoritative seating. Do not reintroduce excluded gestures: clap, cheer, laugh, thumbs-up, point/look at art, talk gestures, yawn, phone use, breathing idle, blink. No advanced avatar editor. Nod and shake-head are candidate approved gestures subject to user review.

## Complete currently configured animation inventory
The current `CLIP_FILES` map in `src/avatars/avatarWorld.js` has 20 logical clips per model:

| Logical ID | Asset filename | Classification | UI behavior |
|---|---|---|---|
| idle | idle_weight_shift.glb | Automatic locomotion | Show info only |
| walk | walk.glb | Automatic locomotion | Show controls only |
| run | run.glb | Automatic locomotion | Show controls only |
| jump | jump.glb | Physics-controlled locomotion | Use Jump control, not arbitrary clip playback |
| wave | wave.glb | Gesture | Playable |
| dance | energetic_dance.glb | Dance | Playable, interruptible |
| sit | seated_idle.glb | Seat state | Auto when seated |
| sitDown | sit_down.glb | Seat transition | Contextual, on seat approval |
| standUp | stand_up.glb | Seat transition | Contextual, on standing |
| stepBack | step_back.glb | Locomotion transition | Automatic where suitable |
| nod | nod_yes.glb | Gesture | Playable if approved |
| shake | shake_head_no.glb | Gesture | Playable if approved |
| turn | turn_in_place.glb | Locomotion transition | Automatic |
| walkStart | walk_start.glb | Locomotion transition | Automatic |
| walkStop | walk_stop.glb | Locomotion transition | Automatic |
| casualDance | casual_dance.glb | Dance | Playable, interruptible |
| sitLow | sit_low_chair.glb | Seat variant | Contextual low seat |
| sitHigh | sit_high_chair.glb | Seat variant | Contextual high seat |
| lookLeft | turn_head_left.glb | Head action | Playable only if approved and compatible |
| lookRight | turn_head_right.glb | Head action | Playable only if approved and compatible |

**Important:** Expose every clip in an inventory or Movement Help section, but only enable direct playback for verified, appropriate actions. Never convert walk/run/sit transitions into free-standing gesture buttons. Confirm no action conflicts with a previously excluded gesture. The present `src/avatars/emotes.js` only declares three emotes (Wave, Dance, Nod); unify this list with the authoritative manifest and avoid mismatched IDs or clip aliases.

## Right-side panel UX
- Press **G** or click **Gestures** on desktop; touch **Gestures** on mobile. All three invoke the same toggle.
- Slide in from the **right**, not the earlier left/bottom placement; do not cover essential mobile joystick or camera controls. Use safe-area insets and a width appropriate for viewport.
- Clear title, close button, Escape behavior, categories/tabs: Gestures, Dances, Sofa/Chair, Movement Help, and optionally Head Actions.
- Search, visible animation status, busy/error/retry state, supported keyboard shortcuts, a stop control for repeating dances, and helpful disabled reasons.
- On opening: release pointer lock and suppress accidental avatar movement. On closing: restore controls only on an explicit user gesture where browser pointer-lock permissions require it.
- Render buttons from an authoritative action manifest, not duplicated hardcoded arrays in CSS/HTML/JS. Support accessibility: focus management, ARIA states, keyboard navigation, readable targets.

## Contextual sitting
- `seatRegistry.js` and `multiplayer.js` remain authoritative clients for nearby seat discovery; server owns seat claims.
- Near an unoccupied sofa/chair, enable Sit; select correct low/high animation from actual seat metadata, not arbitrary guesses.
- Play Sit Down only after server `sit_ok`; transition to Seated Idle. On stand, play Stand Up and safely relocate to the floor.
- Hide or disable seat-only actions when too far, incompatible, occupied, loading, or disconnected if authoritative confirmation is unavailable.
- Preserve collision handling and do not teleport to remote or occupied furniture.

## Animations and rig QA
- Confirm both male and female GLBs have every referenced clip; inspect skeletal track names and avatar scale/retarget compatibility.
- Use animation mixer state machine with appropriate fade-in/fade-out, one-shot vs loop semantics; avoid double trigger on keyboard and click paths.
- Optional clips load asynchronously on-demand (or during true idle), cached per rig; keep essential movement and seated state responsive. Provide graceful missing-asset error.
- Local playback must work offline, with network broadcast only when authenticated/joined.
- Avoid the existing `emotes.js` vs `avatarWorld.js` mapping ambiguity: ensure `dance` and `casualDance` play correct variants and network IDs are stable.

## Multiplayer protocol
- Sync `actionId`, variant, play/stop, start time/sequence; validate allowed IDs server-side and reject excluded or unknown actions.
- Both authenticated visitors see the same gestures and seating changes when sharing a room; late join/reconnect must recover continuing state without replaying expired one-shot gestures.
- Room changes, disconnect, refresh, seat switch, and action interruptions must not leave remote avatars stuck.

## Implementation sequence
1. Inventory files, test existing clips and map prior exclusions to every candidate.
2. Create shared action manifest; add mapping/tests for names, IDs, clip paths and category.
3. Implement right-side responsive panel using shared manifest.
4. Connect local action playback, cancellation and animation state machine.
5. Integrate contextual seats with authoritative reservation.
6. Implement/verify partner action sync.
7. Reduce optional-clip downloads; benchmark.
8. Run regression suite across auth, two-person multiplayer, door navigation, camera, mobile input and gallery UI.

## Required acceptance matrix
- G/button/mobile all open identical right-side panel; G/Escape/Close dismiss correctly.
- Inventory lists all 20 available clips, categorized; only approved user actions are clickable.
- Each playable action works on both existing avatar rigs, transitions naturally, stops/cancels appropriately, and never blocks walking after panel close.
- Seat actions appear correctly for distance, availability and type, with no overlapping participants.
- Two independent browser sessions each see the other's gestures and seat changes.
- Desktop/midrange mobile controls do not overlap; no pointer-lock trap.
- No unrequested gestures, old UI design regression, or security bypass.
- `npm run check`, `npm test`, `npm run models:verify`, `npm run build` pass; visual tests and actual measurement logs included. No claim of physical-device pass without testing one.

## Agent deliverables
`docs/audit/FULL_ANIMATION_INVENTORY.md`, `GESTURE_PANEL_IMPLEMENTATION.md`, `SOFA_INTERACTION_TESTS.md`, `TWO_PLAYER_ANIMATION_SYNC.md`, `ANIMATION_PERFORMANCE.md`, and `FINAL_GESTURE_REGRESSION.md`. Each includes actual evidence, affected code paths and remaining issues.
