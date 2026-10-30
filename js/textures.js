/* =========================================================================
   OUR HOME • PROCEDURAL ARCHITECTURAL TEXTURES & GALLERY MASTERPIECES
   ========================================================================= */

import * as THREE from 'three';

/**
 * Creates high-res herringbone oak parquet floor texture
 */
export function createHardwoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Base warm honey oak
  ctx.fillStyle = '#ad8b67';
  ctx.fillRect(0, 0, 1024, 1024);

  // Draw herringbone planks
  const plankW = 64;
  const plankH = 256;
  const shades = ['#ad8b67', '#b49775', '#aa8765', '#bda080', '#a98a6b'];

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#8c7258';

  for (let y = -plankH; y < 1024 + plankH; y += plankW * 2) {
    for (let x = -plankH; x < 1024 + plankH; x += plankW * 2) {
      // Horizontal / 45-deg herringbone plank
      const shade = shades[Math.floor(Math.abs(Math.sin(x * 12 + y * 7)) * shades.length)];
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, plankH, plankW);
      ctx.strokeRect(x, y, plankH, plankW);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(60, 35, 15, 0.15)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 4; g++) {
        const gy = y + 10 + g * 12;
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.bezierCurveTo(x + 80, gy + Math.sin(x) * 3, x + 160, gy - Math.cos(y) * 3, x + plankH, gy);
        ctx.stroke();
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#8c7258';
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  return tex;
}

/**
 * Creates Venetian gallery plaster wall texture with subtle warmth
 */
export function createPlasterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f3ede2';
  ctx.fillRect(0, 0, 512, 512);

  // Soft organic stippling
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 1.5 + 0.5;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(215, 205, 190, 0.35)' : 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 3);
  return tex;
}

/**
 * Creates Carrara white marble with soft grey & golden veining
 */
export function createMarbleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base soft milky white
  ctx.fillStyle = '#f8f7f4';
  ctx.fillRect(0, 0, 512, 512);

  // Veins
  ctx.lineWidth = 2;
  for (let v = 0; v < 7; v++) {
    ctx.strokeStyle = v % 2 === 0 ? 'rgba(175, 172, 168, 0.45)' : 'rgba(195, 175, 140, 0.30)';
    ctx.beginPath();
    let cx = Math.random() * 512;
    let cy = 0;
    ctx.moveTo(cx, cy);
    while (cy < 512) {
      cx += (Math.random() - 0.5) * 45;
      cy += Math.random() * 50 + 20;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates architectural coffered ceiling texture with warm cove LED perimeter glow
 */
export function createCeilingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Warm off-white ceiling field
  ctx.fillStyle = '#ece8e1';
  ctx.fillRect(0, 0, 512, 512);

  // Recessed panel
  ctx.fillStyle = '#f4f0ea';
  ctx.fillRect(32, 32, 448, 448);

  // Warm LED cove glow edge
  ctx.strokeStyle = 'rgba(255, 225, 170, 0.65)';
  ctx.lineWidth = 5;
  ctx.strokeRect(32, 32, 448, 448);

  // Wooden molding frame
  ctx.strokeStyle = '#b7ad9c';
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, 480, 480);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/**
 * Creates luxury Persian / oriental ornamental wool carpet
 */
export function createRugTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  // Rich warm terracotta & cream
  ctx.fillStyle = '#747d71';
  ctx.fillRect(0, 0, 512, 768);

  // Ornate cream border
  ctx.strokeStyle = '#e8d4b0';
  ctx.lineWidth = 24;
  ctx.strokeRect(20, 20, 472, 728);

  ctx.strokeStyle = '#505a50';
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, 432, 688);

  // Center medallion
  ctx.fillStyle = '#e8d4b0';
  ctx.beginPath();
  ctx.ellipse(256, 384, 110, 160, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#747d71';
  ctx.beginPath();
  ctx.ellipse(256, 384, 80, 120, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fringe at top and bottom
  ctx.fillStyle = '#f0eadc';
  for (let f = 0; f < 512; f += 8) {
    ctx.fillRect(f, 0, 4, 12);
    ctx.fillRect(f, 756, 4, 12);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates an impressionist, gallery-grade fine art painting for each slot
 */
export function createRomanticPainting(slotId, title, tag, quote) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');

  // Palette selection based on slot mood
  const moodPalettes = [
    // 0. Winter cottage starlight (Centerpiece Slot 1)
    { sky: ['#0b1123', '#1e2947', '#423d5a'], ground: '#eef2f7', light: '#ffbe6b', type: 'chalet' },
    // 1. Snowy forest path (Slot 2)
    { sky: ['#0f172a', '#223254', '#7088a8'], ground: '#e5ecf5', light: '#ffd180', type: 'pines' },
    // 2. Lake by pine bench (Slot 3)
    { sky: ['#1a1932', '#3d3056', '#9c6f84'], ground: '#455060', light: '#ffc17a', type: 'lake' },
    // 3. Snowy mountain pass (Slot 4)
    { sky: ['#0c1427', '#253e6b', '#84a6c8'], ground: '#f0f5fa', light: '#ffa366', type: 'mountains' },
    // 4. Golden coastal horizon (Slot 5)
    { sky: ['#1d1933', '#683a5e', '#df8b6a'], ground: '#2e3a4e', light: '#ffe8a3', type: 'ocean' },
    // 5. Fireside hearth (Slot 6)
    { sky: ['#1c120c', '#382013', '#66391d'], ground: '#26150b', light: '#ff7b2b', type: 'hearth' },
    // 6. Grand piano & chandelier (Slot 7)
    { sky: ['#0e111a', '#1e2230', '#3a3a4e'], ground: '#14161f', light: '#ffd580', type: 'piano' },
    // 7. Warm cottage doorway (Slot 8)
    { sky: ['#101524', '#26314d', '#586480'], ground: '#383b42', light: '#ffc15e', type: 'doorway' },
    // 8. Candlelit romantic dining (Slot 9)
    { sky: ['#180e14', '#361b28', '#632943'], ground: '#2b1b16', light: '#ffa842', type: 'dining' },
    // 9. Moonlit linen bed (Slot 10)
    { sky: ['#0c1122', '#1a2440', '#3b4a6b'], ground: '#eee8dc', light: '#a6c8ff', type: 'bedroom' },
    // 10. Ancient library & stars (Slot 11)
    { sky: ['#11121c', '#222335', '#4a4459'], ground: '#261914', light: '#e8c078', type: 'library' },
    // 11. Starlit cosmos balcony (Slot 12)
    { sky: ['#070814', '#151433', '#39285c'], ground: '#181b29', light: '#fffae0', type: 'cosmos' },
    // 12. Morning coffee bar (Slot 13)
    { sky: ['#28201a', '#544133', '#a88665'], ground: '#423327', light: '#ffe4b5', type: 'coffee' },
    // 13. Rustic kitchen baking (Slot 14)
    { sky: ['#241a15', '#483528', '#8a684c'], ground: '#33231a', light: '#ffcf8a', type: 'kitchen' },
    // 14. Stone stair lanterns (Slot 15)
    { sky: ['#131a2b', '#273859', '#547094'], ground: '#363d4a', light: '#ffc862', type: 'stairs' },
    // 15. Moonlit reading vanity (Slot 16)
    { sky: ['#0e1220', '#1c253d', '#3f4f73'], ground: '#e8e2d5', light: '#b8d6ff', type: 'vanity' },
    // 16. Radiant golden hour sunbeams (Slot 17)
    { sky: ['#2e1b10', '#63371a', '#c77836'], ground: '#78461f', light: '#ffdf87', type: 'sunbeam' },
    // 17. Starlight garden pergola (Slot 18)
    { sky: ['#090d1c', '#172242', '#36496e'], ground: '#1f2e22', light: '#ffeaa1', type: 'garden' }
  ];

  const p = moodPalettes[(slotId - 1) % moodPalettes.length];

  // 1. Sky Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 1000);
  grad.addColorStop(0, p.sky[0]);
  grad.addColorStop(0.55, p.sky[1]);
  grad.addColorStop(1, p.sky[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 1000);

  // 2. Stars & Celestial Twinkle
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 180; i++) {
    const sx = Math.random() * 800;
    const sy = Math.random() * 550;
    const sr = Math.random() * 1.8 + 0.3;
    ctx.globalAlpha = Math.random() * 0.75 + 0.25;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // 3. Romantic Glowing Moon / Warm Sun
  const moonGrad = ctx.createRadialGradient(620, 220, 10, 620, 220, 110);
  moonGrad.addColorStop(0, '#ffffff');
  moonGrad.addColorStop(0.3, p.light);
  moonGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(620, 220, 110, 0, Math.PI * 2);
  ctx.fill();

  // 4. Distant Mountain Silhouettes / Forest
  ctx.fillStyle = 'rgba(18, 22, 35, 0.75)';
  ctx.beginPath();
  ctx.moveTo(0, 680);
  ctx.lineTo(160, 520);
  ctx.lineTo(340, 580);
  ctx.lineTo(540, 460);
  ctx.lineTo(720, 540);
  ctx.lineTo(800, 480);
  ctx.lineTo(800, 1000);
  ctx.lineTo(0, 1000);
  ctx.fill();

  // 5. Pine Tree Silhouettes
  ctx.fillStyle = '#0d131f';
  for (let t = 0; t < 14; t++) {
    const tx = t * 62 + (Math.sin(t * 5) * 18);
    const th = 140 + (Math.cos(t * 3) * 45);
    const ty = 700 - th;
    for (let layer = 0; layer < 4; layer++) {
      ctx.beginPath();
      ctx.moveTo(tx, ty + layer * 28);
      ctx.lineTo(tx - 28 - layer * 7, ty + layer * 34 + 38);
      ctx.lineTo(tx + 28 + layer * 7, ty + layer * 34 + 38);
      ctx.fill();
    }
  }

  // 6. Ground Snow / Landscape
  ctx.fillStyle = p.ground;
  ctx.beginPath();
  ctx.moveTo(0, 720);
  ctx.bezierCurveTo(240, 700, 560, 740, 800, 710);
  ctx.lineTo(800, 1000);
  ctx.lineTo(0, 1000);
  ctx.fill();

  // 7. Warm glowing cottage / lantern focal point
  const cottageX = 380;
  const cottageY = 660;
  // Cottage silhouette
  ctx.fillStyle = '#181216';
  ctx.fillRect(cottageX, cottageY, 110, 75);
  ctx.beginPath();
  ctx.moveTo(cottageX - 16, cottageY);
  ctx.lineTo(cottageX + 55, cottageY - 48);
  ctx.lineTo(cottageX + 126, cottageY);
  ctx.fill();

  // Glowing amber windows
  ctx.fillStyle = p.light;
  ctx.shadowColor = p.light;
  ctx.shadowBlur = 24;
  ctx.fillRect(cottageX + 20, cottageY + 22, 28, 30);
  ctx.fillRect(cottageX + 62, cottageY + 22, 28, 30);
  ctx.shadowBlur = 0;

  // Window panes
  ctx.strokeStyle = '#181216';
  ctx.lineWidth = 3;
  ctx.strokeRect(cottageX + 20, cottageY + 22, 28, 30);
  ctx.strokeRect(cottageX + 62, cottageY + 22, 28, 30);

  // Couple silhouette standing holding hands
  ctx.fillStyle = '#0a0a0f';
  // Maya
  ctx.beginPath();
  ctx.arc(280, 722, 9, 0, Math.PI * 2); // head
  ctx.fill();
  ctx.fillRect(274, 731, 12, 32); // coat
  // Ethan
  ctx.beginPath();
  ctx.arc(302, 718, 10, 0, Math.PI * 2); // head
  ctx.fill();
  ctx.fillRect(296, 728, 14, 35); // coat

  // 8. Elegant Fine-Art Typography Plaque Header
  const scrimGrad = ctx.createLinearGradient(0, 0, 0, 220);
  scrimGrad.addColorStop(0, 'rgba(8, 10, 16, 0.90)');
  scrimGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = scrimGrad;
  ctx.fillRect(0, 0, 800, 220);

  // Category Tag
  ctx.fillStyle = '#e8d0a9';
  ctx.font = '600 18px Inter, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.textAlign = 'center';
  ctx.fillText((tag || 'A PERMANENT COLLECTION').toUpperCase(), 400, 52);

  // Artwork Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 44px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(title || 'Exhibition Piece', 400, 105);

  // Gold separator line
  ctx.strokeStyle = 'rgba(232, 208, 169, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(310, 128);
  ctx.lineTo(490, 128);
  ctx.stroke();

  // Love Quote Preview
  if (quote) {
    ctx.fillStyle = '#dcd7cb';
    ctx.font = 'italic 19px "Cormorant Garamond", Georgia, serif';
    const dispQ = quote.length > 50 ? quote.substring(0, 48) + '...' : quote;
    ctx.fillText(`"${dispQ}"`, 400, 162);
  }

  // Subtle vignette border
  ctx.strokeStyle = 'rgba(232, 208, 169, 0.35)';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 776, 976);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

