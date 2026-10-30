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

export const coupleSalons = {
  'Fireside Winter Memories': {
    title: 'Fireside Winter Memories',
    extract: 'Warm hearths, snowy pines, and quiet evenings where the outside world faded away into embers and candlelight.',
    longExtract: 'From Ethan to Maya: "You said you hated the cold, but you stayed outside with me in the winter woods anyway, wrapped in oversized blankets. I remember the smell of cedar in the fireplace and how you smiled when the sparks flew upward. This salon holds every winter we have lived together."',
    mainThumbnailUrl: null,
    photos: [
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
    ],
    seeAlso: ['Music & Classical Melodies', 'The Library & Reading Nook', 'Masterpiece Paris Romance', 'The Glass Orangery', 'The Secret Promise Alcove']
  },

  'Music & Classical Melodies': {
    title: 'Music & Classical Melodies',
    extract: 'Chopin nocturnes on the grand piano, acoustic acoustics, and the songs that became the soundtrack to our life.',
    longExtract: 'From Ethan to Maya: "Every time you sat by the piano, the noise of the day seemed to dissolve. Even when you were just playing scales or humming along to an old vinyl record, the room felt lighter. This conservatory is built with resonant mahogany and strings."',
    mainThumbnailUrl: null,
    photos: [
      createMemoryCanvas('Nocturne in E-Flat', 'Grand Piano at Dusk', { top: '#140c1c', mid: '#2d183d', bottom: '#542966', glow: '#ffcc7a', mountain: '#0d0712' }),
      createMemoryCanvas('The Vintage Turntable', '33 RPM in Autumn', { top: '#1c160c', mid: '#382a15', bottom: '#5e431f', glow: '#ffd685', mountain: '#120d06' }),
      createMemoryCanvas('Candlelit Adagio', 'Vienna Conservatory', { top: '#171221', mid: '#322342', bottom: '#5c3e69', glow: '#ffc594', mountain: '#0f0a17' }),
      createMemoryCanvas('Violin by the Window', 'Rainy Symphony', { top: '#0d131f', mid: '#1d2c45', bottom: '#3c5378', glow: '#ffe5a3', mountain: '#060a12' }),
      createMemoryCanvas('Clair de Lune Nocturne', 'Moonlit Keys', { top: '#09101f', mid: '#152442', bottom: '#2f4978', glow: '#e3f0ff', mountain: '#050a14' }, 'lake'),
      createMemoryCanvas('Acoustic Strings at Sunset', 'Balcony Chords', { top: '#1f130c', mid: '#3d2516', bottom: '#693c20', glow: '#ffa857', mountain: '#140b06' }),
      createMemoryCanvas('The Cello Suite', 'Deep Resonances', { top: '#140f1a', mid: '#2a1e36', bottom: '#4d345e', glow: '#ffd199', mountain: '#0d0912' }),
      createMemoryCanvas('Sheet Music in the Breeze', 'Unfinished Melody', { top: '#111724', mid: '#223047', bottom: '#40567a', glow: '#ffdfa3', mountain: '#090e17' }),
      createMemoryCanvas('First Dance Waltz', 'Vienna Ball', { top: '#1c111e', mid: '#3b223f', bottom: '#66396e', glow: '#ffc48c', mountain: '#120a14' }),
      createMemoryCanvas('Late Night Harmonies', 'Song for Two', { top: '#080d1c', mid: '#131e3d', bottom: '#283c6e', glow: '#fedaa8', mountain: '#040712' })
    ],
    seeAlso: ['Fireside Winter Memories', 'The Library & Reading Nook', 'The Glass Orangery', 'The Secret Promise Alcove']
  },

  'The Library & Reading Nook': {
    title: 'The Library & Reading Nook',
    extract: 'Floor-to-ceiling walnut bookcases, quiet afternoon sunlight, and the stories we shared over warm coffee.',
    longExtract: 'From Ethan to Maya: "Our favorite afternoons were always the simplest: two armchairs, rain tapping against tall windows, and hours where neither of us felt the need to speak because just being in the same room was enough."',
    mainThumbnailUrl: null,
    photos: [
      createMemoryCanvas('Pages in the Sunbeam', 'Afternoon Coffee', { top: '#18140e', mid: '#332617', bottom: '#593f24', glow: '#ffdb8a', mountain: '#100c08' }),
      createMemoryCanvas('Rainy Window Nook', 'London September', { top: '#0e1520', mid: '#1e2d42', bottom: '#3c5478', glow: '#ffd699', mountain: '#080c14' }),
      createMemoryCanvas('The Antique Atlas', 'Plotting Next Adventures', { top: '#1b1319', mid: '#382332', bottom: '#5e3752', glow: '#ffcfa8', mountain: '#120b10' }),
      createMemoryCanvas('Quiet Reading Chair', 'Evening Lamp', { top: '#19150d', mid: '#382d19', bottom: '#614c27', glow: '#ffe094', mountain: '#100c06' }),
      createMemoryCanvas('First Edition Poetry', 'Underlined Verses', { top: '#14181f', mid: '#25303d', bottom: '#475769', glow: '#ffdfaa', mountain: '#0c1014' }),
      createMemoryCanvas('The Rolling Library Ladder', 'Top Shelf Treasures', { top: '#1c150c', mid: '#3b2a15', bottom: '#694720', glow: '#ffd180', mountain: '#120c06' }),
      createMemoryCanvas('Tea Cup and Bookmark', 'Chapter Forty-Two', { top: '#1a1215', mid: '#36232b', bottom: '#5c3947', glow: '#ffc999', mountain: '#100a0d' }),
      createMemoryCanvas('Old Bookshop Alley', 'Saint-Germain Cobblestones', { top: '#0f1422', mid: '#1f2c45', bottom: '#3d527a', glow: '#fed894', mountain: '#080c17' }),
      createMemoryCanvas('Pressed Rose in the Ledger', 'Summer Keepsake', { top: '#1e1114', mid: '#3d2028', bottom: '#6b3341', glow: '#ffb594', mountain: '#140a0d' }),
      createMemoryCanvas('Midnight by the Study Lamp', 'Writing Our Story', { top: '#0b101c', mid: '#17223b', bottom: '#30426b', glow: '#ffe3a8', mountain: '#060a12' })
    ],
    seeAlso: ['Fireside Winter Memories', 'Masterpiece Paris Romance', 'The Secret Promise Alcove']
  },

  'Masterpiece Paris Romance': {
    title: 'Masterpiece Paris Romance',
    extract: 'The lights along the Seine, the steps of Montmartre, and holding hands under the midnight rain.',
    longExtract: 'From Ethan to Maya: "Paris is beautiful, but Paris with you felt like stepping inside an Impressionist canvas. The reflections of streetlamps on wet cobblestones, the taste of warm croissants, and the way you looked at the city from the bridge."',
    mainThumbnailUrl: null,
    photos: [
      createMemoryCanvas('Midnight Along the Seine', 'Pont des Arts', { top: '#0c1324', mid: '#192b4d', bottom: '#354e7d', glow: '#ffd980', mountain: '#060a14' }, 'lake'),
      createMemoryCanvas('Steps of Montmartre', 'Golden Hour', { top: '#1e141a', mid: '#422435', bottom: '#703a57', glow: '#ffc285', mountain: '#140c11' }),
      createMemoryCanvas('The Louvre Courtyard', 'Under Glass & Stars', { top: '#111828', mid: '#253554', bottom: '#485e8a', glow: '#ffe2a3', mountain: '#090d17' }),
      createMemoryCanvas('Bistro Candlelight', 'Rue Saint-Louis', { top: '#1f130e', mid: '#422519', bottom: '#6e3a24', glow: '#ffa85c', mountain: '#140b08' }),
      createMemoryCanvas('Sacré-Cœur Dawn', 'Above the Waking City', { top: '#1d1222', mid: '#3b2345', bottom: '#6b3a7a', glow: '#ffcc94', mountain: '#120a16' }),
      createMemoryCanvas('Rain on the Pont Alexandre III', 'Gilded Cherubs', { top: '#0c1626', mid: '#1a2e4c', bottom: '#375782', glow: '#ffd580', mountain: '#060d17' }, 'lake'),
      createMemoryCanvas('Café Terrace in Spring', 'Two Espressos', { top: '#1c170d', mid: '#3b2f18', bottom: '#665026', glow: '#fedca3', mountain: '#120e07' }),
      createMemoryCanvas('Tuileries Autumn Leaves', 'Orange Walkways', { top: '#1e140d', mid: '#3d2616', bottom: '#6b3f20', glow: '#ffa84d', mountain: '#140c06' }),
      createMemoryCanvas('Eiffel Tower Starlight', 'Sparkling at 11 PM', { top: '#090d1f', mid: '#141e3d', bottom: '#2a3d70', glow: '#ffeaad', mountain: '#040714' }),
      createMemoryCanvas('The Secret Garden of Marais', 'Hidden Courtyard', { top: '#0f1c1a', mid: '#1d3832', bottom: '#365e52', glow: '#d6ffd9', mountain: '#08100e' })
    ],
    seeAlso: ['Fireside Winter Memories', 'The Glass Orangery', 'The Secret Promise Alcove']
  },

  'The Glass Orangery': {
    title: 'The Glass Orangery',
    extract: 'Lush architectural palms, starlit glass skylights, and fragrant botanical warmth against the winter chill.',
    longExtract: 'From Ethan to Maya: "Even in the coldest months of winter, this glass pavilion stays green and alive. It is a reminder that no matter what season the world outside is in, inside our home there is always warmth and growth."',
    mainThumbnailUrl: null,
    photos: [
      createMemoryCanvas('Palms Under Starlight', 'Glass Pavilion', { top: '#0a1618', mid: '#153133', bottom: '#2d5452', glow: '#c9f2d0', mountain: '#050d0e' }),
      createMemoryCanvas('Winter Botanical Walk', 'Orchid & Ferns', { top: '#0d1a18', mid: '#1c362f', bottom: '#37594a', glow: '#d4ffd9', mountain: '#070f0e' }),
      createMemoryCanvas('Frost on the Skylight', 'Constellations Above', { top: '#0c1524', mid: '#1b2d47', bottom: '#355078', glow: '#e2f0ff', mountain: '#060b14' }),
      createMemoryCanvas('Sunlight on Citrus Trees', 'Morning Glow', { top: '#171a0e', mid: '#32361a', bottom: '#575c27', glow: '#f7ffa8', mountain: '#0e1007' }),
      createMemoryCanvas('The Central Marble Fountain', 'Rippling Water', { top: '#0a1a1f', mid: '#16353d', bottom: '#2c5963', glow: '#bdf2e8', mountain: '#051014' }, 'lake'),
      createMemoryCanvas('Victorian Glass Dome', 'Architectural Splendor', { top: '#0f1724', mid: '#202f45', bottom: '#3e5578', glow: '#ffe0a8', mountain: '#080d17' }),
      createMemoryCanvas('White Orchids in Bloom', 'Winter Fragrance', { top: '#151520', mid: '#2a2b3d', bottom: '#4b4c63', glow: '#fff2db', mountain: '#0d0d14' }),
      createMemoryCanvas('Spiral Wrought-Iron Stairs', 'Climbing to the Gallery', { top: '#141a12', mid: '#263321', bottom: '#445738', glow: '#e5fed4', mountain: '#0b100a' }),
      createMemoryCanvas('Monstera and Sunlight', 'Geometric Shadows', { top: '#0c1813', mid: '#173024', bottom: '#2d523c', glow: '#c4fed3', mountain: '#060d0a' }),
      createMemoryCanvas('Twilight in the Conservatory', 'Candles Among Foliage', { top: '#17131c', mid: '#302438', bottom: '#523c5e', glow: '#ffd69e', mountain: '#0e0b12' })
    ],
    seeAlso: ['Fireside Winter Memories', 'Music & Classical Melodies', 'The Secret Promise Alcove']
  },

  'The Secret Promise Alcove': {
    title: 'The Secret Promise Alcove',
    extract: 'Hidden behind the revolving library bookcase. A private sanctuary built for two hearts.',
    longExtract: 'From Ethan to Maya: "You found the hidden alcove. Some promises don\'t need to be spoken out loud to the world; they are kept quietly in private places like this. My promise to you is simple: wherever we go, and whatever changes, I will stand beside you, love you, and choose you, every day."',
    mainThumbnailUrl: null,
    photos: [
      createMemoryCanvas('The Promise Under Stars', 'Our Forever', { top: '#0e0b1c', mid: '#251b3d', bottom: '#482e69', glow: '#ffd699', mountain: '#090614' }),
      createMemoryCanvas('Two Rings, One Journey', 'Golden Horizon', { top: '#1c1214', mid: '#3d2024', bottom: '#6b3238', glow: '#ffb38a', mountain: '#120a0c' }),
      createMemoryCanvas('Whispers in the Lanternlight', 'Secret Sanctuary', { top: '#18140c', mid: '#362a14', bottom: '#5c431b', glow: '#ffd980', mountain: '#100b06' }),
      createMemoryCanvas('The Starlit Promise', 'Ethan & Maya', { top: '#0b1021', mid: '#192545', bottom: '#344773', glow: '#ffe5a8', mountain: '#060914' }),
      createMemoryCanvas('The Golden Key', 'Unlock the Future', { top: '#1c160b', mid: '#382a13', bottom: '#5e431a', glow: '#ffde7a', mountain: '#120d05' }),
      createMemoryCanvas('Handwritten Vows', 'Sealed with Wax', { top: '#1b1216', mid: '#38222b', bottom: '#5e3645', glow: '#ffc7a3', mountain: '#120a0d' }),
      createMemoryCanvas('The Secret Courtyard Arch', 'Ivy & Rose Petals', { top: '#121914', mid: '#243327', bottom: '#3f5742', glow: '#e0fed6', mountain: '#0a100c' }),
      createMemoryCanvas('Constellation of Two', 'Mapped in the Sky', { top: '#070c1a', mid: '#111c38', bottom: '#243769', glow: '#fedea3', mountain: '#030612' }),
      createMemoryCanvas('The Eternal Flame', 'Keepsake Lantern', { top: '#1f110a', mid: '#3d2012', bottom: '#69331b', glow: '#ffa84d', mountain: '#140a05' }),
      createMemoryCanvas('A Lifetime of Tomorrow', 'Our Sanctuary', { top: '#141124', mid: '#292245', bottom: '#4b3d75', glow: '#ffcba8', mountain: '#0c0917' })
    ],
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
