/* =========================================================================
   OUR HOME 3D • POLAROID PHOTO SOUVENIR KEEPSAKE GENERATOR
   Captures high-resolution canvas snapshot and frames as custom physical Polaroid card
   ========================================================================= */

import { getConfig } from './config.js';

let modal = null;

export function initPhotoMode() {
  const btn = document.createElement('button');
  btn.id = 'btn-photo-mode';
  btn.type = 'button';
  btn.title = 'Take a romantic souvenir photo keepsake';
  btn.style.cssText = `
    position: fixed;
    top: 18px;
    right: 18px;
    width: 44px;
    height: 34px;
    background: rgba(14, 18, 24, 0.82);
    border: 1px solid rgba(232, 208, 169, 0.45);
    border-radius: 999px;
    color: #ede8dc;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    z-index: 100;
    transition: all 0.2s ease;
  `;
  btn.innerHTML = '📷';
  btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.08)'; });
  btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1.0)'; });
  btn.addEventListener('click', capturePolaroidKeepsake);
  document.body.appendChild(btn);
}

export function capturePolaroidKeepsake() {
  const webglCanvas = document.getElementById('webgl-canvas');
  if (!webglCanvas) return;

  const cfg = getConfig();
  const coupleNames = `${cfg.partnerTo || 'Maya'} & ${cfg.partnerFrom || 'Ethan'}`;
  const museumTitle = cfg.museumTitle || 'Our Home & Museum';
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // 1. Create High-Resolution Offscreen Canvas
  const polaroid = document.createElement('canvas');
  const cardW = 1200;
  const cardH = 1450;
  polaroid.width = cardW;
  polaroid.height = cardH;
  const ctx = polaroid.getContext('2d');

  // Background Linen Paper
  ctx.fillStyle = '#fbf9f4';
  ctx.fillRect(0, 0, cardW, cardH);

  // Subtle paper texture grain
  ctx.fillStyle = 'rgba(230, 220, 205, 0.25)';
  for (let i = 0; i < 20000; i++) {
    const gx = Math.random() * cardW;
    const gy = Math.random() * cardH;
    ctx.fillRect(gx, gy, 1.5, 1.5);
  }

  // Inner Photo Frame
  const photoMarginX = 80;
  const photoMarginY = 80;
  const photoW = cardW - photoMarginX * 2;
  const photoH = 1040;

  // Photo drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#111';
  ctx.fillRect(photoMarginX, photoMarginY, photoW, photoH);
  ctx.shadowColor = 'transparent';

  // Draw 3D WebGL render into photo area (preserving aspect ratio with cover cropping)
  const srcW = webglCanvas.width;
  const srcH = webglCanvas.height;
  const scale = Math.max(photoW / srcW, photoH / srcH);
  const sw = photoW / scale;
  const sh = photoH / scale;
  const sx = (srcW - sw) / 2;
  const sy = (srcH - sh) / 2;

  ctx.drawImage(webglCanvas, sx, sy, sw, sh, photoMarginX, photoMarginY, photoW, photoH);

  // Soft Vignette over photo
  const grad = ctx.createRadialGradient(
    cardW / 2, photoMarginY + photoH / 2, photoW * 0.3,
    cardW / 2, photoMarginY + photoH / 2, photoW * 0.75
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(photoMarginX, photoMarginY, photoW, photoH);

  // Handwritten / Elegant Typography
  ctx.fillStyle = '#262421';
  ctx.font = 'italic 52px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(coupleNames, cardW / 2, photoMarginY + photoH + 110);

  ctx.fillStyle = '#7a7267';
  ctx.font = '400 24px "Inter", sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText(`${museumTitle} • ${today}`, cardW / 2, photoMarginY + photoH + 160);

  ctx.fillStyle = '#a89f91';
  ctx.font = 'italic 20px "Cormorant Garamond", serif';
  ctx.fillText('"Every memory framed with you in our forever home"', cardW / 2, photoMarginY + photoH + 215);

  // 2. Display Keepsake Modal
  showPolaroidModal(polaroid.toDataURL('image/png'), coupleNames);
}

function showPolaroidModal(dataUrl, coupleNames) {
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'polaroid-modal';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(8, 10, 14, 0.88);
    backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: fadeIn 0.3s ease;
  `;

  modal.innerHTML = `
    <div style="position: relative; max-width: 90vw; max-height: 80vh; display: flex; flex-direction: column; align-items: center;">
      <img src="${dataUrl}" style="max-height: 72vh; max-width: 90vw; border-radius: 6px; box-shadow: 0 16px 48px rgba(0,0,0,0.6); margin-bottom: 20px;" alt="Souvenir Polaroid">
      <div style="display: flex; gap: 14px;">
        <a id="btn-download-photo" href="${dataUrl}" download="Our_Home_${coupleNames.replace(/[^a-zA-Z0-9]/g, '_')}.png" style="
          background: #e8d0a9; color: #1a1612; text-decoration: none; padding: 10px 24px; border-radius: 999px;
          font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; box-shadow: 0 4px 14px rgba(232, 208, 169, 0.35);
          display: flex; align-items: center; gap: 8px; cursor: pointer;
        ">
          <span>💾</span> Download Keepsake Card
        </a>
        <button type="button" id="btn-close-photo" style="
          background: rgba(255, 255, 255, 0.12); color: #ede8dc; border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 10px 22px; border-radius: 999px; font-family: 'Inter', sans-serif; font-size: 13px; cursor: pointer;
        ">
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#btn-close-photo').addEventListener('click', () => {
    modal.remove();
    modal = null;
  });

  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.remove();
      modal = null;
    }
  });
}

