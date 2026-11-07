/**
 * BOUNDARY, MALFORMED INPUT & CONCURRENCY STRESS TEST HARNESS (Milestone M1)
 *
 * Verifies scripts/inviteStore.js and server.js under extreme adversarial boundaries:
 * 1. Malformed tokens (null, undefined, non-strings, numbers, booleans, symbols, objects)
 * 2. Massive strings (100KB to 1MB payloads)
 * 3. Exotic unicode, URL-encoded tokens, null bytes, CRLF, path traversals
 * 4. High concurrency load and race conditions on redemption, validation, and revocation
 * 5. Fail-closed guarantees without uncaught exceptions or unhandled promise rejections
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocket } from 'ws';
import { spawn } from 'node:child_process';
import {
  validateSession,
  redeemInvite,
  revokeInvite,
  createInvite,
  loadStore,
  getStorePath
} from '../scripts/inviteStore.js';

const TEST_PORT = 8996;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

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

test('Boundary & Stress: validateSession malformed and non-string inputs', () => {
  const malformedInputs = [
    undefined,
    null,
    '',
    '   ',
    '\t\n\r',
    0,
    1,
    -1,
    42,
    3.14159,
    NaN,
    Infinity,
    -Infinity,
    true,
    false,
    {},
    { token: 'sess_123' },
    { toString: () => 'sess_fake' },
    { valueOf: () => 'sess_fake' },
    Object.create(null),
    [],
    ['sess_123'],
    [null],
    () => {},
    Symbol('sess'),
    Symbol.for('token'),
    12345678901234567890n,
    'constructor',
    '__proto__',
    'prototype',
    'toString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString'
  ];

  function safeStr(val) {
    if (typeof val === 'symbol') return val.toString();
    if (typeof val === 'bigint') return `${val.toString()}n`;
    try { return JSON.stringify(val); } catch { return String(val); }
  }

  for (const input of malformedInputs) {
    let result;
    assert.doesNotThrow(() => {
      result = validateSession(input);
    }, `validateSession must not throw on input: ${safeStr(input)}`);
    assert.strictEqual(
      result,
      null,
      `validateSession must fail closed (return null) for input: ${safeStr(input)}`
    );
  }
});

test('Boundary & Stress: redeemInvite malformed and non-string inputs fail closed', () => {
  function safeStr(val) {
    if (typeof val === 'symbol') return val.toString();
    if (typeof val === 'bigint') return `${val.toString()}n`;
    try { return JSON.stringify(val); } catch { return String(val); }
  }

  const malformedCodes = [
    undefined,
    null,
    '',
    '   ',
    '\t\n\r',
    0,
    1,
    -1,
    42,
    3.14159,
    NaN,
    Infinity,
    -Infinity,
    true,
    false,
    {},
    { code: 'non-existent' },
    [],
    () => {},
    Symbol('invite'),
    12345678901234567890n,
    'constructor',
    '__proto__',
    'prototype',
    'toString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString'
  ];

  for (const code of malformedCodes) {
    let result;
    assert.doesNotThrow(() => {
      result = redeemInvite(code);
    }, `redeemInvite must not throw on code: ${safeStr(code)}`);

    assert.ok(result && typeof result === 'object', 'redeemInvite must return an object');
    assert.strictEqual(
      result.success,
      false,
      `redeemInvite must fail closed ({ success: false }) for code: ${safeStr(code)}`
    );
    assert.ok(
      typeof result.error === 'string' && result.error.length > 0,
      'redeemInvite must provide a human-readable error string'
    );
  }
});

test('Boundary Hardening: redeemInvite fails closed on Object.create(null) without uncaught TypeError', () => {
  // scripts/inviteStore.js evaluates strict typeof inputCode === 'string'
  // When inputCode is Object.create(null), it safely fails closed without TypeError.
  let uncaughtError = null;
  let result = null;
  try {
    result = redeemInvite(Object.create(null));
  } catch (err) {
    uncaughtError = err;
  }

  assert.strictEqual(uncaughtError, null, 'redeemInvite(Object.create(null)) must not throw uncaught error');
  assert.ok(result && typeof result === 'object', 'redeemInvite must return result object');
  assert.strictEqual(result.success, false, 'redeemInvite must fail closed for Object.create(null)');
  assert.strictEqual(result.error, 'Invalid invitation code.');
});

test('Boundary Hardening: redeemInvite strictly rejects arrays without loose string coercion', () => {
  // scripts/inviteStore.js enforces typeof inputCode === 'string'
  // When an array is passed (e.g. ['maya-love']), it is rejected and never coerced.
  const arrayResult = redeemInvite(['maya-love']);
  assert.ok(arrayResult && typeof arrayResult === 'object');
  assert.strictEqual(arrayResult.success, false, 'redeemInvite must reject array without coercion');
  assert.strictEqual(arrayResult.error, 'Invalid invitation code.');
  assert.strictEqual(arrayResult.sessionToken, undefined);
});

test('Boundary & Stress: revokeInvite malformed and non-string inputs', () => {
  function safeStr(val) {
    if (typeof val === 'symbol') return val.toString();
    if (typeof val === 'bigint') return `${val.toString()}n`;
    try { return JSON.stringify(val); } catch { return String(val); }
  }

  const malformedCodes = [
    undefined,
    null,
    '',
    '   ',
    '\t\n\r',
    0,
    1,
    -1,
    42,
    3.14159,
    NaN,
    Infinity,
    -Infinity,
    true,
    false,
    {},
    { code: 'maya-love' },
    Object.create(null),
    [],
    ['maya-love'],
    () => {},
    Symbol('revoke'),
    12345678901234567890n,
    'constructor',
    '__proto__',
    'prototype',
    'non-existent-code-12345-xyz'
  ];

  for (const code of malformedCodes) {
    let result;
    assert.doesNotThrow(() => {
      result = revokeInvite(code);
    }, `revokeInvite must not throw on code: ${safeStr(code)}`);
    assert.strictEqual(
      result,
      false,
      `revokeInvite must return false for non-existent or malformed code: ${safeStr(code)}`
    );
  }
});

test('Boundary & Stress: Massive strings (100KB to 1MB payloads)', () => {
  const sizes = [
    100 * 1024,      // 100 KB
    256 * 1024,      // 256 KB
    512 * 1024,      // 512 KB
    1024 * 1024      // 1 MB
  ];

  for (const size of sizes) {
    const hugeToken = 'A'.repeat(size);
    const hugeInviteCode = 'X'.repeat(size);

    // 1. validateSession
    const t0 = Date.now();
    const vRes = validateSession(hugeToken);
    const vTime = Date.now() - t0;
    assert.strictEqual(vRes, null, `validateSession with ${size} bytes must return null`);
    assert.ok(vTime < 1000, `validateSession with ${size} bytes took too long (${vTime}ms)`);

    // 2. redeemInvite
    const t1 = Date.now();
    const rRes = redeemInvite(hugeInviteCode);
    const rTime = Date.now() - t1;
    assert.strictEqual(rRes.success, false, `redeemInvite with ${size} bytes must return false`);
    assert.ok(rTime < 1000, `redeemInvite with ${size} bytes took too long (${rTime}ms)`);

    // 3. revokeInvite
    const t2 = Date.now();
    const rvRes = revokeInvite(hugeInviteCode);
    const rvTime = Date.now() - t2;
    assert.strictEqual(rvRes, false, `revokeInvite with ${size} bytes must return false`);
    assert.ok(rvTime < 1000, `revokeInvite with ${size} bytes took too long (${rvTime}ms)`);
  }
});

test('Boundary & Stress: Unusual unicode, URL-encoded tokens, null bytes, and traversal tokens', () => {
  const exoticTokens = [
    '%2e%2e',
    '%2e%2e%2f',
    '..%2f..%2f',
    '%00',
    '\x00',
    'token\0hidden',
    '👨‍👩‍👧‍👦',
    '❤️💖💙',
    '🔒🔑🛡️',
    '\u202Ereversed_text\u200E',
    '\u200B\u200C\u200D',       // Zero width spaces / joiners
    '\uFEFF',                   // BOM
    '\uD800',                   // Unpaired high surrogate
    '\uDFFF',                   // Unpaired low surrogate
    '\u0000\u0001\u001F\u007F', // Control characters
    '../',
    '../../data/invites.json',
    '..\\..\\data\\invites.json',
    '../../server.js',
    'data/invites.json',
    "'; DROP TABLE sessions; --",
    '<script>alert("xss")</script>',
    '\r\nSet-Cookie: evil_token=1',
    'sess_.*',
    'sess_[a-z0-9]+',
    '^(?:sess_.*)$',
    '\\',
    '//',
    '\\\\',
    'null',
    'undefined',
    'NaN',
    '[object Object]',
    'true',
    'false'
  ];

  for (const token of exoticTokens) {
    // 1. validateSession
    assert.doesNotThrow(() => {
      const v = validateSession(token);
      assert.strictEqual(v, null, `validateSession must return null for exotic token: ${JSON.stringify(token)}`);
    });

    // 2. redeemInvite
    assert.doesNotThrow(() => {
      const r = redeemInvite(token);
      assert.strictEqual(r.success, false, `redeemInvite must fail closed for exotic code: ${JSON.stringify(token)}`);
    });

    // 3. revokeInvite
    assert.doesNotThrow(() => {
      const rv = revokeInvite(token);
      assert.strictEqual(rv, false, `revokeInvite must return false for non-existent exotic code: ${JSON.stringify(token)}`);
    });
  }
});

test('Boundary & Stress: High concurrency parallel validation and redemption', async () => {
  // 1. Create a dynamic legitimate invite for concurrency testing
  const targetCode = `concurrent-test-${Date.now()}`;
  const inv = createInvite({
    recipient: 'ConcurrentVisitor',
    ttlHours: 1,
    customCode: targetCode
  });
  assert.strictEqual(inv.code, targetCode);

  // 2. Fire 100 concurrent validations with mix of valid and invalid tokens
  const validToken = inv.sessionToken || 'non_existent_yet';
  const validationPromises = [];

  for (let i = 0; i < 100; i++) {
    const isMalformed = i % 2 === 0;
    const token = isMalformed ? `bogus_token_${i}_${Math.random()}` : validToken;
    validationPromises.push(
      Promise.resolve().then(() => validateSession(token))
    );
  }

  const validationResults = await Promise.all(validationPromises);
  assert.strictEqual(validationResults.length, 100);
  for (let i = 0; i < 100; i++) {
    if (i % 2 === 0) {
      assert.strictEqual(validationResults[i], null, `Malformed concurrent validation ${i} must be null`);
    }
  }

  // 3. Fire 30 concurrent redemptions for the same code simultaneously
  const redemptionPromises = [];
  for (let i = 0; i < 30; i++) {
    redemptionPromises.push(
      Promise.resolve().then(() => redeemInvite(targetCode))
    );
  }

  const redemptionResults = await Promise.all(redemptionPromises);
  assert.strictEqual(redemptionResults.length, 30);
  for (const res of redemptionResults) {
    assert.strictEqual(res.success, true, 'Concurrent redemption of valid code must succeed');
    assert.ok(res.sessionToken && res.sessionToken.startsWith('sess_'));
    assert.strictEqual(res.recipient, 'ConcurrentVisitor');
  }

  // 4. Verify that each issued session is valid
  for (const res of redemptionResults) {
    const verified = validateSession(res.sessionToken);
    assert.ok(verified, `Session ${res.sessionToken} must validate successfully`);
    assert.strictEqual(verified.code, targetCode);
  }

  // 5. Concurrently revoke and validate
  const revokePromise = Promise.resolve().then(() => revokeInvite(targetCode));
  const postValidationPromises = redemptionResults.map(r =>
    Promise.resolve().then(() => validateSession(r.sessionToken))
  );

  const [revoked, ...postValidations] = await Promise.all([revokePromise, ...postValidationPromises]);
  assert.strictEqual(revoked, true, 'Revocation must return true');

  // After revocation, all sessions derived from this invite must fail closed
  for (const res of postValidations) {
    assert.strictEqual(res, null, 'Post-revocation session validation must immediately return null');
  }
});

test('Boundary & Stress: Live HTTP endpoint boundary & flood stress', async () => {
  await startServer();
  try {
    // 1. Stress /api/invite/redeem with malformed JSON bodies
    const malformedBodies = [
      '',
      '{',
      '{"code": null}',
      '{"code": 12345}',
      '{"code": true}',
      '{"code": []}',
      '{"code": {}}',
      '{"code": "%2e%2e"}',
      '{"code": "\x00"}',
      '{"code": "constructor"}',
      '{"code": "__proto__"}',
      '{"code": "non_existent_code"}'
    ];

    for (const b of malformedBodies) {
      const res = await fetchUrl('/api/invite/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: b
      });
      assert.ok(
        res.status === 400 || res.status === 401,
        `POST /api/invite/redeem with body ${b} must return 400 or 401, got ${res.status}`
      );
      assert.strictEqual(res.json?.ok, false);
    }

    // 2. Flood /api/letters with 50 concurrent requests containing malformed tokens
    const floodPromises = [];
    for (let i = 0; i < 50; i++) {
      const weirdToken = i % 2 === 0 ? `%2e%2e_%00_${i}` : `bad_sess_${'A'.repeat(500)}`;
      floodPromises.push(
        fetchUrl('/api/letters', {
          headers: { Cookie: `museum_session=${weirdToken}` }
        })
      );
    }

    const floodResults = await Promise.all(floodPromises);
    assert.strictEqual(floodResults.length, 50);
    for (const res of floodResults) {
      assert.strictEqual(res.status, 401, 'Flood request to /api/letters must return HTTP 401');
      assert.strictEqual(res.json?.ok, false);
    }

    // 3. Flood /photos/* with 50 concurrent requests
    const photoFloodPromises = [];
    for (let i = 0; i < 50; i++) {
      photoFloodPromises.push(
        fetchUrl('/photos/README.md', {
          headers: { Cookie: `museum_session=fake_cookie_${i}` }
        })
      );
    }
    const photoResults = await Promise.all(photoFloodPromises);
    assert.strictEqual(photoResults.length, 50);
    for (const res of photoResults) {
      assert.strictEqual(res.status, 401, 'Flood request to /photos/* must return HTTP 401');
    }
  } finally {
    stopServer();
  }
});

test('Boundary & Stress: Live WebSocket protocol malformed join tokens', async () => {
  await startServer();
  try {
    const malformedWsTokens = [
      'constructor',
      '__proto__',
      '%2e%2e',
      '%00',
      'invalid_token_xyz',
      'sess_fake_123',
      'A'.repeat(1000)
    ];

    for (const tok of malformedWsTokens) {
      const ws = await connectWs({ Cookie: `museum_session=${tok}` });
      const pClose = new Promise(resolve => ws.on('close', (code, reason) => resolve({ code, reason: reason.toString() })));

      ws.send(JSON.stringify({ t: 'join', proto: 2, name: 'Attacker' }));
      const msg = await nextWsMessage(ws);
      assert.strictEqual(msg.t, 'error');
      assert.strictEqual(msg.msg, 'unauthorized');

      const closeEvt = await pClose;
      assert.strictEqual(closeEvt.code, 4003);
    }
  } finally {
    stopServer();
  }
});
