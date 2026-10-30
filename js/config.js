/* =========================================================================
   OUR MUSEUM • CONFIGURATION & STATE SYSTEM
   ========================================================================= */

export const DEFAULT_CONFIG = {
  museumTitle: "Our Museum",
  partnerFrom: "Ethan",
  partnerTo: "Maya",
  speechBubble: "i love you maya ❤️",
  mayaModel: "Claire.glb",
  jackModel: "Aj.glb",
  plaque: {
    tag: "A PERMANENT COLLECTION",
    title: "For Maya",
    quote: "Our whole winter, hung on the walls, just for you.",
    sign: "Love, Ethan"
  },
  artworks: [
    {
      id: 1,
      room: "Memory Gallery",
      name: "Gallery Centerpiece (Main Wall)",
      title: "For Maya",
      tag: "A PERMANENT COLLECTION",
      quote: "Our whole winter, hung on the walls, just for you.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 2,
      room: "Memory Gallery",
      name: "North Gallery (Left)",
      title: "The Snowy Whispers",
      tag: "WINTER MEMORIES",
      quote: "You said you hated the cold, but you stayed outside with me anyway.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 3,
      room: "Memory Gallery",
      name: "North Gallery (Right)",
      title: "Quiet Bench by the Pines",
      tag: "WINTER MEMORIES",
      quote: "The quiet moments we shared while the world stood completely still.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 4,
      room: "Memory Gallery",
      name: "West Wing Wall",
      title: "Snowy Trails With You",
      tag: "JOURNEY",
      quote: "Every single path I walk, I want to walk with you.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 5,
      room: "Memory Gallery",
      name: "East Wing Wall",
      title: "Forever Beside You",
      tag: "ETERNAL",
      quote: "When time completely stopped and nothing else in this universe mattered.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 6,
      room: "Living Room",
      name: "Fireplace Overmantel",
      title: "Warm Hearth With You",
      tag: "LIVING ROOM",
      quote: "The cozy glow of our fireplace while the night winds blew outside.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 7,
      room: "Living Room",
      name: "Piano Lounge Wall",
      title: "Melody in the Evening",
      tag: "LIVING ROOM",
      quote: "Every romantic note played on the piano reminds me of your smile.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 8,
      room: "Entrance Hall",
      name: "Welcome Wall",
      title: "Welcome Home, My Love",
      tag: "ENTRANCE HALL",
      quote: "Coming home to you is my favourite part of every single day.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 9,
      room: "Dining Room",
      name: "Dining Feature Wall",
      title: "Candlelight & Laughter",
      tag: "DINING ROOM",
      quote: "The dinners that lasted for hours because we couldn't stop talking.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 10,
      room: "Master Bedroom",
      name: "King Bed Headboard",
      title: "Sweetest Dreams",
      tag: "MASTER BEDROOM",
      quote: "Falling asleep beside you and waking up to your morning glow.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 11,
      room: "Study & Library",
      name: "Library Desk Wall",
      title: "Our Next Chapter",
      tag: "STUDY & LIBRARY",
      quote: "All the dreams, plans, and stories we are writing together.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 12,
      room: "Balcony Terrace",
      name: "Sunset Alcove",
      title: "Under the Midnight Sky",
      tag: "BALCONY TERRACE",
      quote: "Standing under the stars together, breathing in the quiet night air.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 13,
      room: "Kitchen",
      name: "Breakfast Bar Corner",
      title: "Morning Brew & Gentle Smiles",
      tag: "KITCHEN CORNER",
      quote: "Fresh coffee brewing and your morning laughter filling the room.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 14,
      room: "Kitchen",
      name: "Recipe Alcove Wall",
      title: "The Recipe of Us",
      tag: "KITCHEN ALCOVE",
      quote: "Late night midnight snacks and dancing barefoot on the tiles.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 15,
      room: "Upper Landing",
      name: "Stair Landing Wall",
      title: "Steps We Walk Together",
      tag: "STAIR LANDING",
      quote: "Every step we take in this life, we take hand in hand.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 16,
      room: "Master Bedroom",
      name: "Vanity Alcove Wall",
      title: "Moonlit Whispers",
      tag: "BEDROOM ALCOVE",
      quote: "The quiet night hours when the universe narrows down to just us.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 17,
      room: "Living Room",
      name: "Living South Corner",
      title: "Golden Hour Moments",
      tag: "LIVING ROOM NOOK",
      quote: "Watching the sun paint warm gold across the floorboards with you.",
      sign: "Love, Ethan",
      imageData: null
    },
    {
      id: 18,
      room: "Garden & Porch",
      name: "Front Porch Wall",
      title: "Starlight Garden",
      tag: "GARDEN PORCH",
      quote: "Breathing the pine scent of evening under a canopy of countless stars.",
      sign: "Love, Ethan",
      imageData: null
    }
  ]
};

export let currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

export function setConfig(cfg) {
  currentConfig = cfg;
}

export function compressImage(file, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Treat config files, local storage and URL hashes as untrusted input.
export function deepMerge(target, source) {
  if (Array.isArray(target)) {
    return target.map((item, index) => deepMerge(item, Array.isArray(source) ? source[index] : undefined));
  }
  if (target && typeof target === 'object') {
    const input = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
    return Object.fromEntries(Object.keys(target).map(key => [key, deepMerge(target[key], input[key])]));
  }
  if (target === null) return validImageData(source) ? source : null;
  return typeof source === typeof target && (typeof source !== 'number' || Number.isFinite(source)) ? source : target;
}

export function validImageData(value) {
  return typeof value === 'string' && /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

export function loadSavedConfig() {
  try {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#cfg=')) {
      const b64 = hash.substring(5);
      const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(b64))));
      const parsed = JSON.parse(jsonStr);
      currentConfig = deepMerge(DEFAULT_CONFIG, parsed);
      return currentConfig;
    }
  } catch (err) {
    console.warn('Could not parse config from URL hash:', err);
  }

  try {
    const stored = localStorage.getItem('3d_museum_config_v2');
    if (stored) {
      const parsed = JSON.parse(stored);
      currentConfig = deepMerge(DEFAULT_CONFIG, parsed);
      return currentConfig;
    }
  } catch (err) {
    console.warn('Could not read from localStorage:', err);
  }

  currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  return currentConfig;
}

export function saveConfig(cfg) {
  try {
    localStorage.setItem('3d_museum_config_v2', JSON.stringify(cfg));
    return true;
  } catch (err) {
    console.warn('localStorage save failed:', err);
    return false;
  }
}

