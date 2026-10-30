# Museum Developer & QA Tools

> [!NOTE]
> **Is Python required to run the 3D Museum?**
> **No.** The 3D Museum runs 100% on **Node.js** (`server.js`) and client-side WebGL (Three.js).
> Python is strictly optional and only used for headless browser automated quality assurance testing (Playwright).

---

## 🛠️ Folder Contents

### `tools/qa/verify_museum.py`
Automated headless end-to-end test suite:
- Loads `http://localhost:8080/index.html?offline=true`
- Confirms zero console errors
- Verifies 41 interactive artworks in 3D beveled walnut frames
- Verifies all 7 salons (Rotunda, Fireside Lounge, Music Salon, Library Nook, Grand Monolith, Glass Orangery, Secret Promise Alcove)
- Verifies sliding wall collision on $Y = 0.0$ flat ground
- Verifies Lighting & Atmosphere Controller modal and sliders

**Usage:**
```bash
python -u tools/qa/verify_museum.py
```

---

### `tools/qa/verify_multiplayer.py`
Automated dual-browser real-time WebSocket synchronization test:
- Spawns two independent Chrome instances simultaneously (Player 1: Maya, Player 2: Ethan)
- Simulates keyboard navigation in Browser 1
- Measures and asserts sub-millimeter position synchronization in Browser 2 over WebSockets

**Usage:**
```bash
python -u tools/qa/verify_multiplayer.py
```

---

### `tools/qa/server_sync_alternative.py`
An optional standalone Python WebSocket server (`websockets` library) for developers who prefer running a separate Python WebSocket backend instead of the unified Node.js `server.js`.

