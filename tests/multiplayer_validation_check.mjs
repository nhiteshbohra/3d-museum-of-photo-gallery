import { WebSocket } from 'ws'

const U = 'ws://localhost:8090/ws'
const mk = () => new Promise((res, rej) => {
  const w = new WebSocket(U)
  w.on('open', () => res(w))
  w.on('error', rej)
})
const until = (w, cond, t = 4000) => new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('timeout')), t)
  const h = (d) => {
    let m; try { m = JSON.parse(d) } catch { return }
    if (cond(m)) { clearTimeout(to); w.off('message', h); res(m) }
  }
  w.on('message', h)
})

const A = await mk()
const B = await mk()

const aB = until(A, m => m.t === 'room_state')
const bB = until(B, m => m.t === 'room_state')
A.send(JSON.stringify({ t: 'join', name: 'Maya', room: 'our-home' }))
B.send(JSON.stringify({ t: 'join', name: 'Ethan', room: 'our-home' }))
const a = await aB
const b = await bB

// Clamping: huge position should be clamped to bounds before relay.
const saw = until(B, m => m.t === 'state' && m.id === a.yourId)
A.send(JSON.stringify({ t: 'state', p: [99999, 99999, -99999], ry: 999, room: 'our-home', anim: 'idle', moving: false }))
const st = await saw
const maxP = Math.max(...st.p.map(Math.abs))
console.log('clamped-to-bounds', maxP <= 100, maxP)

// Unknown message type rejected.
const uErr = until(A, m => m.t === 'error')
A.send(JSON.stringify({ t: 'nonsense' }))
const ue = await uErr
console.log('unknown-type-rejected', ue.msg === 'unknown-type')

// Rate-limit: flood messages -> server returns error, and does not relay a flood.
const rErr = until(A, m => m.t === 'error')
for (let i = 0; i < 80; i++) {
  A.send(JSON.stringify({ t: 'chat', m: 'x' }))
}
const re = await rErr
console.log('flood-rate-limited', re.msg === 'rate-limit')

// Foreign/state tampering: server ignores client-supplied id in 'state'
// (it always uses the connection's own peerId), so a spoofed id is not used.
const spoof = until(B, m => m.t === 'state' && m.id === 'spoofed-id')
A.send(JSON.stringify({ t: 'state', id: 'spoofed-id', p: [0, 0, 0], room: 'our-home' }))
const spoofed = await Promise.race([spoof.then(() => true), new Promise(r => setTimeout(() => r(false), 1200))])
console.log('spoofed-id-not-relayed', spoofed === false)

A.close(); B.close()
process.exit(0)
