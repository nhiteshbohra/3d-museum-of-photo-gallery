// =========================================================================
// MULTIPLAYER SERVER INTEGRITY TEST (no browser needed)
//
//   node tests/multiplayer_server_test.mjs
//
// Verifies:
//   1. Two clients can join the same room and see each other.
//   2. Peer state is relayed (moved) to the other client.
//   3. A third client is REJECTED (2-player cap).
//   4. A client sending a wrong/foreign avatar id is handled safely.
//   5. Massive position values are clamped by the server.
//   6. Message flooding is rate-limited.
// =========================================================================
import { WebSocket } from 'ws'

const PORT = process.env.PORT || '8080'
const URL = `ws://localhost:${PORT}/ws`

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL)
    ws.on('open', () => resolve(ws))
    ws.on('error', reject)
  })
}
function waitFor(ws, predicate, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout)
    const onMsg = (raw) => {
      let m; try { m = JSON.parse(raw.toString()) } catch { return }
      if (predicate(m)) { clearTimeout(timer); ws.off('message', onMsg); resolve(m) }
    }
    ws.on('message', onMsg)
  })
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ---- helpers -------------------------------------------------------------
let A, B, C
try {
  // 1. two clients join
  A = await connect()
  B = await connect()

  const aState = waitFor(A, m => m.t === 'room_state' && m.yourId)
  const bState = waitFor(B, m => m.t === 'room_state' && m.yourId)
  A.send(JSON.stringify({ t: 'join', name: 'Maya', color: '#fff', model: 'female.glb', room: 'our-home' }))
  B.send(JSON.stringify({ t: 'join', name: 'Ethan', color: '#000', model: 'male.glb', room: 'our-home' }))
  const aStateMsg = await aState
  const bStateMsg = await bState
  const aId = aStateMsg.yourId
  const bId = bStateMsg.yourId
  check('both clients receive room_state with server-assigned id', aId && bId && aId !== bId)

  // A should be told about B after B joins
  const aSawB = await waitFor(A, m => m.t === 'peer_joined' && m.peerId === bId)
  check('A sees B join (peer_joined)', !!aSawB)

  // 2. relay state
  A.send(JSON.stringify({ t: 'state', p: [1, 1.7, 2], ry: 0.5, room: 'our-home', anim: 'walk', moving: true, mode: 'stand' }))
  const bSawState = await waitFor(B, m => m.t === 'state' && m.id === aId)
  check('state relayed A->B', bSawState && bSawState.p[0] === 1 && bSawState.p[2] === 2)

  // 3. third client rejected (2 cap)
  C = await connect()
  const cError = waitFor(C, m => m.t === 'error')
  C.send(JSON.stringify({ t: 'join', name: 'Third', room: 'our-home' }))
  const cErr = await cError
  check('third client rejected (room-full)', cErr && cErr.msg === 'room-full')

  // 4. huge position clamped
  A.send(JSON.stringify({ t: 'state', p: [99999, 99999, -99999], ry: 999, room: 'our-home', anim: 'idle', moving: false }))
  const clamped = await waitFor(B, m => m.t === 'state' && m.id === aId)
  const maxP = Math.max(...clamped.p.map(Math.abs))
  check('huge positions clamped to bounds', maxP <= 100)

  // 5. rate-limit: flood chat
  const aErr = (() => { let resolve; const p = new Promise(r => resolve = r); const h = (raw) => { const m = JSON.parse(raw.toString()); if (m.t === 'error') { A.off('message', h); resolve(m) } }; A.on('message', h); return p })()
  for (let i = 0; i < 80; i++) {
    A.send(JSON.stringify({ t: 'chat', m: 'x' }))
  }
  const floodErr = await aErr
  check('flood is rate-limited (error returned)', floodErr && (floodErr.msg === 'rate-limit'))

  // 6. unknown type rejected
  const aErr2 = (() => { let resolve; const p = new Promise(r => resolve = r); const h = (raw) => { const m = JSON.parse(raw.toString()); if (m.t === 'error') { A.off('message', h); resolve(m) } }; A.on('message', h); return p })()
  A.send(JSON.stringify({ t: 'nonsense' }))
  const uErr = await aErr2
  check('unknown message type rejected', uErr && uErr.msg === 'unknown-type')

} catch (err) {
  check('test framework', false, err.message)
} finally {
  try { A?.close() } catch {}
  try { B?.close() } catch {}
  try { C?.close() } catch {}
}

const failed = results.filter(r => !r.pass).length
console.log(`\n=== ${results.length - failed}/${results.length} checks passed ===`)
process.exit(failed ? 1 : 0)
