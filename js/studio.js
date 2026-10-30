/* =========================================================================
   OUR MUSEUM • CREATOR & CUSTOMER ORDER STUDIO ENGINE
   ========================================================================= */

import { DEFAULT_CONFIG, compressImage, deepMerge, escapeHTML } from './config.js';

const STORAGE_CUSTOMERS_KEY = 'museum_customers_store_v1';
const ACTIVE_CUSTOMER_KEY = 'museum_active_customer_id';

let customersDatabase = {};
let activeCustomerId = 'default';
let activeConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

// Toast Notification
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast-msg');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.remove('translate-y-24', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('translate-y-24', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 2500);
}

// Generate customer URL
function generateCustomerLink(cfg) {
  try {
    const jsonStr = JSON.stringify(cfg);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return `${new URL('index.html', window.location.href).href.split('#')[0]}#cfg=${encodeURIComponent(b64)}`;
  } catch (err) {
    console.error('Error generating link:', err);
    return new URL('index.html', window.location.href).href.split('#')[0];
  }
}

function updateLinkDisplay() {
  const urlInput = document.getElementById('customer-share-url');
  if (urlInput) {
    urlInput.value = generateCustomerLink(activeConfig);
  }
}

// =========================================================================
// CUSTOMER DATABASE MANAGEMENT
// =========================================================================
function loadCustomers() {
  try {
    const stored = localStorage.getItem(STORAGE_CUSTOMERS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        customersDatabase = Object.fromEntries(Object.entries(parsed).filter(([, value]) => value && typeof value === 'object').map(([id, value]) => [id, {
          id, label: String(value.label || 'Customer Order'), config: deepMerge(DEFAULT_CONFIG, value.config)
        }]));
      }
    }
  } catch (e) {
    console.warn('Could not parse customers store:', e);
  }

  if (!customersDatabase['default']) {
    customersDatabase['default'] = {
      id: 'default',
      label: 'Default Order: Ethan & Maya',
      config: JSON.parse(JSON.stringify(DEFAULT_CONFIG))
    };
  }

  let savedActive;
  try { savedActive = localStorage.getItem(ACTIVE_CUSTOMER_KEY); } catch (error) { console.warn('Could not read active customer:', error); }
  if (savedActive && customersDatabase[savedActive]) {
    activeCustomerId = savedActive;
  } else {
    activeCustomerId = 'default';
  }

  activeConfig = deepMerge(DEFAULT_CONFIG, customersDatabase[activeCustomerId].config);
  refreshCustomerDropdown();
  populateForm(activeConfig);
  updateLinkDisplay();
}

function saveCustomers() {
  try {
    customersDatabase[activeCustomerId] = {
      id: activeCustomerId,
      label: document.getElementById('input-customer-label').value.trim() || activeConfig.partnerTo || 'Customer Order',
      config: activeConfig
    };
    localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(customersDatabase));
    localStorage.setItem(ACTIVE_CUSTOMER_KEY, activeCustomerId);
    refreshCustomerDropdown();
    return true;
  } catch (e) {
    console.warn('Could not save customers to localStorage:', e);
    showToast('Could not save locally. Export a JSON backup before leaving.');
    return false;
  }
}

function refreshCustomerDropdown() {
  const select = document.getElementById('customer-select');
  if (!select) return;
  select.innerHTML = '';
  Object.keys(customersDatabase).forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = customersDatabase[id].label;
    if (id === activeCustomerId) opt.selected = true;
    select.appendChild(opt);
  });
}

// =========================================================================
// FORM POPULATION & INPUT BINDINGS
// =========================================================================
function populateForm(cfg) {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('input-museum-title', cfg.museumTitle);
  setVal('input-customer-label', customersDatabase[activeCustomerId]?.label || `${cfg.partnerFrom} & ${cfg.partnerTo}`);
  setVal('input-partner-from', cfg.partnerFrom);
  setVal('input-partner-to', cfg.partnerTo);
  setVal('input-speech-bubble', cfg.speechBubble);

  setVal('input-plaque-tag', cfg.plaque?.tag);
  setVal('input-plaque-title', cfg.plaque?.title);
  setVal('input-plaque-quote', cfg.plaque?.quote);
  setVal('input-plaque-sign', cfg.plaque?.sign);

  renderArtworkSlots(cfg);
}

function readFormIntoConfig() {
  activeConfig.museumTitle = document.getElementById('input-museum-title').value.trim() || 'Our Museum';
  activeConfig.partnerFrom = document.getElementById('input-partner-from').value.trim() || 'Ethan';
  activeConfig.partnerTo = document.getElementById('input-partner-to').value.trim() || 'Maya';
  activeConfig.speechBubble = document.getElementById('input-speech-bubble').value.trim() || 'i love you maya ❤️';

  activeConfig.plaque.tag = document.getElementById('input-plaque-tag').value.trim() || 'A PERMANENT COLLECTION';
  activeConfig.plaque.title = document.getElementById('input-plaque-title').value.trim() || `For ${activeConfig.partnerTo}`;
  activeConfig.plaque.quote = document.getElementById('input-plaque-quote').value.trim();
  activeConfig.plaque.sign = document.getElementById('input-plaque-sign').value.trim() || `Love, ${activeConfig.partnerFrom}`;

  // Centerpiece sync
  if (activeConfig.artworks && activeConfig.artworks[0]) {
    activeConfig.artworks[0].title = activeConfig.plaque.title;
    activeConfig.artworks[0].tag = activeConfig.plaque.tag;
    activeConfig.artworks[0].quote = activeConfig.plaque.quote;
    activeConfig.artworks[0].sign = activeConfig.plaque.sign;
  }
}

// =========================================================================
// ARTWORK SLOTS UI & IMAGE COMPRESSION
// =========================================================================
function renderArtworkSlots(cfg) {
  const container = document.getElementById('artwork-slots-container');
  if (!container) return;
  container.innerHTML = '';

  cfg.artworks.forEach((item, index) => {
    const art = Object.fromEntries(Object.entries(item).map(([key, value]) => [key, typeof value === 'string' ? escapeHTML(value) : value]));
    const card = document.createElement('div');
    card.className = 'bg-black/30 border border-white/10 rounded-xl p-5 space-y-4';
    card.innerHTML = `
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <span class="text-xs uppercase tracking-wider text-[#e8d0a9] font-bold">${art.room ? `${art.room} &bull; ` : ''}${art.name || `Wall Slot ${index + 1}`}</span>
        <span class="text-xs text-stone-500">Slot ${index + 1} of ${cfg.artworks.length}</span>
      </div>

      <div id="preview-box-${index}" class="${art.imageData ? 'block' : 'hidden'} relative h-40 rounded-lg overflow-hidden border border-white/10 bg-black">
        <img id="preview-img-${index}" src="${art.imageData || ''}" alt="Slot preview" class="w-full h-full object-cover">
        <button type="button" class="btn-remove-photo absolute top-3 right-3 px-3 py-1 rounded bg-black/80 hover:bg-rose-600 text-xs text-white border border-white/20 transition" data-slot="${index}">
          ✕ Remove Photo
        </button>
      </div>

      <div id="dropzone-${index}" class="${art.imageData ? 'hidden' : 'flex'} flex-col items-center justify-center p-6 border-2 border-dashed border-[#e8d0a9]/30 hover:border-[#e8d0a9] rounded-lg cursor-pointer bg-black/20 hover:bg-[#e8d0a9]/5 transition">
        <input type="file" id="file-${index}" accept="image/*" class="hidden">
        <span class="text-sm font-medium text-stone-200">📷 Upload Customer Photo (Click or Drag &amp; Drop)</span>
        <span class="text-xs text-stone-500 mt-1">Automatic in-browser compression for instant 3D WebGL streaming</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Artwork Title</label>
          <input type="text" id="slot-title-${index}" value="${art.title || ''}" class="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e8d0a9]">
        </div>
        <div>
          <label class="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Tag / Category</label>
          <input type="text" id="slot-tag-${index}" value="${art.tag || ''}" class="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e8d0a9]">
        </div>
      </div>

      <div>
        <label class="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">Memory Quote / Story</label>
        <textarea id="slot-quote-${index}" rows="2" class="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e8d0a9]">${art.quote || ''}</textarea>
      </div>
    `;
    container.appendChild(card);

    const dropzone = card.querySelector(`#dropzone-${index}`);
    const fileInput = card.querySelector(`#file-${index}`);
    const previewBox = card.querySelector(`#preview-box-${index}`);
    const btnRemove = card.querySelector(`.btn-remove-photo`);

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', e => {
      e.preventDefault();
      dropzone.classList.add('border-[#e8d0a9]');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('border-[#e8d0a9]'));
    dropzone.addEventListener('drop', async e => {
      e.preventDefault();
      dropzone.classList.remove('border-[#e8d0a9]');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        await uploadSlotPhoto(index, e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', async e => {
      if (e.target.files && e.target.files[0]) {
        await uploadSlotPhoto(index, e.target.files[0]);
      }
    });

    btnRemove.addEventListener('click', () => {
      activeConfig.artworks[index].imageData = null;
      previewBox.classList.add('hidden');
      dropzone.classList.remove('hidden');
      if (!saveCustomers()) return;
      updateLinkDisplay();
      showToast(`Photo removed from Slot ${index + 1}`);
    });

    // Input listeners
    card.querySelector(`#slot-title-${index}`).addEventListener('input', e => {
      activeConfig.artworks[index].title = e.target.value;
      updateLinkDisplay();
    });
    card.querySelector(`#slot-tag-${index}`).addEventListener('input', e => {
      activeConfig.artworks[index].tag = e.target.value;
      updateLinkDisplay();
    });
    card.querySelector(`#slot-quote-${index}`).addEventListener('input', e => {
      activeConfig.artworks[index].quote = e.target.value;
      updateLinkDisplay();
    });
  });
}

async function uploadSlotPhoto(slotIndex, file) {
  try {
    showToast(`Compressing photo for Slot ${slotIndex + 1}...`);
    const base64 = await compressImage(file, 1280, 0.82);
    activeConfig.artworks[slotIndex].imageData = base64;
    if (!saveCustomers()) return;
    renderArtworkSlots(activeConfig);
    updateLinkDisplay();
    showToast(`Photo applied to Slot ${slotIndex + 1}! ✨`);
  } catch (err) {
    console.error(err);
    showToast('Failed to process image.');
  }
}

// =========================================================================
// TAB SWITCHING & INITIALIZATION
// =========================================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active', 'border-[#e8d0a9]', 'text-[#e8d0a9]', 'bg-white/5');
      b.classList.add('border-transparent', 'text-stone-400');
    });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));

    btn.classList.add('active', 'border-[#e8d0a9]', 'text-[#e8d0a9]', 'bg-white/5');
    btn.classList.remove('border-transparent', 'text-stone-400');

    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.remove('hidden');
  });
});

// Customer Dropdown selection
document.getElementById('customer-select')?.addEventListener('change', e => {
  const newId = e.target.value;
  if (customersDatabase[newId]) {
    activeCustomerId = newId;
    activeConfig = deepMerge(DEFAULT_CONFIG, customersDatabase[newId].config);
    try { localStorage.setItem(ACTIVE_CUSTOMER_KEY, activeCustomerId); } catch (error) { console.warn('Could not save active customer:', error); }
    populateForm(activeConfig);
    updateLinkDisplay();
    showToast(`Switched to order: ${customersDatabase[newId].label}`);
  }
});

// Add new customer profile
document.getElementById('btn-new-customer')?.addEventListener('click', () => {
  const name = prompt('Enter reference name for new customer (e.g. Liam & Sophia):');
  if (!name) return;
  const newId = 'cust_' + Date.now();
  customersDatabase[newId] = {
    id: newId,
    label: name,
    config: JSON.parse(JSON.stringify(DEFAULT_CONFIG))
  };
  customersDatabase[newId].config.partnerTo = name.split('&')[1]?.trim() || 'Partner';
  customersDatabase[newId].config.partnerFrom = name.split('&')[0]?.trim() || 'Ethan';
  activeCustomerId = newId;
  activeConfig = customersDatabase[newId].config;
  if (!saveCustomers()) return;
  populateForm(activeConfig);
  updateLinkDisplay();
  showToast(`New customer order created: ${name}`);
});

// Delete customer profile
document.getElementById('btn-delete-customer')?.addEventListener('click', () => {
  if (activeCustomerId === 'default') {
    alert('Cannot delete default reference template.');
    return;
  }
  if (confirm(`Delete customer profile "${customersDatabase[activeCustomerId]?.label}"?`)) {
    delete customersDatabase[activeCustomerId];
    activeCustomerId = 'default';
    activeConfig = deepMerge(DEFAULT_CONFIG, customersDatabase['default'].config);
    if (!saveCustomers()) return;
    populateForm(activeConfig);
    updateLinkDisplay();
    showToast('Customer profile deleted.');
  }
});

// Save & Apply button
const saveApplyAction = () => {
  readFormIntoConfig();
  if (!saveCustomers()) return;
  updateLinkDisplay();
  showToast('Configuration saved & customer link updated! ✨');
};

document.getElementById('btn-save-apply')?.addEventListener('click', saveApplyAction);
document.getElementById('btn-save-customer')?.addEventListener('click', saveApplyAction);

// Open customer preview
document.getElementById('btn-preview-customer')?.addEventListener('click', () => {
  readFormIntoConfig();
  if (!saveCustomers()) return;
  const link = generateCustomerLink(activeConfig);
  window.open(link, '_blank');
});

// Copy link button
document.getElementById('btn-copy-customer-url')?.addEventListener('click', () => {
  readFormIntoConfig();
  if (!saveCustomers()) return;
  const link = generateCustomerLink(activeConfig);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(() => {
      showToast('Customer link copied to clipboard! 📋');
    }).catch(() => {
      prompt('Copy customer link:', link);
    });
  } else {
    prompt('Copy customer link:', link);
  }
});

// Export JSON
document.getElementById('btn-export-json')?.addEventListener('click', () => {
  readFormIntoConfig();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeConfig, null, 2));
  const dl = document.createElement('a');
  dl.setAttribute("href", dataStr);
  dl.setAttribute("download", `museum-order-${activeCustomerId}.json`);
  document.body.appendChild(dl);
  dl.click();
  dl.remove();
  showToast('Customer config exported! 💾');
});

// Import JSON
document.getElementById('input-import-json')?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      activeConfig = deepMerge(DEFAULT_CONFIG, parsed);
      if (!saveCustomers()) return;
      populateForm(activeConfig);
      updateLinkDisplay();
      showToast('Customer config imported successfully! 🎉');
    } catch (err) {
      alert('Invalid JSON config file.');
    }
  };
  reader.readAsText(file);
});

// Auto-save on input change
['input-museum-title', 'input-partner-from', 'input-partner-to', 'input-speech-bubble', 'input-plaque-tag', 'input-plaque-title', 'input-plaque-quote', 'input-plaque-sign'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => {
    readFormIntoConfig();
    updateLinkDisplay();
  });
});

// Initialize on page load
loadCustomers();
const studioStatus = document.getElementById('studio-status');
if (studioStatus) studioStatus.textContent = 'Use Save Customer Profile to keep your changes.';

