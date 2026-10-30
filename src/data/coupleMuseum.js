// Couple Museum Salons and Artwork Data for notbigmuzzy baseline

function createMemoryCanvas(title, subtitle, palette) {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Sky / Mood Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, palette.top || '#0d1527');
  grad.addColorStop(0.55, palette.mid || '#1a2744');
  grad.addColorStop(1, palette.bottom || '#33263a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Distant Mountain Silhouette
  ctx.fillStyle = palette.mountain || '#0a0e18';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.75);
  ctx.lineTo(canvas.width * 0.25, canvas.height * 0.45);
  ctx.lineTo(canvas.width * 0.5, canvas.height * 0.65);
  ctx.lineTo(canvas.width * 0.8, canvas.height * 0.4);
  ctx.lineTo(canvas.width, canvas.height * 0.7);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();

  // Stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) {
    const sx = Math.sin(i * 991) * 0.5 + 0.5;
    const sy = Math.cos(i * 337) * 0.5 + 0.5;
    ctx.globalAlpha = 0.3 + (i % 5) * 0.15;
    ctx.fillRect(sx * canvas.width, sy * (canvas.height * 0.55), 2.5, 2.5);
  }
  ctx.globalAlpha = 1.0;

  // Golden Glow / Sun / Moon
  const moonGrad = ctx.createRadialGradient(
    canvas.width * 0.72, canvas.height * 0.35, 10,
    canvas.width * 0.72, canvas.height * 0.35, 120
  );
  moonGrad.addColorStop(0, palette.glow || '#ffe2a3');
  moonGrad.addColorStop(1, 'rgba(255, 226, 163, 0)');
  ctx.fillStyle = moonGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border Frame
  ctx.strokeStyle = '#c4a470';
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

  // Typography
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(title, canvas.width / 2, canvas.height * 0.86);

  ctx.fillStyle = '#e8d0a9';
  ctx.font = 'italic 26px Georgia, serif';
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
      createMemoryCanvas('Cabin by the Frozen Lake', 'Quiet Solitude', { top: '#08111f', mid: '#162945', bottom: '#2f496e', glow: '#ffe0a8', mountain: '#040912' })
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
      createMemoryCanvas('Violin by the Window', 'Rainy Symphony', { top: '#0d131f', mid: '#1d2c45', bottom: '#3c5378', glow: '#ffe5a3', mountain: '#060a12' })
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
      createMemoryCanvas('Quiet Reading Chair', 'Evening Lamp', { top: '#19150d', mid: '#382d19', bottom: '#614c27', glow: '#ffe094', mountain: '#100c06' })
    ],
    seeAlso: ['Fireside Winter Memories', 'Masterpiece Paris Romance', 'The Secret Promise Alcove']
  },

  'Masterpiece Paris Romance': {
    title: 'Masterpiece Paris Romance',
    extract: 'The lights along the Seine, the steps of Montmartre, and holding hands under the midnight rain.',
    longExtract: 'From Ethan to Maya: "Paris is beautiful, but Paris with you felt like stepping inside an Impressionist canvas. The reflections of streetlamps on wet cobblestones, the taste of warm croissants, and the way you looked at the city from the bridge."',
    mainThumbnailUrl: null,
    photos: [
      createMemoryCanvas('Midnight Along the Seine', 'Pont des Arts', { top: '#0c1324', mid: '#192b4d', bottom: '#354e7d', glow: '#ffd980', mountain: '#060a14' }),
      createMemoryCanvas('Steps of Montmartre', 'Golden Hour', { top: '#1e141a', mid: '#422435', bottom: '#703a57', glow: '#ffc285', mountain: '#140c11' }),
      createMemoryCanvas('The Louvre Courtyard', 'Under Glass & Stars', { top: '#111828', mid: '#253554', bottom: '#485e8a', glow: '#ffe2a3', mountain: '#090d17' }),
      createMemoryCanvas('Bistro Candlelight', 'Rue Saint-Louis', { top: '#1f130e', mid: '#422519', bottom: '#6e3a24', glow: '#ffa85c', mountain: '#140b08' })
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
      createMemoryCanvas('Sunlight on Citrus Trees', 'Morning Glow', { top: '#171a0e', mid: '#32361a', bottom: '#575c27', glow: '#f7ffa8', mountain: '#0e1007' })
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
      createMemoryCanvas('The Starlit Promise', 'Ethan & Maya', { top: '#0b1021', mid: '#192545', bottom: '#344773', glow: '#ffe5a8', mountain: '#060914' })
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

