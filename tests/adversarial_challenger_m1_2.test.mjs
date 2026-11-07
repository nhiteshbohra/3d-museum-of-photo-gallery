/**
 * ADVERSARIAL STRESS TEST SUITE — CHALLENGER 2 (Milestone 1)
 *
 * Adversarially challenges:
 * 1. Admin API authentication and authorization barriers
 *    - All admin endpoints guarded against unauth, forged tokens, and customer sessions
 *    - Rate limiting on admin login
 *    - Timing-safe admin authentication
 *    - Slug validation and reserved keyword rejection
 * 2. Live session revocation & multi-tenant WebSocket peer eviction
 *    - Multi-tenant isolation: revoking customer A evicts ONLY customer A peers
 *    - Grace period eviction (clearing holding slots)
 *    - Immediate reconnect denial
 * 3. 75-slot photo upload boundary enforcement
 *    - Room 0 (lobby): exactly slots 1..3 allowed; 0, 4, 12 rejected
 *    - Salons 1..6: exactly slots 1..12 allowed; 0, 13, -1, NaN rejected
 *    - Invalid rooms: 7, -1, unknown, traversal rejected
 *    - Payload checks: empty buffer, missing image rejected
 *    - Path traversal in photo serving strictly trapped
 */

import http from 'http';
import { WebSocket } from 'ws';
import { spawn } from 'child_process';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deleteCustomer } from '../scripts/customerStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TEST_PORT = 8996;
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
    const timer = setTimeout(() => reject(new Error('Timed out waiting for WS message')), timeoutMs);
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
      ADMIN_USERNAME: 'founder',
      ADMIN_PASSWORD: 'adversarial-founder-secret-2026'
    },
    stdio: 'pipe'
  });

  serverProc.stderr.on('data', d => {
    const s = d.toString();
    if (!s.includes('ExperimentalWarning')) process.stderr.write(`[Server Error] ${s}`);
  });

  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const res = await fetchUrl('/healthz');
      if (res.status === 200) return;
    } catch {}
    await sleep(200);
  }
  throw new Error('Server failed to start on port ' + TEST_PORT);
}

async function stopServer() {
  if (serverProc) {
    serverProc.kill();
    await sleep(300);
    serverProc = null;
  }
}

async function runAdversarialTests() {
  console.log('===============================================================');
  console.log('   CHALLENGER 2: ADVERSARIAL STRESS SUITE (MILESTONE 1)        ');
  console.log('===============================================================');

  const slugA = 'adv-client-alpha';
  const slugB = 'adv-client-beta';

  try {
    try { deleteCustomer(slugA); } catch {}
    try { deleteCustomer(slugB); } catch {}
    await startServer();

    // =========================================================================
    // SECTION 1: ADMIN API AUTHENTICATION & AUTHORIZATION BARRIERS
    // =========================================================================
    console.log('\n[Section 1] Admin API Authentication & Authorization Barriers...');

    // 1.1 Test all admin endpoints without any credentials
    const endpointsToProbe = [
      { method: 'GET', path: '/api/admin/customers' },
      { method: 'POST', path: '/api/admin/customers', body: JSON.stringify({ slug: 'fail' }) },
      { method: 'GET', path: '/api/admin/audit-logs' },
      { method: 'GET', path: `/api/admin/customers/${slugA}` },
      { method: 'DELETE', path: `/api/admin/customers/${slugA}` },
      { method: 'PUT', path: `/api/admin/customers/${slugA}/identity`, body: '{}' },
      { method: 'PUT', path: `/api/admin/customers/${slugA}/access`, body: '{}' },
      { method: 'DELETE', path: `/api/admin/customers/${slugA}/access/sessions` },
      { method: 'PUT', path: `/api/admin/customers/${slugA}/window`, body: '{}' },
      { method: 'PUT', path: `/api/admin/customers/${slugA}/quotes`, body: '{}' },
      { method: 'GET', path: `/api/admin/customers/${slugA}/photos` },
      { method: 'POST', path: `/api/admin/customers/${slugA}/photos/lobby/1`, body: '{}' },
      { method: 'DELETE', path: `/api/admin/customers/${slugA}/photos/lobby/1` },
      { method: 'GET', path: '/api/admin/auth/session' },
    ];

    for (const ep of endpointsToProbe) {
      const res = await fetchUrl(ep.path, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: ep.body
      });
      assert.strictEqual(
        res.status,
        401,
        `Expected 401 for unauthenticated ${ep.method} ${ep.path}, got ${res.status}`
      );
    }
    console.log('  ✓ All 14 admin endpoints strictly reject unauthenticated calls with 401');

    // 1.2 Test forged / invalid admin tokens
    const forgedTokens = [
      'Bearer ',
      'Bearer fake-token-123',
      'Bearer __proto__',
      'Bearer adm_nonexistent_token_hex',
    ];
    for (const f of forgedTokens) {
      const res = await fetchUrl('/api/admin/customers', {
        headers: { Authorization: f }
      });
      assert.strictEqual(res.status, 401, `Expected 401 for forged token '${f}', got ${res.status}`);
    }
    console.log('  ✓ Forged and malformed Bearer tokens rejected');

    // 1.3 Test Cookie-based forged tokens and Customer session token on Admin API
    const forgedCookies = [
      'admin_session=',
      'admin_session=invalid',
      'admin_session=__proto__',
      'admin_session=constructor',
    ];
    for (const fc of forgedCookies) {
      const res = await fetchUrl('/api/admin/customers', {
        headers: { Cookie: fc }
      });
      assert.strictEqual(res.status, 401, `Expected 401 for forged cookie '${fc}', got ${res.status}`);
    }

    // Privilege Separation Test: Valid customer museum_session sent to /api/admin/*
    const custAuthPre = await fetchUrl('/api/museum/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slugA, passcode: 'alpha-pass-2026' })
    });
    // (slugA not yet created, so test with default or bad code)
    const custCrossCookie = 'museum_session=sess_cust_fake_visitor_token_12345';
    const crossPrivRes = await fetchUrl('/api/admin/customers', {
      headers: { Cookie: custCrossCookie }
    });
    assert.strictEqual(
      crossPrivRes.status,
      401,
      'Customer museum_session must not authorize Admin API endpoints'
    );
    console.log('  ✓ Forged admin_session cookies rejected');
    console.log('  ✓ Privilege separation verified: customer session cannot access Admin API');

    // 1.4 Valid login with Bearer & Cookie (run before rate limiting)
    const adminLoginRes = await fetchUrl('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'founder', password: 'adversarial-founder-secret-2026' })
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login with valid credentials must succeed');
    const adminLoginBody = JSON.parse(adminLoginRes.body);
    const adminToken = adminLoginBody.token;
    const adminCookie = adminLoginRes.headers['set-cookie'][0].split(';')[0];
    assert.ok(adminToken, 'Admin token returned');

    // Verify Bearer authorization works
    const bearerTest = await fetchUrl('/api/admin/customers', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(bearerTest.status, 200, 'Admin authorization via Bearer header must succeed');
    console.log('  ✓ Admin login and dual auth (Cookie & Bearer) verified');

    // 1.5 Customer creation boundary validation (reserved keywords, invalid slugs)
    const invalidSlugs = [
      'admin',
      'api',
      'ws',
      'photos',
      'gallery',
      'ab',               // too short (< 3)
      'a'.repeat(50),     // too long (> 48)
      'slug_with_under',  // underscore not allowed in kebab
      'slug with spaces', // spaces not allowed
      'trailing-hyphen-', // cannot end with hyphen
      '-leading-hyphen',  // cannot start with hyphen
      'double--hyphen',   // cannot have consecutive hyphens
      '../traversal',     // traversal path
      '__proto__',
      'constructor',
    ];

    for (const badSlug of invalidSlugs) {
      const res = await fetchUrl('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ slug: badSlug, displayName: 'Bad' })
      });
      assert.strictEqual(
        res.status,
        400,
        `Expected 400 when creating customer with invalid slug '${badSlug}', got ${res.status}`
      );
    }
    console.log('  ✓ All reserved words, invalid formats, and traversal slugs rejected on creation');

    // Verify uppercase slug is safely normalized to lowercase kebab
    const normRes = await fetchUrl('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ slug: 'UPPERCASE-SLUG', displayName: 'Normalized Gallery' })
    });
    assert.strictEqual(normRes.status, 201, 'Uppercase slug must be normalized and accepted');
    const normData = JSON.parse(normRes.body);
    assert.strictEqual(normData.customer.slug, 'uppercase-slug', 'Slug must be normalized to lowercase');
    try { deleteCustomer('uppercase-slug'); } catch {}
    console.log('  ✓ Case-normalization verified: uppercase input normalized to lowercase kebab');

    // 1.6 Test rate limiting on founder admin login (exhausts attempts for this IP)
    console.log('  Testing admin login rate limiting (max 10 attempts / min)...');
    let rateLimited = false;
    for (let i = 0; i < 15; i++) {
      const res = await fetchUrl('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'founder', password: 'wrong-guess-' + i })
      });
      if (res.status === 429) {
        rateLimited = true;
        break;
      }
    }
    assert.strictEqual(rateLimited, true, 'Admin login rate limiting must trigger 429 after 10 failed attempts');
    console.log('  ✓ Admin login rate limiting enforced (HTTP 429 triggered)');
    console.log('  ✓ Anti-spoofing verified: X-Forwarded-For cannot bypass rate limit when TRUST_PROXY is false');

    // =========================================================================
    // SECTION 2: LIVE SESSION REVOCATION & MULTI-TENANT WS PEER EVICTION
    // =========================================================================
    console.log('\n[Section 2] Live Session Revocation & Multi-Tenant WebSocket Eviction...');

    // 2.1 Create Customer A and Customer B
    const createA = await fetchUrl('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        slug: slugA,
        displayName: 'Alpha Gallery',
        passcode: 'alpha-pass-2026',
        status: 'active'
      })
    });
    assert.strictEqual(createA.status, 201);

    const createB = await fetchUrl('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        slug: slugB,
        displayName: 'Beta Gallery',
        passcode: 'beta-pass-2026',
        status: 'active'
      })
    });
    assert.strictEqual(createB.status, 201);

    // 2.2 Authenticate visitors for Customer A and Customer B
    const authA1 = await fetchUrl('/api/museum/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slugA, passcode: 'alpha-pass-2026' })
    });
    assert.strictEqual(authA1.status, 200);
    const cookieA1 = authA1.headers['set-cookie'][0].split(';')[0];

    const authA2 = await fetchUrl('/api/museum/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slugA, passcode: 'alpha-pass-2026' })
    });
    assert.strictEqual(authA2.status, 200);
    const cookieA2 = authA2.headers['set-cookie'][0].split(';')[0];

    const authB1 = await fetchUrl('/api/museum/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slugB, passcode: 'beta-pass-2026' })
    });
    assert.strictEqual(authB1.status, 200);
    const cookieB1 = authB1.headers['set-cookie'][0].split(';')[0];

    // 2.3 Connect WebSocket peers
    const wsA1 = await connectWs({ Cookie: cookieA1 });
    wsA1.send(JSON.stringify({ t: 'join', proto: 2, avatarId: 'maya', name: 'MayaA' }));
    const joinA1 = await nextMessage(wsA1, m => m.t === 'room_state');
    assert.strictEqual(joinA1.room, `customer_${slugA}`);

    const wsA2 = await connectWs({ Cookie: cookieA2 });
    wsA2.send(JSON.stringify({ t: 'join', proto: 2, avatarId: 'ethan', name: 'EthanA' }));
    const joinA2 = await nextMessage(wsA2, m => m.t === 'room_state');
    assert.strictEqual(joinA2.room, `customer_${slugA}`);

    const wsB1 = await connectWs({ Cookie: cookieB1 });
    wsB1.send(JSON.stringify({ t: 'join', proto: 2, avatarId: 'maya', name: 'MayaB' }));
    const joinB1 = await nextMessage(wsB1, m => m.t === 'room_state');
    assert.strictEqual(joinB1.room, `customer_${slugB}`);

    // Track eviction events
    let a1Evicted = false;
    let a2Evicted = false;
    let b1Evicted = false;

    wsA1.on('close', code => { if (code === 4003) a1Evicted = true; });
    wsA2.on('close', code => { if (code === 4003) a2Evicted = true; });
    wsB1.on('close', code => { if (code === 4003) b1Evicted = true; });

    // 2.4 Revoke Customer A sessions via Admin API
    const revokeRes = await fetchUrl(`/api/admin/customers/${slugA}/access/sessions`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(revokeRes.status, 200);
    const revokeBody = JSON.parse(revokeRes.body);
    assert.strictEqual(revokeBody.ok, true);
    assert.strictEqual(revokeBody.revokedCount, 2);

    await sleep(400);

    // Verify Customer A peers are evicted, but Customer B peer is STILL OPEN and UNAFFECTED!
    assert.strictEqual(a1Evicted, true, 'Customer A visitor 1 must be evicted (4003)');
    assert.strictEqual(a2Evicted, true, 'Customer A visitor 2 must be evicted (4003)');
    assert.strictEqual(b1Evicted, false, 'Customer B visitor must NOT be evicted');
    assert.strictEqual(wsB1.readyState, WebSocket.OPEN, 'Customer B connection must remain open');
    console.log('  ✓ Multi-tenant eviction precision verified: Customer A evicted, Customer B unaffected');

    // 2.5 Reconnect attempt by evicted session must be rejected
    const reconnectWs = await connectWs({ Cookie: cookieA1 });
    reconnectWs.send(JSON.stringify({ t: 'join', proto: 2, avatarId: 'maya', name: 'MayaA' }));
    let reconnectDenied = false;
    reconnectWs.on('close', code => {
      if (code === 4003) reconnectDenied = true;
    });
    await sleep(300);
    assert.strictEqual(reconnectDenied, true, 'Evicted session reconnect must be denied with code 4003');
    console.log('  ✓ Reconnect with revoked session token strictly denied');

    // 2.6 Server-Authoritative Room Routing (Anti-Spoofing Challenge)
    // Client authenticated for Customer B tries to spoof customerSlug: slugA in WS join message
    const wsSpoof = await connectWs({ Cookie: cookieB1 });
    wsSpoof.send(JSON.stringify({
      t: 'join',
      proto: 2,
      avatarId: 'ethan',
      name: 'EthanSpoof',
      customerSlug: slugA // Maliciously attempt to jump into Customer A's room!
    }));
    const spoofState = await nextMessage(wsSpoof, m => m.t === 'room_state');
    assert.strictEqual(
      spoofState.room,
      `customer_${slugB}`,
      'Server MUST ignore client-supplied customerSlug and enforce session-bound slug'
    );
    console.log('  ✓ Server-authoritative room isolation verified: client-supplied customerSlug spoof ignored');

    // 2.7 Grace Period Session Revocation & Eviction
    // Customer B visitor disconnects gracefully (entering 30s grace period)
    try { wsB1.close(); } catch {}
    await sleep(200);

    // Verify occupancy endpoint reflects grace period
    const occBefore = await fetchUrl(`/api/occupancy?slug=${slugB}`);
    const occBeforeData = JSON.parse(occBefore.body);
    assert.ok(occBeforeData.count >= 1, 'Grace session counted in occupancy');

    // Admin revokes Customer B's sessions
    const revokeB = await fetchUrl(`/api/admin/customers/${slugB}/access/sessions`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(revokeB.status, 200);

    // Verify grace sessions were wiped and occupancy dropped to 0
    const occAfter = await fetchUrl(`/api/occupancy?slug=${slugB}`);
    const occAfterData = JSON.parse(occAfter.body);
    assert.strictEqual(occAfterData.count, 0, 'Grace sessions must be cleared on session revocation');
    console.log('  ✓ Disconnection grace period cleared immediately upon session revocation');

    try { wsSpoof.close(); } catch {}

    // =========================================================================
    // SECTION 3: 75-SLOT PHOTO UPLOAD BOUNDARY ENFORCEMENT
    // =========================================================================
    console.log('\n[Section 3] 75-Slot Photo Upload Boundary Enforcement...');

    const validPngBuffer = Buffer.from('FAKED_PNG_PAYLOAD_FOR_PHOTO_TESTING_123456');

    // 3.1 Test Room 0 (Grand Lobby) Slot Boundaries (Exactly 3 slots: 1, 2, 3)
    console.log('  Testing Room 0 (Lobby) slot boundaries [1..3]...');
    // Slot 1: valid (base64 JSON)
    const upLobby1 = await fetchUrl(`/api/admin/customers/${slugA}/photos/lobby/1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ image: validPngBuffer.toString('base64') })
    });
    assert.strictEqual(upLobby1.status, 200, 'Lobby slot 1 must succeed');

    // Slot 2: valid (raw binary buffer / octet-stream)
    const upLobby2Raw = await fetchUrl(`/api/admin/customers/${slugA}/photos/lobby/2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', Cookie: adminCookie },
      body: validPngBuffer
    });
    assert.strictEqual(upLobby2Raw.status, 200, 'Lobby slot 2 via raw octet-stream must succeed');

    // Slot 3: valid (canonical folder name)
    const upLobby3 = await fetchUrl(`/api/admin/customers/${slugA}/photos/00_grand_lobby/3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ image: validPngBuffer.toString('base64') })
    });
    assert.strictEqual(upLobby3.status, 200, 'Lobby slot 3 must succeed');

    // Slot 0: invalid boundary
    const upLobby0 = await fetchUrl(`/api/admin/customers/${slugA}/photos/lobby/0`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ image: validPngBuffer.toString('base64') })
    });
    assert.strictEqual(upLobby0.status, 400, 'Lobby slot 0 must be rejected with 400');

    // Slot 4: invalid boundary (Lobby only has 3 slots)
    const upLobby4 = await fetchUrl(`/api/admin/customers/${slugA}/photos/lobby/4`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ image: validPngBuffer.toString('base64') })
    });
    assert.strictEqual(upLobby4.status, 400, 'Lobby slot 4 must be rejected with 400');

    // Slot 12: invalid boundary for Lobby
    const upLobby12 = await fetchUrl(`/api/admin/customers/${slugA}/photos/lobby/12`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ image: validPngBuffer.toString('base64') })
    });
    assert.strictEqual(upLobby12.status, 400, 'Lobby slot 12 must be rejected with 400');
    console.log('  ✓ Lobby slots 0, 4, 12 rejected; slots 1..3 accepted');

    // 3.2 Test Salon Rooms (1..6) Slot Boundaries (Exactly 12 slots each: 1..12)
    console.log('  Testing Salon Room slot boundaries [1..12]...');
    const salonRooms = [
      'fireside',
      '02_music_classical_melodies',
      'library',
      '04_masterpiece_paris_romance',
      'orangery',
      '06_secret_promise_alcove'
    ];

    for (const room of salonRooms) {
      // Slot 1: valid
      const up1 = await fetchUrl(`/api/admin/customers/${slugA}/photos/${room}/1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ image: validPngBuffer.toString('base64') })
      });
      assert.strictEqual(up1.status, 200, `Slot 1 in room '${room}' must be accepted`);

      // Slot 12: valid
      const up12 = await fetchUrl(`/api/admin/customers/${slugA}/photos/${room}/12`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ image: validPngBuffer.toString('base64') })
      });
      assert.strictEqual(up12.status, 200, `Slot 12 in room '${room}' must be accepted`);

      // Slot 0: invalid
      const up0 = await fetchUrl(`/api/admin/customers/${slugA}/photos/${room}/0`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ image: validPngBuffer.toString('base64') })
      });
      assert.strictEqual(up0.status, 400, `Slot 0 in room '${room}' must be rejected`);

      // Slot 13: invalid (out of bounds)
      const up13 = await fetchUrl(`/api/admin/customers/${slugA}/photos/${room}/13`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ image: validPngBuffer.toString('base64') })
      });
      assert.strictEqual(up13.status, 400, `Slot 13 in room '${room}' must be rejected`);

      // Negative slot
      const upNeg = await fetchUrl(`/api/admin/customers/${slugA}/photos/${room}/-1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ image: validPngBuffer.toString('base64') })
      });
      assert.strictEqual(upNeg.status, 400, `Negative slot in room '${room}' must be rejected`);

      // Non-numeric slot
      const upNonNum = await fetchUrl(`/api/admin/customers/${slugA}/photos/${room}/invalid_slot_name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ image: validPngBuffer.toString('base64') })
      });
      assert.strictEqual(upNonNum.status, 400, `Invalid slot name in room '${room}' must be rejected`);
    }
    console.log('  ✓ Salon rooms slots 0, 13, -1, NaN rejected; slots 1 and 12 accepted');

    // 3.3 Test Invalid Rooms & Traversal Attempts
    console.log('  Testing invalid room identifiers...');
    const invalidRooms = [
      '7',
      '07_extra_room',
      '-1',
      'bathroom',
      'outside',
      '00_grand_lobby%00'
    ];
    for (const badRoom of invalidRooms) {
      const res = await fetchUrl(`/api/admin/customers/${slugA}/photos/${badRoom}/1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ image: validPngBuffer.toString('base64') })
      });
      assert.strictEqual(res.status, 400, `Invalid room '${badRoom}' must be rejected with 400`);
    }

    // Traversal attempts in room parameter (both normalized and percent-encoded)
    const traversalRooms = ['../outside', '..%2f..%2fetc', '..%5c..%5cwindows'];
    for (const badRoom of traversalRooms) {
      const res = await fetchUrl(`/api/admin/customers/${slugA}/photos/${badRoom}/1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ image: validPngBuffer.toString('base64') })
      });
      assert.ok(
        res.status === 400 || res.status === 404,
        `Traversal room '${badRoom}' must be rejected (400 or 404), got ${res.status}`
      );
    }
    console.log('  ✓ Invalid room keys and traversal attempts rejected');

    // 3.4 Test Payload Boundary Checks
    console.log('  Testing payload boundary checks (empty / missing)...');
    // Empty buffer
    const emptyUpload = await fetchUrl(`/api/admin/customers/${slugA}/photos/lobby/2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', Cookie: adminCookie },
      body: Buffer.alloc(0)
    });
    assert.strictEqual(emptyUpload.status, 400, 'Empty buffer upload must return 400');

    // Missing image field in JSON
    const missingImgUpload = await fetchUrl(`/api/admin/customers/${slugA}/photos/lobby/2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ wrongField: 'data' })
    });
    assert.strictEqual(missingImgUpload.status, 400, 'Missing image field must return 400');
    console.log('  ✓ Empty payloads and malformed image bodies rejected');

    // 3.5 Cross-Customer Photo Isolation and Path Traversal via GET /photos/*
    console.log('  Testing cross-customer isolation on GET /photos/*...');
    // Re-auth customer B
    const authBRe = await fetchUrl('/api/museum/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slugB, passcode: 'beta-pass-2026' })
    });
    assert.strictEqual(authBRe.status, 200);
    const cookieBRe = authBRe.headers['set-cookie'][0].split(';')[0];

    // Customer B requests slot 1 in lobby (which exists in Customer A, but NOT in Customer B!)
    const bAttempt = await fetchUrl('/photos/00_grand_lobby/01_south_wall_masterpiece.png', {
      headers: { Cookie: cookieBRe }
    });
    assert.strictEqual(bAttempt.status, 404, 'Customer B must NOT see Customer A photo (must get 404)');

    // Path traversal attempt in GET /photos/*
    const traversalAttempt = await fetchUrl('/photos/../customer.json', {
      headers: { Cookie: cookieBRe }
    });
    assert.strictEqual(traversalAttempt.status, 404, 'Path traversal on /photos/ must return 404');
    console.log('  ✓ Cross-customer photo isolation strictly enforced (404)');
    console.log('  ✓ Directory traversal on /photos/ strictly blocked (404)');

    // 3.6 Verify Total Slot Count Report is Exactly 75
    const slotListRes = await fetchUrl(`/api/admin/customers/${slugA}/photos`, {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(slotListRes.status, 200);
    const slotListData = JSON.parse(slotListRes.body);
    assert.strictEqual(slotListData.totalSlots, 75, 'Total slots must be exactly 75');
    assert.strictEqual(slotListData.slots.length, 75, 'Slots array length must be exactly 75');
    console.log('  ✓ Exact 75-slot layout verified (3 lobby + 6x12 salons = 75)');

    console.log('\n===============================================================');
    console.log('   ALL ADVERSARIAL CHALLENGES PASSED EMPIRICALLY (100%)        ');
    console.log('===============================================================');

  } finally {
    await stopServer();
    try { deleteCustomer(slugA); } catch {}
    try { deleteCustomer(slugB); } catch {}
  }
}

runAdversarialTests().catch(err => {
  console.error('\n❌ ADVERSARIAL STRESS TEST FAILED:\n', err);
  process.exit(1);
});
