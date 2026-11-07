/**
 * Automated test suite for Customer Admin API.
 * Validates:
 * 1. Founder authentication (login, session check, logout, 401 gates).
 * 2. Customer CRUD (/api/admin/customers): list, create, identity, access, window, quotes.
 * 3. 75-Slot Photo Management: list slots, upload slot photo, delete slot photo.
 * 4. Active session revocation & WebSocket eviction.
 * 5. Customer deletion and directory cleanup.
 * 6. Audit logging for founder actions.
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

const TEST_PORT = 8994;
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
      ADMIN_USERNAME: 'founder',
      ADMIN_PASSWORD: 'test-admin-password-2026'
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
  console.log('=== CUSTOMER ADMIN API TEST SUITE ===');
  const targetSlug = 'admin-api-demo-client';

  try {
    try { deleteCustomer(targetSlug); } catch {}
    await startServer();

    // ── TEST 1: Founder Auth Gate & Login ──────────────────────────
    console.log('[Test 1] Founder Authentication & Session Management...');
    let adminCookie = null;
    let adminToken = null;

    {
      // 1. Unauthenticated request to admin route must return 401
      const unauth = await fetchUrl('/api/admin/customers');
      assert.strictEqual(unauth.status, 401, 'Unauthenticated admin request must return 401');

      // 2. Bad credentials
      const badLogin = await fetchUrl('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'founder', password: 'wrong-password' })
      });
      assert.strictEqual(badLogin.status, 401, 'Bad credentials must return 401');

      // 3. Valid login
      const goodLogin = await fetchUrl('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'founder', password: 'test-admin-password-2026' })
      });
      assert.strictEqual(goodLogin.status, 200, 'Valid admin login must return 200');
      const loginBody = JSON.parse(goodLogin.body);
      assert.strictEqual(loginBody.ok, true);
      assert.ok(loginBody.token, 'Must return admin token');
      adminToken = loginBody.token;

      adminCookie = goodLogin.headers['set-cookie'][0].split(';')[0];
      assert.ok(adminCookie.startsWith('admin_session='), 'Must set admin_session cookie');

      // 4. Session check
      const sessCheck = await fetchUrl('/api/admin/auth/session', {
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(sessCheck.status, 200);
      const sessBody = JSON.parse(sessCheck.body);
      assert.strictEqual(sessBody.user, 'founder');
    }
    console.log('✓ Test 1 Passed: Founder authentication and session verified');

    // ── TEST 2: Customer Creation & CRUD Operations ────────────────
    console.log('[Test 2] Customer Creation & Management CRUD...');
    {
      // 1. Create Customer
      const createRes = await fetchUrl('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie
        },
        body: JSON.stringify({
          slug: targetSlug,
          displayName: 'Admin Demo Gallery',
          passcode: 'demo-passcode-999',
          plan: 'premium',
          status: 'active',
          activeFrom: '2026-01-01',
          activeUntil: '2028-12-31'
        })
      });
      assert.strictEqual(createRes.status, 201, 'Customer creation must return 201 Created');
      const createData = JSON.parse(createRes.body);
      assert.strictEqual(createData.ok, true);
      assert.strictEqual(createData.customer.slug, targetSlug);
      assert.strictEqual(createData.customer.plan, 'premium');

      // Verify on disk directory hierarchy
      const customerOnDisk = path.join(rootDir, 'data', 'customers', targetSlug);
      assert.ok(fs.existsSync(customerOnDisk), 'Customer directory must exist on disk');
      assert.ok(fs.existsSync(path.join(customerOnDisk, 'customer.json')));
      assert.ok(fs.existsSync(path.join(customerOnDisk, 'photos', '00_grand_lobby')));
      assert.ok(fs.existsSync(path.join(customerOnDisk, 'photos', '06_secret_promise_alcove')));

      // 2. Duplicate slug returns 409
      const dupRes = await fetchUrl('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ slug: targetSlug, displayName: 'Dup' })
      });
      assert.strictEqual(dupRes.status, 409, 'Duplicate slug creation must return 409');

      // 3. List customers
      const listRes = await fetchUrl('/api/admin/customers', {
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(listRes.status, 200);
      const listData = JSON.parse(listRes.body);
      const found = listData.customers.find(c => c.slug === targetSlug);
      assert.ok(found, 'Created customer must appear in admin listing');
      assert.strictEqual(found.totalSlots, 75);

      // 4. Update Identity
      const updateIdent = await fetchUrl(`/api/admin/customers/${targetSlug}/identity`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ displayName: 'Renamed Demo Gallery', status: 'paused' })
      });
      assert.strictEqual(updateIdent.status, 200);
      const identData = JSON.parse(updateIdent.body);
      assert.strictEqual(identData.customer.displayName, 'Renamed Demo Gallery');
      assert.strictEqual(identData.customer.status, 'paused');

      // Re-activate customer
      await fetchUrl(`/api/admin/customers/${targetSlug}/identity`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ status: 'active' })
      });

      // 5. Update Access / Passcode
      const updateAccess = await fetchUrl(`/api/admin/customers/${targetSlug}/access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ passcode: 'brand-new-secret-2026', sessionDurationHours: 48 })
      });
      assert.strictEqual(updateAccess.status, 200);

      // 6. Update Window
      const updateWin = await fetchUrl(`/api/admin/customers/${targetSlug}/window`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ activeFrom: '2026-03-01', activeUntil: '2027-03-01' })
      });
      assert.strictEqual(updateWin.status, 200);
      const winData = JSON.parse(updateWin.body);
      assert.strictEqual(winData.window.activeFrom, '2026-03-01');

      // 7. Update Quotes
      const updateQuotes = await fetchUrl(`/api/admin/customers/${targetSlug}/quotes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          quotes: {
            "Grand Lobby": { letter: "Welcome to our gallery!" }
          }
        })
      });
      assert.strictEqual(updateQuotes.status, 200);
    }
    console.log('✓ Test 2 Passed: Customer CRUD operations fully functional');

    // ── TEST 3: 75-Slot Photo Management ───────────────────────────
    console.log('[Test 3] 75-Slot Photo Management...');
    {
      // 1. List 75 slots
      const photosRes = await fetchUrl(`/api/admin/customers/${targetSlug}/photos`, {
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(photosRes.status, 200);
      const photosData = JSON.parse(photosRes.body);
      assert.strictEqual(photosData.totalSlots, 75);
      assert.strictEqual(photosData.filledSlots, 0);

      // 2. Upload photo to room 'lobby' slot 1
      const sampleImageBuffer = Buffer.from('PNG_FAKE_IMAGE_HEADER_AND_BODY_FOR_SLOT_01');
      const uploadRes = await fetchUrl(`/api/admin/customers/${targetSlug}/photos/lobby/1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie
        },
        body: JSON.stringify({
          image: sampleImageBuffer.toString('base64')
        })
      });
      assert.strictEqual(uploadRes.status, 200, 'Photo upload must return 200');
      const uploadData = JSON.parse(uploadRes.body);
      assert.strictEqual(uploadData.ok, true);
      assert.strictEqual(uploadData.room, '00_grand_lobby');
      assert.strictEqual(uploadData.slot, 1);

      // Verify on disk
      const slotFilePath = path.join(
        rootDir,
        'data',
        'customers',
        targetSlug,
        'photos',
        '00_grand_lobby',
        '01_south_wall_masterpiece.png'
      );
      assert.ok(fs.existsSync(slotFilePath), 'Photo file must exist on disk');
      assert.strictEqual(fs.readFileSync(slotFilePath).toString(), sampleImageBuffer.toString());

      // Re-check slot listing: filledSlots must now be 1
      const recheck = await fetchUrl(`/api/admin/customers/${targetSlug}/photos`, {
        headers: { Cookie: adminCookie }
      });
      const recheckData = JSON.parse(recheck.body);
      assert.strictEqual(recheckData.filledSlots, 1);

      // 3. Delete photo from slot
      const delRes = await fetchUrl(`/api/admin/customers/${targetSlug}/photos/lobby/1`, {
        method: 'DELETE',
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(delRes.status, 200);
      assert.strictEqual(fs.existsSync(slotFilePath), false, 'Photo file must be removed on disk');
    }
    console.log('✓ Test 3 Passed: 75-slot photo upload, listing, and deletion verified');

    // ── TEST 4: Session Revocation & WebSocket Eviction ─────────────
    console.log('[Test 4] Session Revocation & WebSocket Eviction...');
    {
      // 1. Authenticate customer client
      const custAuth = await fetchUrl('/api/museum/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: targetSlug, passcode: 'brand-new-secret-2026' })
      });
      assert.strictEqual(custAuth.status, 200);
      const custCookie = custAuth.headers['set-cookie'][0].split(';')[0];

      // 2. Connect client to WebSocket
      const clientWs = await connectWs({ Cookie: custCookie });
      clientWs.send(JSON.stringify({ t: 'join', proto: 2, avatarId: 'maya', name: 'DemoMaya' }));
      const stateMsg = await nextMessage(clientWs, m => m.t === 'room_state');
      assert.strictEqual(stateMsg.room, `customer_${targetSlug}`);

      let evicted = false;
      clientWs.on('close', code => {
        if (code === 4003) evicted = true;
      });

      // 3. Admin revokes sessions for this customer
      const revokeRes = await fetchUrl(`/api/admin/customers/${targetSlug}/access/sessions`, {
        method: 'DELETE',
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(revokeRes.status, 200);
      const revokeData = JSON.parse(revokeRes.body);
      assert.ok(revokeData.revokedCount >= 1, 'At least 1 session must be revoked');

      await sleep(300);
      assert.strictEqual(evicted, true, 'Active WebSocket client must be evicted with code 4003');
    }
    console.log('✓ Test 4 Passed: Admin session revocation terminates active sockets');

    // ── TEST 5: Audit Logging ──────────────────────────────────────
    console.log('[Test 5] Audit Logging...');
    {
      const auditRes = await fetchUrl('/api/admin/audit-logs', {
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(auditRes.status, 200);
      const auditData = JSON.parse(auditRes.body);
      assert.ok(Array.isArray(auditData.logs), 'Audit logs must be an array');
      assert.ok(auditData.logs.length > 0, 'Must have recorded audit actions');

      const actions = auditData.logs.map(l => l.action);
      assert.ok(actions.includes('customer_created'), 'Must record customer_created');
      assert.ok(actions.includes('identity_updated'), 'Must record identity_updated');
      assert.ok(actions.includes('photo_uploaded'), 'Must record photo_uploaded');
    }
    console.log('✓ Test 5 Passed: Audit logs recorded and retrievable');

    // ── TEST 6: Customer Deletion & Admin Logout ───────────────────
    console.log('[Test 6] Customer Deletion & Founder Logout...');
    {
      // 1. Delete customer
      const delCustRes = await fetchUrl(`/api/admin/customers/${targetSlug}`, {
        method: 'DELETE',
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(delCustRes.status, 200);
      const customerOnDisk = path.join(rootDir, 'data', 'customers', targetSlug);
      assert.strictEqual(fs.existsSync(customerOnDisk), false, 'Customer directory removed from disk');

      // 2. Admin Logout
      const logoutRes = await fetchUrl('/api/admin/auth/logout', {
        method: 'POST',
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(logoutRes.status, 200);

      // Verify session is now invalidated
      const checkInvalid = await fetchUrl('/api/admin/auth/session', {
        headers: { Cookie: adminCookie }
      });
      assert.strictEqual(checkInvalid.status, 401, 'Logged out admin session must return 401');
    }
    console.log('✓ Test 6 Passed: Customer deletion and founder logout verified');

    console.log('\n=========================================');
    console.log('ALL CUSTOMER ADMIN API TESTS PASSED');
    console.log('=========================================\n');
  } finally {
    await stopServer();
    try { deleteCustomer(targetSlug); } catch {}
  }
}

runTests().catch(err => {
  console.error('\n❌ CUSTOMER ADMIN API TEST FAILED:\n', err);
  process.exit(1);
});
