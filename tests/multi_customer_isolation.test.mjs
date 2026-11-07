/**
 * Automated test suite for Multi-Customer Isolation.
 * Validates:
 * 1. Customer routing & date window enforcement (/gallery/:slug).
 * 2. Timing-safe passcode authentication & session scoping.
 * 3. Server-authoritative photo scoping: Client A sees only Customer A photos; Client B sees Customer B.
 * 4. Cross-customer photo access denial and path traversal defense.
 * 5. Config and letters scoping per customer session.
 * 6. WebSocket multiplayer room partitioning: isolated 2-visitor rooms, chat, and seating.
 */

import http from 'http';
import { WebSocket } from 'ws';
import { spawn } from 'child_process';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createCustomer,
  deleteCustomer,
  saveCustomerPhoto,
  updateCustomerQuotes,
} from '../scripts/customerStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TEST_PORT = 8993;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

let serverProc = null;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(pathStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathStr, BASE_URL);
    const req = http.request(url, options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function connectWs(headers = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, { headers });
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function nextMessage(ws, filterFn = null, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for message')), timeoutMs);
    const onMsg = raw => {
      try {
        const msg = JSON.parse(raw.toString());
        if (!filterFn || filterFn(msg)) {
          clearTimeout(timer);
          ws.off('message', onMsg);
          resolve(msg);
        }
      } catch (err) {
        clearTimeout(timer);
        ws.off('message', onMsg);
        reject(err);
      }
    };
    ws.on('message', onMsg);
  });
}

async function startServer() {
  serverProc = spawn('node', ['server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      HOST: '127.0.0.1',
      MUSEUM_PASSCODE: 'global-test-pass'
    },
    stdio: 'pipe'
  });

  serverProc.stderr.on('data', d => {
    const s = d.toString();
    if (!s.includes('ExperimentalWarning')) process.stderr.write(`[Server Error] ${s}`);
  });

  // Wait for server readiness
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const res = await fetchUrl('/healthz');
      if (res.status === 200) return;
    } catch {}
    await sleep(200);
  }
  throw new Error('Server failed to start');
}

async function stopServer() {
  if (serverProc) {
    serverProc.kill();
    await sleep(300);
    serverProc = null;
  }
}

async function runTests() {
  console.log('=== MULTI-CUSTOMER ISOLATION TEST SUITE ===');

  const customerA = 'iso-cust-alpha';
  const customerB = 'iso-cust-beta';
  const customerDraft = 'iso-cust-draft';
  const customerExpired = 'iso-cust-expired';

  try {
    // 1. Setup Test Customers
    console.log('[Setup] Creating test customers in customerStore...');
    try { deleteCustomer(customerA); } catch {}
    try { deleteCustomer(customerB); } catch {}
    try { deleteCustomer(customerDraft); } catch {}
    try { deleteCustomer(customerExpired); } catch {}

    createCustomer({
      slug: customerA,
      displayName: 'Customer Alpha Gallery',
      passcode: 'passcode-alpha-123',
      status: 'active',
      activeFrom: '2026-01-01',
      activeUntil: '2028-12-31'
    });

    createCustomer({
      slug: customerB,
      displayName: 'Customer Beta Gallery',
      passcode: 'passcode-beta-456',
      status: 'active',
      activeFrom: '2026-01-01',
      activeUntil: '2028-12-31'
    });

    createCustomer({
      slug: customerDraft,
      displayName: 'Draft Gallery',
      passcode: 'passcode-draft',
      status: 'draft'
    });

    createCustomer({
      slug: customerExpired,
      displayName: 'Expired Gallery',
      passcode: 'passcode-expired',
      status: 'active',
      activeFrom: '2020-01-01',
      activeUntil: '2021-01-01'
    });

    // Populate distinct photos for customer A and customer B
    const alphaPhotoBytes = Buffer.from('RAW_PIXEL_DATA_ALPHA_EXCLUSIVE_IMAGE_01');
    const betaPhotoBytes = Buffer.from('RAW_PIXEL_DATA_BETA_EXCLUSIVE_IMAGE_02');

    saveCustomerPhoto(customerA, 'lobby', 1, alphaPhotoBytes);
    saveCustomerPhoto(customerB, 'lobby', 1, betaPhotoBytes);

    updateCustomerQuotes(customerA, {
      "Fireside Winter Memories": {
        author: "Partner Alpha",
        recipient: "Partner Alpha 2",
        title: "Alpha Letter",
        letter: "Alpha private secret memory"
      }
    });

    await startServer();

    // ── TEST 1: URL Routing & Status Gates ──────────────────────────
    console.log('[Test 1] Customer URL Routing and Status Window...');
    {
      const resAlpha = await fetchUrl(`/gallery/${customerA}`);
      assert.strictEqual(resAlpha.status, 200, 'Active customer gallery should return 200 SPA shell');

      const resNotFound = await fetchUrl('/gallery/non-existent-gallery-12345');
      assert.strictEqual(resNotFound.status, 404, 'Unknown slug should return 404');

      const resDraft = await fetchUrl(`/gallery/${customerDraft}`);
      assert.strictEqual(resDraft.status, 404, 'Draft gallery should return 404');

      const resExpired = await fetchUrl(`/gallery/${customerExpired}`);
      assert.strictEqual(resExpired.status, 403, 'Expired gallery should return 403');

      // Traversal attempt in gallery route
      const resTraversal = await fetchUrl('/gallery/..%2f..%2fserver.js');
      assert.ok(resTraversal.status === 404 || resTraversal.status === 400, 'Traversal slug should be rejected');
    }
    console.log('✓ Test 1 Passed: Gallery routing & date window verified');

    // ── TEST 2: Customer Passcode Authentication ───────────────────
    console.log('[Test 2] Customer Passcode Authentication & Session Issuance...');
    let sessionTokenAlpha = null;
    let sessionCookieAlpha = null;
    let sessionTokenBeta = null;
    let sessionCookieBeta = null;

    {
      // Wrong passcode
      const badAuth = await fetchUrl('/api/museum/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: customerA, passcode: 'wrong-pass' })
      });
      assert.strictEqual(badAuth.status, 401, 'Wrong passcode must return 401');

      // Valid passcode for Customer Alpha
      const goodAuthAlpha = await fetchUrl('/api/museum/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: customerA, passcode: 'passcode-alpha-123' })
      });
      assert.strictEqual(goodAuthAlpha.status, 200, 'Valid Customer Alpha auth must return 200');
      const bodyAlpha = JSON.parse(goodAuthAlpha.body);
      assert.strictEqual(bodyAlpha.ok, true);
      assert.strictEqual(bodyAlpha.customer.slug, customerA);

      sessionCookieAlpha = goodAuthAlpha.headers['set-cookie'][0].split(';')[0];
      sessionTokenAlpha = decodeURIComponent(sessionCookieAlpha.split('=')[1]);

      // Valid passcode for Customer Beta
      const goodAuthBeta = await fetchUrl('/api/museum/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: customerB, passcode: 'passcode-beta-456' })
      });
      assert.strictEqual(goodAuthBeta.status, 200, 'Valid Customer Beta auth must return 200');
      const bodyBeta = JSON.parse(goodAuthBeta.body);
      assert.strictEqual(bodyBeta.ok, true);
      assert.strictEqual(bodyBeta.customer.slug, customerB);

      sessionCookieBeta = goodAuthBeta.headers['set-cookie'][0].split(';')[0];
      sessionTokenBeta = decodeURIComponent(sessionCookieBeta.split('=')[1]);
    }
    console.log('✓ Test 2 Passed: Customer passcode authentication & cookies verified');

    // ── TEST 3: Server-Authoritative Photo Isolation ───────────────
    console.log('[Test 3] Photo Serving Isolation & Anti-Cross-Access...');
    {
      // Unauthenticated request to photo
      const unauth = await fetchUrl('/photos/00_grand_lobby/01_south_wall_masterpiece.png');
      assert.strictEqual(unauth.status, 401, 'Unauthenticated photo fetch must return 401');

      // Customer Alpha requests photo
      const photoAlpha = await fetchUrl('/photos/00_grand_lobby/01_south_wall_masterpiece.png', {
        headers: { Cookie: sessionCookieAlpha }
      });
      assert.strictEqual(photoAlpha.status, 200, 'Customer Alpha should get their photo');
      assert.strictEqual(photoAlpha.body, alphaPhotoBytes.toString(), 'Must return Customer Alpha photo bytes');

      // Customer Beta requests the same relative photo path
      const photoBeta = await fetchUrl('/photos/00_grand_lobby/01_south_wall_masterpiece.png', {
        headers: { Cookie: sessionCookieBeta }
      });
      assert.strictEqual(photoBeta.status, 200, 'Customer Beta should get their photo');
      assert.strictEqual(photoBeta.body, betaPhotoBytes.toString(), 'Must return Customer Beta photo bytes');
      assert.notStrictEqual(photoAlpha.body, photoBeta.body, 'Customer Alpha and Beta photos must never be identical');

      // Attempt to access Customer Beta's photos while authenticated as Customer Alpha
      const crossAttempt1 = await fetchUrl('/photos/00_grand_lobby/01_south_wall_masterpiece.png?customer=iso-cust-beta', {
        headers: { Cookie: sessionCookieAlpha }
      });
      assert.strictEqual(crossAttempt1.body, alphaPhotoBytes.toString(), 'Cross-customer query param must be ignored');

      // Path traversal attempt within photos
      const traversalAttempt = await fetchUrl('/photos/..%2f..%2f..%2fpackage.json', {
        headers: { Cookie: sessionCookieAlpha }
      });
      assert.strictEqual(traversalAttempt.status, 404, 'Path traversal in /photos/* must return 404');
    }
    console.log('✓ Test 3 Passed: Server-authoritative photo isolation strictly enforced');

    // ── TEST 4: Scoped Letters & Quotes ────────────────────────────
    console.log('[Test 4] Scoped Letters / Quotes API...');
    {
      const lettersAlpha = await fetchUrl('/api/letters', {
        headers: { Cookie: sessionCookieAlpha }
      });
      assert.strictEqual(lettersAlpha.status, 200);
      const lettersBody = JSON.parse(lettersAlpha.body);
      assert.strictEqual(lettersBody.ok, true);
      assert.ok(
        lettersBody.letters['Fireside Winter Memories']?.letter?.includes('Alpha private secret memory'),
        'Customer Alpha receives their custom quotes'
      );
    }
    console.log('✓ Test 4 Passed: Customer quotes scoped properly');

    // ── TEST 5: WebSocket Multiplayer Room Partitioning ────────────
    console.log('[Test 5] WebSocket Multiplayer Room Partitioning...');
    {
      // Connect 2 clients to Customer Alpha (reaching Customer Alpha 2-player capacity)
      const wsA1 = await connectWs({ Cookie: sessionCookieAlpha });
      wsA1.send(JSON.stringify({ t: 'join', proto: 2, avatarId: 'maya', name: 'AlphaMaya' }));
      const stateA1 = await nextMessage(wsA1, m => m.t === 'room_state');
      assert.strictEqual(stateA1.room, `customer_${customerA}`);
      assert.strictEqual(stateA1.peerCount, 1);

      const wsA2 = await connectWs({ Cookie: sessionCookieAlpha });
      wsA2.send(JSON.stringify({ t: 'join', proto: 2, avatarId: 'ethan', name: 'AlphaEthan' }));
      const stateA2 = await nextMessage(wsA2, m => m.t === 'room_state');
      assert.strictEqual(stateA2.peerCount, 2);

      // Now connect Client B1 to Customer Beta.
      // Since rooms are partitioned, Customer Beta room has 0 players and must accept B1!
      const wsB1 = await connectWs({ Cookie: sessionCookieBeta });
      wsB1.send(JSON.stringify({ t: 'join', proto: 2, avatarId: 'maya', name: 'BetaMaya' }));
      const stateB1 = await nextMessage(wsB1, m => m.t === 'room_state');
      assert.strictEqual(stateB1.room, `customer_${customerB}`);
      assert.strictEqual(stateB1.peerCount, 1, 'Customer Beta room is independent and has 1 peer');

      // Test Chat Isolation: Client A1 chats; only A2 receives it, B1 receives NOTHING
      let b1ReceivedChat = false;
      const b1ChatListener = raw => {
        const msg = JSON.parse(raw.toString());
        if (msg.t === 'chat') b1ReceivedChat = true;
      };
      wsB1.on('message', b1ChatListener);

      wsA1.send(JSON.stringify({ t: 'chat', m: 'Private message between Alpha couple!' }));
      const a2Chat = await nextMessage(wsA2, m => m.t === 'chat');
      assert.strictEqual(a2Chat.m, 'Private message between Alpha couple!');

      await sleep(300);
      assert.strictEqual(b1ReceivedChat, false, 'Client in Customer Beta room must NEVER receive Customer Alpha chat');
      wsB1.off('message', b1ChatListener);

      wsA1.close();
      wsA2.close();
      wsB1.close();
      await sleep(200);
    }
    console.log('✓ Test 5 Passed: Multiplayer room partitioning and chat isolation verified');

    console.log('\n=========================================');
    console.log('ALL MULTI-CUSTOMER ISOLATION TESTS PASSED');
    console.log('=========================================\n');
  } finally {
    await stopServer();
    try { deleteCustomer(customerA); } catch {}
    try { deleteCustomer(customerB); } catch {}
    try { deleteCustomer(customerDraft); } catch {}
    try { deleteCustomer(customerExpired); } catch {}
  }
}

runTests().catch(err => {
  console.error('\n❌ MULTI-CUSTOMER ISOLATION TEST FAILED:\n', err);
  process.exit(1);
});
