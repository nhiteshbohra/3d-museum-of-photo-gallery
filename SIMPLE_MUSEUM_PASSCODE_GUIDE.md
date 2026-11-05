# Our Museum 3D — Permanent Passcode & Quick Entrance Guide

## 1. Single Port Architecture (Port 8080)
The entire application (Vite build bundle, static assets, HTTP API, and WebSocket multi-peer sync) runs on a single unified port:
- **Web App**: `http://localhost:8080/` (or `http://127.0.0.1:8080/`)
- **WebSocket Protocol**: `ws://localhost:8080/ws` (Protocol v2)

Both `npm run dev` and `npm start` automatically:
1. Rebuild the frontend bundle into `dist/`.
2. Clear any lingering stale processes on port 8080.
3. Start the Node.js server.

---

## 2. Default Permanent Passcode: `290512`
The permanent passcode is configured as:
- **Passcode**: `290512` (or formatted as `29 05 12` / `29-05-12`)
- **Recipient**: `Maya & Ethan`
- **Expires**: Year 2036

Both visitors (Maya on one browser, Ethan on another browser) can enter `290512`. Each visitor automatically receives their own distinct, secure session token so there are zero session collisions.

---

## 3. How to Start the Museum
From PowerShell:
```powershell
cd F:\projects\3dmuseum
npm start
```
Then open `http://127.0.0.1:8080/` in your browser.
Enter `290512` and click **Verify Pass**.

---

## 4. Resetting or Setting Custom Passcodes
You can easily manage passcodes without touching JSON files manually:

- **Reset stale sessions and restore default permanent passcode `290512`**:
  ```powershell
  npm run invite -- reset
  ```

- **Set a custom permanent passcode**:
  ```powershell
  npm run invite -- set "YOUR_PASSCODE" "Maya & Ethan"
  ```

- **List active passcodes**:
  ```powershell
  npm run invite -- list
  ```

---

## 5. Entering with Two Visitors
1. Open `http://127.0.0.1:8080/` in Chrome / Edge.
2. Enter `290512` and choose **Maya**, then click **ENTER SANCTUARY**.
3. Open an Incognito window or second browser (e.g. Edge).
4. Go to `http://127.0.0.1:8080/`, enter `290512`, choose **Ethan**, then click **ENTER SANCTUARY**.
5. Both visitors will see each other in real time with synchronized movements, animations, and seating.
