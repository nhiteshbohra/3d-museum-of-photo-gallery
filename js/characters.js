/* =========================================================================
   OUR MUSEUM • CHARACTER RIGGING, ANIMATION & LOCOMOTION SYSTEM
   ========================================================================= */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene } from './environment.js';

export const coupleGroup = new THREE.Group();
scene.add(coupleGroup);

export const characters = {
  maya: { root: null, mixer: null, actions: {}, currentAction: null, modelFile: 'Claire.glb' },
  jack: { root: null, mixer: null, actions: {}, currentAction: null, modelFile: 'Aj.glb' }
};

export let activeControl = 'maya'; // 'couple' | 'maya' | 'jack'
export function getControlledCharacters() {
  return activeControl === 'couple' ? Object.values(characters) : [characters[activeControl]];
}
export function getControlTarget() {
  return characters[activeControl === 'couple' ? 'maya' : activeControl].controller || coupleGroup;
}
export const onActiveControlChangeCallbacks = [];
export function onActiveControlChange(fn) {
  onActiveControlChangeCallbacks.push(fn);
}
export function setActiveControl(mode) {
  if (!['couple', 'maya', 'jack'].includes(mode) || appState === 'dancing') return;
  Object.values(characters).forEach(c => {
    c.speed = 0;
    if (c.state === 'walking') { c.state = 'idle'; playAction(c, 'idle'); }
  });
  activeControl = mode;
  appState = getControlledCharacters()[0].state || 'idle';
  onActiveControlChangeCallbacks.forEach(fn => fn(mode));
}

export function cycleActiveControl() {
  if (activeControl === 'couple') setActiveControl('maya');
  else if (activeControl === 'maya') setActiveControl('jack');
  else setActiveControl('couple');
  return activeControl;
}

// Floor Selection Ring
const ringGeo = new THREE.RingGeometry(0.38, 0.44, 32);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xe8d0a9, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
export const selectionRing = new THREE.Mesh(ringGeo, ringMat);
selectionRing.rotation.x = -Math.PI / 2;
selectionRing.visible = false;
scene.add(selectionRing);

export function updateSelectionRing(time) {
  if (activeControl === 'couple') {
    selectionRing.visible = false;
    return;
  }
  selectionRing.visible = true;
  const targetChar = activeControl === 'maya' ? characters.maya.root : characters.jack.root;
  if (targetChar) {
    const wp = new THREE.Vector3();
    targetChar.getWorldPosition(wp);
    selectionRing.position.set(wp.x, wp.y + 0.025, wp.z);
    const pulse = 1.0 + Math.sin(time * 5.0) * 0.08;
    selectionRing.scale.set(pulse, pulse, pulse);
  }
}

export let appState = 'loading'; // 'loading' | 'entrance' | 'idle' | 'walking' | 'sitting' | 'lying' | 'dancing'
export function setAppState(state) {
  appState = state;
}

export const animationClips = {};

/**
 * Keep animation rotations; controllers and destination bind offsets own position.
 * bindActions converts every joint between source and destination bone axes.
 */
export function sanitizeClip(clip) {
  const cloned = clip.clone();
  // Controllers own translation and scale; retain the destination skeleton's bind offsets.
  cloned.tracks = cloned.tracks.filter(track => track.name.endsWith('.quaternion'));
  return cloned;
}

const clipSkeletons = new Map();

/**
 * Procedural Sitting Clip for humanoid Mixamo armatures
 */
export function createSittingClip(prefix = 'mixamorig:') {
  const tracks = [];
  const times = [0, 1.0];

  // Hips seated on the bench
  const hipsPos = [0, 0.48, 0, 0, 0.48, 0];
  tracks.push(new THREE.VectorKeyframeTrack(`${prefix}Hips.position`, times, hipsPos));

  // Upper legs rotated forward ~85 degrees
  const qUpLeg = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.46);
  tracks.push(new THREE.QuaternionKeyframeTrack(`${prefix}LeftUpLeg.quaternion`, times, [qUpLeg.x, qUpLeg.y, qUpLeg.z, qUpLeg.w, qUpLeg.x, qUpLeg.y, qUpLeg.z, qUpLeg.w]));
  tracks.push(new THREE.QuaternionKeyframeTrack(`${prefix}RightUpLeg.quaternion`, times, [qUpLeg.x, qUpLeg.y, qUpLeg.z, qUpLeg.w, qUpLeg.x, qUpLeg.y, qUpLeg.z, qUpLeg.w]));

  // Calves bent downward ~85 degrees
  const qLeg = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI * 0.48);
  tracks.push(new THREE.QuaternionKeyframeTrack(`${prefix}LeftLeg.quaternion`, times, [qLeg.x, qLeg.y, qLeg.z, qLeg.w, qLeg.x, qLeg.y, qLeg.z, qLeg.w]));
  tracks.push(new THREE.QuaternionKeyframeTrack(`${prefix}RightLeg.quaternion`, times, [qLeg.x, qLeg.y, qLeg.z, qLeg.w, qLeg.x, qLeg.y, qLeg.z, qLeg.w]));

  // Arms resting relaxed by sides / lap
  const qArmL = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.22);
  const qArmR = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.22);
  tracks.push(new THREE.QuaternionKeyframeTrack(`${prefix}LeftArm.quaternion`, times, [qArmL.x, qArmL.y, qArmL.z, qArmL.w, qArmL.x, qArmL.y, qArmL.z, qArmL.w]));
  tracks.push(new THREE.QuaternionKeyframeTrack(`${prefix}RightArm.quaternion`, times, [qArmR.x, qArmR.y, qArmR.z, qArmR.w, qArmR.x, qArmR.y, qArmR.z, qArmR.w]));

  return new THREE.AnimationClip('sit', 1.0, tracks);
}

/**
 * Cross-fades smoothly between animation states (idle, walk, dance, etc.)
 */
export function playAction(charObj, name, duration = 0.35) {
  if (!charObj.actions[name]) return;
  const nextAction = charObj.actions[name];
  const prevAction = charObj.currentAction;

  if (prevAction === nextAction) return;

  nextAction.reset().fadeIn(duration).play();
  if (prevAction) {
    prevAction.fadeOut(duration);
  }
  charObj.currentAction = nextAction;
}

/**
 * Fine-tunes PBR materials for realistic skin, clothing, and eyes under museum spotlights
 */
function enhanceCharacterMaterials(model) {
  model.traverse(o => {
    if (o.name && o.name.includes(':')) {
      o.name = o.name.replace(':', '_');
    }
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; // prevents popping when close to camera

      if (o.material) {
        const mat = o.material;
        mat.envMapIntensity = 0.9;

        // Enhance texture color space
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.map.needsUpdate = true;
        }

        // Differentiate clothing vs skin
        const meshName = (o.name || '').toLowerCase();
        if (meshName.includes('body') || meshName.includes('head') || meshName.includes('face') || meshName.includes('skin')) {
          mat.roughness = 0.65;
          mat.metalness = 0.02;
        } else if (meshName.includes('hair')) {
          mat.roughness = 0.75;
          mat.metalness = 0.05;
        } else {
          mat.roughness = 0.82;
          mat.metalness = 0.05;
        }
      }
    }
  });
}

/**
 * Procedural bone rotation offsets for sitting on the bench with romantic proximity
 */
function resetPose(model) {
  model.traverse(bone => {
    if (bone.isBone && bone.userData.restQuat) {
      bone.quaternion.copy(bone.userData.restQuat);
      bone.position.copy(bone.userData.restPos);
    }
  });
  model.updateMatrixWorld(true);
}

function rotateJoint(model, name, axis, angle) {
  const bone = model.getObjectByName('mixamorig' + name);
  if (!bone) return;
  bone.parent.updateWorldMatrix(true, false);
  const worldAxis = axis.clone().applyQuaternion(model.parent.getWorldQuaternion(new THREE.Quaternion()));
  worldAxis.applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
  bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(worldAxis, angle));
  bone.updateMatrixWorld(true);
}

export function applySitPose(model, isSit) {
  resetPose(model);
  if (!isSit) return;
  for (const side of ['Left', 'Right']) {
    rotateJoint(model, side + 'UpLeg', new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    rotateJoint(model, side + 'Leg', new THREE.Vector3(1, 0, 0), Math.PI / 2);
    rotateJoint(model, side + 'Foot', new THREE.Vector3(1, 0, 0), -0.22);
    rotateJoint(model, side + 'Arm', new THREE.Vector3(0, 0, 1), side === 'Left' ? -1.15 : 1.15);
    rotateJoint(model, side + 'ForeArm', new THREE.Vector3(1, 0, 0), -1.2);
  }
}

export function applyLiePose(model, isLie) {
  resetPose(model);
  if (!isLie) return;
  rotateJoint(model, 'Hips', new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  for (const side of ['Left', 'Right']) {
    rotateJoint(model, side + 'Arm', new THREE.Vector3(0, 1, 0), side === 'Left' ? -1.15 : 1.15);
  }
}

function applyHeadTurn(charObj, dirToPartner, maxAngle = 0.35) {
  if (!charObj || !charObj.root) return;
  const head = charObj.root.getObjectByName('mixamorigHead') || charObj.root.getObjectByName('mixamorigNeck');
  if (!head || !head.userData.restQuat) return;

  const charWorldQuat = charObj.root.getWorldQuaternion(new THREE.Quaternion());
  const charForward = new THREE.Vector3(0, 0, 1).applyQuaternion(charWorldQuat);
  const charRight = new THREE.Vector3(1, 0, 0).applyQuaternion(charWorldQuat);

  const dotForward = charForward.dot(dirToPartner);
  const dotRight = charRight.dot(dirToPartner);
  const targetYaw = Math.atan2(dotRight, dotForward);
  const clampedYaw = Math.max(-maxAngle, Math.min(maxAngle, targetYaw));

  if (typeof head.userData.currentYaw !== 'number') head.userData.currentYaw = 0;
  head.userData.currentYaw += (clampedYaw - head.userData.currentYaw) * 0.08;

  const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), head.userData.currentYaw);
  head.quaternion.copy(head.userData.restQuat).multiply(yawQuat);
}

function resetHeadTurn(charObj) {
  if (!charObj || !charObj.root) return;
  const head = charObj.root.getObjectByName('mixamorigHead') || charObj.root.getObjectByName('mixamorigNeck');
  if (!head || !head.userData.restQuat || !head.userData.currentYaw) return;

  head.userData.currentYaw += (0 - head.userData.currentYaw) * 0.08;
  const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), head.userData.currentYaw);
  head.quaternion.copy(head.userData.restQuat).multiply(yawQuat);
}

/**
 * Human lifelike idle animations driven smoothly by Mixamo clips & gentle breathing & romantic partner look-at IK
 */
export function updateLifelikeMotions(time) {
  if (appState === 'dancing') return;
  const breath = Math.sin(time * 2.2) * 0.007;

  // Gentle breathing active in standing and sitting
  for (const charKey of ['maya', 'jack']) {
    const c = characters[charKey];
    if (c && c.root) {
      const spine = c.root.getObjectByName('mixamorig:Spine') || c.root.getObjectByName('mixamorigSpine');
      if (spine) spine.rotation.x = breath;
    }
  }

  // Romantic Partner Head-Tracking Look-At IK
  if (characters.maya.root && characters.jack.root && characters.maya.controller && characters.jack.controller) {
    const posM = characters.maya.controller.position;
    const posJ = characters.jack.controller.position;
    const dist = posM.distanceTo(posJ);

    if (dist > 0.4 && dist < 3.2 && appState !== 'dancing') {
      const dirMToJ = new THREE.Vector3().subVectors(posJ, posM).normalize();
      const dirJToM = new THREE.Vector3().subVectors(posM, posJ).normalize();
      applyHeadTurn(characters.maya, dirMToJ, 0.35);
      applyHeadTurn(characters.jack, dirJToM, 0.35);
    } else {
      resetHeadTurn(characters.maya);
      resetHeadTurn(characters.jack);
    }
  }
}

/**
 * Loads shared skeletal animation clips from available models concurrently
 */
export async function loadAnimations(gltfLoader) {
  try {
    const [xbotGltf, michelleGltf] = await Promise.all([
      gltfLoader.loadAsync('assets/Xbot.glb'),
      gltfLoader.loadAsync('assets/Michelle.glb')
    ]);

    xbotGltf.animations.forEach(clip => {
      if (clip.name === 'idle') animationClips.idle = sanitizeClip(clip, true);
      if (clip.name === 'walk') animationClips.walk = sanitizeClip(clip, true);
      if (clip.name === 'run') animationClips.run = sanitizeClip(clip, true);
      if (clip.name === 'agree') animationClips.agree = sanitizeClip(clip, true);
    });

    michelleGltf.animations.forEach(clip => {
      if (clip.name === 'SambaDance') animationClips.dance = sanitizeClip(clip, false);
    });

    for (const [name, clip] of Object.entries(animationClips)) {
      const skeleton = name === 'dance' ? michelleGltf.scene : xbotGltf.scene;
      skeleton.updateMatrixWorld(true);
      clipSkeletons.set(clip, skeleton);
    }
    animationClips.sit = createSittingClip();
  } catch (err) {
    console.warn('Animation loading failed:', err);
    throw err;
  }
}

/**
 * Initializes and spawns the Maya & Jack character duo concurrently
 */
export async function loadAvatars(loadingManager) {
  const gltfLoader = new GLTFLoader(loadingManager);

  try {
    const [_, mayaGltf, jackGltf] = await Promise.all([
      loadAnimations(gltfLoader),
      gltfLoader.loadAsync('assets/Claire.glb'),
      gltfLoader.loadAsync('assets/Aj.glb')
    ]);

    // 1. Setup Maya (Claire.glb)
    const mayaModel = mayaGltf.scene;
    mayaModel.scale.set(0.96, 0.96, 0.96);
    enhanceCharacterMaterials(mayaModel);

    mayaModel.traverse(o => {
      if (o.isBone) {
        o.userData.restQuat = o.quaternion.clone();
        o.userData.restPos = o.position.clone();
      }
    });

    characters.maya.root = mayaModel;
    mayaModel.userData = { characterId: 'maya', name: 'Maya' };
    mayaModel.traverse(c => { if (c.isMesh) c.userData.characterId = 'maya'; });
    mayaModel.position.set(0.42, 0, 0);
    characters.maya.controller = new THREE.Group();
    characters.maya.controller.position.set(0.65, 0, 2.5);
    characters.maya.controller.rotation.y = Math.PI;
    characters.maya.controller.add(mayaModel);
    mayaModel.position.set(0, 0, 0);
    scene.add(characters.maya.controller);
    characters.maya.state = 'idle';

    characters.maya.mixer = new THREE.AnimationMixer(mayaModel);
    bindActions(characters.maya);

    playAction(characters.maya, 'idle');

    // 2. Setup Ethan / Jack (Aj.glb)
    const jackModel = jackGltf.scene;
    jackModel.scale.set(0.98, 0.98, 0.98);
    enhanceCharacterMaterials(jackModel);

    jackModel.traverse(o => {
      if (o.isBone) {
        o.userData.restQuat = o.quaternion.clone();
        o.userData.restPos = o.position.clone();
      }
    });

    characters.jack.root = jackModel;
    jackModel.userData = { characterId: 'jack', name: 'Ethan' };
    jackModel.traverse(c => { if (c.isMesh) c.userData.characterId = 'jack'; });
    jackModel.position.set(-0.42, 0, 0);
    characters.jack.controller = new THREE.Group();
    characters.jack.controller.position.set(-0.65, 0, 2.5);
    characters.jack.controller.rotation.y = Math.PI;
    characters.jack.controller.add(jackModel);
    jackModel.position.set(0, 0, 0);
    scene.add(characters.jack.controller);
    characters.jack.state = 'idle';

    characters.jack.mixer = new THREE.AnimationMixer(jackModel);
    bindActions(characters.jack);

    playAction(characters.jack, 'idle');

    for (const c of Object.values(characters)) {
      c.mixer.update(0);
      c.root.updateMatrixWorld(true);
      const bounds = updateSkinBounds(c.root);
      const height = bounds.max.y - bounds.min.y;
      c.root.scale.multiplyScalar((c === characters.maya ? 1.68 : 1.8) / height);
      c.root.updateMatrixWorld(true);
      bounds.copy(updateSkinBounds(c.root));
      c.root.position.y -= bounds.min.y;
    }

    // Start couple in the Entrance Hall facing into the residence
    coupleGroup.position.set(0.5, 0, 4.2);
    coupleGroup.rotation.y = 0;
  } catch (e) {
    console.warn('Avatar loading error:', e);
    throw e;
  }
}

function bindActions(c) {
  const heading = c.controller.rotation.y;
  c.controller.rotation.y = 0;
  c.controller.updateMatrixWorld(true);
  for (const [name, clip] of Object.entries(animationClips)) {
    if (name === 'sit') continue;
    const source = clipSkeletons.get(clip);
    const fitted = clip.clone();
    fitted.tracks = fitted.tracks.flatMap(track => {
      const boneName = track.name.split('.')[0];
      const bone = c.root.getObjectByName(boneName);
      const sourceBone = source?.getObjectByName(boneName);
      if (!bone || !sourceBone) return [];
      // Mixamo exports can bake different local bone axes. Convert every joint
      // through its bind-space world rotation rather than correcting only hips.
      const left = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert()
        .multiply(sourceBone.parent.getWorldQuaternion(new THREE.Quaternion()));
      const right = sourceBone.getWorldQuaternion(new THREE.Quaternion()).invert()
        .multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
      const values = track.values.slice();
      const rotation = new THREE.Quaternion();
      for (let i = 0; i < values.length; i += 4) {
        rotation.fromArray(values, i).premultiply(left).multiply(right).normalize().toArray(values, i);
      }
      return [new THREE.QuaternionKeyframeTrack(track.name, track.times, values)];
    });
    if (!fitted.tracks.length) throw new Error('No compatible bones for ' + name);
    c.actions[name] = c.mixer.clipAction(fitted);
  }
  c.controller.rotation.y = heading;
  c.controller.updateMatrixWorld(true);
}

function updateSkinBounds(model) {
  model.updateMatrixWorld(true);
  model.traverse(object => {
    if (object.isSkinnedMesh) {
      object.skeleton.update();
      object.computeBoundingBox();
    }
  });
  return new THREE.Box3().setFromObject(model);
}

/**
 * Transition into sitting on any furniture seat or bench
 */
export function sitDown(onSitCallback, customPos = null, customFacing = null) {
  poseCharacters('sitting', customPos || [4.4, 0.48, -3.5], customFacing);
  if (onSitCallback) onSitCallback();
}

export function lieDown(onLieCallback, customPos = null, customFacing = null) {
  poseCharacters('lying', customPos || [-6, 3.55, -4.5], customFacing);
  if (onLieCallback) onLieCallback();
}

function poseCharacters(state, pos, facing) {
  const selected = getControlledCharacters();
  selected.forEach((c, index) => {
    if (!c.controller) return;
    if (!c.returnPosition) c.returnPosition = c.controller.position.clone();
    c.state = state;
    c.speed = 0;
    c.controller.position.set(pos[0] + (selected.length > 1 ? (index - 0.5) * 0.8 : 0), 0, pos[2]);
    if (facing) c.controller.rotation.y = Math.atan2(facing[0], facing[2]);
    c.mixer.stopAllAction();
    applySitPose(c.root, false);
    if (state === 'sitting') applySitPose(c.root, true, c === characters.maya);
    else applyLiePose(c.root, true);
    const hips = c.root.getObjectByName('mixamorigHips');
    const pelvis = hips.getWorldPosition(new THREE.Vector3());
    c.controller.position.y = pos[1] + (state === 'sitting' ? 0.08 : 0) - pelvis.y;
  });
  appState = state;
}

export function standUp(onStandCallback) {
  getControlledCharacters().forEach(c => {
    if (!c.controller || !['sitting', 'lying'].includes(c.state)) return;
    applySitPose(c.root, false);
    if (c.returnPosition) c.controller.position.copy(c.returnPosition);
    c.returnPosition = null;
    c.state = 'idle';
    c.mixer.stopAllAction();
    c.currentAction = null;
    playAction(c, 'idle', 0);
  });
  appState = 'idle';
  if (onStandCallback) onStandCallback();
}

/**
 * Returns character meshes for click-to-select raycasting
 */
export function getSelectableCharacters() {
  const list = [];
  if (characters.maya.root) list.push(characters.maya.root);
  if (characters.jack.root) list.push(characters.jack.root);
  return list;
}

/**
 * Toggle dancing together
 */
export function toggleDancing(btnDance) {
  if (appState === 'dancing') {
    appState = 'idle';
    if (btnDance) {
      btnDance.innerText = 'Dance with me 💃';
      btnDance.classList.remove('active');
    }
    playAction(characters.maya, 'idle');
    playAction(characters.jack, 'idle');
  } else {
    if (!characters.maya.actions.dance || !characters.jack.actions.dance) return;
    const a = characters.maya.controller.position;
    const b = characters.jack.controller.position;
    if (a.distanceTo(b) > 3) return;
    Object.values(characters).forEach(c => {
      if (c.returnPosition) c.controller.position.copy(c.returnPosition);
      c.returnPosition = null;
      applySitPose(c.root, false);
      c.state = 'idle';
    });
    appState = 'dancing';
    if (btnDance) {
      btnDance.innerText = 'Stop Dancing';
      btnDance.classList.add('active');
    }
    playAction(characters.maya, 'dance');
    playAction(characters.jack, 'dance');
  }
}

