// =========================================================================
// MULTIPLAYER ORCHESTRATOR — ties networking, avatar world, seats and chat.
// Protocol v2: partner panel on room_state, selective seat release, unified emotes,
// self-chat bubble projection, and clean connection/listener lifecycle.
// =========================================================================
import * as THREE from 'three'
import characters from '../data/characters.json'
import {
  connectNet, disconnectNet, onNet, sendNet, netJoin, netLeave, netState,
  netEmote, netSit, netStand, netChat, netPing, netConnected, getPeerId, WS_URL,
} from '../net/wsClient.js'
import { AvatarWorld, RemoteAvatar } from './avatarWorld.js'
import { buildSeatRegistry, findNearestSeat } from './seatRegistry.js'
import {
  showChatBubble, positionChatBubble, disposeChatBubble, hideChatBubble,
} from './chat.js'
import { EMOTES, getEmoteByKey, getEmoteById } from './emotes.js'

const STATE_INTERVAL_MS = 50 // ~20 Hz

export function initMultiplayer({
  engineApi,
  selectedAvatar,
  getRoomKey,
  goToRoom,
}) {
  // selectedAvatar normalizer
  const resolveAvatar = typeof selectedAvatar === 'function'
    ? selectedAvatar
    : (selectedAvatar && typeof selectedAvatar.value === 'function')
      ? () => selectedAvatar.value
      : () => selectedAvatar || null

  const wsUrl = WS_URL

  const state = {
    world: null,
    connected: false,
    partner: null,
    seats: new Map(),
    localEmitter: null,
    localSeat: null,
    pendingSeatId: null,
    lastSend: 0,
    lastPing: 0,
    latencyMs: null,
    emoteActive: null,
    hintVisible: false,
    chatOpen: false,
    started: false,
    localAvatar: null,
    unsubNet: [],
    pingInterval: null,
  }

  async function prepareAvatar(avatar) {
    state.localAvatar?.dispose()
    const local = new RemoteAvatar({
      ...avatar,
      peerId: 'local',
      scene: engineApi.scene,
      camera: engineApi.getActiveCamera()
    })
    local.characterId = avatar.id
    state.localAvatar = local
    await local.modelPromise
    return local
  }

  function ensureWorld() {
    if (state.world) return state.world
    state.world = new AvatarWorld({
      scene: engineApi.scene,
      camera: engineApi.camera,
      rooms: () => getRoomKey(),
    })
    return state.world
  }

  function currentRoomKey() {
    try { return getRoomKey() } catch { return 'lobby' }
  }

  // ---- UI elements ------------------------------------------------------
  const ui = {}
  function buildUI() {
    ui.conn = document.getElementById('net-connection')
    ui.partnerPanel = document.getElementById('partner-panel')
    ui.partnerName = document.getElementById('partner-name')
    ui.partnerRoom = document.getElementById('partner-room')
    ui.partnerGo = document.getElementById('partner-go')
    ui.latency = document.getElementById('net-latency')
    ui.hint = document.getElementById('emote-hint')
    ui.chatInput = document.getElementById('chat-input')

    if (!ui.conn) {
      const el = document.createElement('div')
      el.id = 'net-connection'
      el.className = 'net-connection'
      el.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:960;padding:4px 12px;' +
        'border-radius:20px;background:rgba(20,14,8,.7);color:#e9dcc2;font:600 12px system-ui;' +
        'box-shadow:0 2px 10px rgba(0,0,0,.4);'
      document.body.appendChild(el)
      ui.conn = el
    }
    if (!ui.latency) {
      const el = document.createElement('span')
      el.id = 'net-latency'
      el.style.marginLeft = '8px'
      ui.conn.appendChild(el)
      ui.latency = el
    }
    if (!ui.partnerPanel) {
      const el = document.createElement('div')
      el.id = 'partner-panel'
      el.style.cssText = 'position:fixed;left:14px;top:64px;z-index:960;display:none;' +
        'padding:10px 14px;border-radius:12px;background:rgba(20,14,8,.85);' +
        'color:#f0e4ca;font:500 13px system-ui;box-shadow:0 4px 16px rgba(0,0,0,.45);'
      el.innerHTML =
        '<div id="partner-name" style="font-weight:700"></div>' +
        '<div id="partner-room" style="opacity:.85;margin-top:2px"></div>' +
        '<button id="partner-go" style="margin-top:8px;padding:4px 12px;border:none;' +
        'border-radius:8px;background:#cf9d57;color:#1a1206;font:700 12px system-ui;' +
        'cursor:pointer">Go there</button>'
      document.body.appendChild(el)
      ui.partnerPanel = el
      ui.partnerName = el.querySelector('#partner-name')
      ui.partnerRoom = el.querySelector('#partner-room')
      ui.partnerGo = el.querySelector('#partner-go')
      ui.partnerGo.addEventListener('click', () => {
        if (state.partner && typeof goToRoom === 'function') goToRoom(state.partner.room)
      })
    }
    if (!ui.hint) {
      const el = document.createElement('div')
      el.id = 'emote-hint'
      el.style.cssText = 'position:fixed;left:50%;bottom:22%;transform:translateX(-50%);z-index:960;' +
        'display:none;padding:6px 16px;border-radius:20px;background:rgba(20,14,8,.8);' +
        'color:#f0e4ca;font:600 13px system-ui;box-shadow:0 4px 16px rgba(0,0,0,.4);'
      el.textContent = 'Emotes: 1: Wave · 2: Dance · 3: Nod'
      document.body.appendChild(el)
      ui.hint = el
    }
    if (!ui.chatInput) {
      const el = document.createElement('input')
      el.id = 'chat-input'
      el.type = 'text'
      el.maxLength = 120
      el.placeholder = 'Chat… (Enter to send)'
      el.style.cssText = 'position:fixed;left:50%;bottom:18%;transform:translateX(-50%);z-index:960;' +
        'display:none;width:min(320px,70vw);padding:8px 14px;border:none;border-radius:10px;' +
        'background:rgba(20,14,8,.92);color:#f0e4ca;font:500 14px system-ui;' +
        'box-shadow:0 4px 16px rgba(0,0,0,.5);outline:none;'
      document.body.appendChild(el)
      ui.chatInput = el
    }
  }

  // ---- network handlers -------------------------------------------------
  function handleMessage(msg) {
    if (!msg || !msg.t) return
    switch (msg.t) {
      case 'room_state': {
        state.connected = true
        setConnection('connected')
        const myId = getPeerId()
        let partnerFound = null

        // Adopt existing peers and identify partner (MP-01)
        for (const p of (msg.peers || [])) {
          if (p.peerId !== myId) {
            ensureWorld().upsertRemote(p, resolveAvatar()?.model)
            if (!partnerFound) partnerFound = p
          }
        }

        if (partnerFound) {
          setPartner(partnerFound)
        } else {
          state.partner = null
          updatePartnerPanel()
        }

        // Reconcile server seat snapshot (SEAT-03)
        if (Array.isArray(msg.seats)) {
          for (const s of msg.seats) {
            const seat = state.seats.get(s.seatId)
            if (seat) seat.occupiedBy = s.occupiedBy
          }
        }
        break
      }
      case 'peer_joined': {
        if (msg.peerId !== getPeerId()) {
          // Keep whole peer profile including appearance (MP-03)
          const peer = {
            peerId: msg.peerId,
            name: msg.name,
            color: msg.color,
            model: msg.model,
            appearance: msg.appearance,
            location: msg.location || msg.room,
            room: msg.location || msg.room,
            p: msg.p,
            ry: msg.ry,
            anim: msg.anim,
            mode: msg.mode,
          }
          ensureWorld().upsertRemote(peer, resolveAvatar()?.model)
          setPartner(peer)
        }
        break
      }
      case 'peer_left': {
        if (msg.peerId !== getPeerId()) {
          ensureWorld().removeRemote(msg.peerId)
          state.partner = null
          updatePartnerPanel()
          // Free ONLY the leaver's seat, never stand local player up (MP-02)
          for (const seat of state.seats.values()) {
            if (seat.occupiedBy === msg.peerId) seat.occupiedBy = null
          }
        }
        break
      }
      case 'state': {
        if (msg.id === getPeerId()) break
        ensureWorld().applyState(msg)
        if (state.partner && state.partner.peerId === msg.id) {
          state.partner.room = msg.room || msg.location
          updatePartnerPanel()
        }
        break
      }
      case 'peer_status': {
        if (msg.peerId === getPeerId()) break
        if (msg.status === 'reconnecting') {
          if (ui.partnerRoom) {
            ui.partnerRoom.textContent = `Reconnecting… (${msg.graceSeconds || 30}s)`
          }
          if (ui.partnerPanel) {
            ui.partnerPanel.style.opacity = '0.7'
          }
        } else if (msg.status === 'reconnected') {
          if (ui.partnerPanel) {
            ui.partnerPanel.style.opacity = '1'
          }
          updatePartnerPanel()
        }
        break
      }
      case 'emote': {
        if (msg.id === getPeerId()) break
        ensureWorld().applyEmote(msg)
        break
      }
      case 'sit_ok': {
        // Server granted local seat request (SEAT-03)
        if (state.pendingSeatId) {
          const seat = state.seats.get(state.pendingSeatId)
          if (seat) {
            seat.occupiedBy = getPeerId()
            state.localSeat = seat
            engineApi.setSeated ? engineApi.setSeated(seat) : engineApi.setCameraPosition(seat.x, seat.y + 1.0, seat.z, seat.yaw, 0)
          }
          state.pendingSeatId = null
        }
        break
      }
      case 'sit_denied': {
        // Server denied seat request (occupied by peer)
        state.pendingSeatId = null
        console.warn('[multiplayer] Seat occupied:', msg.seat)
        break
      }
      case 'sit': {
        if (msg.id === getPeerId()) break
        const seat = state.seats.get(msg.seat)
        if (seat) seat.occupiedBy = msg.id
        break
      }
      case 'stand_ok': {
        state.localSeat = null
        state.pendingSeatId = null
        engineApi.setSeated?.(null)
        break
      }
      case 'stand': {
        if (msg.id === getPeerId()) {
          state.localSeat = null
          state.pendingSeatId = null
          engineApi.setSeated?.(null)
          break
        }
        for (const seat of state.seats.values()) {
          if (seat.occupiedBy === msg.id) seat.occupiedBy = null
        }
        break
      }
      case 'chat': {
        if (msg.id === getPeerId()) break
        const av = state.world?.remote.get(msg.id)
        const pos = avatarHeadScreenPosition(av)
        showChatBubble(msg.id, msg.m, pos)
        break
      }
      case 'error': {
        console.warn('[net] server error:', msg.msg)
        break
      }
      case 'pong': {
        if (state.lastPing) {
          state.latencyMs = Math.max(0, performance.now() - state.lastPing)
          if (ui.latency) ui.latency.textContent = `~${Math.round(state.latencyMs)}ms`
        }
        break
      }
    }
  }

  function avatarHeadScreenPosition(av) {
    if (!av) return null
    const v = new THREE.Vector3(0, 1.9, 0)
    if (av.group) {
      av.group.localToWorld(v)
      v.project(engineApi.getActiveCamera())
    }
    if (v.z >= 1) return null
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight,
    }
  }

  function localHeadScreenPosition() {
    const v = new THREE.Vector3(0, 1.7, 0)
    if (state.localAvatar?.group) {
      state.localAvatar.group.localToWorld(v)
      v.project(engineApi.getActiveCamera())
      if (v.z < 1) {
        return {
          x: (v.x * 0.5 + 0.5) * window.innerWidth,
          y: (-v.y * 0.5 + 0.5) * window.innerHeight,
        }
      }
    }
    // Fallback to active camera forward
    const cam = engineApi.getActiveCamera()
    v.copy(cam.position)
    v.project(cam)
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight,
    }
  }

  function setPartner(peer) {
    state.partner = peer
    updatePartnerPanel()
  }

  function updatePartnerPanel() {
    if (!ui.partnerPanel) return
    if (state.partner) {
      ui.partnerPanel.style.display = 'block'
      ui.partnerName.textContent = state.partner.name || 'Partner'
      ui.partnerRoom.textContent = `Partner is in: ${prettyRoom(state.partner.location || state.partner.room)}`
    } else {
      ui.partnerPanel.style.display = 'none'
    }
  }

  function prettyRoom(key) {
    if (!key || key === 'lobby') return 'Grand Lobby'
    return key.replace(/^gallery:/, '')
  }

  function setConnection(kind, message) {
    if (!ui.conn) return
    const map = {
      connecting: ['Connecting…', '#c9a554'],
      connected: ['Connected', '#6bc07a'],
      disconnected: ['Offline', '#c0564f'],
      'room-full': ['Museum Full (2/2)', '#c0564f'],
      'bad-code': ['Invalid Passcode', '#c0564f'],
      'update-required': ['Update Required', '#c0564f'],
    }
    const [label, color] = map[kind] || [message || 'Offline', '#c0564f']
    ui.conn.textContent = label
    ui.conn.style.color = color
  }

  // ---- local avatar state ----------------------------------------------
  function gatherLocalState() {
    return {
      ...engineApi.getPlayerState(),
      room: currentRoomKey(),
      location: currentRoomKey(),
      mode: state.localSeat ? 'sit' : 'stand',
      seat: state.localSeat?.id || null,
    }
  }

  // ---- seat interaction (SEAT-03 client half) ---------------------------
  function trySit() {
    if (!state.connected) return
    if (state.localSeat || engineApi.isSeated?.()) {
      standUp()
      return
    }
    const cam = engineApi.camera
    const seat = findNearestSeat(state.seats, cam.position.x, cam.position.z, 3.5)
    if (!seat || seat.occupiedBy) return

    // Send sit request to server for authoritative confirmation
    state.pendingSeatId = seat.id
    netSit(seat.id)
  }

  function standUp() {
    if (!state.localSeat && !engineApi.isSeated?.()) return
    const seatId = state.localSeat?.id
    state.localSeat = null
    state.pendingSeatId = null
    engineApi.setSeated?.(null)
    if (seatId) {
      const seat = state.seats.get(seatId)
      if (seat && seat.occupiedBy === getPeerId()) seat.occupiedBy = null
    }
    netStand()
  }

  function freeLocalSeat() {
    if (state.localSeat || engineApi.isSeated?.()) {
      const seatId = state.localSeat?.id
      state.localSeat = null
      state.pendingSeatId = null
      engineApi.setSeated?.(null)
      if (seatId) {
        const seat = state.seats.get(seatId)
        if (seat && seat.occupiedBy === getPeerId()) seat.occupiedBy = null
      }
      netStand()
    }
  }

  // ---- emotes (MP-04) ---------------------------------------------------
  function doEmote(idx) {
    const emote = getEmoteById(idx)
    if (!emote) return
    if (state.emoteActive && state.emoteActive.idx === idx) {
      stopEmote()
      return
    }
    if (state.connected) {
      netEmote(idx, true)
    }
    state.localAvatar?.setEmote(idx, true)
    state.emoteActive = {
      idx,
      label: emote.label,
      loop: Boolean(emote.loop),
      until: emote.loop ? Infinity : performance.now() + emote.durationMs,
    }
  }

  function stopEmote() {
    if (state.emoteActive) {
      const idx = state.emoteActive.idx
      if (state.connected) {
        netEmote(idx, false)
      }
      state.localAvatar?.setEmote(idx, false)
      state.emoteActive = null
    }
  }

  function updateEmoteHint() {
    if (!ui.hint) return
    const cam = engineApi.camera
    let show = false
    for (const av of state.world?.remote.values() || []) {
      if (!av.group.visible) continue
      const d = Math.hypot(cam.position.x - av.group.position.x, cam.position.z - av.group.position.z)
      if (d < 3.2) {
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion)
        const toAv = new THREE.Vector3(av.group.position.x - cam.position.x, 0, av.group.position.z - cam.position.z).normalize()
        const dot = fwd.dot(toAv)
        if (dot > 0.35) { show = true; break }
      }
    }
    state.hintVisible = show
    ui.hint.style.display = show ? 'block' : 'none'
  }

  // ---- chat (MP-05) -----------------------------------------------------
  function openChat() {
    if (state.chatOpen || !state.connected) return

    // Require pointer lock & sanctuary entry
    const canvas = document.querySelector('#scene')
    const hasEntered = document.body.classList.contains('in-sanctuary')
    const isLocked = document.pointerLockElement === canvas

    if (!hasEntered || !isLocked) return

    state.chatOpen = true
    ui.chatInput.style.display = 'block'
    ui.chatInput.value = ''
    ui.chatInput.focus()
    if (document.pointerLockElement) document.exitPointerLock()
  }

  function closeChat(send) {
    if (!state.chatOpen) return
    const val = ui.chatInput.value.trim()
    state.chatOpen = false
    ui.chatInput.style.display = 'none'
    ui.chatInput.value = ''

    if (send && val) {
      netChat(val)
      // Display local chat bubble above self (MP-05)
      const pos = localHeadScreenPosition()
      showChatBubble('local', val, pos)
    }

    // Restore pointer lock if still in sanctuary
    const canvas = document.querySelector('#scene')
    if (canvas && document.body.classList.contains('in-sanctuary')) {
      try { canvas.requestPointerLock() } catch {}
    }
  }

  function startChatListener() {
    ui.chatInput.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Enter') {
        e.preventDefault()
        closeChat(true)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        closeChat(false)
      }
    })
    ui.chatInput.addEventListener('blur', () => {
      if (state.chatOpen) closeChat(false)
    })
  }

  // ---- frame loop -------------------------------------------------------
  let lastFrame = performance.now()
  function frame() {
    if (!state.started) return
    const now = performance.now()
    const dt = Math.min((now - lastFrame) / 1000, 0.05)
    lastFrame = now

    if (state.world) {
      state.world.setCamera(engineApi.getActiveCamera())
      state.world.update(dt)
    }

    updateEmoteHint()

    // Reposition any active chat bubbles
    for (const [peerId, av] of state.world?.remote.entries() || []) {
      const pos = avatarHeadScreenPosition(av)
      if (pos) positionChatBubble(peerId, pos)
    }
    const localPos = localHeadScreenPosition()
    if (localPos) positionChatBubble('local', localPos)

    if (state.chatOpen) {
      requestAnimationFrame(frame)
      return
    }

    // Send state at ~20 Hz
    if (state.connected && now - state.lastSend >= STATE_INTERVAL_MS) {
      state.lastSend = now
      netState(gatherLocalState())
    }

    // Cancel emote if player starts walking or running
    const ps = engineApi?.getPlayerState?.()
    const isMoving = ps && (ps.moving || Math.hypot(ps.vx || 0, ps.vz || 0) > 0.15)
    if (isMoving && state.emoteActive) {
      stopEmote()
    }

    // Emote expiration check for non-looping emotes
    if (state.emoteActive && !state.emoteActive.loop && now > state.emoteActive.until) {
      stopEmote()
    }

    requestAnimationFrame(frame)
  }

  // ---- keyboard handling -----------------------------------------------
  function onKeyDown(e) {
    if (state.chatOpen) {
      e.preventDefault()
      return
    }
    const canvas = document.querySelector('#scene')
    const locked = document.pointerLockElement === canvas

    // Emote hotkeys 1-4 (MP-04)
    const emote = getEmoteByKey(e.code)
    if (emote && locked) {
      e.preventDefault()
      doEmote(emote.id)
      return
    }

    // E = sit / stand (MP-04)
    if (e.code === 'KeyE' && locked) {
      e.preventDefault()
      trySit()
      return
    }

    // Enter = open chat (MP-05)
    if (e.code === 'Enter') {
      const hasEntered = document.body.classList.contains('in-sanctuary')
      if (locked && hasEntered) {
        e.preventDefault()
        openChat()
        return
      }
    }
  }

  // ---- starting / stopping (MP-06) -------------------------------------
  function start() {
    if (state.started) return
    state.started = true
    buildUI()
    setConnection('connecting')
    ensureWorld()
    engineApi.setPlayerAvatar(state.localAvatar)
    engineApi.onStandRequested?.(() => {
      standUp()
    })
    state.seats = buildSeatRegistry(currentRoomKey())

    function doJoin() {
      const av = resolveAvatar()
      const playerState = engineApi?.getPlayerState?.() || {}
      netJoin({
        peerId: getPeerId(),
        name: av?.name || 'Visitor',
        color: av?.color || '#d8b06a',
        model: av?.model || '',
        appearance: av?.appearance,
        room: currentRoomKey(),
        p: playerState.p || [0, 1.7, 4],
        ry: playerState.ry || 0,
        code: window.__museumPasscode || '',
        sessionToken: ''
      })
    }

    // Store network unsubscribers BEFORE connecting
    state.unsubNet.push(onNet('message', handleMessage))
    state.unsubNet.push(onNet('status', (s) => {
      if (s.kind === 'open') {
        state.connected = true
        setConnection('connected')
        doJoin()
      } else if (s.kind === 'close' || s.kind === 'closed') {
        state.connected = false
        setConnection('disconnected')
        state.partner = null
        updatePartnerPanel()
      } else if (s.kind === 'terminal-error') {
        state.connected = false
        setConnection(s.code)
      }
    }))

    connectNet(wsUrl)
    if (netConnected()) {
      state.connected = true
      setConnection('connected')
      doJoin()
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    startChatListener()

    // 2-second ping heartbeat
    state.pingInterval = setInterval(() => {
      if (state.connected) {
        state.lastPing = performance.now()
        netPing(state.lastPing)
      }
    }, 2000)

    requestAnimationFrame(frame)
  }

  function stop() {
    state.started = false
    window.removeEventListener('keydown', onKeyDown, { capture: true })

    // Unsubscribe net listeners
    for (const unsub of state.unsubNet) {
      try { unsub() } catch {}
    }
    state.unsubNet.length = 0

    // Clear ping timer
    if (state.pingInterval) {
      clearInterval(state.pingInterval)
      state.pingInterval = null
    }

    disconnectNet()
    engineApi.setPlayerAvatar(null)
    state.localAvatar?.dispose()
    state.localAvatar = null
    state.world?.dispose()
    state.world = null
    state.partner = null

    for (const seat of state.seats.values()) seat.occupiedBy = null
    if (ui.partnerPanel) ui.partnerPanel.style.display = 'none'
  }

  // Hook room changes to refresh seats and world
  if (engineApi && typeof engineApi.getCurrentRoom === 'function') {
    const origSetRoom = engineApi.setRoom
    if (typeof origSetRoom === 'function') {
      engineApi.setRoom = async (...args) => {
        const r = await origSetRoom.apply(engineApi, args)
        state.seats = buildSeatRegistry(currentRoomKey())
        state.world && state.world.refreshRooms()
        freeLocalSeat()
        return r
      }
    }
  }

  return {
    start,
    prepareAvatar,
    stop,
    isConnected: () => state.connected,
    getPeerCount: () => (state.partner ? 1 : 0) + (state.connected ? 1 : 0),
    getPartner: () => state.partner,
    getLatency: () => state.latencyMs,
    getState: () => state,
    refreshSeats: () => {
      state.seats = buildSeatRegistry(currentRoomKey())
      return state.seats
    },
    doEmote: (idx) => doEmote(idx),
    stopEmote: () => stopEmote(),
    getActiveEmote: () => state.emoteActive,
    getNearestSeat: (maxDist = 3.5) => {
      const cam = engineApi?.camera
      if (!cam || !state.seats) return null
      return findNearestSeat(state.seats, cam.position.x, cam.position.z, maxDist)
    },
    isSeated: () => Boolean(state.localSeat || engineApi?.isSeated?.()),
    getLocalSeat: () => state.localSeat,
    trySit: () => trySit(),
    standUp: () => standUp(),
    openChat: () => openChat(),
  }
}
