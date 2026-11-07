# 3D Museum — Test Matrix

**Branch:** `fix/production-hardening`  
**Current HEAD SHA:** `36ad81302a50f190768b86e3d37a061d7a2f9d24`  
**Coordinator:** Antigravity Engineering Lead  

---

## 1. Automated Test Suites

| # | Test Suite | Scope | Target Command | Environment | Status | Last Executed |
|---|---|---|---|---|---|---|
| 1 | `motionMath` Contract | 10 pure movement formulas (WASD, sprint, orbit, idle yaw, wrap) | `node --test tests/avatar_motion_contract.test.mjs` | Node.js v20+ Windows | PASS (10/10) | 2026-11-07 01:00 |
| 2 | Photo Aspect & Slots | Fit contain, outline synchrony, 5-photo east wall invariants | `node --test tests/photo_frames.test.mjs` | Node.js v20+ Windows | PASS (4/4) | 2026-11-07 01:00 |
| 3 | Seats & Placement Contract | Real-meter seat offsets (SEAT-01), standup placement 0.7m forward, findNearestSeat (SEAT-02) | `node --test tests/seats.test.mjs` | Node.js v20+ Windows | PASS (5/5) | 2026-11-07 01:00 |
| 4 | Room Photo Loading Contract | All 7 rooms build and apply 61 photo textures; stalled photos do not block loading | `node --test tests/room_photo_loading.test.mjs` | Node.js v20+ Windows | PASS (2/2) | 2026-11-07 01:00 |
| 5 | Server Hardening Protocol | Traversal, crash-proofing, auth session, 2-player limit, 30s grace, seat locks, live revocation, prototype hardening | `node --test tests/server_protocol.test.mjs` | Node.js v20+ Port 8991 | PASS (11/11) | 2026-11-07 00:47 |
| 6 | Layout & Photo Integrity | 9 placed items across 7 rooms, 61/61 photo assets present, all suites pass, production build succeeds | `npm run check` | Node.js v20+ Windows | PASS (45/45 tests + build) | 2026-11-07 01:56 |
| 7 | 3D Model Catalog Verification | Active model paths resolve in `public/models/ready/`, verifying primary & LOD sofa models | `npm run models:verify` | Node.js v20+ Windows | PASS (21 ref checked, 0 missing active) | 2026-11-07 00:48 |
| 8 | Adversarial Mobile Assets & DPR | Bounds parity (<0.001m), asset compression (>85% primary, >95% LOD), zero seat drift, mobile DPR 1.5 clamping | `node --test tests/adversarial_mobile_assets_m3.test.mjs` | Node.js v20+ Windows | PASS (6/6) | 2026-11-07 00:48 |
| 9 | Photo Cache 50-Room Stress | 50 consecutive salon transitions, zero premature active disposals, stop() full purge | `node tests/photo_cache_stress.mjs` | Node.js v20+ Windows | PASS (3/3 invariants) | 2026-11-07 00:48 |
| 10 | Photo Cache Extreme Stress (100) | 100 transitions, rapid cancellation toggling, 50-request deduplication, out-of-order downloads, selective LRU retention | `node tests/photo_cache_adversarial_stress.mjs` | Node.js v20+ Windows | PASS (5/5 scenarios) | 2026-11-07 00:49 |
| 11 | Adversarial Security (M1) | Prototype traversal/pollution immunity, unauthenticated bypass rejection on HTTP and WS | `node tests/adversarial_security_m1.test.mjs` | Node.js v20+ Port 8995 | PASS (12/12) | 2026-11-07 00:47 |
| 12 | Boundary & Stress Auth | Malformed codes, array injection, null prototypes, 1MB payloads, concurrency flood | `node --test tests/boundary_stress.test.mjs` | Node.js v20+ Windows | PASS (10/10) | 2026-11-07 00:47 |
| 13 | Two-Client Multiplayer | Dual-client join (Maya + Ethan), sync, emotes (Wave/Dance), seat conflict | `node tests/two_client_test.mjs` | Node.js v20+ Port 8997 / 8080 | PASS (6/6 stages) | 2026-11-07 01:58 |
| 14 | Avatar Controls WebGL | Real headless Chromium: Maya/Ethan visibility, WASD walk/run/idle/jump, heading preservation, 30s grace | `python tests/check_avatar_controls.py` | Playwright Chromium Port 8080 | PASS (zero errors) | 2026-11-07 02:03 |
| 15 | Character Setup & Look | Real headless Chromium: 20 actions invariant, no clap, wave/dance/nod, canvas palette color change, mobile responsive | `python tests/check_character_setup.py` | Playwright Chromium Port 8080 | PASS (zero errors) | 2026-11-07 01:58 |
| 16 | Production Build | Vite bundling, tree-shaking, CSS minification | `npm run build` | Vite v7.3.7 Windows | PASS (4.35s) | 2026-11-07 01:54 |

---

## 2. Authentication Scenarios Matrix

| Scenario | Input Condition | Expected Result | Acceptance Criteria | Status |
|---|---|---|---|---|
| AUTH-SC-01 | Fresh browser, no cookie | Ticket card displayed; input empty; "Verify Pass" button active | Engine not booted; unauthenticated requests to `/photos/*` and `/api/letters` return 401 | VERIFIED |
| AUTH-SC-02 | Correct passcode (`290512`) | Status becomes "✦ Pass Verified: Welcome, Maya & Ethan ✦"; loading begins | Single click transition; cookie `museum_session` stored; avatar cards displayed | VERIFIED |
| AUTH-SC-03 | Returning visitor, valid cookie | Recognized immediately; status "✦ Pass Verified: Welcome, Maya & Ethan ✦" | Single "Enter Sanctuary →" action available; engine loads; avatar selector ready | VERIFIED |
| AUTH-SC-04 | Invalid passcode entered | Status displays red error "Invalid invitation code." | Input remains editable; "Verify Pass" button remains active; no engine boot | VERIFIED |
| AUTH-SC-05 | Expired/Revoked invitation | Status displays red error "This invitation has been revoked." | Access blocked with 401; no session issued; visitor cannot enter | VERIFIED |
| AUTH-SC-06 | URL query param (`?code=290512`) | Input prefilled; validated via server session; smooth entry | No double redemption or unhandled promise rejection | VERIFIED |
| AUTH-SC-07 | Double click on Enter button | Handled idempotently by UI state machine | Exactly one `startMuseumExperience()` execution; no race conditions | VERIFIED |
