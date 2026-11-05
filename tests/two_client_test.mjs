import WebSocket from 'ws'
import http from 'http'

function redeem(code) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ code })
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8995,
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
    const ws = new WebSocket('ws://127.0.0.1:8995/ws', {
      headers: { Cookie: cookie }
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
      const msg = JSON.parse(data.toString())
      messages.push(msg)
      if (msg.t === 'room_state') {
        resolve({ ws, msg, messages })
      }
    })
    ws.on('error', reject)
  })
}

async function run() {
  console.log('--- 1. Redeeming invites ---')
  const c1 = await redeem('maya-love')
  const c2 = await redeem('ethan-love')
  console.log('Maya cookie:', c1)
  console.log('Ethan cookie:', c2)

  console.log('--- 2. Connecting Maya ---')
  const p1 = await connect(c1, 'Maya', 'woman.glb')
  console.log('Maya joined! Peers in room_state:', p1.msg.peers.length)

  console.log('--- 3. Connecting Ethan ---')
  const p2 = await connect(c2, 'Ethan', 'man.glb')
  console.log('Ethan joined! Peers in room_state:', p2.msg.peers.length)

  // Wait for Maya to receive peer_joined
  await new Promise(r => setTimeout(r, 200))
  const peerJoinedMsg = p1.messages.find(m => m.t === 'peer_joined')
  console.log('Maya received peer_joined for:', peerJoinedMsg?.name, 'model:', peerJoinedMsg?.model)
  
  if (peerJoinedMsg?.name === 'Ethan') {
    console.log('SUCCESS: Multiplayer join & presence sync verified!')
  } else {
    console.error('FAILED: peer_joined missing')
    process.exit(1)
  }

  // Test movement sync: Ethan sends state
  p2.ws.send(JSON.stringify({
    t: 'state',
    p: [1.5, 1.7, -3.2],
    ry: 1.57,
    anim: 'walk',
    moving: true,
    mode: 'stand',
    room: 'lobby'
  }))

  await new Promise(r => setTimeout(r, 200))
  const stateMsg = p1.messages.find(m => m.t === 'state' && m.id === p2.msg.yourId)
  console.log('Maya received Ethan state update:', stateMsg)
  if (stateMsg && stateMsg.p[0] === 1.5 && stateMsg.anim === 'walk') {
    console.log('SUCCESS: Movement state synchronization verified!')
  }

  // Test emote sync: Ethan waves
  p2.ws.send(JSON.stringify({
    t: 'emote',
    idx: 1,
    active: true
  }))

  await new Promise(r => setTimeout(r, 200))
  const emoteMsg = p1.messages.find(m => m.t === 'emote' && m.id === p2.msg.yourId)
  console.log('Maya received Ethan emote update:', emoteMsg)
  if (emoteMsg && emoteMsg.idx === 1 && emoteMsg.active === true) {
    console.log('SUCCESS: Emote synchronization verified!')
  }

  p1.ws.close()
  p2.ws.close()
  process.exit(0)
}

run().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})

