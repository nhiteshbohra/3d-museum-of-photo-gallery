/* =========================================================================
   OUR MUSEUM • USER INTERFACE, MODALS & STUDIO DRAWER
   ========================================================================= */

import * as THREE from 'three';
import { camera, galleryItems, interactiveArtworks, createFallbackArtCanvas, updatePlaqueTexture, toggleFireplace } from './environment.js';
import {
  characters,
  getControlTarget,
  appState,
  sitDown,
  lieDown,
  standUp,
  toggleDancing,
  activeControl,
  setActiveControl,
  onActiveControlChange
} from './characters.js';
import { currentConfig, setConfig, DEFAULT_CONFIG, saveConfig, compressImage, deepMerge, escapeHTML } from './config.js';
import { audioEngine } from './audio.js';
import { activeNearestInteraction } from './controls.js';

// DOM References
export const speechBubble = document.getElementById('speech-bubble');
export const nameTagJack = document.getElementById('name-tag-jack');
export const dancePill = document.getElementById('dance-pill');
export const interactionHint = document.getElementById('interaction-hint');
export const hintText = document.getElementById('hint-text');
export const btnSit = document.getElementById('btn-sit');
export const btnDance = document.getElementById('btn-dance');
export const inspectOverlay = document.getElementById('inspect-overlay');
export const toastMsg = document.getElementById('toast-msg');

let toastTimer = null;
export function showToast(msg) {
  if (!toastMsg) return;
  toastMsg.innerText = msg;
  toastMsg.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMsg.classList.remove('show');
  }, 2600);
}

// =========================================================================
// 3D WORLD-TO-SCREEN PROJECTIONS
// =========================================================================
const tempVec = new THREE.Vector3();

export function updateWorldOverlays() {
  if (!characters.jack.root) return;
  if (btnSit) {
    const resting = appState === 'sitting' || appState === 'lying';
    btnSit.textContent = resting ? 'Stand up' : activeNearestInteraction?.label || 'Interact';
    btnSit.disabled = !resting && !activeNearestInteraction;
    btnSit.classList.toggle('active', resting);
  }

  // Project Jack's head coordinates
  characters.jack.root.getWorldPosition(tempVec);
  tempVec.y += 1.88;
  tempVec.project(camera);

  const screenX = (tempVec.x * 0.5 + 0.5) * window.innerWidth;
  const screenY = (-(tempVec.y * 0.5) + 0.5) * window.innerHeight;
  const isVisible = tempVec.z < 1.0;

  if (nameTagJack) {
    if (isVisible && appState !== 'dancing' && appState !== 'sitting') {
      nameTagJack.style.left = `${screenX}px`;
      nameTagJack.style.top = `${screenY}px`;
      nameTagJack.style.display = 'block';
    } else {
      nameTagJack.style.display = 'none';
    }
  }

  // Floating Speech Bubble during Bench Sitting (Timestamp 0:15)
  if (speechBubble) {
    if (isVisible && characters.jack.state === 'sitting') {
      const bubbleY = screenY - 24;
      speechBubble.style.left = `${screenX}px`;
      speechBubble.style.top = `${bubbleY}px`;
      speechBubble.style.display = 'block';
    } else {
      speechBubble.style.display = 'none';
    }
  }

  // Dance Pill floating anchor in gallery center
  if (dancePill && dancePill.style.display !== 'none') {
    const centerPos = getControlTarget().position.clone();
    centerPos.y += 2.05;
    centerPos.project(camera);
    if (centerPos.z < 1.0) {
      dancePill.style.left = `${(centerPos.x * 0.5 + 0.5) * window.innerWidth}px`;
      dancePill.style.top = `${(-(centerPos.y * 0.5) + 0.5) * window.innerHeight}px`;
    }
  }
}

// =========================================================================
// ART & PLAQUE INSPECTION MODAL
// =========================================================================
export function openInspectionModal(item) {
  if (!item || !inspectOverlay) return;

  document.getElementById('modal-tag').innerText = item.tag || 'A PERMANENT COLLECTION';
  document.getElementById('modal-title').innerText = item.title || 'Exhibition Piece';
  document.getElementById('modal-desc').innerText = `"${item.quote || ''}"`;
  document.getElementById('modal-sign').innerText = item.sign || `Love, ${currentConfig.partnerFrom}`;

  const fullImg = document.getElementById('full-art-img');
  if (item.url) {
    fullImg.src = item.url;
    fullImg.style.display = 'block';
  } else {
    fullImg.style.display = 'none';
  }

  inspectOverlay.style.display = 'flex';
}

export function closeModal() {
  if (inspectOverlay) {
    inspectOverlay.style.display = 'none';
  }
}

export function handleContextualAction(action) {
  if (appState === 'sitting' || appState === 'lying') {
    standUp(() => {
      if (btnSit) {
        btnSit.innerText = 'Sit';
        btnSit.classList.remove('active');
      }
    });
    return;
  }

  if (!action) return;

  if (action.type === 'art') {
    openInspectionModal(action.data);
  } else if (action.type === 'plaque') {
    openInspectionModal(action.data || galleryItems[0]);
  } else if (action.type === 'sit') {
    sitDown(() => {
      if (btnSit) {
        btnSit.innerText = 'Stand Up';
        btnSit.classList.add('active');
      }
    }, action.pos, action.facing);
  } else if (action.type === 'piano') {
    showToast('Playing a romantic melody on the grand piano... 🎹');
    audioEngine.playInteractiveChord();
    sitDown(() => {
      if (btnSit) {
        btnSit.innerText = 'Stand Up';
        btnSit.classList.add('active');
      }
    }, action.pos, action.facing);
  } else if (action.type === 'lie') {
    showToast('Relaxing side-by-side in the master bedroom... 💤');
    lieDown(() => {
      if (btnSit) {
        btnSit.innerText = 'Stand Up';
        btnSit.classList.add('active');
      }
    }, action.pos, action.facing);
  } else if (action.type === 'balcony_view') {
    showToast('Watching the garden and stars with you... 🌌');
  } else if (action.type === 'toggle_fire') {
    const isLit = toggleFireplace();
    showToast(isLit ? 'Fireplace hearth glowing warmly 🔥' : 'Fireplace embers dimmed 🕯️');
  }
}

// =========================================================================
// CONFIGURATION & STUDIO DRAWER
// =========================================================================
export function applyConfig(cfg) {
  setConfig(cfg);

  // 1. DOM Elements
  const titleEl = document.getElementById('start-title');
  if (titleEl) titleEl.innerText = cfg.museumTitle || 'Our Museum';
  const hudTitleEl = document.getElementById('hud-museum-title');
  if (hudTitleEl) hudTitleEl.innerText = cfg.museumTitle || 'Our Museum';
  document.title = `${cfg.museumTitle} • ${cfg.partnerFrom} & ${cfg.partnerTo}`;

  const fromEl = document.getElementById('start-from');
  if (fromEl) fromEl.innerText = cfg.partnerFrom || 'Ethan';
  const toEl = document.getElementById('start-to');
  if (toEl) toEl.innerText = cfg.partnerTo || 'Maya';

  if (nameTagJack) nameTagJack.innerText = cfg.partnerFrom || 'Ethan';
  const mayaPill = document.getElementById('btn-char-maya');
  const jackPill = document.getElementById('btn-char-jack');
  if (mayaPill) mayaPill.textContent = cfg.partnerTo || 'Maya';
  if (jackPill) jackPill.textContent = cfg.partnerFrom || 'Ethan';
  const caption = document.getElementById('control-caption');
  if (caption) caption.textContent = activeControl === 'couple' ? 'Exploring together · local controls' : `Exploring as ${activeControl === 'maya' ? cfg.partnerTo : cfg.partnerFrom}`;
  if (speechBubble) speechBubble.innerText = cfg.speechBubble || 'i love you maya ❤️';

  // 2. Dedication Plaque on Console
  updatePlaqueTexture(cfg.plaque);

  // 3. Update all 5 3D Gallery Artworks
  if (Array.isArray(galleryItems) && Array.isArray(cfg.artworks)) {
    cfg.artworks.forEach((art, i) => {
      const item = galleryItems[i];
      if (!item) return;
      item.title = art.title;
      item.tag = art.tag;
      item.quote = art.quote;
      item.sign = art.sign || `Love, ${cfg.partnerFrom}`;
      item.url = art.imageData || null;

      if (item.photoMesh) {
        item.photoMesh.userData = item;
        if (art.imageData) {
          const img = new Image();
          img.onload = () => {
            const tex = new THREE.Texture(img);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            item.photoMesh.material.map = tex;
            item.photoMesh.material.color.set(0xffffff);
            item.photoMesh.material.needsUpdate = true;
          };
          img.src = art.imageData;
        } else {
          item.photoMesh.material.map = createFallbackArtCanvas(item);
          item.photoMesh.material.color.set(0xffffff);
          item.photoMesh.material.needsUpdate = true;
        }
      }
    });
  }

  syncStudioInputs(cfg);
}

export function syncStudioInputs(cfg) {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };
  setVal('input-museum-title', cfg.museumTitle);
  setVal('input-partner-from', cfg.partnerFrom);
  setVal('input-partner-to', cfg.partnerTo);
  setVal('input-speech-bubble', cfg.speechBubble);

  setVal('input-plaque-tag', cfg.plaque.tag);
  setVal('input-plaque-title', cfg.plaque.title);
  setVal('input-plaque-quote', cfg.plaque.quote);
  setVal('input-plaque-sign', cfg.plaque.sign);

  renderArtworkSlotsUI(cfg);
}

export function renderArtworkSlotsUI(cfg) {
  const container = document.getElementById('artwork-slots-container');
  if (!container) return;
  container.innerHTML = '';

  cfg.artworks.forEach((art, index) => {
    const card = document.createElement('div');
    card.className = 'slot-card';
    card.innerHTML = `
      <div class="slot-card-header">
        <span class="slot-badge">${escapeHTML(art.name || `Artwork Slot ${index + 1}`)}</span>
        <span style="font-size:0.75rem; color:#888;">Slot ${index + 1}/5</span>
      </div>
      
      <div class="slot-preview-wrapper" id="preview-wrapper-${index}" style="display: ${art.imageData ? 'block' : 'none'};">
        <img class="slot-preview-img" id="preview-img-${index}" src="${art.imageData || ''}" alt="Preview" />
        <button type="button" class="btn-remove-slot-img" data-slot="${index}">✕ Remove Photo</button>
      </div>

      <div class="slot-dropzone" id="dropzone-${index}" style="display: ${art.imageData ? 'none' : 'flex'};">
        <input type="file" id="file-input-${index}" accept="image/*" />
        <div class="dropzone-label">📷 Upload Photo (Click or Drag &amp; Drop)</div>
        <div class="dropzone-hint">Auto-compressed in browser &bull; Stored locally</div>
      </div>

      <div class="form-group" style="margin-top:10px;">
        <label>Artwork Title</label>
        <input type="text" id="slot-title-${index}" value="${escapeHTML(art.title)}" placeholder="Artwork Title" />
      </div>

      <div class="form-group">
        <label>Category / Tag</label>
        <input type="text" id="slot-tag-${index}" value="${escapeHTML(art.tag)}" placeholder="e.g. WINTER MEMORIES" />
      </div>

      <div class="form-group">
        <label>Memory Quote / Story</label>
        <textarea id="slot-quote-${index}" placeholder="Romantic quote or memory...">${escapeHTML(art.quote)}</textarea>
      </div>
    `;
    container.appendChild(card);

    const dropzone = card.querySelector(`#dropzone-${index}`);
    const fileInput = card.querySelector(`#file-input-${index}`);
    const previewWrapper = card.querySelector(`#preview-wrapper-${index}`);
    const previewImg = card.querySelector(`#preview-img-${index}`);
    const btnRemove = card.querySelector(`.btn-remove-slot-img`);

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', e => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', async e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        await handleSlotFileUpload(index, e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', async e => {
      if (e.target.files && e.target.files[0]) {
        await handleSlotFileUpload(index, e.target.files[0]);
      }
    });

    btnRemove.addEventListener('click', () => {
      currentConfig.artworks[index].imageData = null;
      previewWrapper.style.display = 'none';
      dropzone.style.display = 'flex';
      applyConfig(currentConfig);
      showToast(saveConfig(currentConfig) ? `Photo removed from Slot ${index + 1}` : 'Photo changed for this visit. Browser storage is full or unavailable.');
    });

    const titleIn = card.querySelector(`#slot-title-${index}`);
    const tagIn = card.querySelector(`#slot-tag-${index}`);
    const quoteIn = card.querySelector(`#slot-quote-${index}`);

    titleIn.addEventListener('input', e => { currentConfig.artworks[index].title = e.target.value; });
    tagIn.addEventListener('input', e => { currentConfig.artworks[index].tag = e.target.value; });
    quoteIn.addEventListener('input', e => { currentConfig.artworks[index].quote = e.target.value; });
  });
}

export async function handleSlotFileUpload(slotIndex, file) {
  try {
    showToast('Compressing photo...');
    const compressedBase64 = await compressImage(file, 1280, 0.82);
    currentConfig.artworks[slotIndex].imageData = compressedBase64;
    applyConfig(currentConfig);
    showToast(saveConfig(currentConfig) ? `Photo applied to Slot ${slotIndex + 1}!` : 'Photo changed for this visit. Browser storage is full or unavailable.');
  } catch (err) {
    console.error(err);
    showToast('Failed to process photo.');
  }
}

export function initUI() {
  const drawer = document.getElementById('customizer-drawer');
  const backdrop = document.getElementById('customizer-backdrop');
  const btnCloseDrawer = document.getElementById('btn-close-customizer');
  const btnOpenHud = document.getElementById('btn-customizer-hud');
  const btnApplyDrawer = document.getElementById('btn-apply-drawer');

  if (drawer && backdrop) {
    const openStudioDrawer = () => {
      drawer.classList.add('open');
      backdrop.classList.add('active');
    };

    const closeStudioDrawer = () => {
      drawer.classList.remove('open');
      backdrop.classList.remove('active');
    };

    if (btnOpenHud) btnOpenHud.addEventListener('click', openStudioDrawer);
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeStudioDrawer);
    if (backdrop) backdrop.addEventListener('click', closeStudioDrawer);

    // Tab Navigation
    const tabs = document.querySelectorAll('.drawer-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.dataset.tab;
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.classList.add('active');
      });
    });

    // Save & Apply Drawer Form
    if (btnApplyDrawer) {
      btnApplyDrawer.addEventListener('click', () => {
        currentConfig.museumTitle = document.getElementById('input-museum-title').value.trim() || 'Our Museum';
        currentConfig.partnerFrom = document.getElementById('input-partner-from').value.trim() || 'Ethan';
        currentConfig.partnerTo = document.getElementById('input-partner-to').value.trim() || 'Maya';
        currentConfig.speechBubble = document.getElementById('input-speech-bubble').value.trim() || 'i love you maya ❤️';

        currentConfig.plaque.tag = document.getElementById('input-plaque-tag').value.trim() || 'A PERMANENT COLLECTION';
        currentConfig.plaque.title = document.getElementById('input-plaque-title').value.trim() || 'For Maya';
        currentConfig.plaque.quote = document.getElementById('input-plaque-quote').value.trim();
        currentConfig.plaque.sign = document.getElementById('input-plaque-sign').value.trim() || `Love, ${currentConfig.partnerFrom}`;

        currentConfig.artworks[0].title = currentConfig.plaque.title;
        currentConfig.artworks[0].tag = currentConfig.plaque.tag;
        currentConfig.artworks[0].quote = currentConfig.plaque.quote;
        currentConfig.artworks[0].sign = currentConfig.plaque.sign;

        applyConfig(currentConfig);
        if (!saveConfig(currentConfig)) { showToast('Unable to save. Export your configuration to keep it.'); return; }
        showToast('All changes saved & updated!');
        closeStudioDrawer();
      });
    }
  }

  // Copy share link
  const btnCopyShareLink = document.getElementById('btn-copy-share-link');
  if (btnCopyShareLink) {
    btnCopyShareLink.addEventListener('click', () => {
      try {
        const jsonStr = JSON.stringify(currentConfig);
        const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
        const shareUrl = `${window.location.origin}${window.location.pathname}#cfg=${encodeURIComponent(b64)}`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('Shareable link copied to clipboard! 📋');
          }).catch(() => {
            prompt('Copy your museum share link:', shareUrl);
          });
        } else {
          prompt('Copy your museum share link:', shareUrl);
        }
      } catch (err) {
        console.error(err);
        showToast('Failed to create link.');
      }
    });
  }

  // Export & Import JSON
  const btnExportJson = document.getElementById('btn-export-json');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentConfig, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `museum-config-${currentConfig.partnerTo.toLowerCase().replace(/\s+/g, '_')}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      showToast('Config exported as JSON! 💾');
    });
  }

  const btnImportJson = document.getElementById('btn-import-json');
  const inputImportJson = document.getElementById('input-import-json');
  if (btnImportJson && inputImportJson) {
    btnImportJson.addEventListener('click', () => inputImportJson.click());
    inputImportJson.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target.result);
          const merged = deepMerge(DEFAULT_CONFIG, parsed);
          applyConfig(merged);
          showToast(saveConfig(merged) ? 'Config imported successfully!' : 'Imported for this visit. Browser storage is full or unavailable.');
        } catch (err) {
          alert('Invalid JSON config file.');
        }
      };
      reader.readAsText(file);
    });
  }

  // Reset defaults
  const btnResetDefaults = document.getElementById('btn-reset-defaults');
  if (btnResetDefaults) {
    btnResetDefaults.addEventListener('click', () => {
      if (confirm('Reset museum back to original defaults?')) {
        localStorage.removeItem('3d_museum_config_v2');
        const resetCfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        applyConfig(resetCfg);
        showToast('Museum reset to defaults! 🔄');
      }
    });
  }

  // Character Switcher UI Buttons (Spec §8.1)
  const btnCharCouple = document.getElementById('btn-char-couple');
  const btnCharMaya = document.getElementById('btn-char-maya');
  const btnCharJack = document.getElementById('btn-char-jack');

  const updateCharButtons = (mode) => {
    if (btnCharCouple) btnCharCouple.classList.toggle('active', mode === 'couple');
    if (btnCharMaya) btnCharMaya.classList.toggle('active', mode === 'maya');
    if (btnCharJack) btnCharJack.classList.toggle('active', mode === 'jack');
    [btnCharCouple, btnCharMaya, btnCharJack].forEach(b => b?.setAttribute('aria-pressed', String(b.classList.contains('active'))));
    const caption = document.getElementById('control-caption');
    if (caption) caption.textContent = mode === 'couple' ? 'Exploring together · local controls' : `Exploring as ${mode === 'maya' ? currentConfig.partnerTo : currentConfig.partnerFrom}`;
  };
  updateCharButtons(activeControl);

  if (btnCharCouple) {
    btnCharCouple.addEventListener('click', () => {
      setActiveControl('couple');
      showToast('Controlling Both (Couple Mode) 👫');
    });
  }
  if (btnCharMaya) {
    btnCharMaya.addEventListener('click', () => {
      setActiveControl('maya');
      showToast('Controlling Maya 👩');
    });
  }
  if (btnCharJack) {
    btnCharJack.addEventListener('click', () => {
      setActiveControl('jack');
      showToast('Controlling Ethan 👨');
    });
  }

  onActiveControlChange(mode => {
    updateCharButtons(mode);
  });

  // Sit button (Generic seating)
  if (btnSit) {
    btnSit.addEventListener('click', () => {
      if (appState === 'sitting' || appState === 'lying') {
        standUp(() => {
          btnSit.innerText = 'Sit';
          btnSit.classList.remove('active');
        });
      } else {
        if (activeNearestInteraction) handleContextualAction(activeNearestInteraction);
        else showToast('Walk close to a seat to sit down.');
      }
    });
  }

  // Dance button
  const danceTogether = () => {
    if (appState !== 'dancing' && characters.maya.controller.position.distanceTo(characters.jack.controller.position) > 3) {
      showToast('Move closer to your partner to dance together.');
      return;
    }
    toggleDancing(btnDance);
  };
  if (btnDance) {
    btnDance.addEventListener('click', () => {
      danceTogether();
    });
  }

  if (dancePill) {
    dancePill.addEventListener('click', () => {
      danceTogether();
    });
  }

  // Modal inspection dismissal
  if (inspectOverlay) {
    inspectOverlay.addEventListener('click', e => {
      if (!e.target.closest('#plaque-card, #full-art-img')) {
        closeModal();
      }
    });
  }

}
