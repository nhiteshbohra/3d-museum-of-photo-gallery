# Multiplayer Avatar Visibility & Synchronization — Root Cause Analysis

**Environment:** Production Hardened  
**Target:** Private 3D Museum of Photo Gallery  
**Branch:** `fix/production-hardening`  

---

## 1. Defect Description

In early testing of two-user multiplayer, visitors entering the lobby could join the session, but:
1. Visitor A (Maya) could not see Visitor B (Ethan), and Visitor B could not see Visitor A.
2. Even when presence indicators appeared in the HUD, remote 3D character avatars were either missing from the scene, invisible, or spawned inside walls at `(0,0,0)`.

---

## 2. Root Cause Breakdown

### Root Cause 1: Deferred Avatar Visibility Blocked by Animation Queue
- **Original Behavior**: In `src/avatars/avatarWorld.js`, `this.applyRoom(this.room)` was only invoked *after* all 20+ skeletal animation clips finished loading over the network.
- **Defect Impact**: If any secondary animation clip took time to stream or hit browser connection limits, `this.group.visible` remained `false` indefinitely, or the avatar was not attached to the room hierarchy.
- **Hardened Fix**: Separated mesh attachment from animation streaming. `this.applyRoom(this._visibleRooms || this.room || 'lobby')` is called immediately when `this.root` is added to `this.group`. The 3D avatar mesh renders instantly, while animation clips load asynchronously in the background.

### Root Cause 2: Missing Initial Spawn Coordinates in Server Room State
- **Original Behavior**: When a client connected and joined, the server emitted `{ t: 'room_state', peers: [...] }` containing peer IDs, names, and rooms, but omitted position (`p`) and rotation (`ry`).
- **Defect Impact**: Remote avatars spawned at `[0, 0, 0]`, clipping below the floor or inside gallery walls until the remote player moved.
- **Hardened Fix**: Updated `server.js` to serialize full transforms (`p: peer.p, ry: peer.ry, anim: peer.anim, mode: peer.mode, seated: peer.seated`) in both `room_state` and `peer_joined` broadcasts.

### Root Cause 3: WebSocket Event Registration Ordering Race Condition
- **Original Behavior**: In `src/avatars/multiplayer.js`, `connectNet(wsUrl)` was called *before* `onNet('status', ...)` was registered.
- **Defect Impact**: When WebSocket connections established quickly (e.g. localhost or low-latency networks), the `'open'` event fired before the listener was attached, causing `doJoin()` never to execute.
- **Hardened Fix**: Registered `onNet('message')` and `onNet('status')` before calling `connectNet(wsUrl)`, and added an immediate `if (netConnected()) doJoin()` fallback check.

### Root Cause 4: Model Filename & Path Normalization
- **Original Behavior**: Avatar profiles in `characters.json` specified `model: "woman.glb"` and `model: "man.glb"`. In some paths, the code concatenated `models/ready/characters/` without checking if a path was already qualified or relative.
- **Defect Impact**: Some loaders requested `models/ready/characters/models/ready/characters/woman.glb`, resulting in 404s for remote avatar GLBs.
- **Hardened Fix**: Implemented normalized model path resolution in `avatarWorld.js`:
  ```javascript
  const url = modelUrl.startsWith('models/') || modelUrl.startsWith('/')
    ? modelUrl
    : `models/ready/characters/${modelUrl}`
  ```

---

## 3. Resolution Verification

- Node-based multi-client verification (`tests/two_client_test.mjs`):
  - Maya and Ethan redeem passes.
  - Maya connects -> `room_state` contains 1 peer.
  - Ethan connects -> `room_state` contains 2 peers; Maya receives `peer_joined` for `Ethan` with `model: "man.glb"`.
  - Ethan sends movement update (`[1.5, 1.7, -3.2]`, `anim: 'walk'`) -> Maya receives real-time state update.
  - Emote sync (`wave`, `dance`, `nod`) verified.
- End-to-end multi-browser test (`tests/server_protocol.test.mjs`):
  - 100% passed across all 10 test suites.
