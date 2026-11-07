# Project: 3D Museum — Multi-Customer Photo Management & Audit Hardening

## Architecture
The system provides a private, authenticated two-visitor 3D museum built on Three.js, Node.js (HTTP + WebSocket), and Vite.
Multi-customer photo management introduces multi-tenant isolation where each customer has their own photo gallery, salon quotes, and real-time multiplayer room, while maintaining 100% backward compatibility for the legacy/default museum.

```
                           Public Internet
                                  │
                                  ▼
                     [Node.js Server: server.js]
             ┌────────────────────┴────────────────────┐
             ▼                                         ▼
   Static / Web Shell                     API & WebSocket Router
   (/, /gallery/:slug)                    (/api/*, /photos/*, /ws)
             │                                         │
             │                           ┌─────────────┴─────────────┐
             ▼                           ▼                           ▼
      Vite SPA Shell             Session Scoping             Admin Management
     (dist/index.html)        (extractSessionToken)          (/api/admin/*)
             │                           │                           │
             │            ┌──────────────┴──────────────┐            │
             │            ▼                             ▼            ▼
             │      Customer Session            Default Session  scripts/customerStore.js
             │      (session.customerSlug)      (no slug)            │
             │            │                             │            ▼
             │            ▼                             ▼      data/master.json
             │    data/customers/<slug>/          public/photos/  data/customers/
             │    ├── photos/ (75 slots)          data/letters.json
             │    ├── quotes.json                 data/museum_config.json
             │    └── customerRooms (2 max)
             │
             └─► Client loads /photos/<room>/<slot>.png
                 Server authoritatively serves from session folder!
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Master Map Loader | Reads `data/master.json` on startup and caches with mtime/fs.watch | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §4 |
| 2 | `/gallery/:slug` Page Delivery | Serves museum web shell configured for requested customer | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §4–5 |
| 3 | Default / Legacy Route Fallback | Serves default museum and public assets when no slug in URL | M1 | `server.js` |
| 4 | Customer Passcode Verification | Verifies customer passcode using timing-safe comparison | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §5 & §7 |
| 5 | Session Customer Binding | Binds authenticated session to customer slug (`session.customerSlug`) | M1 | `scripts/inviteStore.js` |
| 6 | Customer Folder Hierarchy | Standard folder structure per customer with 75-slot photo subdirs | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §3 |
| 7 | 75-Slot Photo Mapping | Exact 75 slots: 3 lobby (`00_grand_lobby`), 12 in each of 6 salons | M1 | `tools/organize_photos.py` |
| 8 | Server-Authoritative Photo Scoping | Serves `/photos/*` strictly from session's customer folder | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §7 |
| 9 | Cross-Customer Access Denial | Blocks customer A from accessing customer B's photos (403/404) | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §7 |
| 10 | Photo Catalog Endpoint | Returns JSON array of all 75 slots indicating presence | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §5 & §10 |
| 11 | Customer Config Scoping | Returns customer-specific theme and couple names without secrets | M1 | `server.js` |
| 12 | Customer Salon Quotes Scoping | Delivers custom letters and dates from `data/customers/<slug>/quotes.json` | M1 | `server.js` |
| 13 | Customer-Scoped WS Rooms | Partitions WebSocket multiplayer rooms by customer slug | M1 | `server.js` |
| 14 | Admin API Founder Auth | Separate founder login independent of customer passcodes | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2–6.3 |
| 15 | Admin Session Check & Logout | Verifies or terminates current founder admin session | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2 |
| 16 | Admin List Customers | Lists all customer profiles from `master.json` with slot fill stats | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2 |
| 17 | Admin Create Customer Skeleton | Creates customer folder structure, JSON files, and master entry | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2 |
| 18 | Admin Get Customer Full State | Fetches metadata, config, quotes, and photo slot status | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2 |
| 19 | Admin Update Customer Identity | Modifies display name, plan, status (`active`/`draft`/`paused`) | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2 |
| 20 | Admin Reset Customer Passcode | Updates passcode (stored hashed) and session duration | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2 |
| 21 | Admin Revoke Customer Sessions | Instantly invalidates all sessions and evicts active WebSocket peers | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2 & §7 |
| 22 | Admin Update Active Window | Sets `activeFrom` and `activeUntil` date thresholds | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2 |
| 23 | Admin Replace Quotes | Overwrites `quotes.json` with updated salon letters and dates | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2 |
| 24 | Admin List 75 Photo Slots | Reports which of the 75 slots have images uploaded on disk | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2 |
| 25 | Admin Slot Photo Upload | Uploads image to specific room/slot; converts to PNG | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2 |
| 26 | Admin Slot Photo Delete | Deletes photo from specific slot (reverting to empty frame) | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2 |
| 27 | Admin Delete Customer | Removes customer from `master.json`, archives data, revokes sessions | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.2 |
| 28 | Admin Audit Logging | Logs every admin write action with before/after state snapshots | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §6.3 |
| 29 | Tooling: Photo Organizer `--customer` | Organizes photos directly into `data/customers/<slug>/photos/` | M1 | `MULTI_CUSTOMER_PHOTO_MANAGEMENT.md` §9 |
| 30 | Git Protection | Add `data/master.json` and `data/customers/**/*` to `.gitignore` | M1 | `AGENTS.md` Invariant 1 & 8 |
| 31 | R-01 Salon Wall Sconce Removal | Remove 4 decorative GLB wall lights from non-lobby salons in `src/game/room.js` | M2 | `MUSEUM_INDEPENDENT_RECHECK_0b2ac12_2026-11-07.md` |
| 32 | R-01 Test Suite Updates | Update `tests/adversarial_salon_lights_m10.test.mjs` & `tests/layout.test.mjs` for 0 lights | M2 | `MUSEUM_INDEPENDENT_RECHECK_0b2ac12_2026-11-07.md` |
| 33 | R-02 Dynamic Import of Character Setup | Defer Three.js load in `src/main.js`, configure Rollup chunks in `vite.config.js` | M2 | `MUSEUM_INDEPENDENT_RECHECK_0b2ac12_2026-11-07.md` |
| 34 | R-05 Correct `VERIFICATION.md` | Fix coordinates ($y=2.20\text{m}$), IDs, duplicated sections, align decor policy | M2 | `MUSEUM_INDEPENDENT_RECHECK_0b2ac12_2026-11-07.md` |
| 35 | Multi-Customer Automated Tests | Implement `tests/multi_customer_isolation.test.mjs`, `customer_admin_api.test.mjs` | M1 | Survey Blueprint |
| 36 | Final Verification Execution | Run `npm test`, `npm run check`, Node test scripts, Playwright suite | M3 | System Directive |
| 37 | Clean Git Commit | Commit all changes cleanly with informative commit message | M3 | User Sequence Directive |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Multi-Customer Photo Management | Implement `scripts/customerStore.js`, `master.json`, server-authoritative `/photos/*` scoping, WebSocket room partitioning, `/api/admin/*` endpoints, `--customer` CLI flags, `.gitignore`, and unit/isolation tests | none | DONE |
| M2 | Audit Recheck Issue Resolution | R-01 (remove salon sconce GLBs, update tests), R-02 (dynamic import `characterSetup`, Rollup chunks, eliminate pre-auth Three.js), R-05 (correct `docs/agent-work/VERIFICATION.md`) | M1 | DONE |
| M3 | Verification Suite & Final Commit | Execute all test suites (`npm test`, `npm run check`, `node tests/two_client_test.mjs`, etc.), verify clean exit codes, create git commit | M1, M2 | IN_PROGRESS (Conv: 7fbfd96a-dff5-4aab-898c-c831beeedbb8) |

## Interface Contracts
### Client ↔ Server Photo Scoping Contract
- **Request**: `GET /photos/<room>/<slot>.png`
- **Headers**: `Cookie: museum_session=<token>`
- **Server Behavior**:
  - Validates session. Missing/invalid -> HTTP 401.
  - If `session.customerSlug` is set: serves file from `data/customers/<session.customerSlug>/photos/<room>/<slot>.png`.
  - Path traversal check: must resolve within customer photos directory.
  - If `session.customerSlug` is absent/default: serves from `public/photos/<room>/<slot>.png` (legacy test compatibility).

### Admin Management Contract (`/api/admin/*`)
- **Authentication**: `POST /api/admin/auth/login` with `{ username, password }`. Issues `admin_session` cookie.
- **Customer CRUD**:
  - `GET /api/admin/customers`: lists customers from `master.json`.
  - `POST /api/admin/customers`: creates skeleton directory and config.
  - `PUT /api/admin/customers/:slug/access`: resets passcode (stored hashed with scrypt).
  - `DELETE /api/admin/customers/:slug/access/sessions`: evicts active sessions and terminates active WS connections in `customerRooms.get(slug)`.
  - `POST /api/admin/customers/:slug/photos/:room/:slot`: saves photo bytes.

### WebSocket Multi-Tenant Isolation Contract
- Each client connection on `/ws` with a valid session joins `customerRooms.get(session.customerSlug)`.
- Capacity (max 2 players), character reservation (`maya` vs `ethan`), seat locks, and chat broadcast are strictly isolated within that customer's room map.

## Code Layout
- `scripts/customerStore.js`: Customer data storage, `master.json` management, scrypt hashing, photo slot file management.
- `scripts/inviteStore.js`: Session management with `customerSlug` binding.
- `server.js`: Static routing (`/gallery/:slug`), scoped `/photos/*`, WebSocket customer room routing, `/api/admin/*` endpoints.
- `src/game/room.js`: Non-lobby salon wall light GLBs removed (R-01).
- `src/main.js`: Dynamic import of `characterSetup` (R-02).
- `vite.config.js`: Rollup chunking to isolate Three.js post-auth (R-02).
- `docs/agent-work/VERIFICATION.md`: Corrected audit documentation (R-05).
- `tests/multi_customer_isolation.test.mjs`: Isolation and access control tests.
- `tests/customer_admin_api.test.mjs`: Admin API tests.
- `tests/adversarial_salon_lights_m10.test.mjs`: Updated for 0 salon wall lights.
- `tests/layout.test.mjs`: Updated for 0 salon wall lights.
