// Couple Museum Salons and Artwork Data (Our Museum 3D - Crafted by Hitesh Bohra)

export function createMemoryCanvas(title, subtitle, palette, style = 'landscape') {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 850;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Sky / Mood Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, palette.top || '#0d1527');
  grad.addColorStop(0.55, palette.mid || '#1a2744');
  grad.addColorStop(1, palette.bottom || '#33263a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Background Scenery based on style
  if (style === 'lake' || style === 'water') {
    // Water Reflection
    const waterGrad = ctx.createLinearGradient(0, canvas.height * 0.65, 0, canvas.height);
    waterGrad.addColorStop(0, palette.mid || '#1a2744');
    waterGrad.addColorStop(1, '#05070c');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, canvas.height * 0.65, canvas.width, canvas.height * 0.35);

    // Ripple Highlights
    ctx.strokeStyle = 'rgba(255, 230, 180, 0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 22; i++) {
      const y = canvas.height * 0.68 + i * 11;
      const w = 40 + Math.sin(i * 3.7) * 80;
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.5 - w, y);
      ctx.lineTo(canvas.width * 0.5 + w, y);
      ctx.stroke();
    }
  }

  // Mountain or Architectural Silhouette
  ctx.fillStyle = palette.mountain || '#0a0e18';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.72);
  ctx.lineTo(canvas.width * 0.22, canvas.height * 0.42);
  ctx.lineTo(canvas.width * 0.45, canvas.height * 0.62);
  ctx.lineTo(canvas.width * 0.78, canvas.height * 0.38);
  ctx.lineTo(canvas.width, canvas.height * 0.68);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();

  // Secondary closer ridge
  ctx.fillStyle = 'rgba(5, 7, 12, 0.55)';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.82);
  ctx.lineTo(canvas.width * 0.35, canvas.height * 0.60);
  ctx.lineTo(canvas.width * 0.65, canvas.height * 0.75);
  ctx.lineTo(canvas.width, canvas.height * 0.65);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();

  // Stars / Embers
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 110; i++) {
    const sx = Math.sin(i * 991) * 0.5 + 0.5;
    const sy = Math.cos(i * 337) * 0.5 + 0.5;
    ctx.globalAlpha = 0.25 + (i % 5) * 0.15;
    ctx.fillRect(sx * canvas.width, sy * (canvas.height * 0.55), 2.5, 2.5);
  }
  ctx.globalAlpha = 1.0;

  // Celestial Body (Sun / Moon / Hearth Glow)
  const moonX = canvas.width * 0.70;
  const moonY = canvas.height * 0.32;
  const moonGrad = ctx.createRadialGradient(moonX, moonY, 12, moonX, moonY, 140);
  moonGrad.addColorStop(0, palette.glow || '#ffe2a3');
  moonGrad.addColorStop(0.35, 'rgba(255, 226, 163, 0.4)');
  moonGrad.addColorStop(1, 'rgba(255, 226, 163, 0)');
  ctx.fillStyle = moonGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sharp Core Disc
  ctx.fillStyle = palette.disc || '#fff9e8';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
  ctx.fill();

  // Classical Museum Gilded Border Frame
  ctx.strokeStyle = '#c5a059';
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);

  // Corner Ornaments
  const drawCornerDiamond = (cx, cy, r) => {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
  };
  drawCornerDiamond(34, 34, 8);
  drawCornerDiamond(canvas.width - 34, 34, 8);
  drawCornerDiamond(34, canvas.height - 34, 8);
  drawCornerDiamond(canvas.width - 34, canvas.height - 34, 8);

  // Typography - High Resolution Serif Title & Subtitle
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px "Cormorant Garamond", Georgia, serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 10;
  ctx.fillText(title, canvas.width / 2, canvas.height * 0.86);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#e8d0a9';
  ctx.font = 'italic 26px Georgia, serif';
  ctx.letterSpacing = '1px';
  ctx.fillText(subtitle, canvas.width / 2, canvas.height * 0.92);

  return canvas.toDataURL('image/png');
}

// All salons share an identical photo set so every room has the same wall
// layout (same images in the same slots). Furniture/artefacts are applied only
// in the lobby.
const IDENTICAL_PHOTOS = [
  createMemoryCanvas('The Hearth at Twilight', 'St. Moritz • December', { top: '#1c100a', mid: '#381e13', bottom: '#61341c', glow: '#ff9d42', mountain: '#120905' }),
  createMemoryCanvas('Snowfall in the Pines', 'Zermatt Trails', { top: '#0b1424', mid: '#1f3354', bottom: '#415e85', glow: '#ffdd99', mountain: '#080d17' }),
  createMemoryCanvas('The Warm Woolen Scarf', 'Cozy Mornings', { top: '#18121f', mid: '#362447', bottom: '#593b73', glow: '#ffc785', mountain: '#100a14' }),
  createMemoryCanvas('Cabin by the Frozen Lake', 'Quiet Solitude', { top: '#08111f', mid: '#162945', bottom: '#2f496e', glow: '#ffe0a8', mountain: '#040912' }, 'lake'),
  createMemoryCanvas('Embers in the Hearth', 'Midnight Glow', { top: '#1f0d08', mid: '#421a10', bottom: '#7a2f1a', glow: '#ffa352', mountain: '#140704' }),
  createMemoryCanvas('Winter Lantern Walk', 'Old Village Pathways', { top: '#0d1829', mid: '#1c2f4d', bottom: '#3c5a85', glow: '#ffd680', mountain: '#080f1a' }),
  createMemoryCanvas('Frost on the Balcony', 'First Morning Chill', { top: '#0a1624', mid: '#192b45', bottom: '#38547a', glow: '#d6edff', mountain: '#050c14' }),
  createMemoryCanvas('Alpine Twilight Glow', 'Matterhorn Silhouette', { top: '#141026', mid: '#2c224a', bottom: '#563f80', glow: '#ffbe85', mountain: '#0e0a1c' }),
  createMemoryCanvas('Steam Over Hot Cocoa', 'Sunday Warmth', { top: '#1c1510', mid: '#382a1e', bottom: '#614833', glow: '#ffc98a', mountain: '#120c08' }),
  createMemoryCanvas('Snow Blanket on the Roof', 'Winter Slumber', { top: '#09131f', mid: '#17273d', bottom: '#304969', glow: '#e8f3ff', mountain: '#050a12' })
]

export const coupleSalons = {
  'Fireside Winter Memories': {
    title: 'Fireside Winter Memories',
    extract: 'Warm hearths, snowy pines, and quiet evenings where the outside world faded away into embers and candlelight.',
    longExtract: '✦ Present your private invitation pass to reveal Ethan and Maya\'s personal letter for this salon ✦',
    mainThumbnailUrl: null,
    photos: IDENTICAL_PHOTOS,
    seeAlso: ['Music & Classical Melodies', 'The Library & Reading Nook', 'Masterpiece Paris Romance', 'The Glass Orangery', 'The Secret Promise Alcove']
  },

  'Music & Classical Melodies': {
    title: 'Music & Classical Melodies',
    extract: 'Chopin nocturnes on the grand piano, acoustic acoustics, and the songs that became the soundtrack to our life.',
    longExtract: '✦ Present your private invitation pass to reveal Ethan and Maya\'s personal letter for this salon ✦',
    mainThumbnailUrl: null,
    photos: IDENTICAL_PHOTOS,
    seeAlso: ['Fireside Winter Memories', 'The Library & Reading Nook', 'The Glass Orangery', 'The Secret Promise Alcove']
  },

  'The Library & Reading Nook': {
    title: 'The Library & Reading Nook',
    extract: 'Floor-to-ceiling walnut bookcases, quiet afternoon sunlight, and the stories we shared over warm coffee.',
    longExtract: '✦ Present your private invitation pass to reveal Ethan and Maya\'s personal letter for this salon ✦',
    mainThumbnailUrl: null,
    photos: IDENTICAL_PHOTOS,
    seeAlso: ['Fireside Winter Memories', 'Masterpiece Paris Romance', 'The Secret Promise Alcove']
  },

  'Masterpiece Paris Romance': {
    title: 'Masterpiece Paris Romance',
    extract: 'The lights along the Seine, the steps of Montmartre, and holding hands under the midnight rain.',
    longExtract: '✦ Present your private invitation pass to reveal Ethan and Maya\'s personal letter for this salon ✦',
    mainThumbnailUrl: null,
    photos: IDENTICAL_PHOTOS,
    seeAlso: ['Fireside Winter Memories', 'The Glass Orangery', 'The Secret Promise Alcove']
  },

  'The Glass Orangery': {
    title: 'The Glass Orangery',
    extract: 'Lush architectural palms, starlit glass skylights, and fragrant botanical warmth against the winter chill.',
    longExtract: '✦ Present your private invitation pass to reveal Ethan and Maya\'s personal letter for this salon ✦',
    mainThumbnailUrl: null,
    photos: IDENTICAL_PHOTOS,
    seeAlso: ['Fireside Winter Memories', 'Music & Classical Melodies', 'The Secret Promise Alcove']
  },

  'The Secret Promise Alcove': {
    title: 'The Secret Promise Alcove',
    extract: 'Hidden behind the revolving library bookcase. A private sanctuary built for two hearts.',
    longExtract: '✦ Present your private invitation pass to reveal Ethan and Maya\'s personal letter for this salon ✦',
    mainThumbnailUrl: null,
    photos: IDENTICAL_PHOTOS,
    seeAlso: ['Fireside Winter Memories', 'Masterpiece Paris Romance', 'The Glass Orangery']
  }
};

export const coupleCategories = [
  'Fireside Winter Memories',
  'Music & Classical Melodies',
  'The Library & Reading Nook',
  'Masterpiece Paris Romance',
  'The Glass Orangery',
  'The Secret Promise Alcove'
];

export const ROOM_KEY_TO_TITLE = {
  fireside: 'Fireside Winter Memories',
  music: 'Music & Classical Melodies',
  library: 'The Library & Reading Nook',
  paris: 'Masterpiece Paris Romance',
  orangery: 'The Glass Orangery',
  alcove: 'The Secret Promise Alcove',
};

export const TITLE_TO_ROOM_KEY = Object.fromEntries(
  Object.entries(ROOM_KEY_TO_TITLE).map(([k, v]) => [v, k])
);
