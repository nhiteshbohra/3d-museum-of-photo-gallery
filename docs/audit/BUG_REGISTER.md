# Bug Register & Resolution Catalog

## Overview
This document itemizes all discovered, audited, and resolved defects across the **Our Museum 3D** project. Every entry documents severity, affected components, root causes, reproduction procedures, implemented resolutions, and automated verification tests.

---

### Bug Index Summary

| Bug ID | Severity | Category | Title | Status |
|---|---|---|---|---|
| **AUTH-01** | P0 | Security | Unauthenticated Direct Access to Private Photos | RESOLVED |
| **AUTH-02** | P0 | Security | Client-Side Bundle Leakage of Private Letter Content | RESOLVED |
| **AUTH-03** | P0 | Security | Lack of Session Token & HttpOnly Cookie on Invitation Pass | RESOLVED |
| **SEC-01** | P0 | Security | Directory Traversal via Unsanitized Express Static Root | RESOLVED |
| **SEC-02** | P1 | Reliability | Server Crash on Malformed URI Decoding (`%`) | RESOLVED |
| **NET-01** | P0 | Multiplayer | Enforcement of Strict Two-Player Session Capacity | RESOLVED |
| **NET-02** | P1 | Multiplayer | Premature Peer Eviction on Mobile Transient Network Blips | RESOLVED |
| **STATE-01** | P1 | State / Seat | Multi-Seat Occupancy Invariant Violation on Seat Switching | RESOLVED |
| **STATE-02** | P1 | Geometry | Seat Anchor Offset Scale Collapse in Dynamic Scaling | RESOLVED |
| **STATE-04** | P1 | Multiplayer | Premature Message Flush Prior to Server `room_state` ACK | RESOLVED |
| **ANIM-01** | P1 | Animations | Inclusion of Excluded "Clap" Emote & Hotkey Collision | RESOLVED |
| **CAM-01** | P1 | Camera | Coupling of Camera Orbit to Character Physical Orientation | RESOLVED |
| **CAM-02** | P1 | Camera | Seated Camera Orbit Geometry Clipping & Missing Front View | RESOLVED |
| **MOBILE-01** | P1 | Mobile / UI | Incomplete Mobile Touch Controls for Orbit & Action Drawer | RESOLVED |
| **UI-01** | P2 | UI / UX | Absence of Ticket Validation Loading & Feedback States | RESOLVED |

---

## Detailed Bug Reports

### AUTH-01: Unauthenticated Direct Access to Private Photos
- **Severity**: P0 (Critical Security)
- **Component**: `server.js` (`/photos/*` routing)
- **Root Cause**: The static file middleware was mounted at root without route-specific session authorization, allowing any unauthenticated visitor with direct URL knowledge to fetch high-resolution family photos.
- **Reproduction**: Perform `curl -I http://localhost:8991/photos/room1/photo1.jpg` without any cookie or session header.
- **Expected**: HTTP 401 Unauthorized unless authenticated via an active invitation session.
- **Actual**: HTTP 200 OK with binary image payload delivered to unauthenticated client.
- **Permanent Fix**: Implemented `requireAuth` middleware for `/photos/*` requiring valid `museum_session` cookie or `Authorization: Bearer <token>`.
- **Verification**: `tests/server_protocol.test.mjs` Section 5 asserts HTTP 401 without cookie and HTTP 200 with authenticated session cookie.

---

### AUTH-02: Client-Side Bundle Leakage of Private Letter Content
- **Severity**: P0 (Critical Security)
- **Component**: `src/data/coupleMuseum.js` & `server.js` (`/api/letters`)
- **Root Cause**: Private romantic letters and anniversary notes were hardcoded inside client-side JavaScript source files. When Vite built the production bundle, these private strings were included in plain text in `dist/assets/main-*.js`.
- **Reproduction**: Inspect compiled `dist/assets/main-*.js` and search for letter text snippets.
- **Expected**: Private letter content is never bundled into public client assets; retrieved only dynamically over an authenticated API endpoint.
- **Actual**: Private letters readable in public JavaScript bundle.
- **Permanent Fix**: Removed private letter bodies from client bundle. Created authenticated endpoint `GET /api/letters` in `server.js` gated by `requireAuth`.
- **Verification**: Automated test asserts `GET /api/letters` returns 401 without session and returns letter JSON only with authenticated session.

---

### AUTH-03: Lack of Session Token & HttpOnly Cookie on Invitation Pass
- **Severity**: P0 (Security)
- **Component**: `server.js` (`POST /api/invite/redeem`)
- **Root Cause**: Early prototypes relied on client-side localStorage checks for invitation keys, susceptible to XSS extraction and bypassing server-side state.
- **Reproduction**: Submit invite key in browser; inspect cookies and storage.
- **Expected**: Server issues a cryptographically secure 64-hex token set in an `HttpOnly`, `SameSite=Strict` cookie (`museum_session`).
- **Actual**: No server-side session token was minted.
- **Permanent Fix**: Implemented `POST /api/invite/redeem` on the server which validates the code against authorized invitations and issues an `HttpOnly` session cookie stored in `activeSessions`.
- **Verification**: `tests/server_protocol.test.mjs` Section 5 asserts invite redemption returns `Set-Cookie: museum_session=...; HttpOnly; SameSite=Strict`.

---

### SEC-01: Directory Traversal via Unsanitized Express Static Root
- **Severity**: P0 (Security)
- **Component**: `server.js` (HTTP request dispatcher)
- **Root Cause**: Naive path joining allowed `../` sequences to traverse outside of the designated web root directory.
- **Reproduction**: Request `GET /../server.js` or `GET /%2e%2e/package.json`.
- **Expected**: HTTP 404 Not Found for any path outside public web directory.
- **Actual**: Served sensitive configuration or server source files.
- **Permanent Fix**: Canonicalized target paths with `path.resolve` and enforced strict boundary check ensuring target starts with `DIST_DIR` or `PUBLIC_DIR`.
- **Verification**: `tests/server_protocol.test.mjs` Section 1 explicitly requests `GET /../server.js` and `GET /%2e%2e/server.js`, verifying 404 responses.

---

### SEC-02: Server Crash on Malformed URI Decoding (`%`)
- **Severity**: P1 (Reliability / Denial of Service)
- **Component**: `server.js`
- **Root Cause**: Calling `decodeURIComponent(req.url)` without a `try/catch` block threw an unhandled `URIError: URI malformed` when receiving raw `%` characters, terminating the Node.js process.
- **Reproduction**: Send `GET /% HTTP/1.1`.
- **Expected**: Server returns HTTP 404 cleanly without crashing.
- **Actual**: Unhandled exception terminated server process.
- **Permanent Fix**: Wrapped URL decoding in `try/catch` and safely rejected invalid URIs with HTTP 404.
- **Verification**: `tests/server_protocol.test.mjs` Section 2 tests `GET /%` and asserts process remains active and healthy.

---

### NET-01: Enforcement of Strict Two-Player Session Capacity
- **Severity**: P0 (Functional / Security)
- **Component**: `server.js` (`wss.on('connection')`)
- **Root Cause**: Museum session lacked an authoritative human peer count check, allowing unauthorized third visitors to join and inject avatars into the private museum.
- **Reproduction**: Connect three concurrent WebSocket clients with valid credentials to the same room.
- **Expected**: Exactly 2 human visitors permitted; 3rd visitor receives `room-full` and is disconnected.
- **Actual**: 3rd visitor connected and spawned a 3rd avatar in the room.
- **Permanent Fix**: Authoritative session map checks active connected peers. If peer count >= 2 and the incoming peer is not reconnecting under grace, connection is immediately rejected with `{ type: "error", error: "room-full" }` and closed with code 4403.
- **Verification**: `tests/server_protocol.test.mjs` Section 3 verifies third client connection receives `room-full`.

---

### NET-02: Premature Peer Eviction on Mobile Transient Network Blips
- **Severity**: P1 (Multiplayer Stability)
- **Component**: `server.js` & `src/avatars/multiplayer.js`
- **Root Cause**: Dropping a TCP connection immediately purged the visitor's state, vacated their seat, and told the partner they left permanently, causing disruptive avatar popping when a mobile device switched cell towers or Wi-Fi.
- **Reproduction**: Briefly disconnect client socket for 3 seconds.
- **Expected**: Partner notified of temporary reconnection state; slot and seat reserved for a 30-second grace window.
- **Actual**: Avatar vanished immediately; seat unassigned; reconnecting user assigned a fresh avatar ID.
- **Permanent Fix**: Added `graceSessions` map retaining participant slot and seat for 30 seconds. Broadcasted `{ type: "peer_status", status: "reconnecting" }`. Restores session smoothly on reconnect within 30 seconds.
- **Verification**: `tests/server_protocol.test.mjs` Section 7 tests 30s grace window and successful reconnection restoration.

---

### STATE-01: Multi-Seat Occupancy Invariant Violation on Seat Switching
- **Severity**: P1 (State Synchronization)
- **Component**: `server.js` (Message handler `sit`)
- **Root Cause**: When a player walked from bench 1 to sofa 1 and sent a `sit` message for sofa 1 without explicitly sending `stand`, the server registered sofa 1 without vacating bench 1. Consequently, bench 1 remained locked permanently.
- **Reproduction**: Send `sit` on seat A, then immediately send `sit` on seat B.
- **Expected**: Seat A is automatically released, broadcasting `stand` to partner; seat B is claimed.
- **Actual**: Both seat A and seat B marked as occupied by the same peer.
- **Permanent Fix**: Enforced single-seat invariant in `server.js`: Before assigning a new seat, iterate through `occupiedSeats` and remove any seat previously occupied by that peer, broadcasting `{ type: "stand", seatId: oldSeatId }`.
- **Verification**: `tests/server_protocol.test.mjs` Section 6 verifies atomic vacating of old seat on seat switch.

---

### STATE-02: Seat Anchor Offset Scale Collapse in Dynamic Scaling
- **Severity**: P1 (Visual / Physics)
- **Component**: `src/game/room/placedItems.js` & `src/game/room/artifactRegistry.js`
- **Root Cause**: Seat attachment offsets defined in centimeters were multiplying against model local scale transforms twice, resulting in sit positions hovering 5cm off the floor or embedded inside cushions.
- **Reproduction**: Sit on any placed salon armchair or bench.
- **Expected**: Character avatar sits precisely at cushion level (~0.45m above floor).
- **Actual**: Character feet clipped through floor or floated in air.
- **Permanent Fix**: Normalized all seat offsets in `artifactRegistry.js` to real-world meters at final visual scale.
- **Verification**: `tests/seats.test.mjs` validates unscaled meter offsets and safe 0.7m forward stand-up positioning.

---

### STATE-04: Premature Message Flush Prior to Server `room_state` ACK
- **Severity**: P1 (Multiplayer Race Condition)
- **Component**: `src/net/wsClient.js`
- **Root Cause**: The client WebSocket message queue was flushing immediately upon the socket `open` event, prior to receiving the server's protocol `room_state` ACK. On slow network handshakes, early movement or emote packets were discarded by the server as unauthenticated.
- **Reproduction**: Send rapid movements immediately upon connecting over simulated high-latency connection.
- **Expected**: Outgoing gameplay messages buffered until handshake completes and `room_state` is received.
- **Actual**: Messages dropped or rejected by server.
- **Permanent Fix**: Buffered outbound messages until `room_state` packet is received and processed.
- **Verification**: Validated in end-to-end connection flow in protocol test suite.

---

### ANIM-01: Inclusion of Excluded "Clap" Emote & Hotkey Collision
- **Severity**: P1 (Design Compliance)
- **Component**: `src/avatars/emotes.js`
- **Root Cause**: A legacy "Clap" emote was present in the emote mapping table and bound to key `4`, violating the approved emote list specification (only Wave, Dance, and Nod permitted).
- **Reproduction**: Inspect `emotes.js` or press key `4` in-game.
- **Expected**: Only approved emotes 1 (Wave), 2 (Dance), and 3 (Nod) exist.
- **Actual**: Key `4` triggered an unapproved clapping animation.
- **Permanent Fix**: Completely removed `clap` from `emotes.js`, UI drawer, and server-side emote validation clamp (`[1, 2, 3]`).
- **Verification**: `tests/emotes.test.mjs` asserts emote table contains only approved IDs 1-3.

---

### CAM-01: Coupling of Camera Orbit to Character Physical Orientation
- **Severity**: P1 (Engine / Camera)
- **Component**: `src/engine/engine.js`
- **Root Cause**: The mouse-drag orbit implementation directly modified the avatar's physics yaw angle `player.rotation.y`. As a result, rotating the camera to inspect Maya's face rotated her body away from the camera, and broadcasted false movement packets to the partner.
- **Reproduction**: Drag mouse horizontally while stationary.
- **Expected**: Camera rotates around avatar in 360° orbit; avatar remains stationary facing original direction.
- **Actual**: Avatar spun in place with camera; partner saw avatar twitching.
- **Permanent Fix**: Decoupled camera yaw via `cameraYawOffset` and `targetYawOffset`. Follow mode synchronizes with avatar yaw; Orbit mode rotates camera smoothly without touching character rotation.
- **Verification**: Verified in `src/engine/engine.js` frame loop and manual orbit inspection checklist.

---

### CAM-02: Seated Camera Orbit Geometry Clipping & Missing Front View
- **Severity**: P1 (Camera / UI)
- **Component**: `src/engine/engine.js` & `src/main.js`
- **Root Cause**: While seated, camera look target was pegged to character root bone which displaced under furniture cushions, causing camera clipping. Additionally, there was no quick front-facing portrait shortcut.
- **Reproduction**: Sit on couch; try to orbit camera to see face.
- **Expected**: Camera orbits smoothly around furniture anchor; one-tap front view frames face instantly.
- **Actual**: Camera clipped inside couch backrest; impossible to frame face easily.
- **Permanent Fix**: Anchored seated camera target to furniture seat center. Added `setFrontView()` (Hotkey `V`) setting `targetYawOffset = Math.PI` to smoothly frame avatar face from front.
- **Verification**: Manual camera mode test matrix passed.

---

### MOBILE-01: Incomplete Mobile Touch Controls for Orbit & Action Drawer
- **Severity**: P1 (Mobile UX)
- **Component**: `src/main.js` & `src/style.css`
- **Root Cause**: Mobile touch interface lacked dedicated look zone swipes, camera mode toggles, and gesture trigger buttons.
- **Reproduction**: Load application on iOS Safari or Android Chrome touch viewport.
- **Expected**: Full virtual joystick movement, right-half touch look swipe, and touch action pills for Orbit, Front View, and Gestures.
- **Actual**: Mobile visitor could only move blindly without camera panning or emote access.
- **Permanent Fix**: Built responsive mobile touch overlay with virtual analog joystick, swipe look zone, and touch action buttons (`ORBIT`, `FACE`, `EMOTES`).
- **Verification**: Verified touch event handlers and responsive layout.

---

### UI-01: Absence of Ticket Validation Loading & Feedback States
- **Severity**: P2 (User Experience)
- **Component**: `src/main.js`
- **Root Cause**: Entering an invalid ticket code caused the modal to stall with no error message, leaving visitors unaware of why access was withheld.
- **Reproduction**: Enter incorrect passcode into ticket modal and submit.
- **Expected**: Clear error message "Pass invalid or expired" with shake animation and re-enabled input.
- **Actual**: No visual feedback; silent failure.
- **Permanent Fix**: Added validating spinner, error alert banner, and auto-focus recovery on rejection.
- **Verification**: Verified in ticket pass UI interaction flow.

