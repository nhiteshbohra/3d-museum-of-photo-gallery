/**
 * ADVERSARIAL SECURITY VERIFICATION HARNESS (Milestone M1)
 *
 * Empirical verification of prototype pollution, prototype property bypass,
 * session token forgery, and access control immunity in scripts/inviteStore.js
 * and server.js HTTP / WebSocket endpoints.
 */

import http from 'http';
import { WebSocket } from 'ws';
import { spawn } from 'child_process';
import assert from 'assert';
import {
  validateSession,
  redeemInvite,
  revokeInvite,
  createInvite,
  listInvites
} from '../scripts/inviteStore.js';

const TEST_PORT = 8995;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

const PROTOTYPE_PROPERTIES = [
  'constructor',
  '__proto__',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__'
];

let serverProc = null;

function fetchUrl(pathname, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, BASE_URL);
    const req = http.request(url, options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
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

function nextWsMessage(ws, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WS message timeout')), timeoutMs);
    const onMsg = raw => {
      try {
        clearTimeout(timer);
        ws.off('message', onMsg);
        resolve(JSON.parse(raw.toString()));
      } catch (e) {
        clearTimeout(timer);
        ws.off('message', onMsg);
        reject(e);
      }
    };
    ws.on('message', onMsg);
  });
}

async function startServer() {
  serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(TEST_PORT), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetchUrl('/healthz');
      if (res.status === 200) return;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Test server failed to start within timeout');
}

function stopServer() {
  if (serverProc) {
    try {
      serverProc.kill('SIGTERM');
      if (process.platform === 'win32' && serverProc.pid) {
        spawn('taskkill', ['/pid', String(serverProc.pid), '/f', '/t']);
      }
    } catch {}
  }
}

async function runAdversarialVerification() {
  console.log('======================================================================');
  console.log('  STARTING EMPIRICAL ADVERSARIAL SECURITY VERIFICATION (MILESTONE M1) ');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // TEST SUITE PART 1: Direct Store Unit Vectors (Prototype Property Immunity)
  // -------------------------------------------------------------------------
  console.log('[SECTION 1] Store Unit Vector: Prototype Property Bypass Immunity');

  // 1.1: validateSession must return null for all prototype properties
  for (const prop of PROTOTYPE_PROPERTIES) {
    const res = validateSession(prop);
    assert.strictEqual(
      res,
      null,
      `validateSession("${prop}") must return null, got ${typeof res}`
    );
  }
  console.log(`  ✓ validateSession rejected all ${PROTOTYPE_PROPERTIES.length} prototype properties directly`);

  // 1.2: validateSession with whitespace, case variants, and non-strings
  const weirdInputs = [
    ' CONSTRUCTOR ',
    'Constructor',
    '__PROTO__',
    ' toString ',
    'ValueOf',
    null,
    undefined,
    12345,
    true,
    false,
    {},
    [],
    () => {},
    NaN
  ];
  for (const weird of weirdInputs) {
    const res = validateSession(weird);
    assert.strictEqual(
      res,
      null,
      `validateSession(${JSON.stringify(weird)}) must return null`
    );
  }
  console.log('  ✓ validateSession rejected malformed types, case variations, and whitespace padded inputs');

  // 1.3: redeemInvite must reject all prototype properties
  for (const prop of PROTOTYPE_PROPERTIES) {
    const res = redeemInvite(prop);
    assert.strictEqual(
      res.success,
      false,
      `redeemInvite("${prop}") must return { success: false }`
    );
    assert.ok(
      typeof res.error === 'string',
      `redeemInvite("${prop}") must return error message`
    );
  }
  console.log(`  ✓ redeemInvite rejected all ${PROTOTYPE_PROPERTIES.length} prototype property codes`);

  // -------------------------------------------------------------------------
  // TEST SUITE PART 2: Prototype Pollution Mutation Attack Resistance
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 2] Store Unit Vector: Prototype Pollution Mutation Attacks');

  // Snapshot Object.prototype keys before attacks
  const baselineKeys = new Set(Object.getOwnPropertyNames(Object.prototype));

  // 2.1: Attack on revokeInvite with prototype properties
  for (const prop of PROTOTYPE_PROPERTIES) {
    const res = revokeInvite(prop);
    assert.strictEqual(
      res,
      false,
      `revokeInvite("${prop}") must return false`
    );
  }
  assert.strictEqual(Object.prototype.revoked, undefined, 'Object.prototype.revoked must be undefined');
  assert.strictEqual(Object.prototype.sessionToken, undefined, 'Object.prototype.sessionToken must be undefined');
  assert.strictEqual(({}).revoked, undefined, '({}).revoked must be undefined');
  console.log('  ✓ revokeInvite safely rejected all prototype property targets without prototype pollution');

  // 2.2: Attack on createInvite with prototype property codes
  assert.throws(
    () => createInvite({ customCode: '__proto__' }),
    /Invalid invitation code/,
    'createInvite("__proto__") must throw'
  );
  assert.throws(
    () => createInvite({ customCode: 'constructor' }),
    /Invalid invitation code/,
    'createInvite("constructor") must throw'
  );
  assert.throws(
    () => createInvite({ customCode: 'prototype' }),
    /Invalid invitation code/,
    'createInvite("prototype") must throw'
  );
  console.log('  ✓ createInvite blocked forbidden prototype property custom codes');

  // 2.3: Verify Object.prototype integrity is 100% pristine
  const postKeys = new Set(Object.getOwnPropertyNames(Object.prototype));
  assert.strictEqual(
    postKeys.size,
    baselineKeys.size,
    `Object.prototype property count changed: ${baselineKeys.size} -> ${postKeys.size}`
  );
  for (const key of postKeys) {
    assert.ok(
      baselineKeys.has(key),
      `Object.prototype was polluted with unexpected property: ${key}`
    );
  }
  console.log('  ✓ Object.prototype remains 100% pristine and unpolluted');

  // -------------------------------------------------------------------------
  // TEST SUITE PART 3: Live HTTP Server Access Control Gates
  // -------------------------------------------------------------------------
  console.log(`\n[SECTION 3] Live HTTP Integration on Port ${TEST_PORT}`);
  await startServer();
  console.log(`  ✓ Spawned isolated live test server on http://127.0.0.1:${TEST_PORT}`);

  // 3.1: Verify /api/letters rejects unauthenticated requests
  const resNoAuthLetters = await fetchUrl('/api/letters');
  assert.strictEqual(resNoAuthLetters.status, 401, 'Unauthenticated /api/letters must return 401');
  console.log('  ✓ GET /api/letters with no credentials returns HTTP 401');

  // 3.2: Verify /api/letters rejects ALL prototype properties via Cookie
  for (const prop of PROTOTYPE_PROPERTIES) {
    const res = await fetchUrl('/api/letters', {
      headers: { Cookie: `museum_session=${prop}` }
    });
    assert.strictEqual(
      res.status,
      401,
      `GET /api/letters with Cookie museum_session=${prop} must return 401`
    );
  }
  console.log(`  ✓ GET /api/letters rejected all ${PROTOTYPE_PROPERTIES.length} prototype cookie tokens with HTTP 401`);

  // 3.3: Verify /api/letters rejects prototype tokens via Authorization: Bearer
  for (const prop of PROTOTYPE_PROPERTIES) {
    const res = await fetchUrl('/api/letters', {
      headers: { Authorization: `Bearer ${prop}` }
    });
    assert.strictEqual(
      res.status,
      401,
      `GET /api/letters with Bearer ${prop} must return 401`
    );
  }
  console.log(`  ✓ GET /api/letters rejected all ${PROTOTYPE_PROPERTIES.length} prototype Bearer tokens with HTTP 401`);

  // 3.4: Verify /api/letters rejects prototype tokens via query string
  for (const prop of PROTOTYPE_PROPERTIES) {
    const res = await fetchUrl(`/api/letters?session=${prop}`);
    assert.strictEqual(
      res.status,
      401,
      `GET /api/letters?session=${prop} must return 401`
    );
  }
  console.log(`  ✓ GET /api/letters rejected all ${PROTOTYPE_PROPERTIES.length} prototype query tokens with HTTP 401`);

  // 3.5: Verify /photos/* rejects prototype tokens and forged cookies
  for (const prop of PROTOTYPE_PROPERTIES) {
    const res = await fetchUrl('/photos/README.md', {
      headers: { Cookie: `museum_session=${prop}` }
    });
    assert.strictEqual(
      res.status,
      401,
      `GET /photos/README.md with Cookie museum_session=${prop} must return 401`
    );
  }
  const resForgedPhoto = await fetchUrl('/photos/README.md', {
    headers: { Cookie: 'museum_session=sess_forged_admin_token' }
  });
  assert.strictEqual(resForgedPhoto.status, 401, 'Forged token on /photos/* must return 401');
  console.log('  ✓ GET /photos/* rejected prototype tokens and forged cookies with HTTP 401');

  // 3.6: Verify POST /api/invite/redeem rejects prototype codes
  for (const prop of PROTOTYPE_PROPERTIES) {
    const res = await fetchUrl('/api/invite/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: prop })
    });
    assert.strictEqual(
      res.status,
      401,
      `POST /api/invite/redeem with code=${prop} must return 401`
    );
    assert.strictEqual(res.json?.ok, false, 'Response json.ok must be false');
  }
  console.log(`  ✓ POST /api/invite/redeem rejected all ${PROTOTYPE_PROPERTIES.length} prototype codes with HTTP 401`);

  // -------------------------------------------------------------------------
  // TEST SUITE PART 4: Live WebSocket Protocol Hardening
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 4] Live WebSocket Protocol Hardening');

  // 4.1: WebSocket with prototype session token via Cookie
  for (const prop of ['constructor', '__proto__', 'toString', 'valueOf']) {
    const ws = await connectWs({ Cookie: `museum_session=${prop}` });
    const pClose = new Promise(resolve => ws.on('close', (code, reason) => resolve({ code, reason: reason.toString() })));
    ws.send(JSON.stringify({ t: 'join', proto: 2, name: `Attacker_${prop}` }));
    const err = await nextWsMessage(ws);
    assert.strictEqual(err.t, 'error', `WebSocket with ${prop} token must receive error`);
    assert.strictEqual(err.msg, 'unauthorized', `WebSocket error must be unauthorized, got ${err.msg}`);
    const closeEvt = await pClose;
    assert.strictEqual(closeEvt.code, 4003, 'Socket must be closed with code 4003');
  }
  console.log('  ✓ WebSocket connections with prototype cookies rejected with unauthorized and closed with 4003');

  // 4.2: WebSocket join payload with prototype code
  for (const prop of ['constructor', '__proto__', 'toString', 'valueOf']) {
    const ws = await connectWs({});
    const pClose = new Promise(resolve => ws.on('close', (code, reason) => resolve({ code, reason: reason.toString() })));
    ws.send(JSON.stringify({ t: 'join', proto: 2, code: prop, name: `Attacker_${prop}` }));
    const err = await nextWsMessage(ws);
    assert.strictEqual(err.t, 'error', `WebSocket with ${prop} code must receive error`);
    assert.strictEqual(err.msg, 'bad-code', `WebSocket error must be bad-code, got ${err.msg}`);
    const closeEvt = await pClose;
    assert.strictEqual(closeEvt.code, 4003, 'Socket must be closed with code 4003');
  }
  console.log('  ✓ WebSocket joins with prototype codes in payload rejected with bad-code and closed with 4003');

  // -------------------------------------------------------------------------
  // TEST SUITE PART 5: Legitimate Invitation & Session Continuity
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 5] Legitimate Invitation & Session Continuity');

  // 5.1: Redeem legitimate invite 'Maya-Love' (case-insensitive test)
  const resMayaRedeem = await fetchUrl('/api/invite/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'Maya-Love' })
  });
  assert.strictEqual(resMayaRedeem.status, 200, 'Legitimate invite redemption must return 200');
  assert.strictEqual(resMayaRedeem.json?.ok, true, 'Redemption response ok must be true');
  assert.strictEqual(resMayaRedeem.json?.recipient, 'Maya', 'Recipient must be Maya');

  const setCookieHeader = resMayaRedeem.headers['set-cookie'];
  assert.ok(setCookieHeader, 'Set-Cookie header must be present');
  const cookieMatch = /(?:^|;\s*)museum_session=([^;]+)/.exec(Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : setCookieHeader);
  assert.ok(cookieMatch, 'museum_session cookie must be set');
  const mayaSessionToken = decodeURIComponent(cookieMatch[1]);
  assert.ok(mayaSessionToken.startsWith('sess_'), 'Session token must start with sess_');
  const mayaCookie = `museum_session=${mayaSessionToken}`;
  console.log('  ✓ Redeem legitimate invite "Maya-Love" succeeded, issued valid HttpOnly session cookie');

  // 5.2: Authenticated access to /api/letters with valid cookie
  const resMayaLetters = await fetchUrl('/api/letters', {
    headers: { Cookie: mayaCookie }
  });
  assert.strictEqual(resMayaLetters.status, 200, 'Authenticated /api/letters must return 200');
  assert.strictEqual(resMayaLetters.json?.ok, true, 'API letters response ok must be true');
  assert.strictEqual(resMayaLetters.json?.recipient, 'Maya', 'API letters recipient must match Maya');
  assert.ok(resMayaLetters.json?.letters, 'Letters payload must be present');
  console.log('  ✓ GET /api/letters succeeded with legitimate session cookie (200 OK)');

  // 5.3: Authenticated access to /photos/* with valid cookie
  const resMayaPhoto = await fetchUrl('/photos/README.md', {
    headers: { Cookie: mayaCookie }
  });
  // If file exists, returns 200, otherwise 404. What matters is it does NOT return 401 Unauthorized!
  assert.notStrictEqual(resMayaPhoto.status, 401, 'Authenticated /photos/* request must not return 401');
  console.log(`  ✓ GET /photos/* authorized with legitimate session cookie (status: ${resMayaPhoto.status})`);

  // 5.4: WebSocket connection with legitimate session cookie
  const wsMaya = await connectWs({ Cookie: mayaCookie });
  wsMaya.send(JSON.stringify({ t: 'join', proto: 2, name: 'Maya' }));
  const mayaJoinMsg = await nextWsMessage(wsMaya);
  assert.notStrictEqual(mayaJoinMsg.t, 'error', 'Legitimate visitor should not receive error on join');
  console.log(`  ✓ WebSocket join succeeded for legitimate visitor (received: ${mayaJoinMsg.t})`);
  wsMaya.close();

  // 5.5: Dynamic Invite Creation, Redemption, and Immediate Revocation Lifecycle
  const dynamicInvite = createInvite({
    recipient: 'EphemeralGuest',
    ttlHours: 1,
    customCode: 'adversarial-dynamic-code-01'
  });
  assert.strictEqual(dynamicInvite.code, 'adversarial-dynamic-code-01');

  const resDynRedeem = await fetchUrl('/api/invite/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'adversarial-dynamic-code-01' })
  });
  assert.strictEqual(resDynRedeem.status, 200);
  const dynCookieMatch = /(?:^|;\s*)museum_session=([^;]+)/.exec(
    Array.isArray(resDynRedeem.headers['set-cookie'])
      ? resDynRedeem.headers['set-cookie'].join(';')
      : resDynRedeem.headers['set-cookie']
  );
  const dynToken = decodeURIComponent(dynCookieMatch[1]);
  const dynCookie = `museum_session=${dynToken}`;

  // Verify access works prior to revocation
  const resDynBefore = await fetchUrl('/api/letters', { headers: { Cookie: dynCookie } });
  assert.strictEqual(resDynBefore.status, 200);

  // Revoke the dynamic invite
  const revokedOk = revokeInvite('adversarial-dynamic-code-01');
  assert.strictEqual(revokedOk, true, 'revokeInvite must return true');

  // Allow cache window (250ms) to elapse for separate server process to reload from disk
  await new Promise(r => setTimeout(r, 350));

  // Verify immediate failure on HTTP after revocation
  const resDynAfter = await fetchUrl('/api/letters', { headers: { Cookie: dynCookie } });
  assert.strictEqual(resDynAfter.status, 401, 'Revoked session must immediately fail with HTTP 401');

  // Verify immediate failure on WebSocket after revocation
  const wsDyn = await connectWs({ Cookie: dynCookie });
  const pDynClose = new Promise(resolve => wsDyn.on('close', (code, reason) => resolve({ code, reason: reason.toString() })));
  wsDyn.send(JSON.stringify({ t: 'join', proto: 2, name: 'EphemeralGuest' }));
  const dynWsErr = await nextWsMessage(wsDyn);
  assert.strictEqual(dynWsErr.t, 'error');
  assert.strictEqual(dynWsErr.msg, 'unauthorized');
  const dynCloseEvt = await pDynClose;
  assert.strictEqual(dynCloseEvt.code, 4003);
  console.log('  ✓ Dynamic invitation lifecycle verified: creation -> redemption -> access -> revocation -> immediate HTTP 401 / WS 4003 denial');

  console.log('\n======================================================================');
  console.log('  ALL EMPIRICAL ADVERSARIAL SECURITY VERIFICATIONS PASSED (100%)      ');
  console.log('======================================================================\n');
}

// Execute harness
try {
  await runAdversarialVerification();
} catch (err) {
  console.error('\n❌ ADVERSARIAL HARNESS FAILURE:', err);
  process.exitCode = 1;
} finally {
  stopServer();
}
