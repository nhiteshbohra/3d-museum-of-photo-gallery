/* =========================================================================
   OUR HOME 3D • 2D RADAR MINIMAP HUD
   Renders real-time architectural floorplan with live blips for both partners
   ========================================================================= */

import { characters, activeControl } from './characters.js';
import { HOUSE_WIDTH, HOUSE_DEPTH, STAIR_X, STAIR_WIDTH, STAIR_START_Z, STAIR_END_Z, interactiveArtworks } from './environment.js';

let canvas = null;
let ctx = null;
let container = null;

const MAP_W = 140;
const MAP_H = 160;

// World house bounds: X in [-10, 10], Z in [-10, 14]
const WORLD_MIN_X = -HOUSE_WIDTH / 2;
const WORLD_MAX_X = HOUSE_WIDTH / 2;
const WORLD_MIN_Z = -HOUSE_DEPTH / 2;
const WORLD_MAX_Z = HOUSE_DEPTH / 2 + 4;

export function initMinimap() {
  if (document.getElementById('minimap-container')) return;

  container = document.createElement('div');
  container.id = 'minimap-container';
  container.style.cssText = `
    position: fixed;
    top: 68px;
    right: 18px;
    width: ${MAP_W}px;
    height: ${MAP_H}px;
    background: rgba(12, 16, 22, 0.85);
    border: 1px solid rgba(232, 208, 169, 0.45);
    border-radius: 12px;
    backdrop-filter: blur(10px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
    z-index: 95;
    overflow: hidden;
    user-select: none;
    pointer-events: none;
    display: flex;
    flex-direction: column;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding: 4px 8px;
    background: rgba(232, 208, 169, 0.12);
    border-bottom: 1px solid rgba(232, 208, 169, 0.2);
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: #e8d0a9;
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  header.innerHTML = `<span>Radar</span><span id="minimap-floor-label">Floor 0</span>`;
  container.appendChild(header);

  canvas = document.createElement('canvas');
  canvas.width = MAP_W;
  canvas.height = MAP_H - 22;
  canvas.style.cssText = 'width: 100%; height: calc(100% - 22px); display: block;';
  container.appendChild(canvas);
  ctx = canvas.getContext('2d');

  document.body.appendChild(container);
}

function worldToMap(wx, wz) {
  const normX = (wx - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X);
  const normZ = (wz - WORLD_MIN_Z) / (WORLD_MAX_Z - WORLD_MIN_Z);
  return {
    x: normX * (MAP_W - 16) + 8,
    y: (1 - normZ) * (canvas.height - 16) + 8
  };
}

export function updateMinimap() {
  if (!ctx || !canvas) return;

  const floor = characters.maya.controller?.userData?.floor ?? 0;
  const floorLabel = document.getElementById('minimap-floor-label');
  if (floorLabel) {
    floorLabel.textContent = floor === 1 ? 'Upper Floor' : 'Ground Floor';
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw outer walls
  ctx.strokeStyle = 'rgba(232, 208, 169, 0.4)';
  ctx.lineWidth = 1.5;
  const tl = worldToMap(WORLD_MIN_X + 0.5, WORLD_MAX_Z - 0.5);
  const br = worldToMap(WORLD_MAX_X - 0.5, WORLD_MIN_Z + 0.5);
  ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

  // 2. Draw interior partition lines
  ctx.strokeStyle = 'rgba(232, 208, 169, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Central divider
  const d1 = worldToMap(0, WORLD_MIN_Z);
  const d2 = worldToMap(0, WORLD_MAX_Z);
  ctx.moveTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  // Horizontal divider
  const h1 = worldToMap(WORLD_MIN_X, 0);
  const h2 = worldToMap(WORLD_MAX_X, 0);
  ctx.moveTo(h1.x, h1.y);
  ctx.lineTo(h2.x, h2.y);
  ctx.stroke();

  // 3. Draw staircase ramp proxy
  ctx.fillStyle = 'rgba(232, 208, 169, 0.2)';
  const st1 = worldToMap(STAIR_X - STAIR_WIDTH / 2, STAIR_START_Z);
  const st2 = worldToMap(STAIR_X + STAIR_WIDTH / 2, STAIR_END_Z);
  ctx.fillRect(st1.x, st1.y, st2.x - st1.x, st2.y - st1.y);

  // 4. Draw photo frame locations (golden dots)
  if (Array.isArray(interactiveArtworks)) {
    ctx.fillStyle = 'rgba(240, 200, 130, 0.7)';
    interactiveArtworks.forEach(art => {
      const p = worldToMap(art.position.x, art.position.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 5. Draw Maya's Blip (Rose / Gold)
  if (characters.maya.controller) {
    const pos = characters.maya.controller.position;
    const rot = characters.maya.controller.rotation.y;
    const pt = worldToMap(pos.x, pos.z);
    drawPlayerBlip(pt.x, pt.y, rot, '#f472b6', '#fb7185', activeControl === 'maya' || activeControl === 'couple');
  }

  // 6. Draw Ethan's Blip (Sky Blue / Cyan)
  if (characters.jack.controller) {
    const pos = characters.jack.controller.position;
    const rot = characters.jack.controller.rotation.y;
    const pt = worldToMap(pos.x, pos.z);
    drawPlayerBlip(pt.x, pt.y, rot, '#38bdf8', '#0284c7', activeControl === 'jack' || activeControl === 'couple');
  }
}

function drawPlayerBlip(x, y, rot, color1, color2, isActive) {
  ctx.save();
  ctx.translate(x, y);

  // Pulsing halo for active selection
  if (isActive) {
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = color1 + '33';
    ctx.fill();
  }

  // Dot
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = color1;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Direction pointer arrow
  ctx.rotate(-rot);
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(2.5, -3);
  ctx.lineTo(-2.5, -3);
  ctx.closePath();
  ctx.fillStyle = color2;
  ctx.fill();

  ctx.restore();
}

