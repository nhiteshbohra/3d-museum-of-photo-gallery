# PENDING TASKS — Live 3D Multiplayer

**Date:** 2026-11-05
**Build status:** `npm run build` — **PASSED** (33 modules, exit 0)

This is the honest, complete list of things that are **pending / not fully done**.
It separates what is genuinely complete from what is still outstanding or unverified.

---

## 1. Things that are DONE (verified)

- Server relay + validation (`server.js`): 2-player cap, one-avatar-per-connection,
  position clamping, rate limiting, unknown-type rejection. Verified by the
  validation harness.
- Client multiplayer modules: `wsClient.js`, `avatarWorld.js` (interpolation,
  AnimationMixer clips, name-tag DOM, dispose-on-leave), `chat.js`, `seatRegistry.js`,
  `multiplayer.js`.
- Characters + animations: V3/V4 studio fully moved into
  `public/models/ready/characters/` — man/woman + 21 clips each (idle, walk, run,
  jump, wave, dance, clap, sit, …) + realism textures + studio docs.
- Entrance wiring (`main.js`), roster (`characters.json`), seat anchors in the
  artifact registry.
- Docs: `MULTIPLAYER_REPORT.md`, `ATTRIBUTIONS.md`, `PROJECT_INSTRUCTIONS.md`
  (§8.6–8.9). `COMPLETION_CHECKLIST.md` (Step 4 model fixture work).

**Relay/validation harness results (PASS):** distinct-ids, A-sees-B,
B-sees-A, state-relayed, third-rejected, clamped-to-bounds, unknown-type-rejected,
flood-rate-limited, spoofed-id-not-relayed.

---

## 2. PENDING — NOT done / NOT verified

### 2.1 Live two-browser visual test (the big one)
The network relay and server validation are automated and passing, but the
**end-to-end visual "two people in two windows" test has NOT been run** in a real
browser. Pending:
- [ ] Two real browser windows (Maya + Ethan) see each other as 3D avatars walking
      in the same room in real time.
- [ ] Each user controls ONLY their own avatar (no cross-control).
- [ ] Smooth movement with no lag/jitter — with **measured delay numbers** read from
      the corner HUD (`~Nms` chip) on a real link.
- [ ] Emotes (wave/dance/clap) visible to both instantly.
- [ ] Sitting: avatar really touches the seat (no float/sink/legs-through); no two
      avatars in the same spot; sync both ways.
- [ ] Room changes through doors, and the "Partner is in: X + Go there" panel.
- [ ] Chat bubbles appear and fade on both screens.
- [ ] Refresh/reconnect works, no ghost avatars left behind.
- [ ] No console errors on BOTH participants.
- [ ] Memory leak check: geometry/texture counts return to baseline after an avatar leaves.

### 2.2 Performance numbers not captured
- [ ] Frame-time and door-transition time measured with two avatars in the room
      (must not be >10% worse than before).
- [ ] FPS A/B benchmark (no baseline captured — noted as PARTIAL in
      `COMPLETION_CHECKLIST.md`).

### 2.3 Hosting switch (deferred by design)
- [ ] Currently built to run **locally** (`node server.js`, port 8080/8090).
      When you pick a real host, the host config must be updated. If the host is
      a static-only host (e.g. some Cloudflare Pages setups), WebSockets may need
      a separate worker/pass-through — this has NOT been set up.
- [ ] You are currently hosting from Cloudflare on your own system; the final
      hosting decision is still open.

### 2.4 Animation-set gaps (from the studio pack's own manifest/QA)
- [ ] Clips shipped in V3/V4 that are **excluded/not present**: `point`,
      `cheer`, `laugh`, `thumbs_up`, `talk_gestures`, `blink`, `yawn`,
      `stretch`. (Code substitutes: `clap` was added in V4; `point` falls back to
      `step_back`.)
- [ ] Animations are **procedural, not motion-captured** — feet sliding / fully
      natural sitting and dancing are not guaranteed; needs a human visual pass.
- [ ] Texture realism is programmatically derived (enhanced, not photoreal).

### 2.5 Miscellaneous / maintenance
- [ ] No general automated test/lint script is configured (only targeted manual
      checks). Consider wiring `npm test`.
- [ ] Several QA files are still untracked in git (new modules, characters folder,
      scripts, tools) — they are not yet committed.
- [ ] `archive/` shell folder may still exist (empty of avatar data) and can be
      removed if you want.

---

## 3. HOW TO VERIFY THE PENDING LIVE TEST (2 minutes)

```powershell
# 1. stop any stale server on 8080, then:
node server.js

# 2. open two browser tabs at http://localhost:8080
#    - Tab A: pick Maya → enter
#    - Tab B: pick Ethan → enter
#    They should see each other as 3D avatars, walk, wave, sit, and chat.
```

Read the latency from the corner HUD chip (`~Nms`). Also run:

```powershell
node tests/multiplayer_quick_check.mjs
node tests/multiplayer_validation_check.mjs
```

---

## 4. SOURCES / STATUS OF EACH REPORT

| File | Status |
|---|---|
| `MULTIPLAYER_REPORT.md` | PASS table filled; live visual check still pending (human-run) |
| `COMPLETION_CHECKLIST.md` | Step 4 model work DONE; heap-profile + FPS A/B PARTIAL |
| `ATTRIBUTIONS.md` | Updated for V3/V4 characters, clips, textures |
| `PROJECT_INSTRUCTIONS.md` | §8.6–8.9 written (network rules, message format, keys, seat anchors) |
| `TODO.md` | Known issues logged (seating anchors/transitions need calibration + verification) |
