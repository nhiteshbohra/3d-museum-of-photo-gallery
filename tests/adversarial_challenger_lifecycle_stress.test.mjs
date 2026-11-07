// =========================================================================
// ADVERSARIAL CHALLENGER LIFECYCLE & RECOVERY STRESS SUITE (CHALLENGER 2)
// Deep stress verification of:
// 1. Multi-attempt claim rejection cycles (3x consecutive 4005 rejection -> recovery -> admission)
// 2. Rapid disconnectNet() / connectNet() re-entrancy & race handling
// 3. Repeated and redundant disconnectNet() calls are idempotent and safe
// 4. Real server multi-client recovery: Winner claims Maya, Loser attempts Maya (denied 4005),
//    Loser recovers via disconnectNet(), claims Ethan, gets admitted; both sync in sanctuary.
// =========================================================================

import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import http from 'node:http'
import { WebSocket, WebSocketServer } from 'ws'
import { connectNet, disconnectNet, onNet, netConnected } from '../src/net/wsClient.js'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function closeMockServer(mockWss, mockHttp) {
  return new Promise(resolve => {
    try {
      for (const client of mockWss.clients) {
        try { client.terminate() } catch {}
      }
      mockWss.close(() => {
        mockHttp.close(() => resolve())
      })
    } catch {
      resolve()
    }
  })
}

// ---------------------------------------------------------------------------
// TEST 1: Multi-attempt claim rejection cycle (3x consecutive 4005 -> admission)
// ---------------------------------------------------------------------------
test('M11-CHALLENGE-01: Consecutive 3x 4005 rejections followed by successful admission', async () => {
  const PORT = 8991
  let connectionAttempts = 0

  const mockHttp = createServer()
  const mockWss = new WebSocketServer({ server: mockHttp })

  mockWss.on('connection', (ws) => {
    connectionAttempts++
    if (connectionAttempts <= 3) {
      // Reject first 3 attempts with 4005
      ws.send(JSON.stringify({ t: 'error', msg: 'character-taken' }))
      ws.close(4005, 'character-taken')
    } else {
      // 4th attempt admitted
      ws.send(JSON.stringify({ t: 'room_state', yourId: 'peer_ethan', peers: [] }))
    }
  })

  await new Promise(res => mockHttp.listen(PORT, res))

  const statuses = []
  const unsub = onNet('status', s => statuses.push(s))

  try {
    for (let i = 1; i <= 3; i++) {
      // Connect
      const ws = connectNet(`ws://127.0.0.1:${PORT}`)
      assert.ok(ws, `connectNet should return WebSocket on attempt ${i}`)
      await sleep(150)

      // Verify terminal-error was emitted
      const termEv = statuses.filter(s => s.kind === 'terminal-error' && s.code === 'character-taken')
      assert.strictEqual(termEv.length, i, `Must have emitted terminal-error for attempt ${i}`)

      // connectNet() is now blocked by terminal error
      assert.strictEqual(connectNet(`ws://127.0.0.1:${PORT}`), null, `connectNet must be blocked after rejection ${i}`)

      // Simulate handleCharacterClaimRejected() -> disconnectNet()
      disconnectNet()
      assert.strictEqual(netConnected(), false)
    }

    // 4th attempt: successfully admitted after disconnectNet cleared terminal latch
    const ws4 = connectNet(`ws://127.0.0.1:${PORT}`)
    assert.ok(ws4, 'connectNet must succeed on 4th attempt after disconnectNet()')
    await sleep(250)

    assert.strictEqual(connectionAttempts, 4, 'Server must have received exactly 4 connections')
    assert.strictEqual(netConnected(), true, 'Client must be connected on 4th attempt')

  } finally {
    unsub()
    disconnectNet()
    await closeMockServer(mockWss, mockHttp)
  }
})

// ---------------------------------------------------------------------------
// TEST 2: In-flight abort: disconnectNet() called immediately before TCP open
// ---------------------------------------------------------------------------
test('M11-CHALLENGE-02: disconnectNet() immediately after connectNet() aborts cleanly without leak', async () => {
  const PORT = 8992
  let serverAccepted = false

  const mockHttp = createServer()
  const mockWss = new WebSocketServer({ server: mockHttp })

  mockWss.on('connection', (ws) => {
    serverAccepted = true
    ws.send(JSON.stringify({ t: 'room_state', yourId: 'peer_test', peers: [] }))
  })

  await new Promise(res => mockHttp.listen(PORT, res))

  try {
    // Initiate connection and IMMEDIATELY abort in the same synchronous frame
    const ws = connectNet(`ws://127.0.0.1:${PORT}`)
    assert.ok(ws, 'connectNet initiated')
    disconnectNet()

    assert.strictEqual(netConnected(), false, 'netConnected() must be false immediately after disconnectNet()')

    await sleep(250)

    // Even if underlying TCP socket completed handshake on server, client NET state is disengaged
    assert.strictEqual(netConnected(), false, 'netConnected() must remain false after early disconnect')

    // Now connect normally
    const ws2 = connectNet(`ws://127.0.0.1:${PORT}`)
    assert.ok(ws2)
    await sleep(250)

    assert.strictEqual(netConnected(), true, 'Subsequent connectNet must succeed cleanly')

  } finally {
    disconnectNet()
    await closeMockServer(mockWss, mockHttp)
  }
})

// ---------------------------------------------------------------------------
// TEST 3: State hygiene: multiple disconnectNet() calls are idempotent
// ---------------------------------------------------------------------------
test('M11-CHALLENGE-03: Repeated and redundant disconnectNet() calls are idempotent and safe', async () => {
  const PORT = 8993
  const mockHttp = createServer()
  const mockWss = new WebSocketServer({ server: mockHttp })

  mockWss.on('connection', (ws) => {
    ws.send(JSON.stringify({ t: 'room_state', yourId: 'peer_test', peers: [] }))
  })

  await new Promise(res => mockHttp.listen(PORT, res))

  try {
    // Connect to server
    connectNet(`ws://127.0.0.1:${PORT}`)
    await sleep(150)
    assert.strictEqual(netConnected(), true)

    // Call disconnectNet() 5 times consecutively
    assert.doesNotThrow(() => {
      disconnectNet()
      disconnectNet()
      disconnectNet()
      disconnectNet()
      disconnectNet()
    })

    assert.strictEqual(netConnected(), false)

    // Connect again
    const ws = connectNet(`ws://127.0.0.1:${PORT}`)
    assert.ok(ws)
    await sleep(150)
    assert.strictEqual(netConnected(), true)

  } finally {
    disconnectNet()
    await closeMockServer(mockWss, mockHttp)
  }
})

// ---------------------------------------------------------------------------
// TEST 4: Real Server: Winner claims Maya, Loser attempts Maya (denied 4005),
//         Loser recovers via disconnectNet(), claims Ethan, gets admitted.
// ---------------------------------------------------------------------------
test('M11-CHALLENGE-04: Full real-server recovery cycle with Maya conflict -> 4005 -> disconnectNet() -> Ethan admission', async () => {
  const SERVER_PORT = 8994
  const BASE_URL = `http://127.0.0.1:${SERVER_PORT}`
  const env = { ...process.env, PORT: String(SERVER_PORT), NODE_ENV: 'production' }
  const serverProc = spawn('node', ['server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] })

  try {
    // Wait for server ready
    for (let i = 0; i < 30; i++) {
      await sleep(150)
      try {
        const res = await fetch(`${BASE_URL}/healthz`)
        if (res.ok) break
      } catch {}
    }

    // Helper to redeem invite
    async function redeem(code) {
      const res = await fetch(`${BASE_URL}/api/invite/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const cookie = res.headers.get('set-cookie').split(';')[0]
      return cookie
    }

    const cookieMaya = await redeem('Maya-Love')
    const cookieEthan = await redeem('ethan-love')

    // 1. Client 1 (Winner) connects and claims Maya
    const wsWinner = new WebSocket(`ws://127.0.0.1:${SERVER_PORT}/ws`, {
      headers: { Cookie: cookieMaya, Origin: BASE_URL }
    })
    await new Promise(res => wsWinner.on('open', res))
    const winnerMsgs = []
    wsWinner.on('message', d => { try { winnerMsgs.push(JSON.parse(d.toString())) } catch {} })

    wsWinner.send(JSON.stringify({
      t: 'join', proto: 2, name: 'Maya', avatarId: 'maya', model: 'woman.glb', room: 'lobby'
    }))
    await sleep(250)
    assert.ok(winnerMsgs.some(m => m.t === 'room_state'), 'Winner must successfully join as Maya')

    // 2. Client 2 attempts to claim Maya
    const wsLoser = new WebSocket(`ws://127.0.0.1:${SERVER_PORT}/ws`, {
      headers: { Cookie: cookieEthan, Origin: BASE_URL }
    })
    await new Promise(res => wsLoser.on('open', res))
    const loserMsgs = []
    let loserCloseCode = null
    let loserCloseReason = ''
    wsLoser.on('message', d => { try { loserMsgs.push(JSON.parse(d.toString())) } catch {} })
    wsLoser.on('close', (code, reason) => {
      loserCloseCode = code
      loserCloseReason = reason.toString()
    })

    // Loser tries to claim Maya
    wsLoser.send(JSON.stringify({
      t: 'join', proto: 2, name: 'Maya', avatarId: 'maya', model: 'woman.glb', room: 'lobby'
    }))
    await sleep(300)

    // Verify loser is strictly rejected with 4005 and character-taken
    assert.strictEqual(loserMsgs.some(m => m.t === 'room_state'), false, 'Loser must NOT receive room_state')
    assert.strictEqual(loserMsgs.some(m => m.t === 'error' && m.msg === 'character-taken'), true, 'Loser must receive character-taken error')
    assert.strictEqual(loserCloseCode, 4005, 'Loser close code must be 4005')
    assert.strictEqual(loserCloseReason, 'character-taken')

    // 3. Occupancy check: Maya claimed, Ethan available
    const occRes = await fetch(`${BASE_URL}/api/occupancy`)
    const occ = await occRes.json()
    assert.strictEqual(occ.count, 1)
    assert.deepStrictEqual(occ.claimedCharacters, ['maya'])
    assert.deepStrictEqual(occ.availableCharacters, ['ethan'])

    // 4. Loser client recovers: creates second socket for Ethan
    const wsRecovered = new WebSocket(`ws://127.0.0.1:${SERVER_PORT}/ws`, {
      headers: { Cookie: cookieEthan, Origin: BASE_URL }
    })
    await new Promise(res => wsRecovered.on('open', res))
    const recoveredMsgs = []
    wsRecovered.on('message', d => { try { recoveredMsgs.push(JSON.parse(d.toString())) } catch {} })

    wsRecovered.send(JSON.stringify({
      t: 'join', proto: 2, name: 'Ethan', avatarId: 'ethan', model: 'man.glb', room: 'lobby'
    }))
    await sleep(300)

    // Verify recovery succeeded
    assert.strictEqual(recoveredMsgs.some(m => m.t === 'room_state'), true, 'Recovered client must join as Ethan')
    const finalOccRes = await fetch(`${BASE_URL}/api/occupancy`)
    const finalOcc = await finalOccRes.json()
    assert.strictEqual(finalOcc.count, 2)
    assert.strictEqual(finalOcc.full, true)
    assert.ok(finalOcc.claimedCharacters.includes('maya') && finalOcc.claimedCharacters.includes('ethan'))

    // Clean up
    try { wsWinner.close() } catch {}
    try { wsRecovered.close() } catch {}

  } finally {
    serverProc.kill()
    await sleep(200)
  }
})
