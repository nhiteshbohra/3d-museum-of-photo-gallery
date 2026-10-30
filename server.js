/**
 * OUR HOME 3D • UNIFIED PRODUCTION NODE.JS SERVER
 *
 * Hosts static assets (HTML, CSS, JS, GLB 3D models, textures, video)
 * AND provides real-time multi-room WebSocket synchronization on the SAME port.
 *
 * Zero external web framework dependencies (uses standard Node.js http + 'ws').
 * Designed for one-command deployment to:
 * - Vercel / Railway / Render / DigitalOcean / Heroku / AWS / Fly.io / VPS
 * - Standard web hosting (e.g. `npm start`)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port selection: reads process.env.PORT for cloud host platforms, defaults to 8080 locally
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Comprehensive MIME table for modern web & WebGL 3D assets
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
  '.ttf': 'font/ttf'
};

// =========================================================================
// 1. STATIC HTTP FILE SERVER WITH RANGE REQUESTS (FOR VIDEO STREAMING)
// =========================================================================
const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // Parse path & strip query parameters
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(path.join(__dirname, pathname));

  // Directory traversal guard
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`404 Not Found: ${pathname}`);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`500 Server Error: ${err.message}`);
      }
      return;
    }

    if (stats.isDirectory()) {
      const indexPath = path.join(safePath, 'index.html');
      if (fs.existsSync(indexPath)) {
        serveFile(req, res, indexPath, fs.statSync(indexPath));
      } else {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Directory listing forbidden');
      }
      return;
    }

    serveFile(req, res, safePath, stats);
  });
});

/**
 * Serves a file with HTTP Range support (crucial for smooth MP4 video playback in Safari & Chrome)
 */
function serveFile(req, res, filePath, stats) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const totalSize = stats.size;

  // Support HTTP Range Requests (video seeking & streaming)
  const rangeHeader = req.headers.range;
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (start >= totalSize || end >= totalSize) {
      res.writeHead(416, {
        'Content-Range': `bytes */${totalSize}`
      });
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

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    // Standard 200 response
    const noCacheExts = ['.html', '.js', '.mjs', '.css', '.json'];
    const cacheHeader = noCacheExts.includes(ext)
      ? 'no-cache, no-store, must-revalidate'
      : 'public, max-age=86400';

    res.writeHead(200, {
      'Content-Length': totalSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': cacheHeader,
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}

// =========================================================================
// 2. UNIFIED WEBSOCKET REAL-TIME MULTIPLAYER SERVER (ON SAME HTTP PORT)
// =========================================================================
// Rooms dictionary: Map<roomId, Map<WebSocket, { peerId, role }>>
const rooms = new Map();

const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket HTTP upgrade requests on the same port (path: /ws or default)
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', ws => {
  let clientRoom = 'our-home';
  let clientPeerId = null;
  let clientRole = 'guest';

  ws.on('message', rawMsg => {
    let data;
    try {
      data = JSON.parse(rawMsg.toString());
    } catch {
      return;
    }

    const type = data.type;

    if (type === 'join') {
      clientRoom = data.room || 'our-home';
      clientPeerId = data.peerId || `peer_${Math.random().toString(36).substring(2, 8)}`;
      clientRole = data.role || 'guest';

      if (!rooms.has(clientRoom)) {
        rooms.set(clientRoom, new Map());
      }
      rooms.get(clientRoom).set(ws, { peerId: clientPeerId, role: clientRole });

      const roomClients = rooms.get(clientRoom);
      const count = roomClients.size;
      const peers = Array.from(roomClients.values()).map(p => p.role);

      console.log(`[WS] Client ${clientPeerId} (${clientRole}) joined room "${clientRoom}". Peers: ${count}`);

      // Confirm join with current room state
      ws.send(JSON.stringify({
        type: 'room_state',
        room: clientRoom,
        peerCount: count,
        peers
      }));

      // Broadcast arrival to peers in this room
      broadcastToRoom(clientRoom, JSON.stringify({
        type: 'peer_joined',
        peerId: clientPeerId,
        role: clientRole,
        peerCount: count
      }), ws);

    } else if (type === 'sync' || type === 'interaction') {
      // Forward real-time movement and interaction packets to all room peers
      if (rooms.has(clientRoom)) {
        broadcastToRoom(clientRoom, rawMsg.toString(), ws);
      }
    }
  });

  ws.on('close', () => {
    if (rooms.has(clientRoom)) {
      const roomClients = rooms.get(clientRoom);
      roomClients.delete(ws);
      const count = roomClients.size;
      console.log(`[WS] Client ${clientPeerId || 'unknown'} disconnected from "${clientRoom}". Remaining: ${count}`);

      if (count === 0) {
        rooms.delete(clientRoom);
      } else {
        broadcastToRoom(clientRoom, JSON.stringify({
          type: 'peer_left',
          peerId: clientPeerId,
          peerCount: count
        }), null);
      }
    }
  });

  ws.on('error', err => {
    console.warn(`[WS Error] ${clientPeerId}:`, err.message);
  });
});

function broadcastToRoom(roomId, message, senderWs) {
  const roomClients = rooms.get(roomId);
  if (!roomClients) return;
  for (const [clientWs] of roomClients) {
    if (clientWs !== senderWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(message);
    }
  }
}

// Start Unified Server
server.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`  OUR HOME 3D • PRODUCTION NODE.JS SERVER RUNNING`);
  console.log(`=======================================================`);
  console.log(`  🌐 Web App:         http://localhost:${PORT}/index.html`);
  console.log(`  🎨 Creator Studio:  http://localhost:${PORT}/studio.html`);
  console.log(`  ⚡ WebSocket Sync:   ws://localhost:${PORT}`);
  console.log(`  📦 Environment:     ${process.env.NODE_ENV || 'production'}`);
  console.log(`=======================================================`);
});

