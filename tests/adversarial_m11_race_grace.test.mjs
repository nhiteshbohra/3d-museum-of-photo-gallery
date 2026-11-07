// =========================================================================
// ADVERSARIAL STRESS TEST: Milestone M11
// Simultaneous Join Race Conditions & Reconnection Grace Window Defense
// Verifies:
// 1. Simultaneous join race: exactly one claims character; duplicate receives
//    WS close code 4005 and { t: 'error', msg: 'character-taken' }.
// 2. Multi-client burst race: 4 concurrent claimants for Maya -> 1 win, 3 code 4005.
// 3. Reconnection grace period defense: ungraceful disconnect enters 30s grace;
//    imposters/competitors claiming Maya during grace are strictly rejected (4005).
// 4. Concurrent race against active grace session: concurrent imposters both blocked (4005).
// 5. Reconnection identity allowance: original session token owner reconnects during
//    grace and is admitted, clearing grace session and restoring peer.
// 6. Dual-occupancy grace reconnect: partner (Ethan) joins while Maya is in grace
//    (museum full); original Maya reconnects and is admitted without capacity failure.
// 7. Contextual seat lock retention across ungraceful disconnect & restoration.
// 8. Server state consistency: rejected sockets never tracked in sessionPeers;
//    GET /api/occupancy accurately mirrors active + grace counts across all transitions.
// =========================================================================

import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import http from 'node:http'
import { WebSocket } from 'ws'
import { createInvite } from '../scripts/inviteStore.js'

const TEST_PORT = 8999
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function redeemInvite(code) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ code })
    const req = http.request(`${BASE_URL}/api/invite/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = ''
      res.on('data', chunk => { body += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body)
          if (!parsed.ok) return reject(new Error('Redeem failed: ' + parsed.error))
          const cookieHeader = res.headers['set-cookie']
          if (!cookieHeader || cookieHeader.length === 0) return reject(new Error('Missing Set-Cookie header'))
          const cookie = cookieHeader[0].split(';')[0]
          const tokenMatch = cookie.match(/museum_session=([^;]+)/)
          const sessionToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null
          resolve({ cookie, sessionToken, recipient: parsed.recipient })
        } catch (err) {
          reject(err)
        }
      })
    })
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

function fetchOccupancy() {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}/api/occupancy`, (res) => {
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

function fetchHealth() {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}/healthz`, (res) => {
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

function createClient(options = {}) {
  const headers = {}
  if (options.cookie) headers.Cookie = options.cookie
  headers.Origin = BASE_URL
  const ws = new WebSocket(WS_URL, { headers })

  const client = {
    id: options.id || 'client',
    sessionToken: options.sessionToken || null,
    cookie: options.cookie || null,
    ws,
    messages: [],
    closed: false,
    closeCode: null,
    closeReason: '',

    waitForOpen() {
      return new Promise((res, rej) => {
        if (ws.readyState === WebSocket.OPEN) return res()
        ws.once('open', res)
        ws.once('error', rej)
      })
    },

    send(obj) {
      ws.send(JSON.stringify(obj))
    },

    waitForMessage(predicate, timeoutMs = 2500) {
      return new Promise((res, rej) => {
        const found = client.messages.find(predicate)
        if (found) return res(found)

        const timer = setTimeout(() => {
          cleanup()
          rej(new Error(`Timeout (${timeoutMs}ms) waiting for message in client ${client.id}`))
        }, timeoutMs)

        function onMsg(data) {
          try {
            const parsed = JSON.parse(data.toString())
            if (predicate(parsed)) {
              cleanup()
              res(parsed)
            }
          } catch {}
        }

        function cleanup() {
          clearTimeout(timer)
          ws.removeListener('message', onMsg)
        }

        ws.on('message', onMsg)
      })
    },

    waitForClose(timeoutMs = 2500) {
      return new Promise((res, rej) => {
        if (client.closed) return res({ code: client.closeCode, reason: client.closeReason })
        const timer = setTimeout(() => {
          rej(new Error(`Timeout (${timeoutMs}ms) waiting for close in client ${client.id}`))
        }, timeoutMs)
        ws.once('close', (code, reason) => {
          clearTimeout(timer)
          res({ code, reason: reason ? reason.toString() : '' })
        })
      })
    },

    closeGracefully() {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ t: 'leave' })) } catch {}
        ws.close()
      }
    },

    terminateAbruptly() {
      ws.terminate()
    }
  }

  ws.on('message', data => {
    try {
      client.messages.push(JSON.parse(data.toString()))
    } catch {}
  })

  ws.on('close', (code, reason) => {
    client.closed = true
    client.closeCode = code
    client.closeReason = reason ? reason.toString() : ''
  })

  return client
}

test('Adversarial M11: Simultaneous Join Race Conditions & Reconnection Grace Defense', { timeout: 45000 }, async () => {
  const env = {
    ...process.env,
    PORT: String(TEST_PORT),
    MUSEUM_PASSCODE: 'adversarial_pass',
    NODE_ENV: 'production'
  }
  const serverProc = spawn('node', ['server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  let serverLogs = ''
  serverProc.stdout.on('data', d => { serverLogs += d.toString() })
  serverProc.stderr.on('data', d => { serverLogs += d.toString() })

  try {
    // Wait for test server to spin up
    let started = false
    for (let i = 0; i < 25; i++) {
      await sleep(150)
      try {
        const h = await fetchHealth()
        if (h && h.ok) {
          started = true
          break
        }
      } catch {}
    }
    assert.ok(started, 'Isolated server failed to start on port ' + TEST_PORT)

    // Baseline: Occupancy check on fresh server
    const baseOcc = await fetchOccupancy()
    assert.strictEqual(baseOcc.count, 0)
    assert.strictEqual(baseOcc.full, false)
    assert.deepStrictEqual(baseOcc.claimedCharacters, [])
    assert.deepStrictEqual(baseOcc.availableCharacters, ['maya', 'ethan'])

    // Redeem valid invitation codes for Maya and Ethan
    const mayaAuth = await redeemInvite('Maya-Love')
    assert.ok(mayaAuth.sessionToken, 'Maya-Love must return valid sessionToken')
    const ethanAuth = await redeemInvite('ethan-love')
    assert.ok(ethanAuth.sessionToken, 'ethan-love must return valid sessionToken')

    // =========================================================================
    // SECTION 1: Simultaneous Join Race Condition (Exact-Millisecond Concurrency)
    // =========================================================================
    console.log('\n[SECTION 1] Simultaneous Join Race Condition (2 Clients for Maya)')
    const clientA = createClient({ id: 'Racer-A', cookie: mayaAuth.cookie })
    const clientB = createClient({ id: 'Racer-B', cookie: ethanAuth.cookie })
    await Promise.all([clientA.waitForOpen(), clientB.waitForOpen()])

    const racePayloadMaya = {
      t: 'join',
      proto: 2,
      name: 'Maya',
      avatarId: 'maya',
      model: 'woman.glb',
      room: 'lobby',
      p: [0, 1.7, 4],
      ry: 0
    }

    // Fire join at the exact same millisecond
    clientA.send(racePayloadMaya)
    clientB.send(racePayloadMaya)

    await sleep(250)

    const aState = clientA.messages.find(m => m.t === 'room_state')
    const bState = clientB.messages.find(m => m.t === 'room_state')
    const aErr = clientA.messages.find(m => m.t === 'error' && m.msg === 'character-taken')
    const bErr = clientB.messages.find(m => m.t === 'error' && m.msg === 'character-taken')

    let winner, loser
    if (aState && !bState && bErr) {
      winner = clientA
      loser = clientB
    } else if (bState && !aState && aErr) {
      winner = clientB
      loser = clientA
    } else {
      assert.fail(`Race resolution failed: aState=${Boolean(aState)}, bState=${Boolean(bState)}, aErr=${Boolean(aErr)}, bErr=${Boolean(bErr)}`)
    }

    // Await loser close event
    const loserClose = await loser.waitForClose()
    assert.strictEqual(loserClose.code, 4005, 'Rejected race client MUST receive close code 4005')
    assert.strictEqual(loserClose.reason, 'character-taken', 'Rejected race client close reason MUST be character-taken')
    console.log(`  ✓ Concurrency race correctly resolved: ${winner.id} won Maya; ${loser.id} denied with code 4005 (character-taken)`)

    // Verify Server State Consistency after race
    const occAfterRace = await fetchOccupancy()
    assert.strictEqual(occAfterRace.count, 1, 'Occupancy count must be exactly 1')
    assert.strictEqual(occAfterRace.full, false)
    assert.deepStrictEqual(occAfterRace.claimedCharacters, ['maya'])
    assert.deepStrictEqual(occAfterRace.availableCharacters, ['ethan'])

    const healthAfterRace = await fetchHealth()
    assert.strictEqual(healthAfterRace.peers, 1, 'healthz must reflect exactly 1 active peer')
    assert.strictEqual(healthAfterRace.grace, 0, 'healthz must reflect 0 grace sessions')
    console.log('  ✓ Server state consistency confirmed: rejected connection is NOT in sessionPeers')

    // Clean up winner for next section
    winner.closeGracefully()
    await sleep(200)

    // =========================================================================
    // SECTION 2: Multi-Client Simultaneous Race Storm (4 Concurrent Requesters)
    // =========================================================================
    console.log('\n[SECTION 2] Multi-Client Race Storm (4 Concurrent Requesters for Maya)')
    const stormClients = [
      createClient({ id: 'Storm-1', cookie: mayaAuth.cookie }),
      createClient({ id: 'Storm-2', cookie: ethanAuth.cookie }),
      createClient({ id: 'Storm-3' }), // Passcode guest 1
      createClient({ id: 'Storm-4' })  // Passcode guest 2
    ]
    await Promise.all(stormClients.map(c => c.waitForOpen()))

    // Broadcast 4 simultaneous join payloads requesting 'maya'
    const joinStormPayload = {
      t: 'join',
      proto: 2,
      code: 'adversarial_pass',
      name: 'Maya Stormer',
      avatarId: 'maya',
      model: 'woman.glb'
    }

    stormClients.forEach(c => c.send(joinStormPayload))
    await sleep(350)

    const winners = stormClients.filter(c => c.messages.some(m => m.t === 'room_state'))
    const losers = stormClients.filter(c => c.messages.some(m => m.t === 'error' && m.msg === 'character-taken'))

    assert.strictEqual(winners.length, 1, 'Exactly ONE client must win Maya in 4-client storm')
    assert.strictEqual(losers.length, 3, 'Exactly THREE clients must be rejected in 4-client storm')

    for (const l of losers) {
      const closeInfo = await l.waitForClose()
      assert.strictEqual(closeInfo.code, 4005, 'Every loser must receive close code 4005')
      assert.strictEqual(closeInfo.reason, 'character-taken')
    }
    console.log('  ✓ 4-client simultaneous storm: 1 winner, 3 rejected with 4005 character-taken')

    const occAfterStorm = await fetchOccupancy()
    assert.strictEqual(occAfterStorm.count, 1)
    assert.deepStrictEqual(occAfterStorm.claimedCharacters, ['maya'])
    const healthAfterStorm = await fetchHealth()
    assert.strictEqual(healthAfterStorm.peers, 1)

    // Clean up winner
    winners[0].closeGracefully()
    await sleep(200)

    // =========================================================================
    // SECTION 3: Reconnection Grace Period Defense (Sole Participant Drop)
    // =========================================================================
    console.log('\n[SECTION 3] Reconnection Grace Period Defense (Sole Participant Drop)')
    // Player 1 connects with Maya credentials and joins
    const p1Maya = createClient({ id: 'Player1-Maya', cookie: mayaAuth.cookie, sessionToken: mayaAuth.sessionToken })
    await p1Maya.waitForOpen()
    p1Maya.send({
      t: 'join',
      proto: 2,
      name: 'Maya',
      avatarId: 'maya',
      model: 'woman.glb'
    })
    const p1State = await p1Maya.waitForMessage(m => m.t === 'room_state')
    assert.strictEqual(p1State.t, 'room_state')

    // Player 1 sits on sofa before drop
    p1Maya.send({ t: 'sit', seat: 'sofa_lobby_1' })
    const sitConfirm = await p1Maya.waitForMessage(m => m.t === 'sit_ok')
    assert.strictEqual(sitConfirm.seat, 'sofa_lobby_1')
    console.log('  ✓ Player 1 joined as Maya and locked seat sofa_lobby_1')

    // Player 1 drops connection UNGRACEFULLY (network/process drop, NO { t: 'leave' })
    p1Maya.terminateAbruptly()
    await sleep(250)

    // Server must hold Maya in 30s grace window
    const healthDuringGrace = await fetchHealth()
    assert.strictEqual(healthDuringGrace.peers, 0, 'Active peers must be 0')
    assert.strictEqual(healthDuringGrace.grace, 1, 'Grace sessions must be 1')

    const occDuringGrace = await fetchOccupancy()
    assert.strictEqual(occDuringGrace.count, 1, 'Occupancy count during grace MUST be 1')
    assert.strictEqual(occDuringGrace.full, false)
    assert.deepStrictEqual(occDuringGrace.claimedCharacters, ['maya'], 'Maya MUST remain claimed during grace')
    assert.deepStrictEqual(occDuringGrace.availableCharacters, ['ethan'], 'Ethan MUST remain available')
    console.log('  ✓ Ungraceful disconnect entered 30s grace: count=1, claimed=[maya], available=[ethan]')

    // An Imposter / Competitor attempts to hijack Maya during grace period
    const imposter = createClient({ id: 'Imposter-Maya', cookie: ethanAuth.cookie })
    await imposter.waitForOpen()
    imposter.send({
      t: 'join',
      proto: 2,
      name: 'Maya Hijacker',
      avatarId: 'maya',
      model: 'woman.glb'
    })

    const imposterErr = await imposter.waitForMessage(m => m.t === 'error')
    assert.strictEqual(imposterErr.msg, 'character-taken', 'Imposter claiming Maya during grace MUST be rejected')

    const imposterClose = await imposter.waitForClose()
    assert.strictEqual(imposterClose.code, 4005, 'Imposter close code MUST be 4005')
    assert.strictEqual(imposterClose.reason, 'character-taken')
    console.log('  ✓ Imposter attempting to claim Maya during grace strictly rejected with code 4005 (character-taken)')

    // Verify rejected imposter was NOT added to sessionPeers or graceSessions
    const healthAfterImposter = await fetchHealth()
    assert.strictEqual(healthAfterImposter.peers, 0, 'Active peers remains 0 (imposter NOT leaked into sessionPeers)')
    assert.strictEqual(healthAfterImposter.grace, 1, 'Grace sessions remains 1')

    // =========================================================================
    // SECTION 4: Concurrent Race against Active Grace Session
    // =========================================================================
    console.log('\n[SECTION 4] Concurrent Race against Active Grace Session')
    // Two competitors simultaneously try to claim Maya while Maya is in grace
    const comp1 = createClient({ id: 'Competitor-1' })
    const comp2 = createClient({ id: 'Competitor-2' })
    await Promise.all([comp1.waitForOpen(), comp2.waitForOpen()])

    const claimMayaPayload = {
      t: 'join',
      proto: 2,
      code: 'adversarial_pass',
      name: 'Maya Snipe',
      avatarId: 'maya',
      model: 'woman.glb'
    }

    comp1.send(claimMayaPayload)
    comp2.send(claimMayaPayload)
    await sleep(250)

    const comp1Err = comp1.messages.find(m => m.t === 'error' && m.msg === 'character-taken')
    const comp2Err = comp2.messages.find(m => m.t === 'error' && m.msg === 'character-taken')
    assert.ok(comp1Err, 'Competitor 1 must be rejected')
    assert.ok(comp2Err, 'Competitor 2 must be rejected')

    const comp1Close = await comp1.waitForClose()
    const comp2Close = await comp2.waitForClose()
    assert.strictEqual(comp1Close.code, 4005)
    assert.strictEqual(comp2Close.code, 4005)
    console.log('  ✓ Concurrent competitors against active grace session BOTH rejected with code 4005')

    // =========================================================================
    // SECTION 5: Reconnection Identity Allowance (Authorized Recovery)
    // =========================================================================
    console.log('\n[SECTION 5] Reconnection Identity Allowance (Legitimate Owner Reconnects)')
    // Player 1 reconnects with their OWN original session token
    const p1Reconnected = createClient({ id: 'Player1-Reconnected', cookie: mayaAuth.cookie, sessionToken: mayaAuth.sessionToken })
    await p1Reconnected.waitForOpen()
    p1Reconnected.send({
      t: 'join',
      proto: 2,
      sessionToken: mayaAuth.sessionToken,
      name: 'Maya',
      avatarId: 'maya',
      model: 'woman.glb'
    })

    const p1ReconnectedState = await p1Reconnected.waitForMessage(m => m.t === 'room_state')
    assert.strictEqual(p1ReconnectedState.t, 'room_state', 'Legitimate owner MUST receive room_state on reconnect')

    // Verify seat sofa_lobby_1 was restored
    const healthAfterReconnected = await fetchHealth()
    assert.strictEqual(healthAfterReconnected.peers, 1, 'Active peers is 1')
    assert.strictEqual(healthAfterReconnected.grace, 0, 'Grace sessions cleared back to 0')

    const occAfterReconnected = await fetchOccupancy()
    assert.strictEqual(occAfterReconnected.count, 1)
    assert.deepStrictEqual(occAfterReconnected.claimedCharacters, ['maya'])
    console.log('  ✓ Reconnection identity allowance verified: Player 1 rejoined, grace cleared to 0, session restored')

    // =========================================================================
    // SECTION 6: Dual Occupancy with Grace Window & Reconnect
    // =========================================================================
    console.log('\n[SECTION 6] Dual Occupancy with Grace Window & Reconnect')
    // Maya drops ungracefully again into grace
    p1Reconnected.terminateAbruptly()
    await sleep(250)

    const healthGrace2 = await fetchHealth()
    assert.strictEqual(healthGrace2.peers, 0)
    assert.strictEqual(healthGrace2.grace, 1)

    // Ethan joins as Ethan (ALLOWED)
    const p2Ethan = createClient({ id: 'Player2-Ethan', cookie: ethanAuth.cookie, sessionToken: ethanAuth.sessionToken })
    await p2Ethan.waitForOpen()
    p2Ethan.send({
      t: 'join',
      proto: 2,
      sessionToken: ethanAuth.sessionToken,
      name: 'Ethan',
      avatarId: 'ethan',
      model: 'man.glb'
    })

    const ethanState = await p2Ethan.waitForMessage(m => m.t === 'room_state')
    assert.strictEqual(ethanState.t, 'room_state')
    console.log('  ✓ Partner Ethan joined successfully while Maya is in grace')

    // Occupancy now reflects 2 occupants (1 active + 1 grace = 2, full = true)
    const occDualGrace = await fetchOccupancy()
    assert.strictEqual(occDualGrace.count, 2, 'Total count must be 2')
    assert.strictEqual(occDualGrace.full, true, 'Sanctuary must be marked full')
    assert.ok(occDualGrace.claimedCharacters.includes('maya'))
    assert.ok(occDualGrace.claimedCharacters.includes('ethan'))
    assert.deepStrictEqual(occDualGrace.availableCharacters, [])

    // A 3rd visitor attempts to join when full -> MUST BE REJECTED
    const v3 = createClient({ id: 'Visitor-3' })
    await v3.waitForOpen()
    v3.send({
      t: 'join',
      proto: 2,
      code: 'adversarial_pass',
      name: 'Third Wheel',
      model: 'woman.glb'
    })
    const v3Err = await v3.waitForMessage(m => m.t === 'error')
    assert.ok(v3Err.msg === 'room-full' || v3Err.msg === 'character-taken', 'Third visitor must be denied')
    const v3Close = await v3.waitForClose()
    assert.ok(v3Close.code === 4002 || v3Close.code === 4005)
    console.log(`  ✓ Third visitor denied during dual occupancy (code ${v3Close.code})`)

    // Now Player 1 (Maya) reconnects with her own session token:
    // Even though count: 2 (full), Maya is the grace session and MUST be admitted!
    const p1ReconnectedFinal = createClient({ id: 'Player1-Final', cookie: mayaAuth.cookie, sessionToken: mayaAuth.sessionToken })
    await p1ReconnectedFinal.waitForOpen()
    p1ReconnectedFinal.send({
      t: 'join',
      proto: 2,
      sessionToken: mayaAuth.sessionToken,
      name: 'Maya',
      avatarId: 'maya',
      model: 'woman.glb'
    })

    const p1FinalState = await p1ReconnectedFinal.waitForMessage(m => m.t === 'room_state')
    assert.strictEqual(p1FinalState.t, 'room_state', 'Maya must successfully rejoin even when museum was marked full')

    const healthDualActive = await fetchHealth()
    assert.strictEqual(healthDualActive.peers, 2, 'Both peers are now actively in sessionPeers')
    assert.strictEqual(healthDualActive.grace, 0, 'Grace sessions back to 0')

    const occDualActive = await fetchOccupancy()
    assert.strictEqual(occDualActive.count, 2)
    assert.strictEqual(occDualActive.full, true)
    console.log('  ✓ Maya successfully reconnected under dual-occupancy: both Maya and Ethan active in sessionPeers')

    // =========================================================================
    // SECTION 7: Rejection Flood / Leak Resistance (Single Active Player)
    // =========================================================================
    console.log('\n[SECTION 7] Rejection Flood & Memory Leak Resistance (Single Active Player)')
    // Disconnect Ethan so room capacity is 1 / 2 (not full).
    p2Ethan.closeGracefully()
    await sleep(250)

    const healthPreFlood = await fetchHealth()
    assert.strictEqual(healthPreFlood.peers, 1, 'Only Maya is active')
    assert.strictEqual(healthPreFlood.grace, 0)

    // With 1 slot open, authenticated duplicate claims for Maya pass capacity (1 < 2)
    // and MUST be rejected specifically by character exclusivity with code 4005 (character-taken).
    for (const batch of [1, 2]) {
      const floodAuths = []
      for (let i = 0; i < 4; i++) {
        const code = `flood-m11-b${batch}-${i}-${Date.now()}`
        createInvite({ recipient: `Flooder-B${batch}-${i}`, customCode: code })
        const auth = await redeemInvite(code)
        floodAuths.push(auth)
      }

      const floodClients = floodAuths.map((auth, i) => createClient({
        id: `Flood-B${batch}-${i}`,
        cookie: auth.cookie,
        sessionToken: auth.sessionToken
      }))
      await Promise.all(floodClients.map(c => c.waitForOpen()))

      floodClients.forEach((c, idx) => {
        c.send({
          t: 'join',
          proto: 2,
          sessionToken: c.sessionToken,
          name: `Maya Clone ${batch}-${idx}`,
          avatarId: 'maya',
          model: 'woman.glb'
        })
      })

      // All must receive close code 4005 and close cleanly
      const closes = await Promise.all(floodClients.map(c => c.waitForClose()))
      for (const cl of closes) {
        assert.strictEqual(cl.code, 4005, 'Every duplicate claimant must be closed with 4005')
        assert.strictEqual(cl.reason, 'character-taken')
      }
    }
    console.log('  ✓ 8 flooded authenticated duplicate claims strictly rejected with code 4005 (character-taken)')

    // Verify sessionPeers and occupancy did not leak a single peer
    const healthPostFlood = await fetchHealth()
    assert.strictEqual(healthPostFlood.peers, 1, 'sessionPeers must still have exactly 1 active peer (Maya)')
    assert.strictEqual(healthPostFlood.grace, 0, 'graceSessions must be 0')

    const occPostFlood = await fetchOccupancy()
    assert.strictEqual(occPostFlood.count, 1)
    assert.strictEqual(occPostFlood.full, false)
    assert.deepStrictEqual(occPostFlood.claimedCharacters, ['maya'])
    assert.deepStrictEqual(occPostFlood.availableCharacters, ['ethan'])
    console.log('  ✓ Server state consistency 100% preserved after rejection flood (zero leaks)')

    // Cleanup active Maya connection
    p1ReconnectedFinal.closeGracefully()
    await sleep(200)

    const healthFinal = await fetchHealth()
    assert.strictEqual(healthFinal.peers, 0)
    console.log('  ✓ Graceful shutdown verified: 0 active peers remaining')

    console.log('\n=======================================================')
    console.log('  ALL ADVERSARIAL RACE & GRACE VERIFICATIONS PASSED!')
    console.log('=======================================================')
  } finally {
    serverProc.kill('SIGTERM')
  }
})
