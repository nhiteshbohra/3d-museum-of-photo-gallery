# Our Museum 3D — Production Deployment Guide

This guide describes how to run and expose **Our Museum 3D** in production with full two-player synchronization, Cloudflare Tunnel HTTPS, and process resilience.

---

## 1. Quick Prerequisites

- **Node.js**: v20+ (ESM support with import attributes)
- **Production Build**: Built static bundle under `dist/`
- **Static Assets**: Ready 3D models and salon photography under `public/`

Build the client before starting the production server:
```powershell
npm run build
```

---

## 2. Environment Configuration & Private Invitations

### 2.1 Server-Side Invitation Management CLI (AUTH-01..03, Q2)
Access to private photos, personal letters, and live multiplayer synchronization requires a valid server-issued invitation pass. Invitations are managed through the Windows-compatible CLI without exposing any public administrative endpoints.

```powershell
# List all active, redeemed, and expired invitations
npm run invite list

# Create a new invitation for a participant (with custom expiration in hours and optional code)
# Syntax: node scripts/invite.mjs create <Name> [ttlHours] [customCode]
npm run invite create Maya 48 maya-love
npm run invite create Ethan 48 ethan-love

# Revoke an invitation immediately (also terminates active sessions bound to it)
npm run invite revoke maya-love
```

### 2.2 Environment Variables
Copy `.env.example` to `.env` or set environment variables in your deployment environment:

```env
PORT=8080
HOST=0.0.0.0
MUSEUM_PASSCODE=
ALLOWED_ORIGINS=https://our-museum.yourdomain.com
TRUST_PROXY=1
LOG_LEVEL=info
```

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | Port for the HTTP/WebSocket server |
| `HOST` | `0.0.0.0` | Host interface binding |
| `MUSEUM_PASSCODE` | *(empty)* | Optional master passcode fallback |
| `ALLOWED_ORIGINS` | *(empty = any)* | Comma-separated list of allowed domains for WebSocket connections |
| `TRUST_PROXY` | `1` | Set to `1` when behind Cloudflare to inspect `CF-Connecting-IP` |
| `LOG_LEVEL` | `info` | Server console log verbosity |

---

## 3. Running with PM2 (Recommended for Node)

Install PM2 globally if not already installed:
```powershell
npm install -g pm2
```

Start the hardened server with auto-restart:
```powershell
pm2 start server.js --name "our-museum-3d" --time
pm2 save
```

To configure PM2 to start on system boot (Windows):
```powershell
npm install -g pm2-windows-service
pm2-service-install
```

Commands:
- `pm2 status` — view uptime and memory usage
- `pm2 logs our-museum-3d` — view real-time access and peer connection logs
- `pm2 restart our-museum-3d` — graceful restart

---

## 4. Alternative: Running as Windows Service with NSSM

If preferred over PM2, use [NSSM (Non-Sucking Service Manager)](https://nssm.cc):
```powershell
# In an Administrator PowerShell terminal:
nssm install OurMuseum3D "node" "F:\projects\3dmuseum\server.js"
nssm set OurMuseum3D AppDirectory "F:\projects\3dmuseum"
nssm set OurMuseum3D AppStdout "F:\projects\3dmuseum\server.log"
nssm set OurMuseum3D AppStderr "F:\projects\3dmuseum\server_error.log"
nssm start OurMuseum3D
```

---

## 5. Exposing via Cloudflare Tunnel (HTTPS & WSS)

Cloudflare Tunnel provides free, secure HTTPS and WebSocket tunneling without opening inbound firewall ports.

1. Install `cloudflared`:
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```
2. Log in and create a tunnel:
   ```powershell
   cloudflared tunnel login
   cloudflared tunnel create our-museum
   ```
3. Configure `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: <TUNNEL_UUID>
   credentials-file: C:\Users\<USER>\.cloudflared\<TUNNEL_UUID>.json

   ingress:
     - hostname: our-museum.yourdomain.com
       service: http://localhost:8080
     - service: http_status:404
   ```
4. Route your domain:
   ```powershell
   cloudflared tunnel route dns our-museum our-museum.yourdomain.com
   ```
5. Run the tunnel as a service:
   ```powershell
   cloudflared service install
   ```
*(Note: Cloudflare automatically enables WebSocket support for free accounts.)*

---

## 6. Pre-flight Health & Verification Checklist

Before inviting Maya & Ethan:
1. **Health check**:
   ```powershell
   curl http://localhost:8080/healthz
   # Expect: {"ok":true,"peers":0,"uptime":...}
   ```
2. **Security allowlist**:
   ```powershell
   curl http://localhost:8080/server.js
   # Expect: 404 Not Found
   curl http://localhost:8080/package.json
   # Expect: 404 Not Found
   ```
3. **Automated test suite**:
   ```powershell
   npm run check
   npm test
   ```
4. **Two-Device Smoke Test**:
   - Device 1 (Computer): Join as Maya, walk to Fireside salon, sit on couch.
   - Device 2 (Phone / Laptop): Join as Ethan, navigate to Fireside via partner panel, verify Maya's seated pose is identical.

