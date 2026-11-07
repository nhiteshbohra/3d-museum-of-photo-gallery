/**
 * Adversarial Stress & Edge Case Test Suite for Multi-Customer Photo Management.
 * Executed independently by Challenger 1.
 *
 * Attack Vectors Tested:
 * 1. Slug Validation boundaries, regex edge cases, unicode/homoglyphs, reserved words, Windows device names.
 * 2. Path traversal attacks against photo serving (directory traversal, backslashes, percent-encoding, null-bytes, ADS).
 * 3. Cross-customer photo isolation under adversarial requests.
 * 4. Invite code customerSlug spoofing vulnerability probe.
 * 5. Passcode requirement exposure /api/config evaluation bug probe.
 * 6. Customer lifecycle state transitions (draft/paused/expired date windows) vs session access.
 * 7. Photo upload/delete room & slot parameter tampering.
 */

import http from 'http';
import { WebSocket } from 'ws';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import {
  validateSlug,
  RESERVED_SLUGS,
  createCustomer,
  deleteCustomer,
  saveCustomerPhoto,
  deleteCustomerPhoto,
  getCustomer,
  listCustomerPhotos,
  updateCustomerIdentity,
} from '../scripts/customerStore.js';
import {
  createInvite,
  redeemInvite,
  validateSession,
  createCustomerSession,
  revokeCustomerSessions,
} from '../scripts/inviteStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TEST_PORT = 8994;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

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

async function runAdversarialChallenges() {
  console.log('================================================================');
  console.log('   EMPIRICAL ADVERSARIAL CHALLENGE SUITE: MULTI-CUSTOMER        ');
  console.log('================================================================\n');

  const findings = [];

  // --------------------------------------------------------------------------
  // Vector 1: Slug Validation Stress Testing
  // --------------------------------------------------------------------------
  console.log('[Vector 1] Slug Validation Boundaries & Character Injections...');

  const invalidSlugs = [
    { input: '', reason: 'Empty string' },
    { input: '   ', reason: 'Whitespace string' },
    { input: null, reason: 'null' },
    { input: undefined, reason: 'undefined' },
    { input: 12345, reason: 'Numeric' },
    { input: {}, reason: 'Object' },
    { input: [], reason: 'Array' },
    { input: 'ab', reason: 'Too short (< 3)' },
    { input: 'a'.repeat(49), reason: 'Too long (> 48)' },
    { input: '-leading-hyphen', reason: 'Leading hyphen' },
    { input: 'trailing-hyphen-', reason: 'Trailing hyphen' },
    { input: 'double--hyphen', reason: 'Consecutive hyphens' },
    { input: 'has.dot', reason: 'Dot in slug' },
    { input: 'has/slash', reason: 'Forward slash in slug' },
    { input: 'has\\backslash', reason: 'Backslash in slug' },
    { input: 'has%2fslash', reason: 'Percent-encoded slash in slug' },
    { input: 'has space', reason: 'Space in slug' },
    { input: 'has\0nullbyte', reason: 'Null byte injection' },
    { input: 'cаfé-homoglyph', reason: 'Cyrillic homoglyph (U+0430)' },
    { input: 'مرحبا-arabic', reason: 'Non-latin unicode' },
    { input: 'emoji-🎨-slug', reason: 'Emoji in slug' },
    { input: 'constructor', reason: 'Prototype pollution: constructor' },
    { input: 'prototype', reason: 'Prototype pollution: prototype' },
    { input: '__proto__', reason: 'Prototype pollution: __proto__' },
  ];

  for (const { input, reason } of invalidSlugs) {
    let threw = false;
    try {
      validateSlug(input);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true, `Expected validateSlug to reject [${reason}] '${input}', but it passed!`);
  }

  // Reserved slug rejection
  for (const reserved of RESERVED_SLUGS) {
    let threw = false;
    try {
      validateSlug(reserved);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true, `Expected validateSlug to reject reserved slug '${reserved}', but it passed!`);
  }

  // Windows device names check
  const windowsDeviceNames = ['con', 'prn', 'aux', 'nul', 'com1', 'lpt1'];
  console.log('   Checking Windows reserved device names...');
  for (const devName of windowsDeviceNames) {
    let threw = false;
    try {
      validateSlug(devName);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true, `validateSlug('${devName}') must reject Windows reserved device name`);
    if (!threw) {
      findings.push({
        severity: 'LOW',
        title: `Windows Reserved Device Slug Allowed: '${devName}'`,
        description: `validateSlug('${devName}') does not reject Windows reserved device names (con, prn, aux, nul, com1-9, lpt1-9).`,
      });
    }
  }

  // Valid slugs should pass
  assert.strictEqual(validateSlug('valid-customer'), 'valid-customer');
  assert.strictEqual(validateSlug('customer123'), 'customer123');
  assert.strictEqual(validateSlug('a-b-c-d'), 'a-b-c-d');
  assert.strictEqual(validateSlug('UPPER-CASE-SLUG'), 'upper-case-slug'); // Normalized to lower
  console.log('✓ Vector 1 Complete: Slug validation regex and limits verified.');

  // --------------------------------------------------------------------------
  // Vector 2: Room & Slot Parameter Tampering in Photo Storage
  // --------------------------------------------------------------------------
  console.log('\n[Vector 2] Photo Storage Room & Slot Parameter Tampering...');
  const testSlug = 'adv-cust-test';
  try { deleteCustomer(testSlug); } catch {}
  createCustomer({ slug: testSlug, displayName: 'Adv Customer', passcode: 'secret-pass' });

  const dummyPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // Attempt to write to arbitrary traversal room
  const traversalRooms = ['../../etc', '..\\..\\windows', '/root', null, undefined, ''];
  for (const r of traversalRooms) {
    let threw = false;
    try {
      saveCustomerPhoto(testSlug, r, 1, dummyPng);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true, `saveCustomerPhoto must reject invalid/traversal room '${r}'`);
  }

  // Attempt to write to invalid slot
  const invalidSlots = [0, 13, 99, -1, '../../hack', 'not_a_slot', null, undefined];
  for (const s of invalidSlots) {
    let threw = false;
    try {
      saveCustomerPhoto(testSlug, 'fireside', s, dummyPng);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true, `saveCustomerPhoto must reject invalid slot '${s}'`);
  }

  // Attempt delete on invalid room/slot
  assert.throws(() => deleteCustomerPhoto(testSlug, '../invalid', 1));
  assert.throws(() => deleteCustomerPhoto(testSlug, 'fireside', 99));

  console.log('✓ Vector 2 Complete: Photo storage strictly bounded to canonical rooms and slots.');

  // --------------------------------------------------------------------------
  // Start Test Server for HTTP/Scoping Tests
  // --------------------------------------------------------------------------
  console.log('\n[Setup] Launching server on port ' + TEST_PORT + '...');
  await startServer();

  try {
    const custAlpha = 'adv-cust-alpha';
    const custBeta = 'adv-cust-beta';
    try { deleteCustomer(custAlpha); } catch {}
    try { deleteCustomer(custBeta); } catch {}

    createCustomer({
      slug: custAlpha,
      displayName: 'Customer Alpha',
      passcode: 'pass-alpha-123',
      status: 'active'
    });
    createCustomer({
      slug: custBeta,
      displayName: 'Customer Beta',
      passcode: 'pass-beta-456',
      status: 'active'
    });

    const alphaPng = Buffer.from('ALPHA_PHOTO_CONTENT');
    const betaPng = Buffer.from('BETA_PHOTO_CONTENT');
    saveCustomerPhoto(custAlpha, 'lobby', 1, alphaPng);
    saveCustomerPhoto(custBeta, 'lobby', 1, betaPng);

    // Authenticate Alpha
    const authAlphaRes = await fetchUrl('/api/museum/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: custAlpha, passcode: 'pass-alpha-123' })
    });
    assert.strictEqual(authAlphaRes.status, 200);
    const alphaCookie = (authAlphaRes.headers['set-cookie'] || [])[0].split(';')[0];

    // Authenticate Beta
    const authBetaRes = await fetchUrl('/api/museum/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: custBeta, passcode: 'pass-beta-456' })
    });
    assert.strictEqual(authBetaRes.status, 200);
    const betaCookie = (authBetaRes.headers['set-cookie'] || [])[0].split(';')[0];

    // ------------------------------------------------------------------------
    // Vector 3: Cross-Customer Photo Isolation & Directory Traversal
    // ------------------------------------------------------------------------
    console.log('\n[Vector 3] Cross-Customer Photo Scoping & Path Traversal Attacks...');

    // Alpha requests own photo -> receives Alpha content
    const alphaOwnPhoto = await fetchUrl('/photos/00_grand_lobby/01_south_wall_masterpiece.png', {
      headers: { Cookie: alphaCookie }
    });
    assert.strictEqual(alphaOwnPhoto.status, 200);
    assert.strictEqual(alphaOwnPhoto.body, 'ALPHA_PHOTO_CONTENT');

    // Beta requests own photo -> receives Beta content
    const betaOwnPhoto = await fetchUrl('/photos/00_grand_lobby/01_south_wall_masterpiece.png', {
      headers: { Cookie: betaCookie }
    });
    assert.strictEqual(betaOwnPhoto.status, 200);
    assert.strictEqual(betaOwnPhoto.body, 'BETA_PHOTO_CONTENT');

    // Traversal attempts using Alpha's session to reach Beta's photos:
    const traversalAttacks = [
      `/photos/../../${custBeta}/photos/00_grand_lobby/01_south_wall_masterpiece.png`,
      `/photos/..\\..\\${custBeta}\\photos\\00_grand_lobby\\01_south_wall_masterpiece.png`,
      `/photos/%2e%2e%2f%2e%2e%2f${custBeta}/photos/00_grand_lobby/01_south_wall_masterpiece.png`,
      `/photos/%2e%2e%5c%2e%2e%5c${custBeta}/photos/00_grand_lobby/01_south_wall_masterpiece.png`,
      `/photos/.%2e/.%2e/${custBeta}/photos/00_grand_lobby/01_south_wall_masterpiece.png`,
      `/photos/00_grand_lobby/../../${custBeta}/photos/00_grand_lobby/01_south_wall_masterpiece.png`,
      `/photos/00_grand_lobby/..%2f..%2f${custBeta}/photos/00_grand_lobby/01_south_wall_masterpiece.png`,
      `/photos/%00/00_grand_lobby/01_south_wall_masterpiece.png`,
      `/photos/../customer.json`,
      `/photos/../../master.json`,
      `/photos/../../../server.js`,
      `/photos/`,
      `/photos`,
    ];

    for (const attackPath of traversalAttacks) {
      const res = await fetchUrl(attackPath, { headers: { Cookie: alphaCookie } });
      assert.strictEqual(
        res.status === 400 || res.status === 404,
        true,
        `Traversal attack '${attackPath}' must return 400 or 404, got ${res.status}`
      );
      assert.notStrictEqual(res.body, 'BETA_PHOTO_CONTENT', `CRITICAL: Traversal leaked Beta's private photo!`);
      assert.strictEqual(res.body.includes('ALPHA_PHOTO_CONTENT'), false);
    }
    console.log('✓ Vector 3 Complete: All 13 directory traversal attacks strictly returned 400/404 with zero data leak.');

    // ------------------------------------------------------------------------
    // Vector 4: Unauthenticated Access Invariants
    // ------------------------------------------------------------------------
    console.log('\n[Vector 4] Unauthenticated Access Invariants...');
    const unauthPhoto = await fetchUrl('/photos/00_grand_lobby/01_south_wall_masterpiece.png');
    assert.strictEqual(unauthPhoto.status, 401, 'Unauthenticated photo access must return 401');

    const fakeCookiePhoto = await fetchUrl('/photos/00_grand_lobby/01_south_wall_masterpiece.png', {
      headers: { Cookie: 'museum_session=fake_invalid_token_12345' }
    });
    assert.strictEqual(fakeCookiePhoto.status, 401, 'Forged session token must return 401');
    console.log('✓ Vector 4 Complete: Unauthenticated and forged tokens strictly rejected.');

    // ------------------------------------------------------------------------
    // Vector 5: CRITICAL PROBE: Invitation Code Customer Slug Spoofing
    // ------------------------------------------------------------------------
    console.log('\n[Vector 5] Testing Invite Code Customer Slug Spoofing Attack...');
    // Create a generic invite (not associated with Beta)
    const genericInvite = createInvite({ recipient: 'Generic Visitor' });
    assert.ok(genericInvite.code);

    // Attacker redeems generic invite but injects slug: custBeta
    const spoofRedeemRes = await fetchUrl('/api/invite/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: genericInvite.code, slug: custBeta })
    });

    assert.notStrictEqual(spoofRedeemRes.status, 200, 'Redeeming generic invite with customer slug must not succeed (expected 400 or 401)');

    if (spoofRedeemRes.status === 200) {
      const spoofCookie = (spoofRedeemRes.headers['set-cookie'] || [])[0].split(';')[0];
      // Try to read Beta's private photo using the spoofed session!
      const spoofPhotoRes = await fetchUrl('/photos/00_grand_lobby/01_south_wall_masterpiece.png', {
        headers: { Cookie: spoofCookie }
      });

      if (spoofPhotoRes.status === 200 && spoofPhotoRes.body === 'BETA_PHOTO_CONTENT') {
        findings.push({
          severity: 'HIGH',
          title: 'Invite Code Customer Slug Spoofing Bypasses Customer Passcode',
          description:
            'A visitor with a general/default museum invite code can submit `slug: "<victim-customer>"` to `POST /api/invite/redeem` (and WebSocket join) to receive an authenticated session for that customer, completely bypassing the victim customer\'s passcode hash and accessing their private photos and multiplayer room.',
          observation: `POST /api/invite/redeem with { code: '${genericInvite.code}', slug: '${custBeta}' } returned 200 and issued a session token with customerSlug='${custBeta}', allowing unauthorized access to Beta's photos.`,
        });
        console.log('   [!] VULNERABILITY CONFIRMED: Generic invite redeemed with customer slug grants access to victim customer photos!');
      }
    } else {
      console.log('   Generic invite redemption with customer slug rejected as expected.');
    }

    // Also verify WebSocket join rejects generic invite code with customerSlug
    const wsUrl = `ws://127.0.0.1:${TEST_PORT}/ws`;
    const wsJoinRejected = await new Promise(resolve => {
      const ws = new WebSocket(wsUrl);
      let closedOrDenied = false;
      ws.on('open', () => {
        ws.send(JSON.stringify({
          t: 'join',
          proto: 2,
          avatarId: 'ethan',
          code: genericInvite.code,
          customerSlug: custBeta,
        }));
      });
      ws.on('message', raw => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.t === 'error' && (msg.msg === 'unauthorized' || msg.msg === 'bad-code')) {
            closedOrDenied = true;
          }
        } catch {}
      });
      ws.on('close', code => {
        if (code === 4003 || closedOrDenied) resolve(true);
        else resolve(false);
      });
      ws.on('error', () => resolve(true));
      setTimeout(() => {
        try { ws.close(); } catch {}
        resolve(closedOrDenied);
      }, 1500);
    });
    assert.strictEqual(wsJoinRejected, true, 'WebSocket join with generic invite code and customerSlug must be rejected');
    console.log('   ✓ WebSocket join with code and customerSlug strictly denied (code 4003)');

    // ------------------------------------------------------------------------
    // Vector 6: PROBE: /api/config Passcode Requirement False Negative
    // ------------------------------------------------------------------------
    console.log('\n[Vector 6] Testing /api/config?slug=<slug> passcodeRequired Evaluation...');
    const configRes = await fetchUrl(`/api/config?slug=${custAlpha}`);
    assert.strictEqual(configRes.status, 200);
    const configJson = JSON.parse(configRes.body);

    assert.strictEqual(configJson.passcodeRequired, true, `/api/config?slug=${custAlpha} must evaluate passcodeRequired as true`);

    if (configJson.passcodeRequired === false) {
      findings.push({
        severity: 'MEDIUM',
        title: '/api/config Evaluates passcodeRequired as false for Customers with Passcodes',
        description:
          'In server.js line 466, `getCustomer(targetSlug)` is called without `includeSecrets=true`, which strips `passcodeHash`. Line 471 then checks `Boolean(cust?.passcodeHash)`, which evaluates to `false`. As a result, the frontend is told no passcode is required, even though the customer has a hashed passcode.',
        observation: `GET /api/config?slug=${custAlpha} returned passcodeRequired: false, but customer '${custAlpha}' has a valid hashed passcode.`,
      });
      console.log('   [!] DISCREPANCY CONFIRMED: /api/config reports passcodeRequired=false due to getCustomer secrets stripping.');
    } else {
      console.log('   passcodeRequired evaluated correctly as true.');
    }

    // ------------------------------------------------------------------------
    // Vector 7: Customer Lifecycle Transitions (Draft / Paused / Window)
    // ------------------------------------------------------------------------
    console.log('\n[Vector 7] Testing Customer Status Transitions & Active Window...');
    // Pausing Customer Alpha
    updateCustomerIdentity(custAlpha, { status: 'paused' });

    // New visitor visits paused gallery
    const pausedGalleryRes = await fetchUrl(`/gallery/${custAlpha}`);
    assert.strictEqual(pausedGalleryRes.status, 403, 'Paused gallery must return 403');

    // New visitor attempts auth on paused gallery
    const pausedAuthRes = await fetchUrl('/api/museum/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: custAlpha, passcode: 'pass-alpha-123' })
    });
    assert.strictEqual(pausedAuthRes.status, 403, 'Auth on paused customer gallery must return 403');

    // Does existing session still serve photos when paused?
    const existingSessionPhoto = await fetchUrl('/photos/00_grand_lobby/01_south_wall_masterpiece.png', {
      headers: { Cookie: alphaCookie }
    });
    assert.notStrictEqual(existingSessionPhoto.status, 200, 'Pre-existing session must not read photos when customer is paused');
    if (existingSessionPhoto.status === 200) {
      findings.push({
        severity: 'LOW',
        title: 'Existing Sessions Not Automatically Invalidated on Status Change to Paused/Draft',
        description:
          'When customer status is changed to `paused` or `draft` via `updateCustomerIdentity`, existing sessions are not automatically revoked, and `validateSession` does not check master customer status. Unless founder explicitly calls `DELETE /api/admin/customers/:slug/access/sessions`, existing browser sessions can still download photos until their 24h TTL expires.',
        observation: `Photo request returned 200 for paused customer '${custAlpha}' using pre-existing session token.`,
      });
      console.log('   [!] OBSERVATION: Pre-existing session can still read photos after status changed to paused (sessions not auto-revoked).');
    }

    // Restore Alpha to active
    updateCustomerIdentity(custAlpha, { status: 'active' });

    // Clean up test customers
    try { deleteCustomer(custAlpha); } catch {}
    try { deleteCustomer(custBeta); } catch {}
    try { deleteCustomer(testSlug); } catch {}

  } finally {
    await stopServer();
  }

  console.log('\n================================================================');
  console.log('               ADVERSARIAL CHALLENGE SUMMARY                    ');
  console.log('================================================================');
  console.log(`Total Findings Identified: ${findings.length}`);
  for (const f of findings) {
    console.log(`- [${f.severity}] ${f.title}`);
  }
  console.log('================================================================\n');

  return findings;
}

runAdversarialChallenges().then(findings => {
  console.log('Adversarial testing script finished.');
  assert.strictEqual(findings.length, 0, `Expected 0 adversarial findings, but got ${findings.length}`);
  process.exit(findings.length > 0 ? 1 : 0);
}).catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
