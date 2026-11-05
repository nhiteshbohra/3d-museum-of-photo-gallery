# Our Museum 3D — Simple Invitation Pass Setup (Windows)

## Important
The app already stores invitation passes and sessions in `data/invites.json`. **Do not create a separate manually edited passcode database.** Use the provided CLI. This file contains live bearer session tokens and must remain private and excluded from Git. The user previously pasted session tokens; invalidate those sessions and create new codes.

## Commands on the machine actually running the museum backend
```powershell
cd F:\projects\3dmuseum
npm run invite -- list
npm run invite -- create "Maya" 24
npm run invite -- create "Ethan" 24
npm start
```

The create commands print fresh invitation codes. Enter the codes on the private pass screen, one for each visitor. `24` is the number of validity hours. Share passcodes privately, not in GitHub or chat. `npm start` starts the Node backend with the authenticated invite API; `npm run dev` starts the Vite development frontend alone and may not serve `/api/invite/redeem` or `/ws` unless proxy and backend are configured.

If running Vite for frontend development, start the Node backend separately and configure a proxy for `/api` and `/ws`, or use the backend server against a built frontend:
```powershell
npm run build
npm start
```

Open the local backend address printed by `npm start` rather than assuming the Vite development address is the same.

## Securing previously exposed sessions
1. Stop the backend and make a private backup of `data/invites.json` outside the public repository.
2. Revoke the exposed invitation codes through `npm run invite -- revoke <CODE>` or, if resetting all passes, delete the existing invite/session store **only after making a backup and confirming no other active invitations need preservation**.
3. Start the backend and generate fresh random invitation codes with `npm run invite -- create`.
4. Verify old codes and cookies fail, and new invitations work. Avoid hardcoded default seeds returning known codes when the store is recreated.
5. Confirm `.gitignore` includes `data/invites.json`; if ever tracked, untrack it with Git while preserving the local file, then assess Git history exposure.

## Testing two users
Use two separate browsers or private browser profiles with different credentials. Each enters through the invitation screen, joins the same lobby and checks remote avatar visibility. There is a limit of two visitors and a 30-second reconnect grace.

## Troubleshooting
- Redeemed status means **used before**, not necessarily invalid; expiration and revocation are the actual restriction. The current implementation may allow renewing a redeemed code unless changed.
- 404 on `/api/invite/redeem`: you are probably opening Vite directly rather than the backend or a configured reverse proxy.
- WebSocket fails: verify the Node backend is listening and Cloudflare Tunnel points at the correct backend port.
- An invite CLI on a different folder or machine updates a different `data/invites.json` and will not affect the server.
