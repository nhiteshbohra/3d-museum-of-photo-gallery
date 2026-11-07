// =========================================================================
// WS CLIENT — thin wrapper over native WebSocket for the museum's relay.
// Sends compact JSON messages and emits typed events to listeners.
// Protocol v2: terminal status handling, non-stale queuing, passcode support.
// =========================================================================

const PROTOCOL_VERSION = 2

export function sameOriginWs() {
  if (typeof window === 'undefined') return 'ws://127.0.0.1:8080/ws'
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws`
}

export const WS_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) || sameOriginWs()

const NET = {
  host: null, // set at connect time
  ws: null,
  peerId: null,
  connected: false,
  joined: false, // true only after server sends room_state (STATE-02)
  terminalError: false, // true on room-full, bad-code, update-required
  reconnectTimer: 0,
  reconnectAttempts: 0,
  listeners: new Map(), // event -> Set<fn>
  pendingChat: [], // only chat is queued while disconnected
}

export function onNet(event, fn) {
  if (!NET.listeners.has(event)) NET.listeners.set(event, new Set())
  NET.listeners.get(event).add(fn)
  return () => NET.listeners.get(event)?.delete(fn)
}

export function emitNet(event, payload) {
  const set = NET.listeners.get(event)
  if (set) for (const fn of set) {
    try { fn(payload) } catch (err) { console.warn('[net] listener error', err) }
  }
}

export function netConnected() {
  return NET.connected
}

export function getPeerId() {
  return NET.peerId
}

/**
 * Connect to the museum WebSocket relay.
 * @param {string} url  e.g. (window.location.origin.replace('http','ws')) + '/ws'
 */
export function connectNet(url) {
  if (NET.terminalError) return null
  if (NET.ws && NET.connected) return NET.ws

  const finalUrl = url || WS_URL
  NET.host = finalUrl

  let ws
  try {
    ws = new WebSocket(finalUrl)
  } catch (err) {
    console.error('[net] WebSocket constructor threw:', err)
    emitNet('status', { kind: 'error', message: 'Could not open WebSocket.' })
    return null
  }
  NET.ws = ws

  ws.onopen = () => {
    NET.connected = true
    NET.joined = false
    NET.terminalError = false
    NET.reconnectAttempts = 0
    emitNet('status', { kind: 'open' })
  }

  ws.onmessage = (ev) => {
    let data
    try { data = JSON.parse(ev.data) } catch { return }

    // Intercept terminal errors from server
    if (data && data.t === 'error') {
      if (data.msg === 'room-full' || data.msg === 'bad-code' || data.msg === 'update-required' || data.msg === 'character-taken') {
        NET.terminalError = true
        emitNet('status', { kind: 'terminal-error', code: data.msg })
      }
    }

    // Adopt server-assigned identity and mark joined (STATE-02)
    if (data && data.t === 'room_state' && data.yourId) {
      NET.peerId = data.yourId
      NET.joined = true

      // Flush only chat messages queued during momentary drop after explicit join acknowledgment
      const now = Date.now()
      const validChat = NET.pendingChat.filter(item => now - item.ts < 10000).slice(-5)
      NET.pendingChat.length = 0
      for (const item of validChat) {
        try { ws.send(item.raw) } catch {}
      }
    }

    emitNet('message', data)
  }

  ws.onclose = (ev) => {
    if (NET.ws !== ws) return
    const wasConnected = NET.connected
    NET.connected = false
    NET.joined = false
    NET.ws = null
    emitNet('status', { kind: wasConnected ? 'close' : 'closed', code: ev.code, reason: ev.reason })

    // If server sent terminal code (room-full, bad-code, update-required, character-taken), do not retry
    if (ev.code === 4001 || ev.code === 4002 || ev.code === 4003 || ev.code === 4005 || NET.terminalError) {
      return
    }

    scheduleReconnect()
  }

  ws.onerror = (ev) => {
    if (NET.ws !== ws) return
    console.error('[net] ws.onerror fired:', ev)
    emitNet('status', { kind: 'error', event: ev })
  }

  return ws
}

export function disconnectNet() {
  if (NET.reconnectTimer) {
    clearTimeout(NET.reconnectTimer)
    NET.reconnectTimer = 0
  }
  if (NET.ws) {
    const oldWs = NET.ws
    NET.ws = null
    oldWs.onopen = null
    oldWs.onmessage = null
    oldWs.onclose = null
    oldWs.onerror = null
    try { oldWs.close(1000, 'client-disconnect') } catch {}
  }
  NET.connected = false
  NET.joined = false
  NET.terminalError = false
  NET.reconnectAttempts = 0
  NET.pendingChat.length = 0
}

function defaultWsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws`
}

function scheduleReconnect() {
  if (NET.terminalError) return
  if (NET.reconnectTimer) return
  const delay = Math.min(1000 * 2 ** NET.reconnectAttempts, 8000)
  NET.reconnectAttempts += 1
  NET.reconnectTimer = setTimeout(() => {
    NET.reconnectTimer = 0
    if (!NET.connected && !NET.terminalError) connectNet(NET.host)
  }, delay)
}

/**
 * Send a message. Ephemeral state/ping messages are dropped if offline (no stale lag on reconnect).
 * Only chat is briefly queued. Messages other than join wait for join acknowledgment (STATE-02).
 * @param {object} msg
 */
export function sendNet(msg) {
  const raw = JSON.stringify(msg)
  if (NET.connected && NET.ws && NET.ws.readyState === WebSocket.OPEN && (NET.joined || msg.t === 'join')) {
    NET.ws.send(raw)
  } else if (msg.t === 'chat') {
    NET.pendingChat.push({ raw, ts: Date.now() })
    if (NET.pendingChat.length > 5) NET.pendingChat.shift()
  }
}

// ---- high-level helpers --------------------------------------------------

export function netJoin({ peerId, avatarId, name, color, model, room, appearance, code, sessionToken }) {
  sendNet({
    t: 'join',
    proto: PROTOCOL_VERSION,
    id: peerId,
    avatarId: avatarId || (model === 'woman.glb' ? 'maya' : 'ethan'),
    name,
    color,
    model,
    room: room || 'lobby',
    location: room || 'lobby',
    appearance,
    code: code || '',
    sessionToken: sessionToken || ''
  })
}

export function netLeave() {
  if (NET.connected) sendNet({ t: 'leave' })
}

export function netState(state) {
  sendNet({ t: 'state', ...state })
}

export function netEmote(emoteIdx, startFlag = true) {
  sendNet({ t: 'emote', e: emoteIdx, start: startFlag })
}

export function netSit(seatId) {
  sendNet({ t: 'sit', seat: seatId })
}

export function netStand() {
  sendNet({ t: 'stand' })
}

export function netChat(text) {
  sendNet({ t: 'chat', m: text })
}

export function netPing(seq) {
  sendNet({ t: 'ping', seq })
}
