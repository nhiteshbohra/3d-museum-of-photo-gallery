# 3D Museum — Test Matrix

**Branch:** `fix/production-hardening`  
**Current HEAD:** `893e0c3`  

---

## 1. Automated Test Suites

| Test Suite | Scope | Target Command | Environment | Status | Last Executed |
|---|---|---|---|---|---|
| `motionMath` Contract | 10 pure movement formulas (WASD, sprint, orbit, idle yaw, wrap) | `node --test tests/avatar_motion_contract.test.mjs` | Node.js v20+ Windows | PASS (11/11) | 2026-11-06 00:56 |
| Photo Aspect & Slots | Fit contain, outline synchrony, 5-photo east wall invariants | `node --test tests/photo_frames.test.mjs` | Node.js v20+ Windows | PASS (4/4) | 2026-11-06 00:56 |
| Server Hardening Protocol | Traversal, crash-proofing, auth session, 2-player limit, 30s grace, seat locks, live revocation | `node --test tests/server_protocol.test.mjs` | Node.js v20+ Port 8991 | PASS (11/11) | 2026-11-06 00:56 |
| Layout & Photo Integrity | 19 placed items, all 7 salon keys, 61/61 photo assets present | `npm run check` | Node.js v20+ Windows | PASS | 2026-11-06 00:56 |
| 3D Model Catalog Verification | Active model paths resolve in `public/models/ready/` | `npm run models:verify` | Node.js v20+ Windows | PASS (20 ref checked) | 2026-11-06 00:56 |
| Two-Client Multiplayer | Dual-client join (Maya + Ethan), sync, emotes (Wave/Dance), seat conflict | `node tests/two_client_test.mjs` | Node.js v20+ Port 8080 | PASS | 2026-11-06 00:57 |
| Production Build | Vite bundling, tree-shaking, CSS minification | `npm run build` | Vite v7.3.7 | PASS | 2026-11-06 00:57 |

---

## 2. Authentication Scenarios Matrix

| Scenario | Input Condition | Expected Result | Acceptance Criteria |
|---|---|---|---|
| AUTH-SC-01 | Fresh browser, no cookie | Ticket card displayed; input empty; "Verify Pass" button active | Engine not booted; unauthenticated requests to `/photos/*` and `/api/letters` return 401 |
| AUTH-SC-02 | Correct passcode (`290512`) | Status becomes "✦ Pass Verified: Welcome, Maya & Ethan ✦"; loading begins | Single click transition; cookie `museum_session` stored; avatar cards displayed |
| AUTH-SC-03 | Returning visitor, valid cookie | Recognized immediately; status "✦ Pass Verified: Welcome, Maya & Ethan ✦" | Single "Enter Sanctuary →" action available; engine loads; avatar selector ready |
| AUTH-SC-04 | Invalid passcode entered | Status displays red error "Invalid invitation code." | Input remains editable; "Verify Pass" button remains active; no engine boot |
| AUTH-SC-05 | Expired/Revoked invitation | Status displays red error "This invitation has been revoked." | Access blocked with 401; no session issued; visitor cannot enter |
| AUTH-SC-06 | URL query param (`?code=290512`) | Input prefilled; validated via server session; smooth entry | No double redemption or unhandled promise rejection |
| AUTH-SC-07 | Double click on Enter button | Handled idempotently by UI state machine | Exactly one `startMuseumExperience()` execution; no race conditions |
