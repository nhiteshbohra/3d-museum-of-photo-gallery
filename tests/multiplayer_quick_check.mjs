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

// A should be told when B joins (A is already in the room).
const aSeeB = until(A, m => m.t === 'peer_joined')

const aB = until(A, m => m.t === 'room_state')
const bB = until(B, m => m.t === 'room_state')
A.send(JSON.stringify({ t: 'join', name: 'Maya', room: 'our-home' }))
B.send(JSON.stringify({ t: 'join', name: 'Ethan', room: 'our-home' }))
const a = await aB
const b = await bB
console.log('distinct-ids', a.yourId !== b.yourId)
console.log('A-sees-B (peer_joined)', !!(await aSeeB))
// B learns about A through room_state.peers (B joined after A).
console.log('B-sees-A (room_state.peers)', !!b.peers.find(p => p.peerId === a.yourId))

const saw = until(B, m => m.t === 'state' && m.id === a.yourId)
A.send(JSON.stringify({ t: 'state', p: [2, 1.7, 3], ry: 1, room: 'our-home', anim: 'walk', moving: true, mode: 'stand' }))
const st = await saw
console.log('state-relayed', st && st.p[0] === 2 && st.p[2] === 3)

const C = await mk()
const cErr = until(C, m => m.t === 'error')
C.send(JSON.stringify({ t: 'join', name: 'Third', room: 'our-home' }))
const ce = await cErr
console.log('third-rejected', ce && ce.msg === 'room-full')

A.close(); B.close(); C.close()
process.exit(0)
