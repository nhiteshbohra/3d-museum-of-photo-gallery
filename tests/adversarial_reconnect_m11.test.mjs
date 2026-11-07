// =========================================================================
// ADVERSARIAL CHALLENGER TEST SUITE: MILESTONE M11
// Client Reconnect, Terminal Error Handling, & Concurrency Recovery
// =========================================================================

import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import http from 'node:http'
import { WebSocket, WebSocketServer } from 'ws'
import { connectNet, disconnectNet, onNet } from '../src/net/wsClient.js'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function redeemInvite(port, code) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ code })
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/invite/redeem',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      const cookie = res.headers['set-cookie']
      if (!cookie) return reject(new Error('No cookie received for code ' + code))
      resolve(cookie[0].split(';')[0])
    })
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

function fetchOccupancy(port) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/api/occupancy`, (res) => {
      let body = ''
      res.on('data', chunk => { body += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (err) {
          reject(err)
        }
      })
    }).on('error', reject)
  })
}

async function waitForServer(port, proc) {
  for (let i = 0; i < 30; i++) {
    await sleep(150)
    try {
      const res = await fetch(`http://127.0.0.1:${port}/healthz`)
      if (res.ok) return
    } catch {}
  }
  throw new Error(`Server failed to start on port ${port}`)
}

function waitForOpen(ws) {
  if (ws.readyState === WebSocket.OPEN) return Promise.resolve()
  return new Promise((resolve, reject) => {
    ws.once('open', resolve)
    ws.once('error', reject)
  })
}

// ---------------------------------------------------------------------------
// TEST 1: wsClient Terminal Error (4005) Interception & Reconnect Suppression
// ---------------------------------------------------------------------------
test('M11-ADV-01: wsClient suppresses automatic reconnect loops on code 4005 and blocks connectNet', async () => {
  const MOCK_PORT = 8981
  let connectionsReceived = 0

  const mockHttp = createServer()
  const mockWss = new WebSocketServer({ server: mockHttp })

  mockWss.on('connection', (ws) => {
    connectionsReceived++
    ws.send(JSON.stringify({ t: 'error', msg: 'character-taken' }))
    ws.close(4005, 'character-taken')
  })

  await new Promise(res => mockHttp.listen(MOCK_PORT, res))

  const statuses = []
  const unsub = onNet('status', s => statuses.push(s))

  try {
    // 1. Initiate connection
    const ws1 = connectNet(`ws://127.0.0.1:${MOCK_PORT}`)
    assert.ok(ws1, 'connectNet should return WebSocket instance')

    // Wait for rejection and close
    await sleep(250)

    // Verify terminal-error was intercepted and emitted
    const termEv = statuses.find(s => s.kind === 'terminal-error')
    assert.ok(termEv, 'wsClient should emit terminal-error on character-taken')
    assert.strictEqual(termEv.code, 'character-taken')

    // Verify close was emitted with code 4005
    const closeEv = statuses.find(s => s.kind === 'closed' || s.kind === 'close')
    assert.ok(closeEv, 'wsClient should emit close event')
    assert.strictEqual(closeEv.code, 4005)

    // 2. Adversarial verification: automatic reconnect must NOT be scheduled!
    // Base reconnect delay is 1000ms. Wait 1600ms to guarantee no timer triggers.
    await sleep(1600)
    assert.strictEqual(connectionsReceived, 1, 'Automatic reconnect MUST NOT fire on code 4005 (connections must remain 1)')

    // 3. While terminalError is active, direct calls to connectNet() MUST return null
    const blockedWs = connectNet(`ws://127.0.0.1:${MOCK_PORT}`)
    assert.strictEqual(blockedWs, null, 'connectNet() must return null while NET.terminalError is active')

  } finally {
    unsub()
    disconnectNet()
    await new Promise(res => mockWss.close(res))
    await new Promise(res => mockHttp.close(res))
  }
})

// ---------------------------------------------------------------------------
// TEST 2: disconnectNet() Clears NET.terminalError and Enables Second Attempt
// ---------------------------------------------------------------------------
test('M11-ADV-02: disconnectNet() clears NET.terminalError, allowing subsequent connection without reload', async () => {
  const MOCK_PORT = 8982
  let attemptCount = 0

  const mockHttp = createServer()
  const mockWss = new WebSocketServer({ server: mockHttp })

  mockWss.on('connection', (ws) => {
    attemptCount++
    if (attemptCount === 1) {
      ws.send(JSON.stringify({ t: 'error', msg: 'character-taken' }))
      ws.close(4005, 'character-taken')
    } else {
      ws.send(JSON.stringify({ t: 'room_state', yourId: 'peer_recovered', peers: [] }))
    }
  })

  await new Promise(res => mockHttp.listen(MOCK_PORT, res))

  const statuses = []
  const unsub = onNet('status', s => statuses.push(s))

  try {
    // Attempt 1: Rejection
    connectNet(`ws://127.0.0.1:${MOCK_PORT}`)
    await sleep(250)

    // Connect is now blocked by terminal error
    assert.strictEqual(connectNet(`ws://127.0.0.1:${MOCK_PORT}`), null)

    // 1. Call disconnectNet() to simulate client recovery in handleCharacterClaimRejected()
    disconnectNet()

    // 2. Connect again without reloading page
    const ws2 = connectNet(`ws://127.0.0.1:${MOCK_PORT}`)
    assert.ok(ws2, 'connectNet() must succeed after disconnectNet() clears NET.terminalError')

    await sleep(250)

    // Verify second connection reached server and was admitted
    assert.strictEqual(attemptCount, 2, 'Server should have received exactly 2 connection attempts')
    const openEv = statuses.filter(s => s.kind === 'open')
    assert.ok(openEv.length >= 2, 'Second connection should successfully emit open status')

  } finally {
    unsub()
    disconnectNet()
    await new Promise(res => mockWss.close(res))
    await new Promise(res => mockHttp.close(res))
  }
})

// ---------------------------------------------------------------------------
// TEST 3: Terminal Close Code Boundary Matrix (4001, 4002, 4003, 4005 vs 1006)
// ---------------------------------------------------------------------------
test('M11-ADV-03: Close code suppression matrix: 4001/4002/4003/4005 suppress reconnect; 1006 reconnects', async () => {
  const MOCK_PORT = 8983
  let connectionCount = 0
  let closeMode = 4005

  const mockHttp = createServer()
  const mockWss = new WebSocketServer({ server: mockHttp })

  mockWss.on('connection', (ws) => {
    connectionCount++
    if (closeMode === 1006) {
      ws.terminate()
    } else {
      ws.close(closeMode, 'terminal-test')
    }
  })

  await new Promise(res => mockHttp.listen(MOCK_PORT, res))

  try {
    // Test terminal codes: 4001, 4002, 4003, 4005
    for (const code of [4001, 4002, 4003, 4005]) {
      disconnectNet()
      connectionCount = 0
      closeMode = code

      connectNet(`ws://127.0.0.1:${MOCK_PORT}`)
      await sleep(150)
      assert.strictEqual(connectionCount, 1)

      // Wait 1300ms — reconnect MUST NOT fire
      await sleep(1300)
      assert.strictEqual(connectionCount, 1, `Close code ${code} must suppress reconnect!`)
    }

    // Now test non-terminal closure: 1006
    disconnectNet()
    connectionCount = 0
    closeMode = 1006

    connectNet(`ws://127.0.0.1:${MOCK_PORT}`)
    await sleep(150)
    assert.strictEqual(connectionCount, 1)

    // Non-terminal closure MUST trigger reconnect after ~1000ms
    await sleep(1400)
    assert.ok(connectionCount >= 2, 'Abnormal closure (1006) MUST trigger automatic reconnect!')

  } finally {
    disconnectNet()
    await new Promise(res => mockWss.close(res))
    await new Promise(res => mockHttp.close(res))
  }
})

// ---------------------------------------------------------------------------
// TEST 4: Live Server Exclusivity, 30s Grace Protection & Recovery
// ---------------------------------------------------------------------------
test('M11-ADV-04: Server-authoritative exclusivity protects characters during 30s grace window', async () => {
  const SERVER_PORT = 8984
  const env = { ...process.env, PORT: String(SERVER_PORT), NODE_ENV: 'production' }
  const serverProc = spawn('node', ['server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] })

  try {
    await waitForServer(SERVER_PORT, serverProc)

    const cMaya = await redeemInvite(SERVER_PORT, 'maya-love')
    const cEthan = await redeemInvite(SERVER_PORT, 'ethan-love')

    // 1. Maya connects and joins
    const wsMaya = new WebSocket(`ws://127.0.0.1:${SERVER_PORT}/ws`, {
      headers: { Cookie: cMaya, Origin: `http://127.0.0.1:${SERVER_PORT}` }
    })
    await new Promise(res => wsMaya.on('open', res))
    wsMaya.send(JSON.stringify({
      t: 'join', proto: 2, name: 'Maya', avatarId: 'maya', model: 'woman.glb', room: 'lobby'
    }))

    const mayaJoinMsg = await new Promise(res => wsMaya.once('message', d => res(JSON.parse(d))))
    assert.strictEqual(mayaJoinMsg.t, 'room_state')

    // 2. Maya drops unexpectedly (entering 30-second disconnect grace)
    wsMaya.terminate()
    await sleep(250)

    // Verify /api/occupancy still protects Maya during grace
    const occDuringGrace = await fetchOccupancy(SERVER_PORT)
    assert.strictEqual(occDuringGrace.count, 1)
    assert.deepStrictEqual(occDuringGrace.claimedCharacters, ['maya'])
    assert.deepStrictEqual(occDuringGrace.availableCharacters, ['ethan'])

    // 3. Visitor 2 attempts to claim Maya during Maya's grace window -> MUST BE STRICTLY REJECTED WITH 4005
    const wsHijack = new WebSocket(`ws://127.0.0.1:${SERVER_PORT}/ws`, {
      headers: { Cookie: cEthan, Origin: `http://127.0.0.1:${SERVER_PORT}` }
    })
    await new Promise(res => wsHijack.on('open', res))

    let hijackRejected = false
    let hijackCloseCode = null
    wsHijack.on('message', d => {
      const msg = JSON.parse(d)
      if (msg.t === 'error' && msg.msg === 'character-taken') hijackRejected = true
    })
    const closePromise = new Promise(res => wsHijack.on('close', (code) => {
      hijackCloseCode = code
      res()
    }))

    wsHijack.send(JSON.stringify({
      t: 'join', proto: 2, name: 'Maya', avatarId: 'maya', model: 'woman.glb', room: 'lobby'
    }))
    await closePromise

    assert.strictEqual(hijackRejected, true, 'Server must reject duplicate claim during active grace window')
    assert.strictEqual(hijackCloseCode, 4005, 'Server must close duplicate claim with code 4005')

    // 4. Maya reconnects within grace window -> Allowed to resume session
    const wsMayaReconnect = new WebSocket(`ws://127.0.0.1:${SERVER_PORT}/ws`, {
      headers: { Cookie: cMaya, Origin: `http://127.0.0.1:${SERVER_PORT}` }
    })
    await new Promise(res => wsMayaReconnect.on('open', res))
    wsMayaReconnect.send(JSON.stringify({
      t: 'join', proto: 2, name: 'Maya', avatarId: 'maya', model: 'woman.glb', room: 'lobby'
    }))

    const mayaReconnectedMsg = await new Promise(res => wsMayaReconnect.once('message', d => res(JSON.parse(d))))
    assert.strictEqual(mayaReconnectedMsg.t, 'room_state', 'Maya must successfully resume her session within grace')

    // Maya explicitly leaves sanctuary
    wsMayaReconnect.send(JSON.stringify({ t: 'leave' }))
    await sleep(200)

  } finally {
    serverProc.kill()
    await sleep(200)
  }
})

// ---------------------------------------------------------------------------
// TEST 5: High-Concurrency Race Stress (4 Simultaneous Claims for Maya)
// ---------------------------------------------------------------------------
test('M11-ADV-05: High-concurrency race stress: 4 simultaneous claims for Maya results in exactly 1 winner and 3 4005 rejections', async () => {
  const SERVER_PORT = 8985
  const env = { ...process.env, PORT: String(SERVER_PORT), NODE_ENV: 'production' }
  const serverProc = spawn('node', ['server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] })

  try {
    await waitForServer(SERVER_PORT, serverProc)

    const cMaya = await redeemInvite(SERVER_PORT, 'maya-love')
    const cEthan = await redeemInvite(SERVER_PORT, 'ethan-love')

    // Prepare 4 client connections with valid authenticated sessions
    const CLIENT_COUNT = 4
    const clients = []

    for (let i = 0; i < CLIENT_COUNT; i++) {
      const cookie = await redeemInvite(SERVER_PORT, '290512')
      const ws = new WebSocket(`ws://127.0.0.1:${SERVER_PORT}/ws`, {
        headers: { Cookie: cookie, Origin: `http://127.0.0.1:${SERVER_PORT}` }
      })
      const client = {
        id: i,
        cookie,
        ws,
        messages: [],
        closed: false,
        closeCode: null
      }
      ws.on('message', d => {
        try { client.messages.push(JSON.parse(d.toString())) } catch {}
      })
      ws.on('close', (code) => {
        client.closed = true
        client.closeCode = code
      })
      clients.push(client)
    }

    await Promise.all(clients.map(c => waitForOpen(c.ws)))

    // Simultaneous barrage: all 4 clients send join for Maya at the exact same moment
    const joinPayload = JSON.stringify({
      t: 'join',
      proto: 2,
      name: 'Maya',
      avatarId: 'maya',
      model: 'woman.glb',
      room: 'lobby'
    })

    for (const client of clients) {
      client.ws.send(joinPayload)
    }

    // Wait for all messages and closures to settle
    await sleep(500)

    // Evaluate race results
    const winners = clients.filter(c => c.messages.some(m => m.t === 'room_state'))
    const rejected = clients.filter(c => c.messages.some(m => m.t === 'error' && m.msg === 'character-taken'))

    assert.strictEqual(winners.length, 1, `Exactly 1 client must win the race for Maya (got ${winners.length})`)
    assert.strictEqual(rejected.length, CLIENT_COUNT - 1, `Exactly ${CLIENT_COUNT - 1} clients must receive character-taken error (got ${rejected.length})`)

    for (const rej of rejected) {
      assert.strictEqual(rej.closeCode, 4005, `Rejected client ${rej.id} must be closed with code 4005 (got ${rej.closeCode})`)
    }

    // Verify /api/occupancy
    const occ = await fetchOccupancy(SERVER_PORT)
    assert.strictEqual(occ.count, 1)
    assert.deepStrictEqual(occ.claimedCharacters, ['maya'])
    assert.deepStrictEqual(occ.availableCharacters, ['ethan'])

    // One rejected client recovers as Ethan
    const recoveringClient = rejected[0]
    const wsRecovered = new WebSocket(`ws://127.0.0.1:${SERVER_PORT}/ws`, {
      headers: { Cookie: recoveringClient.cookie, Origin: `http://127.0.0.1:${SERVER_PORT}` }
    })
    await new Promise(res => wsRecovered.on('open', res))
    const recoveredMsgs = []
    wsRecovered.on('message', d => {
      try { recoveredMsgs.push(JSON.parse(d.toString())) } catch {}
    })

    wsRecovered.send(JSON.stringify({
      t: 'join',
      proto: 2,
      name: 'Ethan',
      avatarId: 'ethan',
      model: 'man.glb',
      room: 'lobby'
    }))

    await sleep(350)
    const admittedState = recoveredMsgs.find(m => m.t === 'room_state')
    assert.ok(admittedState, 'Recovered client must be admitted as Ethan')

    const occFull = await fetchOccupancy(SERVER_PORT)
    assert.strictEqual(occFull.count, 2)
    assert.strictEqual(occFull.full, true)

    for (const c of clients) {
      try { c.ws.close() } catch {}
    }
    try { wsRecovered.close() } catch {}

  } finally {
    serverProc.kill()
    await sleep(200)
  }
})

// ---------------------------------------------------------------------------
// TEST 6: Adversarial Investigation: Same-Session Dual-Connection Behavior
// Challenges line 888: if (sessKey && p.sessionToken === sessKey) return false;
// Empirically measures whether two simultaneous tabs sharing the same session
// can both claim Maya without server-side conflict rejection.
// ---------------------------------------------------------------------------
test('M11-ADV-06: Adversarial probe: Same-session dual-tab connection behavior on character exclusivity', async () => {
  const SERVER_PORT = 8986
  const env = { ...process.env, PORT: String(SERVER_PORT), NODE_ENV: 'production' }
  const serverProc = spawn('node', ['server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] })

  try {
    await waitForServer(SERVER_PORT, serverProc)

    // A single visitor redeems an invitation and receives one session cookie
    const sharedCookie = await redeemInvite(SERVER_PORT, 'maya-love')

    // Tab 1 opens WebSocket and joins as Maya
    const wsTab1 = new WebSocket(`ws://127.0.0.1:${SERVER_PORT}/ws`, {
      headers: { Cookie: sharedCookie, Origin: `http://127.0.0.1:${SERVER_PORT}` }
    })
    await new Promise(res => wsTab1.on('open', res))
    const tab1Msgs = []
    wsTab1.on('message', d => { try { tab1Msgs.push(JSON.parse(d.toString())) } catch {} })

    wsTab1.send(JSON.stringify({
      t: 'join', proto: 2, name: 'Maya', avatarId: 'maya', model: 'woman.glb', room: 'lobby'
    }))
    await sleep(250)
    const tab1Joined = tab1Msgs.some(m => m.t === 'room_state')
    assert.ok(tab1Joined, 'Tab 1 must successfully join as Maya')

    // Tab 2 (same browser / cookie) opens second WebSocket and attempts to join as Maya
    const wsTab2 = new WebSocket(`ws://127.0.0.1:${SERVER_PORT}/ws`, {
      headers: { Cookie: sharedCookie, Origin: `http://127.0.0.1:${SERVER_PORT}` }
    })
    await new Promise(res => wsTab2.on('open', res))
    const tab2Msgs = []
    let tab2CloseCode = null
    wsTab2.on('message', d => { try { tab2Msgs.push(JSON.parse(d.toString())) } catch {} })
    wsTab2.on('close', code => { tab2CloseCode = code })

    wsTab2.send(JSON.stringify({
      t: 'join', proto: 2, name: 'Maya', avatarId: 'maya', model: 'woman.glb', room: 'lobby'
    }))
    await sleep(350)

    const tab2Joined = tab2Msgs.some(m => m.t === 'room_state')
    const tab2Rejected = tab2Msgs.some(m => m.t === 'error' && m.msg === 'character-taken')

    assert.strictEqual(tab2Joined, false, 'Tab 2 with duplicate character claim must NOT join')
    assert.strictEqual(tab2Rejected, true, 'Tab 2 must receive character-taken error')
    assert.strictEqual(tab2CloseCode, 4005, 'Tab 2 must be closed with code 4005')

    console.log(`[ADV-M11-06 Result] Tab 2 with same sessionToken: joined=${tab2Joined}, rejectedWithTaken=${tab2Rejected}, closeCode=${tab2CloseCode}`)

    // Clean up
    try { wsTab1.close() } catch {}
    try { wsTab2.close() } catch {}

  } finally {
    serverProc.kill()
    await sleep(200)
  }
})
