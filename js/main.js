/* =========================================================================
   OUR MUSEUM • APPLICATION ENTRY POINT & MAIN LOOP
   ========================================================================= */

import * as THREE from 'three';
import { scene, camera, renderer, updateFireplaceFlicker } from './environment.js';
import {
  characters,
  loadAvatars,
  appState,
  setAppState,
  applySitPose,
  applyLiePose,
  updateSelectionRing,
  updateLifelikeMotions
} from './characters.js';
import { initControls, handleLocomotion, updateCameraRig, checkProximity } from './controls.js';
import {
  initUI,
  updateWorldOverlays,
  applyConfig,
  handleContextualAction,
  closeModal,
  interactionHint,
  hintText,
  dancePill
} from './ui.js';
import { audioEngine } from './audio.js';
import { loadSavedConfig } from './config.js';

// =========================================================================
// ASSET PRELOADER
// =========================================================================
const loadingManager = new THREE.LoadingManager();
const loadingBar = document.getElementById('loading-bar');
const statusLabel = document.getElementById('status-label');
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const btnAudioToggle = document.getElementById('btn-audio-toggle');

loadingManager.onProgress = (url, loaded, total) => {
  const pct = Math.round((loaded / total) * 100);
  if (loadingBar) loadingBar.style.width = `${pct}%`;
  if (statusLabel) statusLabel.innerHTML = `Loading 3D Gallery &bull; ${pct}%`;
};

loadingManager.onLoad = () => {
  if (loadingBar) loadingBar.style.width = '100%';
  if (statusLabel) statusLabel.textContent = 'Preparing your home…';
};

loadingManager.onError = url => {
  console.warn('Error loading asset:', url);
};

// =========================================================================
// START SCREEN & AUDIO INITIALIZATION
// =========================================================================
if (startBtn) {
  startBtn.addEventListener('click', () => {
    // Web Audio requires user interaction gesture
    audioEngine.start();
    if (btnAudioToggle) btnAudioToggle.innerText = '🎵';

    // Fade out start splash screen
    if (startScreen) {
      startScreen.classList.add('hidden');
    }
    setAppState('idle');
  });
}

if (btnAudioToggle) {
  btnAudioToggle.addEventListener('click', () => {
    const isPlaying = audioEngine.toggle();
    btnAudioToggle.innerText = isPlaying ? '🎵' : '🔇';
  });
}

// =========================================================================
// SYSTEM INITIALIZATION
// =========================================================================
initControls(handleContextualAction, closeModal);
initUI();
window.__camera = camera;
window.__characters = characters;

// Load dynamic config from URL hash or localStorage
const initialConfig = loadSavedConfig();
applyConfig(initialConfig);

// Load Maya & Jack dual-avatar models
loadAvatars(loadingManager).then(() => {
  if (statusLabel) statusLabel.textContent = 'Your home is ready';
  if (startBtn) startBtn.disabled = false;
  setAppState('entrance');
}).catch(() => {
  if (statusLabel) statusLabel.textContent = 'Unable to load the characters. Check your connection and reload.';
});

// =========================================================================
// MAIN ANIMATION RENDER LOOP
// =========================================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  // Skeletal animation updates
  if (characters.maya.mixer) characters.maya.mixer.update(delta);
  if (characters.jack.mixer) characters.jack.mixer.update(delta);

  const elapsed = clock.elapsedTime;
  updateFireplaceFlicker(elapsed);
  updateSelectionRing(elapsed);
  updateLifelikeMotions(elapsed);

  // Maintain sitting or lying posture IK
  Object.values(characters).forEach(c => {
    if (!c.root) return;
    if (c.state === 'sitting') applySitPose(c.root, true, c === characters.maya);
    if (c.state === 'lying') applyLiePose(c.root, true);
  });

  handleLocomotion(delta);
  updateCameraRig();
  updateWorldOverlays();
  checkProximity(interactionHint, hintText, dancePill);

  renderer.render(scene, camera);
}

animate();

// Responsive window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

