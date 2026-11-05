/**
 * OUR MUSEUM 3D • HARDENED PRODUCTION NODE.JS SERVER
 *
 * Hosts static assets (HTML, CSS, JS, GLB 3D models, textures, audio/video)
 * strictly from dist/ (production) and public/ (fallback) with zero path traversal,
 * and provides real-time 2-player WebSocket synchronization on the SAME port.
 *
 * Security & Reliability:
 * - Strict static root allowlist (dist/ and public/ only)
 * - Traversal protection: 404 for server.js, package.json, dotfiles, src/, docs/
 * - Crash-proof: guarded decodeURIComponent, strict Range validation, stream error handlers
 * - Unified session room ('our-home') with a hard 2-player cap across all museum locations
 * - WebSocket payload limit (2048 bytes), origin check, 30s ping/pong heartbeat
 * - Server-authoritative atomic seat reservation map (SEAT-03)
 * - Timing-safe passcode authentication (MUSEUM_PASSCODE)
 * - Health endpoint (/healthz) and client config API (/api/config)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { validateSession, redeemInvite, createInvite, listInvites, revokeInvite, getStorePath } from './scripts/inviteStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LETTERS_FILE = path.join(__dirname, 'data', 'letters.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'museum_config.json');

// Port & Host configuration
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Optional Passcode & Security Settings
const MUSEUM_PASSCODE = (process.env.MUSEUM_PASSCODE || '').trim();
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  : null;
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';

// Static file roots (in priority order: dist/ production build first, public/ asset fallback)
const ROOTS = [
  path.join(__dirname, 'dist'),
  path.join(__dirname, 'public')
];

// MIME types table
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm'
};

// =========================================================================
// 1. STATIC PATH RESOLUTION & ALLOWLIST (SEC-01 & SEC-02)
// =========================================================================

function resolveStatic(rawUrlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(rawUrlPath);
  } catch {
    return null; // Malformed percent-encoding
  }

  // Null byte injection check
  if (decoded.includes('\0')) return null;

  // Map root to /index.html
  if (decoded === '/' || decoded === '') {
    decoded = '/index.html';
  } else if (decoded === '/admin' || decoded === '/admin/') {
    decoded = '/admin.html';
  }

  // Probe allowed roots
  for (const root of ROOTS) {
    if (!fs.existsSync(root)) continue;

    // Resolve relative to root
    const candidate = path.resolve(root, '.' + path.sep + decoded.replace(/^[\/\\]+/, ''));

    // Boundary check: candidate must reside strictly inside root
    if (candidate === root || candidate.startsWith(root + path.sep)) {
      try {
        const stats = fs.statSync(candidate);
        if (stats.isFile()) {
          return { filePath: candidate, stats };
        } else if (stats.isDirectory()) {
          const indexCandidate = path.join(candidate, 'index.html');
          if (fs.existsSync(indexCandidate)) {
            const indexStats = fs.statSync(indexCandidate);
            if (indexStats.isFile()) return { filePath: indexCandidate, stats: indexStats };
          }
        }
      } catch {}
    }
  }

  return null;
}

// IP extraction helper
function getClientIp(req) {
  if (TRUST_PROXY) {
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp) return String(cfIp).trim();
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// Passcode rate limiting (IP -> attempts[])
const passcodeAttempts = new Map();
function checkPasscodeRate(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const attempts = passcodeAttempts.get(ip) || [];
  const valid = attempts.filter(t => now - t < windowMs);
  if (valid.length >= 10) return false;
  valid.push(now);
  passcodeAttempts.set(ip, valid);
  return true;
}

// Session token extraction helper (AUTH-01..03, Q2, Q6)
function extractSessionToken(req) {
  if (!req) return null;
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers && req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  // 2. Cookie: museum_session=<token>
  const cookieHeader = req.headers && req.headers['cookie'];
  if (cookieHeader && typeof cookieHeader === 'string') {
    const match = /(?:^|;\s*)museum_session=([^;]+)/.exec(cookieHeader);
    if (match) return decodeURIComponent(match[1].trim());
  }
  // 3. Query string: ?session=<token>
  if (req.url && req.url.includes('session=')) {
    try {
      const host = req.headers.host || 'localhost';
      const urlObj = new URL(req.url, `http://${host}`);
      const sess = urlObj.searchParams.get('session');
      if (sess) return sess.trim();
    } catch {}
  }
  return null;
}

// JSON request body parser
function parseJsonBody(req, maxBytes = 16384) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error('Payload too large'));
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// =========================================================================
// 2. HTTP SERVER WITH CRASH-PROOF RANGE & STREAM HANDLING
// =========================================================================

const server = http.createServer(async (req, res) => {
  try {
    // CORS headers
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization, Cookie');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const hostHeader = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url, `http://${hostHeader}`);
    const pathname = parsedUrl.pathname;

    // Health endpoint
    if (pathname === '/healthz') {
      const activeCount = sessionPeers.size;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, peers: activeCount, grace: graceSessions.size, uptime: Math.round(process.uptime()) }));
      return;
    }

// Central client customization and template interpolation helper
function getResolvedCustomization() {
  let customConfig = null;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      customConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('[API /api/config] Failed to load museum_config.json:', err.message);
  }

  if (!customConfig) return { customConfig: null, templateMap: {}, interpolate: s => s };

  const p1 = customConfig.couple?.partner1?.name || 'Maya';
  const p2 = customConfig.couple?.partner2?.name || 'Ethan';
  const date = customConfig.couple?.anniversaryDate || 'October 30, 2026';
  const year = customConfig.couple?.celebrationYear || '2026';
  const museumName = customConfig.museum?.name || 'OUR MUSEUM';

  const templateMap = {
    partner1: p1,
    partner2: p2,
    anniversaryDate: date,
    celebrationYear: year,
    museumName: museumName
  };

  const interpolate = (val) => {
    if (typeof val !== 'string') return val;
    return val.replace(/\{(\w+)\}/g, (_, key) => (templateMap[key] !== undefined ? templateMap[key] : `{${key}}`));
  };

  if (customConfig.museum) {
    for (const [k, v] of Object.entries(customConfig.museum)) {
      if (typeof v === 'string') customConfig.museum[k] = interpolate(v);
    }
  }

  // Strictly strip all credentials, passcodes, and secrets from configuration
  delete customConfig.access;
  delete customConfig.masterPasscode;
  if (customConfig.couple?.partner1) delete customConfig.couple.partner1.inviteCode;
  if (customConfig.couple?.partner2) delete customConfig.couple.partner2.inviteCode;

  if (customConfig.salons) {
    for (const salon of Object.values(customConfig.salons)) {
      if (!salon.author) salon.author = p2;
      if (!salon.recipient) salon.recipient = p1;
      for (const [k, v] of Object.entries(salon)) {
        if (typeof v === 'string') salon[k] = interpolate(v);
      }
    }
  }

  return { customConfig, templateMap, interpolate };
}

    // Public client config endpoint (zero credentials or passcodes exposed)
    if (pathname === '/api/config') {
      const { customConfig } = getResolvedCustomization();
      const safeCustomization = customConfig ? JSON.parse(JSON.stringify(customConfig)) : null;
      if (safeCustomization) {
        delete safeCustomization.access;
        delete safeCustomization.masterPasscode;
        if (safeCustomization.couple?.partner1) delete safeCustomization.couple.partner1.inviteCode;
        if (safeCustomization.couple?.partner2) delete safeCustomization.couple.partner2.inviteCode;
      }

      const hasActiveInvites = listInvites().some(inv => !inv.revoked && Date.now() <= inv.expiresAt);
      const passcodeRequired = Boolean(MUSEUM_PASSCODE || hasActiveInvites);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({
        passcodeRequired,
        maxPlayers: MAX_PLAYERS_PER_SESSION,
        protocol: PROTOCOL_VERSION,
        customization: safeCustomization
      }));
      return;
    }

    // POST /api/invite/redeem (AUTH-01..03, Q2)
    if (pathname === '/api/invite/redeem' && req.method === 'POST') {
      let body;
      try {
        body = await parseJsonBody(req);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Malformed JSON payload' }));
        return;
      }

      const code = body && body.code;
      const redemption = redeemInvite(code);
      if (!redemption.success) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: redemption.error }));
        return;
      }

      const isHttps = Boolean(
        req.socket.encrypted ||
        req.headers['x-forwarded-proto'] === 'https' ||
        (typeof req.headers['cf-visitor'] === 'string' && req.headers['cf-visitor'].includes('https'))
      );
      const secureFlag = isHttps ? '; Secure' : '';
      const cookieVal = `museum_session=${encodeURIComponent(redemption.sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secureFlag}`;

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieVal,
        'Cache-Control': 'no-store'
      });
      // Never expose session token directly to frontend JS
      res.end(JSON.stringify({
        ok: true,
        recipient: redemption.recipient
      }));
      return;
    }

    // Only GET and HEAD allowed for other routes
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    // GET /api/letters (Protected private letters API - AUTH-02)
    if (pathname === '/api/letters') {
      const token = extractSessionToken(req);
      const session = validateSession(token);
      if (!session) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Unauthorized: valid invitation session required' }));
        return;
      }

      let rawLetters = {};
      try {
        if (fs.existsSync(LETTERS_FILE)) {
          rawLetters = JSON.parse(fs.readFileSync(LETTERS_FILE, 'utf8'));
        }
      } catch (err) {
        console.error('[API /api/letters] Failed to read letters.json:', err.message);
      }

      const { templateMap, interpolate } = getResolvedCustomization();
      const defaultAuthor = interpolate(rawLetters._defaults?.author) || templateMap.partner2 || 'Ethan';
      const defaultRecipient = interpolate(rawLetters._defaults?.recipient) || templateMap.partner1 || 'Maya';

      const letters = {};
      for (const [key, val] of Object.entries(rawLetters)) {
        if (key.startsWith('_') || key.startsWith('$')) continue;
        if (typeof val === 'string') {
          letters[key] = interpolate(val);
        } else if (val && typeof val === 'object') {
          const author = interpolate(val.author) || defaultAuthor;
          const recipient = interpolate(val.recipient) || defaultRecipient;
          const letter = interpolate(val.letter || val.text || val.body || '');
          const title = interpolate(val.title || key);
          const location = interpolate(val.location || '');
          const date = interpolate(val.date || '');
          const fullText = val.fullText
            ? interpolate(val.fullText)
            : `From ${author} to ${recipient}: "${letter}"`;

          letters[key] = {
            title,
            date,
            location,
            author,
            recipient,
            letter,
            fullText
          };
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-cache' });
      res.end(JSON.stringify({ ok: true, recipient: session.recipient, letters }));
      return;
    }

    // GET /photos/* (Protected private photos - AUTH-02 / Q6)
    if (pathname.startsWith('/photos/')) {
      const token = extractSessionToken(req);
      const session = validateSession(token);
      if (!session) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Unauthorized: private museum photos require invitation pass' }));
        return;
      }
    }

    const resolved = resolveStatic(pathname);
    if (!resolved) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    serveFile(req, res, resolved.filePath, resolved.stats);
  } catch (err) {
    console.error('[HTTP Error]', err);
    try {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    } catch {}
  }
});

function serveFile(req, res, filePath, stats) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const totalSize = stats.size;

  // Strict range parsing
  const rangeHeader = req.headers.range;
  if (rangeHeader) {
    const matches = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!matches) {
      res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
      res.end();
      return;
    }

    let start = matches[1] !== '' ? parseInt(matches[1], 10) : NaN;
    let end = matches[2] !== '' ? parseInt(matches[2], 10) : NaN;

    if (isNaN(start) && isNaN(end)) {
      res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
      res.end();
      return;
    }

    if (isNaN(start)) {
      // Suffix range: bytes=-N (last N bytes)
      const suffix = end;
      if (suffix <= 0) {
        res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
        res.end();
        return;
      }
      start = Math.max(0, totalSize - suffix);
      end = totalSize - 1;
    } else if (isNaN(end)) {
      // Open range: bytes=N-
      end = totalSize - 1;
    }

    if (start >= totalSize || end >= totalSize || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
      res.end();
      return;
    }

    const chunksize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath, { start, end });
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    stream.pipe(res);
  } else {
    // Cache strategy: hashed production bundle in dist/assets is immutable; html is no-cache; media cached 24h
    let cacheHeader;
    if (filePath.includes(path.join('dist', 'assets'))) {
      cacheHeader = 'public, max-age=31536000, immutable';
    } else if (ext === '.html') {
      cacheHeader = 'no-cache, no-store, must-revalidate';
    } else if (['.js', '.mjs', '.css', '.json'].includes(ext)) {
      cacheHeader = 'no-cache';
    } else {
      cacheHeader = 'public, max-age=86400';
    }

    res.writeHead(200, {
      'Content-Length': totalSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': cacheHeader
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    stream.pipe(res);
  }
}

// =========================================================================
// 3. WEBSOCKET REAL-TIME MULTIPLAYER SERVER (PROTOCOL V2)
// =========================================================================

const PROTOCOL_VERSION = 2;
const MAX_PLAYERS_PER_SESSION = 2;   // Strict 2-player capacity
const MAX_PAYLOAD_BYTES = 2048;      // 2 KB per WebSocket frame
const RATE_WINDOW_MS = 1000;
const MAX_MSG_PER_TYPE_PER_SEC = 30;
const MAX_POS = 100;
const MAX_CHAT_LEN = 120;
const MSG_TYPES = new Set(['join', 'leave', 'state', 'emote', 'sit', 'stand', 'chat', 'ping', 'pong']);

// Allowed character model assets
const ALLOWED_MODELS = new Set(['man.glb', 'woman.glb', 'models/ready/characters/man.glb', 'models/ready/characters/woman.glb']);

// Active session state: Map<ws, peerProfile>
const sessionPeers = new Map();

// Authoritative seat locks (SEAT-03 & STATE-01): Map<seatId, peerId>
const sessionSeats = new Map();

// 30-second disconnection grace (Q3): Map<sessionToken, { profile, seatId, timer, disconnectedAt }>
const graceSessions = new Map();

// Per-IP socket connection tracker
const ipConnections = new Map();

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: MAX_PAYLOAD_BYTES
});

// Evict revoked active sessions immediately across process boundaries
function evictRevokedSessions() {
  for (const [ws, profile] of sessionPeers) {
    if (profile && profile.sessionToken) {
      const valid = validateSession(profile.sessionToken);
      if (!valid) {
        console.log(`[WS] Evicting revoked session for peer ${profile.peerId} (${profile.name})`);
        try {
          ws.send(JSON.stringify({ t: 'error', msg: 'session-revoked' }));
        } catch {}
        if (profile.seated) {
          sessionSeats.delete(profile.seated);
          broadcast({ t: 'stand', id: profile.peerId }, null);
        }
        sessionPeers.delete(ws);
        broadcast({ t: 'peer_left', peerId: profile.peerId, peerCount: sessionPeers.size }, null);
        try {
          ws.close(4003, 'session-revoked');
        } catch {}
      }
    }
  }
}

// Watch store file directory for CLI invitation revocations across separate processes
try {
  const storeFilePath = getStorePath();
  const storeDirPath = path.dirname(storeFilePath);
  if (fs.existsSync(storeDirPath)) {
    fs.watch(storeDirPath, (eventType, filename) => {
      if (!filename || filename === path.basename(storeFilePath)) {
        evictRevokedSessions();
      }
    });
  }
} catch (err) {
  console.warn('[InviteStore Watcher] fs.watch not active:', err.message);
}

// Periodic check backup (every 400ms) to guarantee fast eviction across process boundaries
const storeEvictionInterval = setInterval(() => {
  if (sessionPeers.size > 0) {
    evictRevokedSessions();
  }
}, 400);
storeEvictionInterval.unref();

// Upgrade handling with strict /ws route and safe Origin verification
server.on('upgrade', (req, socket, head) => {
  // Strict URL route check: only /ws allowed
  const reqUrl = req.url ? req.url.split('?')[0] : '';
  if (reqUrl !== '/ws') {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  // Safe Origin parsing and enforcement
  const origin = req.headers.origin;
  if (origin) {
    try {
      new URL(origin);
    } catch {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
  }

  if (ALLOWED_ORIGINS) {
    if (!origin) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    let originHost;
    try {
      originHost = new URL(origin).host.toLowerCase();
    } catch {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    if (!ALLOWED_ORIGINS.includes(originHost)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
  }

  // Per-IP connection rate check (max 8 per IP)
  const clientIp = getClientIp(req);
  const activeForIp = ipConnections.get(clientIp) || 0;
  if (activeForIp >= 8) {
    socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
    socket.destroy();
    return;
  }

  const sessionToken = extractSessionToken(req);

  wss.handleUpgrade(req, socket, head, ws => {
    ipConnections.set(clientIp, activeForIp + 1);
    ws._clientIp = clientIp;
    ws._sessionToken = sessionToken;
    ws._explicitLeave = false;
    wss.emit('connection', ws, req);
  });
});

function clampNum(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function safeStr(v, maxLen) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().slice(0, maxLen);
}

// Timing-safe passcode comparison
function verifyPasscode(inputCode) {
  if (!MUSEUM_PASSCODE) return true; // Passcode not enabled
  if (typeof inputCode !== 'string') return false;
  const a = Buffer.from(inputCode);
  const b = Buffer.from(MUSEUM_PASSCODE);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

wss.on('connection', ws => {
  const peerId = `peer_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  let joined = false;
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  const rateCounts = new Map();
  let windowStart = Date.now();

  function rateOk(type) {
    const now = Date.now();
    if (now - windowStart > RATE_WINDOW_MS) {
      windowStart = now;
      rateCounts.clear();
    }
    const count = (rateCounts.get(type) || 0) + 1;
    if (count > MAX_MSG_PER_TYPE_PER_SEC) return false;
    rateCounts.set(type, count);
    return true;
  }

  function sendTo(obj) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify(obj)); } catch {}
    }
  }

  function deny(reason) {
    sendTo({ t: 'error', msg: reason });
  }

  ws.on('message', rawMsg => {
    let data;
    try {
      data = JSON.parse(rawMsg.toString());
    } catch {
      deny('bad-json');
      return;
    }

    const type = data && data.t;
    if (!MSG_TYPES.has(type)) {
      deny('unknown-type');
      return;
    }

    if (!rateOk(type)) {
      deny('rate-limit');
      return;
    }

    // 1. JOIN
    if (type === 'join') {
      if (joined) {
        deny('already-joined');
        return;
      }

      // Protocol version validation
      if (data.proto !== PROTOCOL_VERSION) {
        deny('update-required');
        ws.close(4001, 'update-required');
        return;
      }

      // Session Token / Authentication check (AUTH-01..03, Q2, Q6)
      let authenticatedSession = null;
      const token = data.sessionToken || ws._sessionToken;
      if (token) {
        authenticatedSession = validateSession(token);
      }

      if (!authenticatedSession) {
        if (data.code) {
          const redemption = redeemInvite(data.code);
          if (redemption.success) {
            authenticatedSession = validateSession(redemption.sessionToken);
          } else if (MUSEUM_PASSCODE) {
            if (!checkPasscodeRate(ws._clientIp)) {
              deny('rate-limit');
              return;
            }
            if (verifyPasscode(data.code)) {
              authenticatedSession = { recipient: 'Passcode Guest', token: null };
            } else {
              deny('bad-code');
              ws.close(4003, 'bad-code');
              return;
            }
          } else {
            deny('bad-code');
            ws.close(4003, 'bad-code');
            return;
          }
        } else {
          // Strictly reject unauthenticated joins
          deny('unauthorized');
          ws.close(4003, 'unauthorized');
          return;
        }
      }

      if (!authenticatedSession) {
        deny('unauthorized');
        ws.close(4003, 'unauthorized');
        return;
      }

      // Check 30s disconnection grace (Q3): reconnecting partner?
      const sessKey = authenticatedSession ? authenticatedSession.token : null;
      let reconnectedGrace = null;
      if (sessKey && graceSessions.has(sessKey)) {
        reconnectedGrace = graceSessions.get(sessKey);
        clearTimeout(reconnectedGrace.timer);
        graceSessions.delete(sessKey);
        console.log(`[WS Grace] Participant ${reconnectedGrace.profile.name} reconnected within grace window!`);
      }

      // Enforce global 2-player capacity for the museum session (NET-01 & Q1)
      const effectivePeers = sessionPeers.size + (reconnectedGrace ? 0 : graceSessions.size);
      if (effectivePeers >= MAX_PLAYERS_PER_SESSION) {
        deny('room-full');
        ws.close(4002, 'room-full');
        return;
      }

      joined = true;
      ws._sessionKey = sessKey;

      let seatToRestore = null;
      if (reconnectedGrace && reconnectedGrace.seatId) {
        seatToRestore = reconnectedGrace.seatId;
        sessionSeats.set(seatToRestore, peerId);
      }

      // Color hex validation
      const colorHex = String(data.color || '');
      const safeColor = /^#[0-9a-f]{6}$/i.test(colorHex) ? colorHex : '#d8b06a';

      // Model validation
      const rawModel = String(data.model || '');
      const safeModel = ALLOWED_MODELS.has(rawModel) ? rawModel : 'woman.glb';

      // Location carries initial gameplay room (e.g. 'lobby')
      const location = safeStr(data.location || data.room, 32) || 'lobby';

      const appearance = {};
      if (data.appearance && typeof data.appearance === 'object') {
        for (const k of ['skin', 'hair', 'top', 'trousers']) {
          const val = data.appearance[k];
          appearance[k] = /^#[0-9a-f]{6}$/i.test(val) ? val : null;
        }
      }

      const initialP = Array.isArray(data.p) && data.p.length >= 3
        ? [clampNum(data.p[0], -MAX_POS, MAX_POS), clampNum(data.p[1], -MAX_POS, MAX_POS), clampNum(data.p[2], -MAX_POS, MAX_POS)]
        : [0, 1.7, 4];
      const initialRy = Number.isFinite(data.ry) ? clampNum(data.ry, -Math.PI * 4, Math.PI * 4) : 0;

      const profile = {
        peerId,
        name: safeStr(data.name || authenticatedSession?.recipient, 24) || 'Guest',
        color: safeColor,
        model: safeModel,
        appearance,
        location,
        seated: seatToRestore,
        sessionToken: sessKey,
        lastState: {
          p: initialP,
          ry: initialRy,
          anim: 'idle',
          moving: false,
          mode: seatToRestore ? 'sit' : 'stand',
          seat: seatToRestore
        }
      };

      sessionPeers.set(ws, profile);

      const count = sessionPeers.size;
      const peers = Array.from(sessionPeers.values()).map(p => ({
        peerId: p.peerId,
        name: p.name,
        color: p.color,
        model: p.model,
        appearance: p.appearance,
        location: p.location,
        room: p.location,
        seated: p.seated,
        p: p.lastState ? p.lastState.p : [0, 1.7, 4],
        ry: p.lastState ? p.lastState.ry : 0,
        anim: p.lastState ? p.lastState.anim : 'idle',
        mode: p.lastState ? p.lastState.mode : 'stand'
      }));

      // Snapshot of currently taken seats
      const seatsSnapshot = Array.from(sessionSeats.entries()).map(([seatId, ownerId]) => ({
        seatId,
        occupiedBy: ownerId
      }));

      console.log(`[WS] ${peerId} (${profile.name}) joined session. Total peers: ${count}`);

      // Reply with full session state
      sendTo({
        t: 'room_state',
        room: 'our-home',
        peerCount: count,
        peers,
        seats: seatsSnapshot,
        yourId: peerId
      });

      // If reconnected within grace, notify partner of reconnected status
      if (reconnectedGrace) {
        broadcast({
          t: 'peer_status',
          peerId,
          status: 'reconnected'
        }, ws);
      }

      // Broadcast newcomer to partner
      broadcast({
        t: 'peer_joined',
        peerId,
        name: profile.name,
        color: profile.color,
        model: profile.model,
        appearance: profile.appearance,
        location: profile.location,
        room: profile.location,
        seated: profile.seated,
        p: profile.lastState ? profile.lastState.p : [0, 1.7, 4],
        ry: profile.lastState ? profile.lastState.ry : 0,
        anim: profile.lastState ? profile.lastState.anim : 'idle',
        mode: profile.lastState ? profile.lastState.mode : 'stand',
        peerCount: count
      }, ws);
      return;
    }

    // All subsequent message types require join
    if (!joined) {
      deny('join-first');
      return;
    }

    // Active session revocation check on incoming messages (throttled to 2s to preserve event loop)
    const currentProfile = sessionPeers.get(ws);
    if (currentProfile && currentProfile.sessionToken) {
      const now = Date.now();
      if (!currentProfile._lastRevocationCheck || now - currentProfile._lastRevocationCheck > 2000) {
        currentProfile._lastRevocationCheck = now;
        const valid = validateSession(currentProfile.sessionToken);
        if (!valid) {
          deny('session-revoked');
          if (currentProfile.seated) {
            sessionSeats.delete(currentProfile.seated);
            broadcast({ t: 'stand', id: currentProfile.peerId }, null);
          }
          sessionPeers.delete(ws);
          broadcast({ t: 'peer_left', peerId: currentProfile.peerId, peerCount: sessionPeers.size }, null);
          try {
            ws.close(4003, 'session-revoked');
          } catch {}
          return;
        }
      }
    }

    // 2. LEAVE
    if (type === 'leave') {
      ws._explicitLeave = true;
      ws.close(1000, 'leave');
      return;
    }

    // 3. PING / PONG
    if (type === 'ping') {
      const seq = clampNum(data.seq, 0, 1e9);
      sendTo({ t: 'pong', seq });
      return;
    }
    if (type === 'pong') {
      return;
    }

    // 4. STATE
    if (type === 'state') {
      const p = Array.isArray(data.p) && data.p.length >= 3 ? data.p : [0, 1.7, 0];
      const location = safeStr(data.room || data.location, 32) || 'lobby';
      const state = {
        t: 'state',
        id: peerId,
        p: [
          clampNum(p[0], -MAX_POS, MAX_POS),
          clampNum(p[1], -MAX_POS, MAX_POS),
          clampNum(p[2], -MAX_POS, MAX_POS)
        ],
        ry: clampNum(data.ry, -Math.PI * 4, Math.PI * 4),
        room: location,
        location,
        anim: safeStr(data.anim, 20) || 'idle',
        moving: Boolean(data.moving),
        mode: safeStr(data.mode, 10) || 'stand',
        seat: data.seat ? safeStr(String(data.seat), 64) : null
      };

      const profile = sessionPeers.get(ws);
      if (profile) {
        profile.location = location;
        profile.lastState = {
          p: state.p,
          ry: state.ry,
          anim: state.anim,
          moving: state.moving,
          mode: state.mode,
          seat: state.seat
        };
      }

      broadcast(state, ws);
      return;
    }

    // 5. EMOTE (Approved emotes & actions 1..7)
    if (type === 'emote') {
      const idx = clampNum(data.e, 1, 7);
      const start = Boolean(data.start);
      broadcast({ t: 'emote', id: peerId, e: idx, start }, ws);
      return;
    }

    // 6. SIT (Authoritative Seat Lock - SEAT-03 & STATE-01 single seat invariant)
    if (type === 'sit') {
      const seatId = safeStr(String(data.seat || ''), 64);
      if (!seatId) {
        deny('bad-seat');
        return;
      }

      const profile = sessionPeers.get(ws);
      if (!profile) return;

      // Single-seat invariant (STATE-01): vacate old seat if different
      if (profile.seated && profile.seated !== seatId) {
        sessionSeats.delete(profile.seated);
        broadcast({ t: 'stand', id: peerId }, ws);
        profile.seated = null;
      }

      const existingOwner = sessionSeats.get(seatId);
      if (existingOwner && existingOwner !== peerId) {
        // Seat already occupied by another participant
        sendTo({ t: 'sit_denied', seat: seatId, reason: 'occupied' });
        return;
      }

      // Claim seat atomically
      sessionSeats.set(seatId, peerId);
      profile.seated = seatId;

      // Confirm to sender and broadcast to partner
      sendTo({ t: 'sit_ok', seat: seatId });
      broadcast({ t: 'sit', id: peerId, seat: seatId }, ws);
      return;
    }

    // 7. STAND (Release Seat)
    if (type === 'stand') {
      const profile = sessionPeers.get(ws);
      if (profile && profile.seated) {
        sessionSeats.delete(profile.seated);
        profile.seated = null;
      }
      sendTo({ t: 'stand_ok' });
      broadcast({ t: 'stand', id: peerId }, ws);
      return;
    }

    // 8. CHAT
    if (type === 'chat') {
      const msg = safeStr(data.m, MAX_CHAT_LEN);
      if (!msg) return;
      broadcast({ t: 'chat', id: peerId, m: msg }, ws);
      return;
    }
  });

  ws.on('close', () => {
    const profile = sessionPeers.get(ws);
    sessionPeers.delete(ws);

    // Decrement per-IP connection count
    if (ws._clientIp && ipConnections.has(ws._clientIp)) {
      const cur = ipConnections.get(ws._clientIp) - 1;
      if (cur <= 0) ipConnections.delete(ws._clientIp);
      else ipConnections.set(ws._clientIp, cur);
    }

    if (profile) {
      if (ws._explicitLeave || !profile.sessionToken) {
        // Explicit leave or unauthenticated test client: release immediately
        if (profile.seated) {
          sessionSeats.delete(profile.seated);
          broadcast({ t: 'stand', id: peerId }, null);
        }
        const count = sessionPeers.size;
        console.log(`[WS] ${peerId} left permanently. Remaining peers: ${count}`);
        broadcast({ t: 'peer_left', peerId, peerCount: count }, null);
      } else {
        // 30-second disconnection grace (Q3):
        // Reserve slot and seat for 30 seconds so partner can reconnect.
        const sessKey = profile.sessionToken;
        const currentSeat = profile.seated;
        console.log(`[WS Grace] ${peerId} (${profile.name}) disconnected. Holding slot & seat for 30s grace.`);

        broadcast({
          t: 'peer_status',
          peerId,
          status: 'reconnecting',
          graceSeconds: 30
        }, null);

        const timer = setTimeout(() => {
          graceSessions.delete(sessKey);
          if (currentSeat && sessionSeats.get(currentSeat) === peerId) {
            sessionSeats.delete(currentSeat);
            broadcast({ t: 'stand', id: peerId }, null);
          }
          console.log(`[WS Grace] 30s grace expired for ${profile.name}. Slot & seat freed.`);
          broadcast({ t: 'peer_left', peerId, peerCount: sessionPeers.size }, null);
        }, 30000);

        graceSessions.set(sessKey, {
          profile,
          seatId: currentSeat,
          timer,
          disconnectedAt: Date.now()
        });
      }
    }
  });

  ws.on('error', err => {
    console.warn(`[WS Error] ${peerId}:`, err.message);
  });
});

function broadcast(message, senderWs) {
  const raw = typeof message === 'string' ? message : JSON.stringify(message);
  for (const [clientWs] of sessionPeers) {
    if (clientWs !== senderWs && clientWs.readyState === WebSocket.OPEN) {
      try { clientWs.send(raw); } catch {}
    }
  }
}

// 30-second ping/pong heartbeat to detect dead connections and free slots
const heartbeatInterval = setInterval(() => {
  evictRevokedSessions();
  for (const [ws, profile] of sessionPeers) {
    if (!ws.isAlive) {
      console.log(`[WS Heartbeat] Terminating inactive connection: ${profile.peerId}`);
      if (profile.seated) {
        sessionSeats.delete(profile.seated);
        broadcast({ t: 'stand', id: profile.peerId }, null);
      }
      sessionPeers.delete(ws);
      broadcast({ t: 'peer_left', peerId: profile.peerId, peerCount: sessionPeers.size }, null);
      ws.terminate();
    } else {
      ws.isAlive = false;
      try { ws.ping(); } catch {}
    }
  }
}, 30000);

heartbeatInterval.unref();

// Process crash guards
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', err => {
  console.error('[Uncaught Exception]', err);
  process.exit(1);
});

// Start Server
server.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`  OUR MUSEUM 3D • HARDENED PRODUCTION SERVER RUNNING`);
  console.log(`=======================================================`);
  console.log(`  🌐 Web App:         http://localhost:${PORT}/index.html`);
  console.log(`  ⚡ WebSocket Sync:   ws://localhost:${PORT}/ws (Proto v${PROTOCOL_VERSION})`);
  const hasActiveInvites = listInvites().some(inv => !inv.revoked && Date.now() <= inv.expiresAt);
  const gateActive = Boolean(MUSEUM_PASSCODE || hasActiveInvites);
  console.log(`  🔒 Passcode Gate:   ${gateActive ? 'ENABLED' : 'DISABLED (Open Dev Mode)'}`);
  console.log(`  👥 Capacity:        Max ${MAX_PLAYERS_PER_SESSION} human peers`);
  console.log(`=======================================================`);
});
