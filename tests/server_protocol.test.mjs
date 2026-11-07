/**
 * Automated test suite for server hardening, security, and protocol v2.
 * Covers: SEC-01, SEC-02, NET-01, SEC-03, SEC-04, SEAT-03.
 */

import http from 'http';
import { WebSocket } from 'ws';
import { spawn } from 'child_process';
import assert from 'assert';
import { revokeInvite, createInvite, validateSession, redeemInvite } from '../scripts/inviteStore.js';

const TEST_PORT = 8991;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

let serverProc = null;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

function connectWs() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function nextMessage(ws, filterFn = null, timeoutMs = 2500) {
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

async function runTests() {
  console.log('[TEST] Starting hardened server on port', TEST_PORT);
  serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(TEST_PORT), MUSEUM_PASSCODE: 'secret123' },
    stdio: 'inherit'
  });

  // Give server 1.5s to boot
  await sleep(1500);

  try {
    // -------------------------------------------------------------
    // 1. SEC-01: Static File Serving & Traversal Protection
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing SEC-01: Traversal & Allowlist ---');
    
    // Normal public asset or index should work (200)
    const resIndex = await fetchUrl('/');
    assert.strictEqual(resIndex.status, 200, 'GET / should return 200');
    console.log('  ✓ GET / returns 200');

    // Health endpoint
    const resHealth = await fetchUrl('/healthz');
    assert.strictEqual(resHealth.status, 200, 'GET /healthz should return 200');
    assert.ok(resHealth.body.includes('"ok":true'), 'healthz returns ok:true');
    console.log('  ✓ GET /healthz returns ok:true');

    // Forbidden files outside dist/public
    const forbidden = ['/server.js', '/package.json', '/src/main.js', '/docs/README.md', '/../server.js', '/%2e%2e/server.js'];
    for (const path of forbidden) {
      const res = await fetchUrl(path);
      assert.strictEqual(res.status, 404, `GET ${path} must return 404, got ${res.status}`);
      console.log(`  ✓ GET ${path} correctly returns 404`);
    }

    // -------------------------------------------------------------
    // 2. SEC-02: Crash Proofing (Malformed URL, Bad Range, Stream errors)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing SEC-02: Crash Proofing ---');

    // Malformed URI percent encoding (e.g. /%)
    const resBadUri = await fetchUrl('/%');
    assert.strictEqual(resBadUri.status, 404, 'Malformed % encoding must return 404 without crashing server');
    console.log('  ✓ GET /% returns 404 without server crash');

    // Valid range header
    const resRange = await fetchUrl('/index.html', { headers: { Range: 'bytes=0-10' } });
    assert.strictEqual(resRange.status, 206, 'Valid Range request returns 206 Partial Content');
    console.log('  ✓ Valid Range header returns 206');

    // Invalid range header (e.g. bytes=abc)
    const resBadRange = await fetchUrl('/index.html', { headers: { Range: 'bytes=abc' } });
    assert.strictEqual(resBadRange.status, 416, 'Malformed Range header returns 416');
    console.log('  ✓ Malformed Range header returns 416');

    // -------------------------------------------------------------
    // 3. SEC-04 & NET-01: WebSocket Passcode, Protocol v2 & 2-Player Cap
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing SEC-04 & NET-01: Passcode & 2-Player Cap ---');

    // Client with wrong proto
    const wsProto = await connectWs();
    wsProto.send(JSON.stringify({ t: 'join', proto: 1, name: 'OldClient' }));
    const msgProto = await nextMessage(wsProto);
    assert.strictEqual(msgProto.msg, 'update-required', 'Old proto must receive update-required');
    console.log('  ✓ Protocol v1 correctly rejected with update-required');
    wsProto.close();
    await sleep(100);

    // Client with wrong passcode
    const wsBadCode = await connectWs();
    wsBadCode.send(JSON.stringify({ t: 'join', proto: 2, code: 'wrong', name: 'Intruder' }));
    const msgBadCode = await nextMessage(wsBadCode);
    assert.strictEqual(msgBadCode.msg, 'bad-code', 'Wrong passcode must receive bad-code error');
    console.log('  ✓ Wrong passcode correctly rejected with bad-code');
    wsBadCode.close();
    await sleep(100);

    // Client 1 with valid passcode
    const ws1 = await connectWs();
    ws1.send(JSON.stringify({ t: 'join', proto: 2, code: 'secret123', name: 'Alice', model: 'woman.glb', location: 'lobby' }));
    const msg1 = await nextMessage(ws1, m => m.t === 'room_state');
    assert.strictEqual(msg1.t, 'room_state', 'Client 1 receives room_state');
    assert.strictEqual(msg1.peerCount, 1, 'Client 1 is first peer');
    console.log('  ✓ Client 1 (Alice) joined session successfully');

    // Client 2 with valid passcode (in different gameplay room 'fireside')
    const ws2 = await connectWs();
    ws2.send(JSON.stringify({ t: 'join', proto: 2, code: 'secret123', name: 'Bob', model: 'man.glb', location: 'fireside' }));
    const msg2 = await nextMessage(ws2, m => m.t === 'room_state');
    assert.strictEqual(msg2.t, 'room_state', 'Client 2 receives room_state');
    assert.strictEqual(msg2.peerCount, 2, 'Client 2 sees peerCount 2');
    console.log('  ✓ Client 2 (Bob) joined session successfully in fireside');

    // Client 1 receives peer_joined from Bob with correct location
    const msg1PeerJoined = await nextMessage(ws1, m => m.t === 'peer_joined');
    assert.strictEqual(msg1PeerJoined.t, 'peer_joined', 'Client 1 notified of Bob joining');
    assert.strictEqual(msg1PeerJoined.name, 'Bob');
    assert.strictEqual(msg1PeerJoined.location, 'fireside');
    console.log('  ✓ Client 1 notified of Bob arrival with location "fireside"');

    // Client 3 tries to join: must be rejected with room-full
    const ws3 = await connectWs();
    ws3.send(JSON.stringify({ t: 'join', proto: 2, code: 'secret123', name: 'Eve', model: 'woman.glb' }));
    const msg3 = await nextMessage(ws3, m => m.t === 'error');
    assert.strictEqual(msg3.msg, 'room-full', 'Third connection rejected with room-full');
    console.log('  ✓ Third client correctly rejected with room-full');
    ws3.close();
    await sleep(150);

    // -------------------------------------------------------------
    // 4. SEAT-03: Authoritative Atomic Seat Locking & Conflict
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing SEAT-03: Authoritative Seat Reservation ---');

    // Alice claims seat 'sofa_seat_1'
    const pAliceSit = nextMessage(ws1, m => m.t === 'sit_ok');
    const pBobSeeSit = nextMessage(ws2, m => m.t === 'sit');
    ws1.send(JSON.stringify({ t: 'sit', seat: 'sofa_seat_1' }));
    const [msgAliceSit, msgBobSeeSit] = await Promise.all([pAliceSit, pBobSeeSit]);
    assert.strictEqual(msgAliceSit.t, 'sit_ok', 'Alice receives sit_ok confirmation');
    assert.strictEqual(msgBobSeeSit.t, 'sit', 'Bob sees Alice sit');
    assert.strictEqual(msgBobSeeSit.seat, 'sofa_seat_1');
    console.log('  ✓ Alice successfully claimed sofa_seat_1');

    // Bob tries to claim the SAME seat 'sofa_seat_1' -> must be DENIED
    ws2.send(JSON.stringify({ t: 'sit', seat: 'sofa_seat_1' }));
    const msgBobSitDenied = await nextMessage(ws2, m => m.t === 'sit_denied');
    assert.strictEqual(msgBobSitDenied.t, 'sit_denied', 'Bob receives sit_denied for occupied seat');
    console.log('  ✓ Bob seat collision correctly rejected with sit_denied');

    // Alice stands up
    const pAliceStandOk = nextMessage(ws1, m => m.t === 'stand_ok');
    const pBobStand = nextMessage(ws2, m => m.t === 'stand');
    ws1.send(JSON.stringify({ t: 'stand' }));
    const [msgAliceStandOk, msgBobSeeStand] = await Promise.all([pAliceStandOk, pBobStand]);
    assert.strictEqual(msgAliceStandOk.t, 'stand_ok');
    assert.strictEqual(msgBobSeeStand.t, 'stand');
    console.log('  ✓ Alice stood up; seat released');

    // Now Bob can claim 'sofa_seat_1'
    ws2.send(JSON.stringify({ t: 'sit', seat: 'sofa_seat_1' }));
    const msgBobSitOk = await nextMessage(ws2, m => m.t === 'sit_ok');
    assert.strictEqual(msgBobSitOk.t, 'sit_ok');
    console.log('  ✓ Bob successfully claimed previously released seat');

    // Alice leaves / disconnects
    const pBobPeerLeft = nextMessage(ws2, m => m.t === 'peer_left');
    ws1.close();
    const msgBobPeerLeft = await pBobPeerLeft;
    assert.strictEqual(msgBobPeerLeft.t, 'peer_left');
    assert.strictEqual(msgBobPeerLeft.peerCount, 1);
    console.log('  ✓ Alice disconnect broadcasted to Bob (peers remaining: 1)');

    // Now a new client (Charlie) CAN join because slot was freed
    const ws4 = await connectWs();
    ws4.send(JSON.stringify({ t: 'join', proto: 2, code: 'secret123', name: 'Charlie', model: 'man.glb' }));
    const msg4 = await nextMessage(ws4, m => m.t === 'room_state');
    assert.strictEqual(msg4.t, 'room_state');
    assert.strictEqual(msg4.peerCount, 2);
    console.log('  ✓ Charlie successfully joined freed slot');
    ws2.close();
    ws4.close();
    await sleep(200);

    // -------------------------------------------------------------
    // 5. AUTH-01..03 & Q6: Invitation Redemption & Gated Content
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing AUTH-01..03 & Q6: Invitation Redemption & Gated Content ---');

    // Invalid invite redemption fails with 401
    const postBadInvite = await fetchUrl('/api/invite/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    // Request with no body or invalid code
    const resBadCodeRedeem = await new Promise((resolve, reject) => {
      const req = http.request(new URL('/api/invite/redeem', BASE_URL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d || '{}') }));
      });
      req.on('error', reject);
      req.write(JSON.stringify({ code: 'non-existent-code' }));
      req.end();
    });
    assert.strictEqual(resBadCodeRedeem.status, 401, 'Redeeming invalid code must return 401');
    assert.strictEqual(resBadCodeRedeem.body.ok, false);
    console.log('  ✓ Invalid invite code correctly returns 401');

    // Valid invite redemption (maya-love)
    let sessionToken = null;
    let sessionCookie = null;
    const resValidRedeem = await new Promise((resolve, reject) => {
      const req = http.request(new URL('/api/invite/redeem', BASE_URL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({
          status: res.statusCode,
          headers: res.headers,
          body: JSON.parse(d || '{}')
        }));
      });
      req.on('error', reject);
      req.write(JSON.stringify({ code: 'maya-love' }));
      req.end();
    });
    assert.strictEqual(resValidRedeem.status, 200, 'Valid code redemption must return 200');
    assert.strictEqual(resValidRedeem.body.ok, true);
    assert.strictEqual(resValidRedeem.body.recipient, 'Maya');
    assert.strictEqual(resValidRedeem.body.sessionToken, undefined, 'Session token MUST NOT be exposed in JSON body');
    const rawCookie = resValidRedeem.headers['set-cookie']?.[0] || '';
    assert.ok(rawCookie.includes('museum_session='), 'Sets museum_session cookie');
    assert.ok(rawCookie.includes('HttpOnly'), 'Cookie MUST be HttpOnly');
    assert.ok(rawCookie.includes('SameSite=Lax'), 'Cookie MUST have SameSite=Lax');
    sessionCookie = rawCookie.split(';')[0];
    sessionToken = decodeURIComponent(rawCookie.match(/museum_session=([^;]+)/)[1]);
    console.log('  ✓ Valid invite code successfully redeemed with secure HttpOnly cookie and zero body token leakage');

    // Unauthenticated GET /photos/ returns 401
    const resUnauthPhoto = await fetchUrl('/photos/README.md');
    assert.strictEqual(resUnauthPhoto.status, 401, 'Unauthenticated request to /photos/ must return 401');
    console.log('  ✓ Unauthenticated access to /photos/* correctly blocked with 401');

    // Authenticated GET /photos/ with cookie returns 200
    const resAuthPhoto = await fetchUrl('/photos/README.md', {
      headers: { Cookie: sessionCookie }
    });
    assert.strictEqual(resAuthPhoto.status, 200, 'Authenticated request to /photos/ returns 200');
    console.log('  ✓ Authenticated access to /photos/* returns 200 OK');

    // Unauthenticated GET /api/letters returns 401
    const resUnauthLetters = await fetchUrl('/api/letters');
    assert.strictEqual(resUnauthLetters.status, 401, 'Unauthenticated request to /api/letters must return 401');
    console.log('  ✓ Unauthenticated access to /api/letters correctly blocked with 401');

    // Authenticated GET /api/letters returns 200 with letters
    const resAuthLetters = await fetchUrl('/api/letters', {
      headers: { Cookie: sessionCookie }
    });
    assert.strictEqual(resAuthLetters.status, 200, 'Authenticated request to /api/letters returns 200');
    const lettersJson = JSON.parse(resAuthLetters.body);
    assert.strictEqual(lettersJson.ok, true);
    assert.strictEqual(lettersJson.recipient, 'Maya');
    assert.ok(lettersJson.letters['Fireside Winter Memories'], 'Letters contains Fireside salon letter');
    console.log('  ✓ Authenticated access to /api/letters returns private letters payload');

    // -------------------------------------------------------------
    // 6. STATE-01: Single-Seat-Per-Peer Invariant
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing STATE-01: Single-Seat Invariant ---');

    const wsAlice = await connectWs();
    wsAlice.send(JSON.stringify({ t: 'join', proto: 2, sessionToken, name: 'Maya', model: 'woman.glb' }));
    await nextMessage(wsAlice, m => m.t === 'room_state');

    const wsPartner = await connectWs();
    wsPartner.send(JSON.stringify({ t: 'join', proto: 2, code: 'secret123', name: 'Partner', model: 'man.glb' }));
    await nextMessage(wsPartner, m => m.t === 'room_state');

    // Alice sits on seat_A
    const pBobSeeBench1 = nextMessage(wsPartner, m => m.t === 'sit');
    const pAliceSit1 = nextMessage(wsAlice, m => m.t === 'sit_ok');
    wsAlice.send(JSON.stringify({ t: 'sit', seat: 'bench_1' }));
    await pAliceSit1;
    const msgSeeBench1 = await pBobSeeBench1;
    assert.strictEqual(msgSeeBench1.seat, 'bench_1');

    // Alice directly sits on seat_B without standing first
    const pBobSeeStand = nextMessage(wsPartner, m => m.t === 'stand');
    const pBobSeeBench2 = nextMessage(wsPartner, m => m.t === 'sit' && m.seat === 'bench_2');
    const pAliceSit2 = nextMessage(wsAlice, m => m.t === 'sit_ok');
    wsAlice.send(JSON.stringify({ t: 'sit', seat: 'bench_2' }));
    await pAliceSit2;
    
    // Partner must receive 'stand' (for bench_1) and then 'sit' (for bench_2)
    const msgPartnerStand = await pBobSeeStand;
    assert.strictEqual(msgPartnerStand.t, 'stand');
    const msgPartnerSit2 = await pBobSeeBench2;
    assert.strictEqual(msgPartnerSit2.seat, 'bench_2');

    // Partner can now immediately claim bench_1 (proves it was cleanly released)
    const pPartnerSitOk = nextMessage(wsPartner, m => m.t === 'sit_ok');
    wsPartner.send(JSON.stringify({ t: 'sit', seat: 'bench_1' }));
    const msgPartnerSitOk = await pPartnerSitOk;
    assert.strictEqual(msgPartnerSitOk.t, 'sit_ok');
    console.log('  ✓ Single-seat invariant enforced: switching seats atomically vacates previous seat');

    // -------------------------------------------------------------
    // 7. Q3: 30-Second Disconnection Grace
    // -------------------------------------------------------------
    console.log('\n--- 7. Testing Q3: 30-Second Disconnection Grace ---');

    // Alice (with sessionToken) drops connection abruptly (simulate mobile drop)
    wsAlice.close();
    
    // Partner receives peer_status reconnecting
    const msgReconnecting = await nextMessage(wsPartner, m => m.t === 'peer_status');
    assert.strictEqual(msgReconnecting.status, 'reconnecting');
    assert.strictEqual(msgReconnecting.graceSeconds, 30);
    console.log('  ✓ Disconnect with active session enters 30s grace, partner notified');

    // While in grace, third visitor (Eve) attempts to join -> MUST BE REJECTED with room-full
    const wsEve = await connectWs();
    wsEve.send(JSON.stringify({ t: 'join', proto: 2, code: 'secret123', name: 'Eve', model: 'woman.glb' }));
    const msgEveDenied = await nextMessage(wsEve, m => m.t === 'error');
    assert.strictEqual(msgEveDenied.msg, 'room-full', 'Third visitor must be blocked during grace');
    console.log('  ✓ Slot reserved during grace: third visitor rejected with room-full');
    wsEve.close();

    // Alice reconnects within 30s grace with the same session token
    const wsAliceReconnected = await connectWs();
    wsAliceReconnected.send(JSON.stringify({ t: 'join', proto: 2, sessionToken, name: 'Maya', model: 'woman.glb' }));
    const msgAliceState = await nextMessage(wsAliceReconnected, m => m.t === 'room_state');
    assert.strictEqual(msgAliceState.t, 'room_state');
    assert.strictEqual(msgAliceState.peerCount, 2);
    
    // Partner receives peer_status reconnected
    const msgPartnerReconnected = await nextMessage(wsPartner, m => m.t === 'peer_status');
    assert.strictEqual(msgPartnerReconnected.status, 'reconnected');
    console.log('  ✓ Participant reconnected within grace successfully restored without eviction');

    wsAliceReconnected.send(JSON.stringify({ t: 'leave' }));
    wsPartner.send(JSON.stringify({ t: 'leave' }));
    await sleep(200);

    // -------------------------------------------------------------
    // 8. PRODUCTION HARDENING FIXES VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 8. Testing Production Security Hardening Fixes ---');

    // 8.1: /api/config does not expose credentials
    const resConfig = await fetchUrl('/api/config');
    assert.strictEqual(resConfig.status, 200);
    const configBody = JSON.parse(resConfig.body);
    assert.strictEqual(configBody.customization?.access, undefined, '/api/config MUST NOT contain access object');
    assert.strictEqual(configBody.customization?.masterPasscode, undefined, '/api/config MUST NOT contain masterPasscode');
    assert.strictEqual(configBody.customization?.couple?.partner1?.inviteCode, undefined, '/api/config MUST NOT contain inviteCode');
    assert.strictEqual(configBody.customization?.couple?.partner2?.inviteCode, undefined, '/api/config MUST NOT contain inviteCode');
    assert.strictEqual(typeof configBody.passcodeRequired, 'boolean', 'passcodeRequired must be boolean');
    assert.strictEqual(configBody.passcodeRequired, true, 'passcodeRequired must be true when active invites exist');
    console.log('  ✓ Fix 1 Verified: /api/config exposes zero credentials, passcodes, or invite codes, and accurately reflects active invite status');

    // 8.2: WebSocket join without auth is rejected with unauthorized (4003)
    const wsUnauth = await connectWs();
    const pUnauthClose = new Promise((resolve) => {
      wsUnauth.on('close', (code, reason) => resolve({ code, reason: reason.toString() }));
    });
    wsUnauth.send(JSON.stringify({ t: 'join', proto: 2, name: 'Attacker' }));
    const msgUnauth = await nextMessage(wsUnauth, m => m.t === 'error');
    assert.strictEqual(msgUnauth.msg, 'unauthorized');
    const closeUnauth = await pUnauthClose;
    assert.strictEqual(closeUnauth.code, 4003);
    console.log('  ✓ Fix 3 Verified: Unauthenticated WebSocket join strictly rejected with unauthorized (close 4003)');

    // 8.3: Upgrade to / returns 404
    const resUpgradeRoot = await new Promise((resolve) => {
      const wsRoot = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`);
      wsRoot.on('unexpected-response', (req, res) => {
        resolve(res.statusCode);
      });
      wsRoot.on('error', () => {});
    });
    assert.strictEqual(resUpgradeRoot, 404, 'Upgrade to / must return 404');

    // 8.4: Upgrade to /socket returns 404
    const resUpgradeOther = await new Promise((resolve) => {
      const wsOther = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/socket`);
      wsOther.on('unexpected-response', (req, res) => {
        resolve(res.statusCode);
      });
      wsOther.on('error', () => {});
    });
    assert.strictEqual(resUpgradeOther, 404, 'Upgrade to /socket must return 404');

    // 8.5: Malformed origin header returns 403
    const resMalformedOrigin = await new Promise((resolve) => {
      const wsBadOrigin = new WebSocket(WS_URL, {
        headers: { Origin: ':::not-a-valid-url:::' }
      });
      wsBadOrigin.on('unexpected-response', (req, res) => {
        resolve(res.statusCode);
      });
      wsBadOrigin.on('error', () => {});
    });
    assert.strictEqual(resMalformedOrigin, 403, 'Malformed Origin header must return 403');
    console.log('  ✓ Fix 6 Verified: WebSocket upgrades restricted to /ws and malformed origins safely rejected with 403');

    // 8.6: Live Invitation Revocation Evicts Connected Active WebSocket
    const testInvite = createInvite({ recipient: 'RevocationTarget', ttlHours: 1, customCode: 'test-revoke-code' });
    assert.ok(testInvite.code);

    const resRedeemTarget = await new Promise((resolve, reject) => {
      const req = http.request(new URL('/api/invite/redeem', BASE_URL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({
          status: res.statusCode,
          headers: res.headers,
          body: JSON.parse(d || '{}')
        }));
      });
      req.on('error', reject);
      req.write(JSON.stringify({ code: 'test-revoke-code' }));
      req.end();
    });
    assert.strictEqual(resRedeemTarget.status, 200);
    const targetCookie = resRedeemTarget.headers['set-cookie'][0].split(';')[0];

    const wsTarget = new WebSocket(WS_URL, {
      headers: { Cookie: targetCookie }
    });
    await new Promise(r => wsTarget.on('open', r));
    wsTarget.send(JSON.stringify({ t: 'join', proto: 2, name: 'RevocationTarget', model: 'woman.glb' }));
    const msgTargetJoin = await nextMessage(wsTarget, m => m.t === 'room_state');
    assert.strictEqual(msgTargetJoin.t, 'room_state');
    console.log('  ✓ Revocation target joined WebSocket successfully');

    const wsObserver = await connectWs();
    wsObserver.send(JSON.stringify({ t: 'join', proto: 2, code: 'secret123', name: 'Observer', model: 'man.glb' }));
    await nextMessage(wsObserver, m => m.t === 'room_state');

    const pTargetEvicted = new Promise((resolve) => {
      wsTarget.on('close', (code, reason) => resolve({ code, reason: reason.toString() }));
    });
    const pObserverNotified = nextMessage(wsObserver, m => m.t === 'peer_left', 5000);

    const revokedOk = revokeInvite('test-revoke-code');
    assert.strictEqual(revokedOk, true, 'revokeInvite must return true');

    const eviction = await pTargetEvicted;
    assert.strictEqual(eviction.code, 4003, 'Evicted socket must close with 4003');
    const observerNotice = await pObserverNotified;
    assert.strictEqual(observerNotice.t, 'peer_left', 'Partner notified that revoked peer left');

    const resBlockedHttp = await fetchUrl('/api/letters', {
      headers: { Cookie: targetCookie }
    });
    assert.strictEqual(resBlockedHttp.status, 401, 'Revoked session must immediately fail HTTP auth with 401');
    console.log('  ✓ Fix 4 Verified: Live CLI revocation immediately evicts connected WebSocket and invalidates HTTP sessions');
    wsObserver.close();

    // -------------------------------------------------------------
    // 9. AUTH-SEC-01: Prototype Property Hardening & Regression Suite
    // -------------------------------------------------------------
    console.log('\n--- 9. Testing AUTH-SEC-01: Prototype Property Hardening ---');

    // 9.1: HTTP /api/letters with Cookie: museum_session=constructor must return 401
    const resProtoLetters = await fetchUrl('/api/letters', {
      headers: { Cookie: 'museum_session=constructor' }
    });
    assert.strictEqual(resProtoLetters.status, 401, 'Request to /api/letters with museum_session=constructor must return 401');
    console.log('  ✓ GET /api/letters with museum_session=constructor correctly rejected with 401');

    // 9.2: HTTP /photos/README.md with Cookie: museum_session=constructor must return 401
    const resProtoPhoto = await fetchUrl('/photos/README.md', {
      headers: { Cookie: 'museum_session=constructor' }
    });
    assert.strictEqual(resProtoPhoto.status, 401, 'Request to /photos/* with museum_session=constructor must return 401');
    console.log('  ✓ GET /photos/* with museum_session=constructor correctly rejected with 401');

    // Additional prototype property checks for HTTP endpoints (__proto__, toString, valueOf)
    for (const protoKey of ['__proto__', 'toString', 'valueOf']) {
      const resLetters = await fetchUrl('/api/letters', {
        headers: { Cookie: `museum_session=${protoKey}` }
      });
      assert.strictEqual(resLetters.status, 401, `Request to /api/letters with museum_session=${protoKey} must return 401`);

      const resPhoto = await fetchUrl('/photos/README.md', {
        headers: { Cookie: `museum_session=${protoKey}` }
      });
      assert.strictEqual(resPhoto.status, 401, `Request to /photos/* with museum_session=${protoKey} must return 401`);
    }
    console.log('  ✓ All prototype keys (__proto__, toString, valueOf) correctly return 401 on /api/letters and /photos/*');

    // 9.3: WebSocket connections with museum_session=constructor are rejected with 4003 (unauthorized)
    const wsProtoClient = new WebSocket(WS_URL, {
      headers: { Cookie: 'museum_session=constructor' }
    });
    const pProtoClose = new Promise((resolve) => {
      wsProtoClient.on('close', (code, reason) => resolve({ code, reason: reason.toString() }));
    });
    await new Promise((resolve) => wsProtoClient.on('open', resolve));
    wsProtoClient.send(JSON.stringify({ t: 'join', proto: 2, name: 'AttackerConstructor' }));
    const msgProtoWsError = await nextMessage(wsProtoClient, m => m.t === 'error');
    assert.strictEqual(msgProtoWsError.msg, 'unauthorized', 'WebSocket join with prototype session token must receive unauthorized error');
    const protoCloseEvt = await pProtoClose;
    assert.strictEqual(protoCloseEvt.code, 4003, 'WebSocket with museum_session=constructor must be closed with 4003');
    console.log('  ✓ WebSocket connection with museum_session=constructor rejected with error and closed with code 4003');

    // 9.4: revokeInvite('__proto__') returns false and does not pollute Object.prototype.revoked
    const revokeProtoResult = revokeInvite('__proto__');
    assert.strictEqual(revokeProtoResult, false, 'revokeInvite("__proto__") must return false');
    assert.strictEqual(Object.prototype.revoked, undefined, 'Object.prototype.revoked must remain undefined (no prototype pollution)');
    assert.strictEqual(revokeInvite('constructor'), false, 'revokeInvite("constructor") must return false');
    console.log('  ✓ revokeInvite("__proto__") safely returns false without prototype pollution');

    // 9.5: redeemInvite prototype rejection
    const redeemProtoResult = redeemInvite('__proto__');
    assert.strictEqual(redeemProtoResult.success, false);
    const redeemCtorResult = redeemInvite('constructor');
    assert.strictEqual(redeemCtorResult.success, false);
    console.log('  ✓ redeemInvite correctly rejects prototype property codes');

    // 9.6: validateSession unit assertions
    assert.strictEqual(validateSession('constructor'), null);
    assert.strictEqual(validateSession('__proto__'), null);
    assert.strictEqual(validateSession('toString'), null);
    assert.strictEqual(validateSession('valueOf'), null);
    console.log('  ✓ validateSession directly returns null for all prototype properties');

    console.log('\n=======================================================');
    console.log('  ALL STEP 1 HARDENING & PROTOCOL TESTS PASSED! (100%)');
    console.log('=======================================================\n');
  } finally {
    if (serverProc) {
      serverProc.kill();
    }
  }
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  if (serverProc) serverProc.kill();
  process.exit(1);
});
