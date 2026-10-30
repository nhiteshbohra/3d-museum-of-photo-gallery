/* =========================================================================
   OUR HOME 3D • 2D RADAR MINIMAP HUD (THE PAVILION OF ROOMS)
   Renders real-time architectural floorplan with live blips for both partners
   ========================================================================= */

import { characters, activeControl } from './characters.js';
import { HOUSE_WIDTH, HOUSE_DEPTH, interactiveArtworks } from './environment.js';

let canvas = null;
let ctx = null;
let container = null;
let roomLabel = null;

const MAP_W = 150;
const MAP_H = 165;

// World museum bounds: X in [-14, 14], Z in [-16, 15]
const WORLD_MIN_X = -HOUSE_WIDTH / 2;
const WORLD_MAX_X = HOUSE_WIDTH / 2;
const WORLD_MIN_Z = -16.0;
const WORLD_MAX_Z = 15.5;

export function updateMinimap() {
  drawMinimap();
}

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
    background: rgba(12, 16, 22, 0.88);
    border: 1px solid rgba(232, 208, 169, 0.45);
    border-radius: 12px;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    z-index: 95;
    overflow: hidden;
    user-select: none;
    pointer-events: none;
    display: flex;
    flex-direction: column;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding: 5px 8px;
    background: rgba(232, 208, 169, 0.12);
    border-bottom: 1px solid rgba(232, 208, 169, 0.2);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 0.74rem;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #ede8dc;
  `;
  header.innerHTML = `<span>🏛️ Grand Pavilion</span><span id="mm-room-badge" style="color:#e8d0a9;font-weight:600;">Rotunda</span>`;
  container.appendChild(header);

  canvas = document.createElement('canvas');
  canvas.width = MAP_W;
  canvas.height = MAP_H - 26;
  canvas.style.display = 'block';
  container.appendChild(canvas);

  ctx = canvas.getContext('2d');
  document.body.appendChild(container);

  roomLabel = header.querySelector('#mm-room-badge');
  
}

function toMapX(worldX) {
  return ((worldX - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X)) * (MAP_W - 16) + 8;
}

function toMapY(worldZ) {
  return ((worldZ - WORLD_MIN_Z) / (WORLD_MAX_Z - WORLD_MIN_Z)) * (canvas.height - 16) + 8;
}

function detectActiveRoom(x, z) {
  if (z > 5.5) return 'Garden Courtyard';
  if (z >= -2.0 && Math.abs(x) <= 4.0) return 'Grand Rotunda';
  if (x < -4.0 && z >= -2.0) return 'Fireside Salon';
  if (x > 4.0 && z >= -2.0) return 'Music Conservatory';
  if (x < -4.0 && z < -2.0) return 'Library Nook';
  if (x > 4.0 && z < -2.0) return 'Monolith Hall';
  if (z <= -12.0 && Math.abs(x) <= 2.5) return 'Promise Alcove';
  if (z < -2.0 && Math.abs(x) <= 4.8) return 'Glass Orangery';
  return 'Main Pavilion';
}

function drawMinimap() {
  if (!ctx || !canvas) return;

  ctx.fillStyle = '#0e1219';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw 7-Salon Outer Perimeter
  const pMinX = toMapX(WORLD_MIN_X);
  const pMaxX = toMapX(WORLD_MAX_X);
  const pMinZ = toMapY(-15.5);
  const pSouth = toMapY(5.5);
  const pGarden = toMapY(15.5);

  ctx.strokeStyle = 'rgba(232, 208, 169, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pMinX, pMinZ, pMaxX - pMinX, pSouth - pMinZ);

  // Garden Courtyard Enclosure
  ctx.strokeStyle = 'rgba(100, 140, 110, 0.45)';
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(pMinX, pSouth, pMaxX - pMinX, pGarden - pSouth);
  ctx.setLineDash([]);

  // Room Partition Walls
  ctx.strokeStyle = 'rgba(232, 208, 169, 0.35)';
  ctx.lineWidth = 1;

  // Rotunda West & East Partitions (X: -4, +4)
  const rotWestX = toMapX(-4.0);
  const rotEastX = toMapX(4.0);
  const rotNorthZ = toMapY(-2.0);
  const rotSouthZ = toMapY(5.5);

  ctx.beginPath();
  ctx.moveTo(rotWestX, rotNorthZ);
  ctx.lineTo(rotWestX, rotSouthZ);
  ctx.moveTo(rotEastX, rotNorthZ);
  ctx.lineTo(rotEastX, rotSouthZ);

  // North/South room split (Z: -2.0)
  ctx.moveTo(pMinX, rotNorthZ);
  ctx.lineTo(rotWestX, rotNorthZ);
  ctx.moveTo(rotEastX, rotNorthZ);
  ctx.lineTo(pMaxX, rotNorthZ);

  // Orangery South Portal (Z: -7.0)
  const orangeryZ = toMapY(-7.0);
  ctx.moveTo(rotWestX, orangeryZ);
  ctx.lineTo(rotEastX, orangeryZ);

  // Library / Orangery West Wall (Z: -10.0)
  const libNorthZ = toMapY(-10.0);
  ctx.moveTo(pMinX, libNorthZ);
  ctx.lineTo(rotWestX, libNorthZ);

  ctx.stroke();

  // Draw 3 Freestanding Art Monoliths in Salon 5
  ctx.fillStyle = 'rgba(232, 208, 169, 0.7)';
  const m1X = toMapX(7.5), m1Y = toMapY(-4.6);
  const m2X = toMapX(10.5), m2Y = toMapY(-6.9);
  const m3X = toMapX(7.5), m3Y = toMapY(-9.3);
  ctx.fillRect(m1X - 4, m1Y - 1, 8, 2);
  ctx.fillRect(m2X - 4, m2Y - 1, 8, 2);
  ctx.fillRect(m3X - 4, m3Y - 1, 8, 2);

  // Draw 40 Exhibition Artworks as Golden Dots
  ctx.fillStyle = '#ffcf70';
  for (const art of interactiveArtworks) {
    if (!art.userData || !art.userData.pos) continue;
    const ax = toMapX(art.userData.pos[0]);
    const ay = toMapY(art.userData.pos[2]);
    ctx.beginPath();
    ctx.arc(ax, ay, art.userData.isCenterpiece ? 2.5 : 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw Characters Blips
  const drawBlip = (charObj, color, haloColor, label) => {
    if (!charObj || !charObj.controller) return;
    const pos = charObj.controller.position;
    const bx = toMapX(pos.x);
    const by = toMapY(pos.z);

    // Halo
    ctx.fillStyle = haloColor;
    ctx.beginPath();
    ctx.arc(bx, by, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Heading direction tick
    const heading = charObj.controller.rotation.y;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.sin(heading) * 6, by + Math.cos(heading) * 6);
    ctx.stroke();
  };

  // Maya (Pink / Gold) & Ethan (Cyan / Sky)
  drawBlip(characters.maya, '#ff70a6', 'rgba(255, 112, 166, 0.35)', 'M');
  drawBlip(characters.jack, '#4cc9f0', 'rgba(76, 201, 240, 0.35)', 'E');

  // Update Room Badge
  const activeChar = activeControl === 'jack' ? characters.jack : characters.maya;
  if (activeChar && activeChar.controller && roomLabel) {
    const rName = detectActiveRoom(activeChar.controller.position.x, activeChar.controller.position.z);
    roomLabel.textContent = rName;
  }
}

function drawMinimapLoop() {
  drawMinimap();
  
}
