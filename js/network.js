/* =========================================================================
   OUR HOME 3D • MULTIPLAYER SYNCHRONIZATION ENGINE (WebSocket & BroadcastChannel)
   ========================================================================= */

import * as THREE from 'three';
import { characters, activeControl, setActiveControl, onActiveControlChange, playAction, applySitPose, applyLiePose } from './characters.js';
import { interactionPoints, toggleFireplace } from './environment.js';
import { audioEngine } from './audio.js';

export const peerId = 'peer_' + Math.random().toString(36).substring(2, 9);
export let isOnline = false;
export let connectedPeers = 1;
export let networkRole = activeControl; // 'maya', 'jack', 'couple'

let socket = null;
let broadcastChannel = null;
let syncInterval = null;

// Remote target states for interpolation
export const remoteTargets = {
  maya: {
    pos: new THREE.Vector3(0, 0, 7.5),
    rotY: Math.PI,
    speed: 0,
    state: 'idle',
    floor: 0,
    lastUpdate: 0
  },
  jack: {
    pos: new THREE.Vector3(1.2, 0, 7.5),
    rotY: Math.PI,
    speed: 0,
    state: 'idle',
    floor: 0,
    lastUpdate: 0
  }
};

/**
 * Initializes multiplayer networking:
 * Connects via WebSocket for cross-device/phone sync,
 * with concurrent BroadcastChannel for instant zero-latency multi-tab sync.
 */
export function initNetwork() {
  // Check URL param for role assignment (?char=jack or ?char=maya)
  const params = new URLSearchParams(window.location.search);
  const requestedChar = params.get('char');
  if (requestedChar === 'jack' || requestedChar === 'maya' || requestedChar === 'couple') {
    setActiveControl(requestedChar);
    networkRole = requestedChar;
  }

  onActiveControlChange(mode => {
    networkRole = mode;
    updateNetworkHUD();
  });

  // 1. Initialize BroadcastChannel (Native multi-tab synchronization)
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('our_home_3d_sync');
      broadcastChannel.onmessage = e => {
        handleIncomingMessage(e.data, 'broadcast');
      };
      // Announce arrival to other tabs
      broadcastChannel.postMessage({
        type: 'hello',
        peerId,
        role: activeControl,
        timestamp: Date.now()
      });
    }
  } catch (err) {
    console.warn('[Network] BroadcastChannel unsupported:', err);
  }

  // 2. Initialize WebSocket (Cross-device and local Wi-Fi phones)
  connectWebSocket();

  // 3. Start 30Hz State Broadcast Loop
  syncInterval = setInterval(() => {
    broadcastLocalState();
  }, 33); // ~30Hz

  // 4. Create HUD Connection Pill
  createNetworkHUD();
}

/**
 * Establishes WebSocket connection with automatic retry
 */
function connectWebSocket() {
  const host = window.location.hostname || '127.0.0.1';
  // Use current page protocol (wss:// for HTTPS/cloud hosting, ws:// for local HTTP)
  const isSecure = window.location.protocol === 'https:';
  const proto = isSecure ? 'wss://' : 'ws://';
  // If running in development with separate port 8081 or unified port on current origin
  const port = window.location.port ? `:${window.location.port}` : '';
  const wsUrl = (window.location.port === '8080' || window.location.port === '')
    ? `${proto}${host}${port}`
    : `ws://${host}:8081`;

  try {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      isOnline = true;
      updateNetworkHUD();
      socket.send(json({
        type: 'join',
        peerId,
        role: activeControl,
        room: 'our-home'
      }));
    };

    socket.onmessage = e => {
      try {
        const data = JSON.parse(e.data);
        handleIncomingMessage(data, 'websocket');
      } catch (err) {}
    };

    socket.onclose = () => {
      isOnline = false;
      updateNetworkHUD();
      setTimeout(connectWebSocket, 4000);
    };

    socket.onerror = () => {
      if (socket) socket.close();
    };
  } catch (err) {
    // If WebSocket fails (e.g. server_sync not running), BroadcastChannel continues working cleanly
    isOnline = false;
    updateNetworkHUD();
  }
}

function json(obj) {
  return JSON.stringify(obj);
}

/**
 * Broadcasts local active character's transform and activity to all peers
 */
export function broadcastLocalState() {
  const active = activeControl;
  const charsToSend = active === 'couple' ? ['maya', 'jack'] : [active];

  charsToSend.forEach(id => {
    const ch = characters[id];
    if (!ch || !ch.controller) return;

    const msg = {
      type: 'sync',
      peerId,
      charId: id,
      pos: [
        Number(ch.controller.position.x.toFixed(3)),
        Number(ch.controller.position.y.toFixed(3)),
        Number(ch.controller.position.z.toFixed(3))
      ],
      rotY: Number(ch.controller.rotation.y.toFixed(3)),
      speed: Number((ch.speed || 0).toFixed(2)),
      state: ch.state || 'idle',
      floor: ch.controller.userData?.floor ?? 0,
      timestamp: Date.now()
    };

    // Send via WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(json(msg));
    }
    // Send via BroadcastChannel
    if (broadcastChannel) {
      broadcastChannel.postMessage(msg);
    }
  });
}

/**
 * Broadcasts an interaction event (sit, lie, piano, fireplace, dance)
 */
export function broadcastInteraction(action, data = {}) {
  const msg = {
    type: 'interaction',
    peerId,
    charId: activeControl,
    action,
    data,
    timestamp: Date.now()
  };

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(json(msg));
  }
  if (broadcastChannel) {
    broadcastChannel.postMessage(msg);
  }
}

/**
 * Processes incoming network messages from peers
 */
function handleIncomingMessage(data, source) {
  if (!data || data.peerId === peerId) return; // Ignore own messages

  if (data.type === 'hello') {
    connectedPeers = Math.max(connectedPeers, 2);
    updateNetworkHUD();
    // Respond to let the newcomer know we exist
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'welcome',
        peerId,
        role: activeControl,
        timestamp: Date.now()
      });
    }
  } else if (data.type === 'welcome' || data.type === 'peer_joined') {
    connectedPeers = Math.max(connectedPeers, (data.peerCount || 2));
    updateNetworkHUD();
  } else if (data.type === 'room_state') {
    connectedPeers = Math.max(1, data.peerCount || 1);
    updateNetworkHUD();
  } else if (data.type === 'peer_left') {
    connectedPeers = Math.max(1, (data.peerCount || 1));
    updateNetworkHUD();
  } else if (data.type === 'sync') {
    const charId = data.charId;
    if (!charId || !remoteTargets[charId]) return;

    // Only update if the local player is NOT controlling this character
    if (activeControl !== 'couple' && activeControl === charId) return;

    const t = remoteTargets[charId];
    t.pos.set(data.pos[0], data.pos[1], data.pos[2]);
    t.rotY = data.rotY;
    t.speed = data.speed;
    t.state = data.state;
    t.floor = data.floor;
    t.lastUpdate = Date.now();
    connectedPeers = Math.max(connectedPeers, 2);
    updateNetworkHUD();
  } else if (data.type === 'interaction') {
    handleRemoteInteraction(data);
  }
}

/**
 * Executes interaction initiated by remote partner
 */
function handleRemoteInteraction(msg) {
  const { action, charId, data } = msg;
  const ch = characters[charId] || characters.jack;

  if (action === 'sit') {
    if (data.anchorPos) {
      ch.controller.position.fromArray(data.anchorPos);
      ch.controller.rotation.y = data.facingY || 0;
      ch.state = 'sitting';
      if (ch.root) applySitPose(ch.root, true, ch === characters.maya);
    }
  } else if (action === 'stand') {
    ch.state = 'idle';
    playAction(ch, 'idle');
  } else if (action === 'lie') {
    if (data.anchorPos) {
      ch.controller.position.fromArray(data.anchorPos);
      ch.state = 'lying';
      if (ch.root) applyLiePose(ch.root, true);
    }
  } else if (action === 'toggle_fire') {
    toggleFireplace();
  } else if (action === 'piano') {
    audioEngine.playInteractiveChord();
  } else if (action === 'dance') {
    playAction(ch, 'dance');
  }
}

/**
 * Frame-by-frame Hermite/Linear interpolation for remote characters
 * Called inside the main requestAnimationFrame loop
 */
export function updateNetworkInterpolation(delta) {
  delta = Math.min(delta, 0.05);

  for (const [id, target] of Object.entries(remoteTargets)) {
    // If the local player is currently driving this character, skip remote interpolation
    if (activeControl === id || activeControl === 'couple') continue;

    // If no recent update within 8 seconds, skip
    if (Date.now() - target.lastUpdate > 8000) continue;

    const ch = characters[id];
    if (!ch || !ch.controller || !ch.root) continue;

    const actor = ch.controller;

    // Smooth position interpolation
    actor.position.lerp(target.pos, 1 - Math.exp(-16 * delta));

    // Smooth rotation interpolation
    const diff = Math.atan2(Math.sin(target.rotY - actor.rotation.y), Math.cos(target.rotY - actor.rotation.y));
    actor.rotation.y += diff * (1 - Math.exp(-16 * delta));

    // Animation matching
    ch.speed = target.speed;
    actor.userData.floor = target.floor;

    if (target.state === 'sitting') {
      ch.state = 'sitting';
      applySitPose(ch.root, true, ch === characters.maya);
    } else if (target.state === 'lying') {
      ch.state = 'lying';
      applyLiePose(ch.root, true);
    } else if (target.speed > 0.1) {
      ch.state = 'walking';
      playAction(ch, target.speed > 2.0 ? 'run' : 'walk');
    } else {
      if (ch.state !== 'idle') {
        ch.state = 'idle';
        playAction(ch, 'idle');
      }
    }
  }
}

/**
 * Creates/Updates the Multiplayer Status Pill in the top HUD
 */
function createNetworkHUD() {
  let pill = document.getElementById('net-status-pill');
  if (!pill) {
    pill = document.createElement('div');
    pill.id = 'net-status-pill';
    pill.style.cssText = `
      position: fixed;
      top: 18px;
      right: 74px;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(14, 18, 24, 0.82);
      border: 1px solid rgba(232, 208, 169, 0.45);
      border-radius: 999px;
      padding: 5px 12px;
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 500;
      color: #ede8dc;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    `;
    pill.title = 'Click to switch character or view multiplayer room status';
    pill.addEventListener('click', () => {
      // Toggle role
      const nextRole = activeControl === 'maya' ? 'jack' : (activeControl === 'jack' ? 'couple' : 'maya');
      setActiveControl(nextRole);
      networkRole = nextRole;
      updateNetworkHUD();
    });
    document.body.appendChild(pill);
  }
  updateNetworkHUD();
}

function updateNetworkHUD() {
  const pill = document.getElementById('net-status-pill');
  if (!pill) return;

  const roleName = activeControl === 'maya' ? 'Maya' : (activeControl === 'jack' ? 'Ethan' : 'Together');
  const partnerName = activeControl === 'maya' ? 'Ethan' : 'Maya';
  const dotColor = connectedPeers > 1 ? '#4ade80' : (isOnline ? '#38bdf8' : '#e8d0a9');
  const countText = connectedPeers > 1 ? `${connectedPeers} In Room` : 'Sync Ready';

  pill.innerHTML = `
    <span style="width: 7px; height: 7px; border-radius: 50%; background: ${dotColor}; box-shadow: 0 0 6px ${dotColor};"></span>
    <span>You: <strong style="color: #e8d0a9;">${roleName}</strong></span>
    <span style="opacity: 0.5;">&bull;</span>
    <span style="font-size: 10px; color: #a3b899;">${countText}</span>
  `;
}

