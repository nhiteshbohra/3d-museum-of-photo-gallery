import WebSocket from 'ws'
import http from 'http'
import { spawn } from 'child_process'

const PORT = parseInt(process.env.TEST_PORT || process.env.PORT || '8080', 10)
const BASE_URL = `http://127.0.0.1:${PORT}`
const WS_URL = `ws://127.0.0.1:${PORT}/ws`

let serverProc = null

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function redeem(code) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ code })
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/invite/redeem',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      const cookie = res.headers['set-cookie']
      if (!cookie) return reject(new Error('No cookie received'))
      resolve(cookie[0].split(';')[0])
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

function connect(cookie, name, model, avatarId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, {
      headers: { Cookie: cookie, Origin: BASE_URL }
    })
    const messages = []
    ws.on('open', () => {
      ws.send(JSON.stringify({
        t: 'join',
        proto: 2,
        name,
        avatarId: avatarId || (model === 'woman.glb' ? 'maya' : 'ethan'),
        model,
        room: 'lobby',
        p: [0, 1.7, 4],
        ry: 0
      }))
    })
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        messages.push(msg)
        if (msg.t === 'room_state') {
          resolve({ ws, msg, messages })
        }
      } catch (err) {
        console.error('JSON parse error:', err)
      }
    })
    ws.on('error', reject)
  })
}

async function startServer() {
  try {
    const res = await new Promise((res, rej) => {
      http.get(`${BASE_URL}/healthz`, (r) => res(r.statusCode)).on('error', rej)
    })
    if (res === 200) {
      console.log(`Connected to already running server on port ${PORT}`)
      return
    }
  } catch {}

  serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' }
  })
  serverProc.stdout.on('data', () => {})
  serverProc.stderr.on('data', (d) => console.error('[server error]', d.toString()))
  for (let i = 0; i < 30; i++) {
    await sleep(200)
    try {
      const res = await new Promise((res, rej) => {
        http.get(`${BASE_URL}/healthz`, (r) => res(r.statusCode)).on('error', rej)
      })
      if (res === 200) return
    } catch {}
  }
  throw new Error('Server failed to start on port ' + PORT)
}

async function run() {
  console.log(`Starting isolated test server on port ${PORT}...`)
  await startServer()

  console.log('--- 1. Redeeming invites (testing case-insensitivity) ---')
  const c1 = await redeem('Maya-Love')
  const c2 = await redeem('ethan-love')
  console.log('✓ Maya redeemed successfully with cookie')
  console.log('✓ Ethan redeemed successfully with cookie')

  console.log('--- 1.5. Concurrent Character Claim Race & Recovery ---')
  const wsA = new WebSocket(WS_URL, { headers: { Cookie: c1, Origin: BASE_URL } })
  const wsB = new WebSocket(WS_URL, { headers: { Cookie: c2, Origin: BASE_URL } })

  await Promise.all([
    new Promise(res => wsA.on('open', res)),
    new Promise(res => wsB.on('open', res)),
  ])

  const clientA = { id: 'Client 1', cookie: c1, ws: wsA, messages: [], closed: false, closeCode: null, closeReason: null }
  const clientB = { id: 'Client 2', cookie: c2, ws: wsB, messages: [], closed: false, closeCode: null, closeReason: null }

  for (const client of [clientA, clientB]) {
    client.ws.on('message', (data) => {
      try { client.messages.push(JSON.parse(data.toString())) } catch {}
    })
    client.ws.on('close', (code, reason) => {
      client.closed = true
      client.closeCode = code
      client.closeReason = reason ? reason.toString() : ''
    })
  }

  // Both clients concurrently send { t: 'join', avatarId: 'maya' }
  const joinPayload = JSON.stringify({
    t: 'join',
    proto: 2,
    name: 'Maya',
    avatarId: 'maya',
    model: 'woman.glb',
    room: 'lobby',
    p: [0, 1.7, 4],
    ry: 0
  })

  wsA.send(joinPayload)
  wsB.send(joinPayload)

  await sleep(350)

  // Exactly one client receives room_state. The other receives { t: 'error', msg: 'character-taken' } and WS close code 4005.
  const aState = clientA.messages.find(m => m.t === 'room_state')
  const bState = clientB.messages.find(m => m.t === 'room_state')
  const aError = clientA.messages.find(m => m.t === 'error' && m.msg === 'character-taken')
  const bError = clientB.messages.find(m => m.t === 'error' && m.msg === 'character-taken')

  let winner, rejected
  if (aState && !bState && bError) {
    winner = clientA
    rejected = clientB
  } else if (bState && !aState && aError) {
    winner = clientB
    rejected = clientA
  } else {
    throw new Error(`Race condition expectation failed: A(state=${Boolean(aState)}, err=${Boolean(aError)}), B(state=${Boolean(bState)}, err=${Boolean(bError)})`)
  }

  if (!rejected.closed) {
    await new Promise(r => rejected.ws.once('close', r))
  }

  if (rejected.closeCode !== 4005) {
    throw new Error(`Rejected client expected close code 4005, got ${rejected.closeCode} (${rejected.closeReason})`)
  }
  console.log(`✓ Concurrent race resolved: ${winner.id} claimed Maya; ${rejected.id} duplicate claim strictly rejected with code 4005 (character-taken)!`)

  // Check GET /api/occupancy: returns count: 1, claimedCharacters: ['maya'], availableCharacters: ['ethan']
  const occ1 = await fetchOccupancy()
  console.log('✓ GET /api/occupancy count:', occ1.count, 'claimed:', occ1.claimedCharacters, 'available:', occ1.availableCharacters)
  if (occ1.count !== 1 || !occ1.claimedCharacters.includes('maya') || !occ1.availableCharacters.includes('ethan')) {
    throw new Error(`Occupancy after single join mismatch: ${JSON.stringify(occ1)}`)
  }

  // The rejected client recovers, switches to avatarId: 'ethan', and joins successfully.
  console.log(`--- Recovering rejected client (${rejected.id}) as Ethan ---`)
  const recoveredWs = new WebSocket(WS_URL, { headers: { Cookie: rejected.cookie, Origin: BASE_URL } })
  const recoveredClient = { id: rejected.id, cookie: rejected.cookie, ws: recoveredWs, messages: [] }
  await new Promise(res => recoveredWs.on('open', res))
  recoveredWs.on('message', (data) => {
    try { recoveredClient.messages.push(JSON.parse(data.toString())) } catch {}
  })

  recoveredWs.send(JSON.stringify({
    t: 'join',
    proto: 2,
    name: 'Ethan',
    avatarId: 'ethan',
    model: 'man.glb',
    room: 'lobby',
    p: [0, 1.7, 4],
    ry: 0
  }))

  await sleep(350)
  const recoveredState = recoveredClient.messages.find(m => m.t === 'room_state')
  if (!recoveredState) {
    throw new Error('Recovered client failed to receive room_state')
  }
  console.log('✓ Recovered client joined successfully as Ethan! Peers in room_state:', recoveredState.peers.length)

  // Verify winning client receives peer_joined for Ethan
  const peerJoinedMsg = winner.messages.find(m => m.t === 'peer_joined')
  if (!peerJoinedMsg || peerJoinedMsg.name !== 'Ethan' || peerJoinedMsg.model !== 'man.glb') {
    throw new Error('Winner did not receive peer_joined for Ethan')
  }
  console.log('✓ Winner received peer_joined for:', peerJoinedMsg.name, 'model:', peerJoinedMsg.model)

  // Check GET /api/occupancy: returns count: 2, full: true
  const occ2 = await fetchOccupancy()
  console.log('✓ GET /api/occupancy count:', occ2.count, 'full:', occ2.full, 'claimed:', occ2.claimedCharacters)
  if (occ2.count !== 2 || !occ2.full || !occ2.claimedCharacters.includes('maya') || !occ2.claimedCharacters.includes('ethan')) {
    throw new Error(`Occupancy after recovery mismatch: ${JSON.stringify(occ2)}`)
  }

  const p1 = { ws: winner.ws, msg: winner.messages.find(m => m.t === 'room_state'), messages: winner.messages }
  const p2 = { ws: recoveredClient.ws, msg: recoveredState, messages: recoveredClient.messages }

  console.log('--- 4. Testing Movement Synchronization ---')
  p2.ws.send(JSON.stringify({
    t: 'state',
    p: [1.5, 1.7, -3.2],
    ry: 1.57,
    anim: 'walk',
    moving: true,
    mode: 'stand',
    room: 'lobby'
  }))

  await sleep(250)
  const stateMsg = p1.messages.find(m => m.t === 'state' && m.id === p2.msg.yourId)
  if (stateMsg && stateMsg.p[0] === 1.5 && stateMsg.anim === 'walk') {
    console.log('✓ Movement state sync verified!')
  } else {
    throw new Error('Movement state sync failed')
  }

  console.log('--- 5. Testing Gesture & Dance Synchronization (Wave, Dance, Cancel) ---')
  // Wave
  p2.ws.send(JSON.stringify({ t: 'emote', e: 1, start: true }))
  await sleep(250)
  let emoteMsg = p1.messages.find(m => m.t === 'emote' && m.id === p2.msg.yourId && m.e === 1 && m.start === true)
  if (!emoteMsg) throw new Error('Wave emote sync failed')
  console.log('✓ Ethan Wave (1) received by Maya!')

  // Stop Wave
  p2.ws.send(JSON.stringify({ t: 'emote', e: 1, start: false }))
  await sleep(250)
  let stopEmoteMsg = p1.messages.find(m => m.t === 'emote' && m.id === p2.msg.yourId && m.e === 1 && m.start === false)
  if (!stopEmoteMsg) throw new Error('Wave stop sync failed')
  console.log('✓ Ethan Wave cancel received by Maya!')

  // Energetic Dance (2)
  p2.ws.send(JSON.stringify({ t: 'emote', e: 2, start: true }))
  await sleep(250)
  let danceMsg = p1.messages.find(m => m.t === 'emote' && m.id === p2.msg.yourId && m.e === 2 && m.start === true)
  if (!danceMsg) throw new Error('Dance emote sync failed')
  console.log('✓ Ethan Energetic Dance (2) received by Maya!')

  // Stop Dance
  p2.ws.send(JSON.stringify({ t: 'emote', e: 2, start: false }))
  await sleep(250)
  let stopDanceMsg = p1.messages.find(m => m.t === 'emote' && m.id === p2.msg.yourId && m.e === 2 && m.start === false)
  if (!stopDanceMsg) throw new Error('Dance stop sync failed')
  console.log('✓ Ethan Dance stop received by Maya!')

  console.log('--- 6. Testing Contextual Seating Synchronization ---')
  // Ethan sits down on sofa_seat_1
  p2.ws.send(JSON.stringify({ t: 'sit', seat: 'sofa_seat_1' }))
  await sleep(250)
  const sitOkMsg = p2.messages.find(m => m.t === 'sit_ok' && m.seat === 'sofa_seat_1')
  const partnerSitMsg = p1.messages.find(m => m.t === 'sit' && m.id === p2.msg.yourId && m.seat === 'sofa_seat_1')
  if (!sitOkMsg || !partnerSitMsg) throw new Error('Sitting sync failed')
  console.log('✓ Ethan sit_ok confirmed and broadcasted to Maya!')

  // Ethan stands up
  p2.ws.send(JSON.stringify({ t: 'stand' }))
  await sleep(250)
  const partnerStandMsg = p1.messages.find(m => m.t === 'stand' && m.id === p2.msg.yourId)
  if (!partnerStandMsg) throw new Error('Standing sync failed')
  console.log('✓ Ethan stand broadcasted to Maya!')

  console.log('=======================================================')
  console.log('  ALL TWO-CLIENT MULTIPLAYER & INTERACTION TESTS PASSED!')
  console.log('=======================================================')

  p1.ws.close()
  p2.ws.close()
  if (serverProc) serverProc.kill()
  process.exit(0)
}

run().catch(err => {
  console.error('Test Error:', err)
  if (serverProc) serverProc.kill()
  process.exit(1)
})
