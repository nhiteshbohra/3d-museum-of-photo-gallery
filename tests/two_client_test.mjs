import WebSocket from 'ws'
import http from 'http'
import { spawn } from 'child_process'

const PORT = 8996
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

function connect(cookie, name, model) {
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

  console.log('--- 2. Connecting Maya ---')
  const p1 = await connect(c1, 'Maya', 'woman.glb')
  console.log('✓ Maya joined! Peers in room_state:', p1.msg.peers.length)

  console.log('--- 3. Connecting Ethan ---')
  const p2 = await connect(c2, 'Ethan', 'man.glb')
  console.log('✓ Ethan joined! Peers in room_state:', p2.msg.peers.length)

  await sleep(250)
  const peerJoinedMsg = p1.messages.find(m => m.t === 'peer_joined')
  console.log('✓ Maya received peer_joined for:', peerJoinedMsg?.name, 'model:', peerJoinedMsg?.model)

  if (peerJoinedMsg?.name !== 'Ethan' || peerJoinedMsg?.model !== 'man.glb') {
    throw new Error('peer_joined missing or mismatched model')
  }

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
  serverProc.kill()
  process.exit(0)
}

run().catch(err => {
  console.error('Test Error:', err)
  if (serverProc) serverProc.kill()
  process.exit(1)
})
