/* =========================================================================
   OUR MUSEUM • SINGLE-FLOOR CONTROLS, CAMERA RIG & SALON NAVIGATION
   ========================================================================= */

import * as THREE from 'three';
import {
  camera,
  HOUSE_WIDTH,
  HOUSE_DEPTH,
  interactionPoints,
  houseRooms,
  interactiveArtworks,
  houseColliders,
  cameraObstacles
} from './environment.js';
import {
  getControlledCharacters,
  getControlTarget,
  characters,
  appState,
  setAppState,
  playAction,
  standUp,
  activeControl,
  setActiveControl,
  cycleActiveControl,
  getSelectableCharacters
} from './characters.js';

export const keys = {};
export let isMoving = false;
export const MOVE_SPEED = 1.4;
export const ROTATION_SPEED = 6.0;

export const cameraOrbit = { yaw: Math.PI, pitch: 0.12 };
let isDragging = false;
let prevMousePos = { x: 0, y: 0 };
export let joyDelta = { x: 0, y: 0 };

export let currentFloor = 0; // 0 = Ground, 1 = Upper
export let activeNearestInteraction = null;

// Debug fly-camera state
export let isFlyCam = false;
const flyCamTarget = new THREE.Vector3(0, 3.2, 0);

let clickStartPos = { x: 0, y: 0 };
const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();

export function initControls(onContextualAction, onModalClose) {
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (e.target.closest('input, textarea, select, [contenteditable=true]')) return;
    if (e.key === 'Escape') { if (onModalClose) onModalClose(); return; }
    if (document.getElementById('inspect-overlay')?.style.display === 'flex' || ['loading', 'entrance'].includes(appState)) return;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === 'tab' && e.target.closest('button, a, [tabindex]')) return;
    keys[k] = true;
    if (e.repeat && ['tab', '1', '2', '3', 'e', 'q'].includes(k)) return;

    // Character Switching: Tab or keys 1/2/3
    if (e.key === 'Tab') {
      e.preventDefault();
      cycleActiveControl();
    } else if (k === '1') {
      setActiveControl('couple');
    } else if (k === '2') {
      setActiveControl('maya');
    } else if (k === '3') {
      setActiveControl('jack');
    }

    if (k === 'e') {
      if (onContextualAction) onContextualAction(activeNearestInteraction);
    }
    if (e.key === 'Escape') {
      if (onModalClose) onModalClose();
    }
    if ((appState === 'sitting' || appState === 'lying') && (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q'].includes(k))) {
      standUp();
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
  });

  window.addEventListener('blur', () => {
    Object.keys(keys).forEach(k => { keys[k] = false; });
    joyDelta.x = joyDelta.y = 0;
    isDragging = false;
  });

  // Camera Orbit Dragging & Click Selection
  window.addEventListener('mousedown', e => {
    if (e.target.closest('#hud-controls, #start-screen, #inspect-overlay, #top-bar, #mobile-joystick, #toast-msg, #debug-panel')) return;
    isDragging = true;
    prevMousePos = { x: e.clientX, y: e.clientY };
    clickStartPos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - prevMousePos.x;
    const dy = e.clientY - prevMousePos.y;
    prevMousePos = { x: e.clientX, y: e.clientY };

    cameraOrbit.yaw -= dx * 0.005;
    cameraOrbit.pitch = Math.max(-0.25, Math.min(0.65, cameraOrbit.pitch + dy * 0.004));
  });

  window.addEventListener('mouseup', e => {
    if (!isDragging) return;
    isDragging = false;

    // Check if it was a clean click without significant dragging (< 6px)
    const distMoved = Math.hypot(e.clientX - clickStartPos.x, e.clientY - clickStartPos.y);
    if (distMoved < 6) {
      mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);

      // 1. Check click on character to switch control
      const selectableChars = getSelectableCharacters();
      const charHits = raycaster.intersectObjects(selectableChars, true);
      if (charHits.length > 0) {
        let curr = charHits[0].object;
        while (curr && !curr.userData?.characterId && curr.parent) {
          curr = curr.parent;
        }
        if (curr && curr.userData?.characterId) {
          setActiveControl(curr.userData.characterId);
          return;
        }
      }

      // 2. Check click on Artwork to open inspection modal
      const artHits = raycaster.intersectObjects(interactiveArtworks, true);
      if (artHits.length > 0) {
        const mesh = artHits[0].object;
        if (mesh.userData && onContextualAction) {
          onContextualAction({ type: 'art', data: mesh.userData });
        }
      }
    }
  });

  initJoystick();
  const canvas = document.getElementById('webgl-canvas');
  let lookTouch = null;
  canvas.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    const t = Array.from(e.changedTouches).find(t => t.identifier === lookTouch?.id);
    if (!t) return;
    cameraOrbit.yaw -= (t.clientX - lookTouch.x) * .005;
    cameraOrbit.pitch = THREE.MathUtils.clamp(cameraOrbit.pitch + (t.clientY - lookTouch.y) * .004, -.25, .65);
    lookTouch.x = t.clientX; lookTouch.y = t.clientY;
    e.preventDefault();
  }, { passive: false });
  const endLook = e => { if (Array.from(e.changedTouches).some(t => t.identifier === lookTouch?.id)) lookTouch = null; };
  canvas.addEventListener('touchend', endLook);
  canvas.addEventListener('touchcancel', endLook);
  initDebugTooling();
}

function initJoystick() {
  const joystick = document.getElementById('mobile-joystick');
  const knob = document.getElementById('joystick-knob');
  if (!joystick || !knob) return;

  let touchId = null;

  const updateJoystick = (clientX, clientY) => {
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxR = rect.width / 2;
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    joyDelta.x = dx / maxR;
    joyDelta.y = dy / maxR;
  };

  joystick.addEventListener('touchstart', e => {
    e.preventDefault();
    if (touchId !== null) return;
    const touch = e.changedTouches[0];
    touchId = touch.identifier;
    updateJoystick(touch.clientX, touch.clientY);
  }, { passive: false });

  window.addEventListener('touchmove', e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  });

  const resetJoy = () => {
    touchId = null;
    joyDelta.x = 0;
    joyDelta.y = 0;
    knob.style.transform = 'translate(-50%, -50%)';

  };

  const endTouch = e => {
    if (Array.from(e.changedTouches).some(touch => touch.identifier === touchId)) resetJoy();
  };
  window.addEventListener('touchend', endTouch);
  window.addEventListener('touchcancel', endTouch);
}

/**
 * Resolves 2D AABB obstacle penetration with smooth sliding along obstacle faces
 */
function resolveCollisions(pos) {
  const charRadius = 0.38;
  for (const col of houseColliders) {

    const closestX = Math.max(col.minX, Math.min(pos.x, col.maxX));
    const closestZ = Math.max(col.minZ, Math.min(pos.z, col.maxZ));
    const diffX = pos.x - closestX;
    const diffZ = pos.z - closestZ;
    const distSq = diffX * diffX + diffZ * diffZ;

    if (distSq < charRadius * charRadius) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const overlap = charRadius - dist;
        pos.x += (diffX / dist) * overlap;
        pos.z += (diffZ / dist) * overlap;
      } else {
        const dMinX = Math.abs(pos.x - col.minX);
        const dMaxX = Math.abs(pos.x - col.maxX);
        const dMinZ = Math.abs(pos.z - col.minZ);
        const dMaxZ = Math.abs(pos.z - col.maxZ);
        const minPen = Math.min(dMinX, dMaxX, dMinZ, dMaxZ);
        if (minPen === dMinX) pos.x = col.minX - charRadius;
        else if (minPen === dMaxX) pos.x = col.maxX + charRadius;
        else if (minPen === dMinZ) pos.z = col.minZ - charRadius;
        else pos.z = col.maxZ + charRadius;
      }
    }
  }
}

/**
 * Single-Floor locomotion: smooth velocity, collision sliding, and boundary containment
 */
export function handleLocomotion(delta) {
  delta = Math.min(Math.max(delta, 0), 0.05);
  currentFloor = 0;
  if (isFlyCam || ['dancing', 'loading', 'entrance'].includes(appState) || document.getElementById('inspect-overlay')?.style.display === 'flex') return;
  let moveX = Number(!!(keys.d || keys.arrowright)) - Number(!!(keys.a || keys.arrowleft));
  let moveZ = Number(!!(keys.s || keys.arrowdown)) - Number(!!(keys.w || keys.arrowup));
  const joystickLength = Math.hypot(joyDelta.x, joyDelta.y);
  if (joystickLength > 0.1) { moveX = joyDelta.x; moveZ = joyDelta.y; }
  const inputLen = Math.hypot(moveX, moveZ);
  const controlled = getControlledCharacters();
  isMoving = false;
  for (const ch of Object.values(characters)) {
    const actor = ch.controller;
    if (!actor || !ch.root) continue;
    const moving = controlled.includes(ch) && inputLen > 0.1 && !['sitting', 'lying'].includes(ch.state);
    if (!moving) {
      ch.speed = 0;
      if (ch.state === 'walking') { ch.state = 'idle'; playAction(ch, 'idle'); }
      continue;
    }
    // The orbit is a world heading, independent of avatar turning.
    const angle = Math.atan2(-moveX, -moveZ) + cameraOrbit.yaw;
    const diff = Math.atan2(Math.sin(angle - actor.rotation.y), Math.cos(angle - actor.rotation.y));
    actor.rotation.y += diff * (1 - Math.exp(-ROTATION_SPEED * delta));
    const pos = actor.position;
    const previous = pos.clone();

    // Single-floor ground plane (Y = 0)
    pos.y = 0;
    actor.userData.floor = 0;

    const targetSpeed = Math.min(keys.shift || joystickLength > 0.9 ? 3.2 : MOVE_SPEED, 3.2) * Math.min(inputLen, 1);
    ch.speed = THREE.MathUtils.lerp(ch.speed || 0, targetSpeed, 1 - Math.exp(-9 * delta));
    pos.x += Math.sin(angle) * ch.speed * delta;
    pos.z += Math.cos(angle) * ch.speed * delta;

    // Resolve room collisions with sliding physics
    resolveCollisions(pos);

    // Clamp inside grand museum grounds
    pos.x = THREE.MathUtils.clamp(pos.x, -HOUSE_WIDTH / 2 + 0.65, HOUSE_WIDTH / 2 - 0.65);
    pos.z = THREE.MathUtils.clamp(pos.z, -15.0, 14.8);

    // Front portal doorway boundary check
    if (previous.z <= 5.5 && pos.z > 5.5 && Math.abs(pos.x) >= 2.1) {
      pos.z = 5.3;
    } else if (previous.z > 5.5 && pos.z <= 5.5 && Math.abs(pos.x) >= 2.1) {
      pos.z = 5.6;
    }

    ch.state = 'walking';
    playAction(ch, ch.speed > 2 ? 'run' : 'walk');
    isMoving = true;
  }
  if (['idle', 'walking'].includes(appState)) setAppState(isMoving ? 'walking' : 'idle');
}

/**
 * Third-person camera follow rig with Spring-Arm Raycast Wall Collision
 */
let cameraPose = '';
export function updateCameraRig() {
  if (isFlyCam) {
    camera.lookAt(flyCamTarget);
    return;
  }

  const resting = appState === 'sitting' || appState === 'lying';
  const followDist = resting ? 2.8 : 3.8;

  const target = getControlTarget();
  if (!target) return;
  const focusWorldPos = target.getWorldPosition(new THREE.Vector3());

  // Torso / chest level look target for cinematic human framing
  const lookTarget = focusWorldPos.clone();
  lookTarget.y += 1.05;
  if (resting) {
    const ch = getControlledCharacters()[0];
    ch.root.getObjectByName('mixamorigHips')?.getWorldPosition(lookTarget);
    lookTarget.y += appState === 'lying' ? .25 : .5;
    const pose = activeControl + appState;
    if (cameraPose !== pose) {
      cameraOrbit.yaw = target.rotation.y - Math.PI;
      cameraOrbit.pitch = appState === 'lying' ? .45 : .18;
    }
    cameraPose = pose;
  } else cameraPose = '';

  const yaw = cameraOrbit.yaw + Math.PI;
  const pitch = cameraOrbit.pitch;

  const camOffset = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * followDist,
    Math.sin(pitch) * followDist + 0.38,
    Math.cos(yaw) * Math.cos(pitch) * followDist
  );

  // =========================================================================
  // CAMERA SPRING-ARM: Raycast against walls & ceiling to prevent clipping void
  // =========================================================================
  let actualCamOffset = camOffset.clone();
  const rayDir = camOffset.clone().normalize();
  const camRaycaster = new THREE.Raycaster(lookTarget, rayDir, 0.1, followDist);

  let isBlocked = false;
  if (cameraObstacles && cameraObstacles.length > 0) {
    const hits = camRaycaster.intersectObjects(cameraObstacles, false);
    if (hits.length > 0 && hits[0].distance < followDist) {
      const safeDist = Math.max(0.45, hits[0].distance - 0.22);
      actualCamOffset = rayDir.clone().multiplyScalar(safeDist);
      isBlocked = true;
    }
  }

  const desiredCamPos = lookTarget.clone().add(actualCamOffset);
  if (isBlocked) {
    // Instantly avoid wall penetration: never lag behind the wall into void
    camera.position.copy(desiredCamPos);
  } else {
    camera.position.lerp(desiredCamPos, 0.12);
  }
  camera.lookAt(lookTarget);
}

/**
 * Checks proximity to interaction points, artworks, and furniture
 */
export function checkProximity(interactionHint, hintText, dancePill) {
  if (appState === 'sitting' || appState === 'lying' || appState === 'dancing') {
    activeNearestInteraction = null;
    if (interactionHint) interactionHint.classList.remove('visible');
    if (dancePill) dancePill.style.display = 'none';
    return;
  }

  const target = getControlTarget();
  if (!target) return;
  const pPos = target.position;
  let nearestInteraction = null;
  let minDist = 2.6;

  // 1. Check all house interaction points
  interactionPoints.forEach(point => {
    const ptVec = new THREE.Vector3(...point.pos);
    const d = pPos.distanceTo(ptVec);
    if (d < minDist) {
      minDist = d;
      nearestInteraction = point;
    }
  });

  // 2. Check artworks in Memory Gallery
  interactiveArtworks.forEach(mesh => {
    const meshPos = new THREE.Vector3();
    mesh.getWorldPosition(meshPos);
    const d = pPos.distanceTo(meshPos);
    if (d < minDist) {
      minDist = d;
      nearestInteraction = {
        id: 'art_' + (mesh.userData?.id || 'item'),
        type: 'art',
        label: `Inspect "${mesh.userData?.title || 'Art'}" 🖼️`,
        data: mesh.userData
      };
    }
  });

  activeNearestInteraction = nearestInteraction;

  if (nearestInteraction) {
    if (hintText) hintText.innerText = nearestInteraction.label;
    if (interactionHint) interactionHint.classList.add('visible');
  } else {
    if (interactionHint) interactionHint.classList.remove('visible');
  }

  // Dance Pill trigger: available in Grand Rotunda or Fireside Salon
  if (dancePill) {
    const isRotunda = Math.abs(pPos.x) < 4.0 && pPos.z > -2.0 && pPos.z < 5.0;
    const isFireside = pPos.x < -5.0 && pPos.z > 0.0;

    if ((isRotunda || isFireside) && appState === 'idle') {
      dancePill.style.display = 'block';
    } else {
      dancePill.style.display = 'none';
    }
  }
}

/**
 * Debug inspection tooling API (window.__debug per Playbook §4.3)
 */
function initDebugTooling() {
  window.__debug = {
    teleport(roomName) {
      const room = houseRooms[roomName];
      if (!room) {
        console.warn(`Room "${roomName}" not found. Available:`, Object.keys(houseRooms));
        return false;
      }
      for (const ch of getControlledCharacters()) {
        ch.controller.position.set(...room.spawn);
        ch.controller.rotation.y = room.facingY ?? 0;
        ch.controller.userData.floor = room.floor;
        ch.speed = 0;
      }
      currentFloor = room.floor;
      cameraOrbit.yaw = 0;
      cameraOrbit.pitch = 0.08;
      console.log(`[Debug] Teleported to ${room.name} (Floor ${room.floor}) at:`, room.spawn);
      return true;
    },
    toggleFlyCam() {
      isFlyCam = !isFlyCam;
      if (isFlyCam) {
        camera.position.set(0, 14, 18);
        flyCamTarget.set(0, 2.5, 0);
        console.log('[Debug] Fly Camera: ENABLED (Viewing Grand Pavilion)');
      } else {
        console.log('[Debug] Fly Camera: DISABLED (Returned to third-person follow)');
      }
      return isFlyCam;
    },
    getState() {
      const target = getControlTarget();
      return {
        activeControl,
        positions: Object.fromEntries(Object.entries(characters).map(([id, ch]) => [id, ch.controller?.position.toArray()])),
        floors: Object.fromEntries(Object.entries(characters).map(([id, ch]) => [id, ch.controller?.userData.floor ?? 0])),
        couplePos: [
          Number(target.position.x.toFixed(2)),
          Number(target.position.y.toFixed(2)),
          Number(target.position.z.toFixed(2))
        ],
        currentFloor,
        appState,
        isMoving,
        activeInteraction: activeNearestInteraction?.id || null
      };
    },
    rooms: Object.keys(houseRooms),
    houseRooms,
    characters,
    camera,
    interactiveArtworks,
    interactionPoints
  };

  // URL flag ?debug=1 check
  if (window.location.search.includes('debug=1')) {
    createDebugUI();
  }
}

function createDebugUI() {
  const panel = document.createElement('div');
  panel.id = 'debug-panel';
  panel.style.cssText = `
    position: fixed; top: 75px; left: 24px; z-index: 9999;
    background: rgba(10, 12, 16, 0.92); border: 1px solid #e8d0a9;
    padding: 12px 16px; border-radius: 12px; font-family: monospace; font-size: 11px;
    color: #ede8dc; backdrop-filter: blur(8px); min-width: 200px;
  `;
  panel.innerHTML = `
    <div style="font-weight:bold; color:#e8d0a9; margin-bottom:6px;">🛠️ OUR HOME DEBUG</div>
    <div id="dbg-info" style="margin-bottom:8px; line-height:1.4;">Grand Pavilion | Single-Floor</div>
    <div style="display:flex; flex-direction:column; gap:4px;">
      <button type="button" id="dbg-btn-fly" style="background:#222; border:1px solid #555; color:#fff; padding:3px 6px; border-radius:4px; cursor:pointer;">Toggle Fly-Cam</button>
      <select id="dbg-sel-room" style="background:#111; border:1px solid #555; color:#e8d0a9; padding:3px 6px; border-radius:4px;">
        ${Object.keys(houseRooms).map(r => `<option value="${r}">${houseRooms[r].name}</option>`).join('')}
      </select>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('#dbg-btn-fly').addEventListener('click', () => {
    window.__debug.toggleFlyCam();
  });

  const sel = panel.querySelector('#dbg-sel-room');
  sel.addEventListener('change', () => {
    window.__debug.teleport(sel.value);
  });

  setInterval(() => {
    const s = window.__debug.getState();
    const info = document.getElementById('dbg-info');
    if (info) {
      info.innerHTML = `Floor: ${s.currentFloor} | Pos: (${s.couplePos.join(', ')})<br>State: ${s.appState}`;
    }
  }, 250);
}
