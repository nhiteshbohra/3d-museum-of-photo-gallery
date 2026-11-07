import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { WebSocket } from 'ws'

const PORT = 8997
const BASE_URL = `http://127.0.0.1:${PORT}`
const WS_URL = `ws://127.0.0.1:${PORT}/ws`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function nextMessage(ws, predicate) {
  return new Promise((resolve, reject) => {
    const onMsg = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (!predicate || predicate(data)) {
          cleanup()
          resolve(data)
        }
      } catch {}
    }
    const onClose = (code, reason) => {
      cleanup()
      resolve({ t: 'closed', code, reason: reason.toString() })
    }
    const onError = (err) => {
      cleanup()
      reject(err)
    }
    function cleanup() {
      ws.removeEventListener('message', onMsg)
      ws.removeEventListener('close', onClose)
      ws.removeEventListener('error', onError)
    }
    ws.addEventListener('message', onMsg)
    ws.addEventListener('close', onClose)
    ws.addEventListener('error', onError)
  })
}

test('Strict 2-player capacity and Maya/Ethan character exclusivity enforcement', async () => {
  const env = { ...process.env, PORT: String(PORT), MUSEUM_PASSCODE: 'testpass' }
  const serverProc = spawn('node', ['server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  let serverStdout = ''
  serverProc.stdout.on('data', d => { serverStdout += d.toString() })

  try {
    await sleep(700)

    // 1. Initial occupancy check
    const res1 = await fetch(`${BASE_URL}/api/occupancy`)
    assert.strictEqual(res1.status, 200)
    const occ1 = await res1.json()
    assert.strictEqual(occ1.ok, true)
    assert.strictEqual(occ1.count, 0)
    assert.strictEqual(occ1.max, 2)
    assert.strictEqual(occ1.full, false)
    assert.deepStrictEqual(occ1.claimedCharacters, [])
    assert.deepStrictEqual(occ1.availableCharacters, ['maya', 'ethan'])

    // 2. Player 1 connects and claims Maya
    const ws1 = new WebSocket(WS_URL)
    await new Promise(res => ws1.on('open', res))
    ws1.send(JSON.stringify({
      t: 'join',
      proto: 2,
      code: 'testpass',
      name: 'Maya',
      avatarId: 'maya',
      model: 'woman.glb'
    }))
    const msg1 = await nextMessage(ws1, m => m.t === 'room_state')
    assert.strictEqual(msg1.t, 'room_state')
    assert.strictEqual(msg1.peerCount, 1)

    // Occupancy check after Player 1 joins
    const res2 = await fetch(`${BASE_URL}/api/occupancy`)
    const occ2 = await res2.json()
    assert.strictEqual(occ2.count, 1)
    assert.strictEqual(occ2.full, false)
    assert.deepStrictEqual(occ2.claimedCharacters, ['maya'])
    assert.deepStrictEqual(occ2.availableCharacters, ['ethan'])

    // 3. Player 2 attempts to join with Maya (DUPLICATE) -> Must be rejected with character-taken!
    const ws2Dup = new WebSocket(WS_URL)
    await new Promise(res => ws2Dup.on('open', res))
    ws2Dup.send(JSON.stringify({
      t: 'join',
      proto: 2,
      code: 'testpass',
      name: 'Maya Imposter',
      avatarId: 'maya',
      model: 'woman.glb'
    }))
    const msgDup = await nextMessage(ws2Dup)
    assert.strictEqual(msgDup.msg, 'character-taken')
    ws2Dup.close()
    await sleep(100)

    // 4. Player 2 joins with Ethan (ALLOWED) -> Succeeds!
    const ws2 = new WebSocket(WS_URL)
    await new Promise(res => ws2.on('open', res))
    ws2.send(JSON.stringify({
      t: 'join',
      proto: 2,
      code: 'testpass',
      name: 'Ethan',
      avatarId: 'ethan',
      model: 'man.glb'
    }))
    const msg2 = await nextMessage(ws2, m => m.t === 'room_state')
    assert.strictEqual(msg2.t, 'room_state')
    assert.strictEqual(msg2.peerCount, 2)

    // Occupancy check after Player 2 joins: Full museum!
    const res3 = await fetch(`${BASE_URL}/api/occupancy`)
    const occ3 = await res3.json()
    assert.strictEqual(occ3.count, 2)
    assert.strictEqual(occ3.full, true)
    assert.ok(occ3.claimedCharacters.includes('maya'))
    assert.ok(occ3.claimedCharacters.includes('ethan'))
    assert.deepStrictEqual(occ3.availableCharacters, [])

    // 5. Player 3 attempts to join when full -> Rejected with room-full!
    const ws3 = new WebSocket(WS_URL)
    await new Promise(res => ws3.on('open', res))
    ws3.send(JSON.stringify({
      t: 'join',
      proto: 2,
      code: 'testpass',
      name: 'Third Visitor',
      avatarId: 'maya',
      model: 'woman.glb'
    }))
    const msg3 = await nextMessage(ws3)
    assert.strictEqual(msg3.msg, 'room-full')
    ws3.close()
    await sleep(100)

    // 6. Player 1 leaves the sanctuary
    ws1.send(JSON.stringify({ t: 'leave' }))
    ws1.close()
    await sleep(150)

    // Occupancy check after Player 1 left: 1 player remaining, Maya freed!
    const res4 = await fetch(`${BASE_URL}/api/occupancy`)
    const occ4 = await res4.json()
    assert.strictEqual(occ4.count, 1)
    assert.strictEqual(occ4.full, false)
    assert.deepStrictEqual(occ4.claimedCharacters, ['ethan'])
    assert.deepStrictEqual(occ4.availableCharacters, ['maya'])

    // 7. A new visitor joins claiming the freed Maya -> Succeeds!
    const wsNew = new WebSocket(WS_URL)
    await new Promise(res => wsNew.on('open', res))
    wsNew.send(JSON.stringify({
      t: 'join',
      proto: 2,
      code: 'testpass',
      name: 'Maya',
      avatarId: 'maya',
      model: 'woman.glb'
    }))
    const msgNew = await nextMessage(wsNew, m => m.t === 'room_state')
    assert.strictEqual(msgNew.t, 'room_state')
    assert.strictEqual(msgNew.peerCount, 2)

    wsNew.close()
    ws2.close()
  } finally {
    serverProc.kill('SIGTERM')
  }
})

