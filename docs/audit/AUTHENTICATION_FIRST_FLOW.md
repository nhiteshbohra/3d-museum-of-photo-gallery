# Authentication-First Experience Architecture & Flow

**Environment:** Production Hardened  
**Target:** Private 3D Museum of Photo Gallery  
**Branch:** `fix/production-hardening`  

---

## 1. Executive Summary

In previous builds, the 3D museum asset loader initialized Three.js and requested resources (including 3D models, room geometry, private photos, and personal letters) before verifying whether the visitor possessed a valid private invitation pass.

Under the hardened **Authentication-First** gate (P0):
- **Zero Asset Leakage**: The client displays strictly the private invitation/passcode redemption card.
- **Uninitialized Three.js Scene**: WebGL renderers, Three.js scenes, camera controllers, and network sockets are not initialized until an invitation is verified by the backend.
- **Protected Endpoints**:
  - `GET /photos/*` returns `401 Unauthorized` without a valid `museum_session` cookie.
  - `GET /api/letters` returns `401 Unauthorized` without a valid `museum_session` cookie.
  - `GET /api/config` exposes only sanitized public configuration, omitting invitations and master passcodes.
  - WebSocket upgrades (`/ws`) require an authenticated session and reject unauthenticated connections immediately (`close(4003, 'unauthorized')`).

---

## 2. Authentication Sequence Flow

```
Visitor Browser                                  Node.js Hardened Server
       |                                                    |
       |  1. GET / (Index page loaded)                      |
       |--------------------------------------------------->|
       |  2. Returns minimal shell (Ticket card visible,    |
       |     #entrance-loading hidden, Three.js unstarted)   |
       |<---------------------------------------------------|
       |                                                    |
       |  3. Visitor submits Invitation Code                |
       |     POST /api/invite/redeem { code: "maya-love" }  |
       |--------------------------------------------------->|
       |                                                    | [Validate Invite & Issue Token]
       |  4. Set-Cookie: museum_session=<token>; HttpOnly   |
       |     { ok: true, recipient: "Maya" }                |
       |<---------------------------------------------------|
       |                                                    |
       |  5. Authenticated Entrance Init:                   |
       |     - Fetch private letters (/api/letters)         |
       |     - Initialize Three.js engine                   |
       |     - Prepare avatar selector & initial room shell |
       |--------------------------------------------------->|
       |                                                    |
       |  6. User clicks "Enter Museum"                     |
       |     WebSocket Upgrade: GET /ws (Cookie attached)   |
       |--------------------------------------------------->|
       |                                                    | [Validate Cookie & Session]
       |  7. WebSocket Connected (Proto v2)                 |
       |     Client sends: { t: 'join', name, model }       |
       |--------------------------------------------------->|
       |  8. Server broadcasts { t: 'room_state' }          |
       |<---------------------------------------------------|
```

---

## 3. Session Security Controls

| Security Control | Implementation | Verification Status |
|---|---|---|
| **Cookie Flagging** | `HttpOnly; SameSite=Lax; Path=/; Max-Age=86400; Secure` (when HTTPS) | Verified (`server_protocol.test.mjs`) |
| **Zero Token Body Leak** | `/api/invite/redeem` returns `{ ok: true, recipient }` with no session token in body | Verified |
| **Session Revocation** | `revokeInvite(code)` invalidates active HTTP sessions and drops active WebSockets across processes | Verified |
| **Max Capacity** | Max 2 authenticated human visitors per private museum sanctuary | Verified |
| **Origin Policy** | Strict `/ws` path gating, origin host whitelist or null/same-origin safety | Verified |

