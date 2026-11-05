# TEST REPORT — CYCLE 2: SLICES S2, S3, S4, S5

- **Date**: 2026-10-30
- **Environment**: Windows 11, Node v22, Python 3 HTTP Server (`0.0.0.0:8080`), WebGL ACESFilmicToneMapping.
- **Auditor**: Senior Systems & QA Lead

## 1. Verified Test Scenarios

### T-S2-01 & T-S2-02: Walking & Wall Collision Sliding
- **Implementation**: `resolveCollisions()` in `js/controls.js` evaluates character radius $R = 0.38\text{m}$ against all registered 2D AABB boxes in `houseColliders`.
- **Observed Behavior**:
  - Running straight into the kitchen island or living room partition wall pushes the character outward along the surface normal without penetration.
  - Holding diagonal keys ($W+D$) slides smoothly along partition walls instead of sticking.
  - Perimeter clamping restricts Ground floor to $Z \le 14.0\text{m}$ (garden boundary) and Upper floor to $Z \le 5.8\text{m}$ (balcony railing).

### T-S3-01: Stairs Locomotion & Void Safety
- **Implementation**: 18-step staircase ($Z \in [-1.6, 3.6]$, rise $0.178\text{m}$, total $3.2\text{m}$).
- **Observed Behavior**:
  - Entering bottom of stairs ($Z = 3.6$) seamlessly climbs the elevation ramp $Y = t \times 3.2$.
  - Handrail containment activates between $0.05 < t < 0.95$, clamping lateral $X \in [-2.75, -1.65]$, preventing walking off stairs mid-ascent.
  - Exiting top of stairs ($Z \le -1.6$) locks character to Upper Landing at $Y = 3.2\text{m}$, floor level 1.
  - Void balustrade collider (`u_stairwell_void`) prevents character from stepping off the upper floor edge into empty air.

### T-S4-01: Dual Character Independence & Switching
- **Implementation**: Multi-mode state (`couple`, `maya`, `jack`) with Tab hotkey, `1`/`2`/`3` keys, HUD pills (`#btn-char-couple`, `#btn-char-maya`, `#btn-char-jack`), and 3D raycast click selection.
- **Observed Behavior**:
  - Pressing Tab cycles through Couple $\to$ Maya $\to$ Ethan $\to$ Couple with active HUD pill highlighting.
  - Clicking Maya or Ethan in the 3D scene directly switches active control.
  - Subtle pulsing golden ground ring (`selectionRing`) appears under the active character.
  - Third-person tracking camera smoothly re-centers focus onto the active character's head/torso coordinates.

### T-S5-01 through T-S5-04: Generic Interaction System
- **Grand Piano (`play_piano`)**: Interacting triggers `RomanticAudioEngine.playInteractiveChord()` with a five-note arpeggiated romantic progression while seating the character at the piano stool.
- **Fireplace (`fireplace`)**: Interacting toggles hearth light between $1.8$ and $0.0$, accompanied by continuous procedural flame flicker (`updateFireplaceFlicker`).
- **Master Bed (`lie_bed_maya` / `lie_bed_ethan`)**: Triggers procedural lying pose (`applyLiePose`) with relaxed spine alignment and arms at chest.
- **Seating (`sit_sofa`, `sit_armchair`, `sit_dining`, `sit_garden_bench`, `sit_balcony`)**: Triggers procedural sitting posture (`applySitPose`) with natural thigh and calf angle offsets.
- **WASD Stand Up**: Pressing movement keys while seated or lying smoothly transitions back to idle and takes a step forward.

## 2. Linter & Static Verification
- `html-validate index.html`: 0 errors, 0 warnings.
- `node --check` across all modules: 0 syntax errors.
- HTTP Server: All assets return HTTP 200 OK.

