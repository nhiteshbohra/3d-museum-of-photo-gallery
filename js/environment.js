/* =========================================================================
   OUR HOME 3D • THE PAVILION OF ROOMS (SINGLE-FLOOR CURATED GRAND MUSEUM)
   Features 7 Interconnected Boutique Salons housing 40 Curated Artworks
   Zero Stairs • Zero Falling/Snapping Bugs • Pure Architectural Atmosphere
   ========================================================================= */

import * as THREE from 'three';
import {
  createHardwoodTexture,
  createPlasterTexture,
  createMarbleTexture,
  createCeilingTexture,
  createRugTexture,
  createRomanticPainting
} from './textures.js';
import { gallery40Items } from './gallery40.js';

export const canvas = document.getElementById('webgl-canvas');
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111422);
scene.fog = new THREE.FogExp2(0x111422, 0.009);

// =========================================================================
// CELESTIAL STARRY SKYDOME & ROMANTIC MOON
// =========================================================================
const skyGeo = new THREE.SphereGeometry(95, 24, 16);
skyGeo.scale(-1, 1, 1);
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 512;
skyCanvas.height = 512;
const sctx = skyCanvas.getContext('2d');
const sgrad = sctx.createLinearGradient(0, 0, 0, 512);
sgrad.addColorStop(0, '#090c16');
sgrad.addColorStop(0.5, '#111626');
sgrad.addColorStop(1, '#201d32');
sctx.fillStyle = sgrad;
sctx.fillRect(0, 0, 512, 512);

sctx.fillStyle = '#ffffff';
for (let i = 0; i < 280; i++) {
  const sx = Math.random() * 512;
  const sy = Math.random() * 320;
  const sr = Math.random() * 1.5;
  sctx.globalAlpha = Math.random() * 0.7 + 0.3;
  sctx.beginPath();
  sctx.arc(sx, sy, sr, 0, Math.PI * 2);
  sctx.fill();
}
sctx.globalAlpha = 1.0;
const skyTex = new THREE.CanvasTexture(skyCanvas);
const skyDome = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: skyTex }));
scene.add(skyDome);

// Soft glowing romantic moon
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(3.8, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xfffae6 })
);
moon.position.set(45, 48, -55);
scene.add(moon);

export const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 160);
camera.position.set(0.0, 1.8, 4.5);

export const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// =========================================================================
// LIGHTING RIG (Ambient, Moon, Skylights & Museum Spotlights)
// =========================================================================
const ambientLight = new THREE.AmbientLight(0xe8dcc8, 0.65);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0xaac4ff, 0.75);
moonLight.position.set(35, 45, -45);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.near = 10;
moonLight.shadow.camera.far = 120;
moonLight.shadow.camera.left = -25;
moonLight.shadow.camera.right = 25;
moonLight.shadow.camera.top = 25;
moonLight.shadow.camera.bottom = -25;
moonLight.shadow.bias = -0.0005;
scene.add(moonLight);

// High-end procedural PBR textures & materials
const texHardwood = createHardwoodTexture();
const texPlaster = createPlasterTexture();
const texMarble = createMarbleTexture();
const texCeiling = createCeilingTexture();
const texPersianRug = createRugTexture();

// Museum Pavilion Dimensions (Expanded Single-Floor Grounds)
export const HOUSE_WIDTH = 28;  // X: -14.0 to +14.0
export const HOUSE_DEPTH = 30;  // Z: -15.5 to +14.5

export const matWoodFloor = new THREE.MeshStandardMaterial({
  map: texHardwood,
  roughness: 0.38,
  metalness: 0.08
});

export const matGalleryFloor = new THREE.MeshStandardMaterial({
  map: texMarble,
  roughness: 0.22,
  metalness: 0.12
});

export const matPlasterWall = new THREE.MeshStandardMaterial({
  map: texPlaster,
  roughness: 0.88,
  metalness: 0.02
});

export const matDarkWood = new THREE.MeshStandardMaterial({
  color: 0x1f1610,
  roughness: 0.45,
  metalness: 0.05
});

export const matWhiteMarble = new THREE.MeshStandardMaterial({
  map: texMarble,
  roughness: 0.18,
  metalness: 0.08
});

export const matAccentWall = new THREE.MeshStandardMaterial({
  color: 0x12141a,
  roughness: 0.75,
  metalness: 0.15
});

export const matCeiling = new THREE.MeshStandardMaterial({
  map: texCeiling,
  roughness: 0.85
});

export const matBrass = new THREE.MeshStandardMaterial({
  color: 0xc4a470,
  roughness: 0.25,
  metalness: 0.85
});

export const matGlass = new THREE.MeshPhysicalMaterial({
  color: 0x9fbccc,
  transparent: true,
  opacity: 0.35,
  roughness: 0.1,
  metalness: 0.1,
  transmission: 0.7,
  ior: 1.5
});

// =========================================================================
// 1. EXPANSIVE SINGLE-FLOOR GALLERY FLOOR & GARDEN GROUNDS
// =========================================================================
const pavilionFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(HOUSE_WIDTH, 22),
  matGalleryFloor
);
pavilionFloor.rotation.x = -Math.PI / 2;
pavilionFloor.position.set(0, 0, -4.5);
pavilionFloor.receiveShadow = true;
scene.add(pavilionFloor);

// Front Garden & Entrance Courtyard Ground
const gardenGround = new THREE.Mesh(
  new THREE.PlaneGeometry(36, 16),
  new THREE.MeshStandardMaterial({ color: 0x1a261c, roughness: 0.95 })
);
gardenGround.rotation.x = -Math.PI / 2;
gardenGround.position.set(0, -0.01, 10.5);
gardenGround.receiveShadow = true;
scene.add(gardenGround);

// Entrance Stone Pavers Path
const stonePath = new THREE.Mesh(
  new THREE.PlaneGeometry(4.2, 10),
  new THREE.MeshStandardMaterial({ color: 0x3d3a36, roughness: 0.85 })
);
stonePath.rotation.x = -Math.PI / 2;
stonePath.position.set(0, 0.005, 9.5);
stonePath.receiveShadow = true;
scene.add(stonePath);

// Architectural Coffered Ceilings with Skylight Openings (Height = 4.8m)
const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(HOUSE_WIDTH, 22),
  matCeiling
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.set(0, 4.8, -4.5);
scene.add(ceiling);

// Ambient Ceiling Cove Illumination
const ceilingLight1 = new THREE.PointLight(0xfff3e0, 1.2, 18, 2.0);
ceilingLight1.position.set(0, 4.3, 1.0);
scene.add(ceilingLight1);

const ceilingLight2 = new THREE.PointLight(0xffecd0, 1.2, 18, 2.0);
ceilingLight2.position.set(0, 4.3, -9.5);
scene.add(ceilingLight2);

// =========================================================================
// 2. COLLIDERS & CAMERA OBSTACLES ARRAYS
// =========================================================================
export const wallColliders = [];
export const cameraObstacles = [];
export const houseColliders = [];

function createWall(w, h, d, x, y, z, mat = matPlasterWall) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  wallColliders.push(mesh);
  cameraObstacles.push(mesh);

  houseColliders.push({
    id: `wall_${x.toFixed(1)}_${z.toFixed(1)}`,
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
    floor: 0
  });

  return mesh;
}

// =========================================================================
// 3. ARCHITECTURAL PERIMETER & SALON PARTITION WALLS (7 ROOMS)
// =========================================================================
// Outer Pavilion Perimeter Enclosure (H = 4.8m)
// North Wall (Starlight Orangery & Promise Alcove Back)
createWall(28, 4.8, 0.35, 0, 2.4, -15.5);
// West Wall
createWall(0.35, 4.8, 21.35, -14.0, 2.4, -4.825);
// East Wall
createWall(0.35, 4.8, 21.35, 14.0, 2.4, -4.825);

// South Wall (Main Entrance Portal with Doorway at center X: -2.2 to +2.2)
createWall(10.8, 4.8, 0.35, -8.6, 2.4, 5.5);
createWall(10.8, 4.8, 0.35, 8.6, 2.4, 5.5);
createWall(4.4, 1.4, 0.35, 0, 4.1, 5.5); // Entrance Lintel

// Garden Perimeter Stone Walls
const matGardenWall = new THREE.MeshStandardMaterial({ color: 0x44423e, roughness: 0.9 });
createWall(0.35, 2.4, 10.5, -14.0, 1.2, 10.75, matGardenWall);
createWall(0.35, 2.4, 10.5, 14.0, 1.2, 10.75, matGardenWall);
createWall(28.35, 2.4, 0.35, 0, 1.2, 15.5, matGardenWall);

// -------------------------------------------------------------------------
// SALON 1: THE GRAND ROTUNDA (Centerpiece Jet-Black Feature Wall)
// -------------------------------------------------------------------------
createWall(4.4, 4.8, 0.35, 0, 2.4, -2.0, matAccentWall);

// Round Structural Columns in Rotunda
for (const [colX, colZ] of [[-3.8, 1.2], [3.8, 1.2], [-3.8, -1.2], [3.8, -1.2]]) {
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 4.8, 24), matWhiteMarble);
  col.position.set(colX, 2.4, colZ);
  col.castShadow = true;
  scene.add(col);
  houseColliders.push({
    id: `col_${colX}_${colZ}`,
    minX: colX - 0.45, maxX: colX + 0.45,
    minZ: colZ - 0.45, maxZ: colZ + 0.45,
    floor: 0
  });
}

// -------------------------------------------------------------------------
// SALON 2 (Fireside Winter Salon) & SALON 4 (Library Nook) PARTITION
// -------------------------------------------------------------------------
// Separator Wall between Rotunda and Fireside Salon (X: -4.0, with archway at Z: 1.5 to 3.5)
createWall(0.35, 4.8, 3.5, -4.0, 2.4, -0.25);
createWall(0.35, 4.8, 1.5, -4.0, 2.4, 4.75);
createWall(0.35, 1.4, 2.5, -4.0, 4.1, 2.75); // Archway Lintel

// North wall of Fireside Salon / South wall of Library Nook (Z: -2.0, X: -14 to -4 with archway)
createWall(4.2, 4.8, 0.35, -11.9, 2.4, -2.0);
createWall(3.2, 4.8, 0.35, -5.6, 2.4, -2.0);
createWall(2.6, 1.4, 0.35, -8.5, 4.1, -2.0); // Archway Lintel

// North wall of Library Nook (Z: -10.0, X: -14 to -5)
createWall(9.0, 4.8, 0.35, -9.5, 2.4, -10.0);

// -------------------------------------------------------------------------
// SALON 3 (Music Conservatory) & SALON 5 (Monolith Hall) PARTITION
// -------------------------------------------------------------------------
// Separator Wall between Rotunda and Music Conservatory (X: +4.0, with archway at Z: 1.5 to 3.5)
createWall(0.35, 4.8, 3.5, 4.0, 2.4, -0.25);
createWall(0.35, 4.8, 1.5, 4.0, 2.4, 4.75);
createWall(0.35, 1.4, 2.5, 4.0, 4.1, 2.75); // Archway Lintel

// North wall of Music Conservatory / South wall of Monolith Hall (Z: -2.0, X: +4 to +14)
createWall(4.2, 4.8, 0.35, 11.9, 2.4, -2.0);
createWall(3.2, 4.8, 0.35, 5.6, 2.4, -2.0);
createWall(2.6, 1.4, 0.35, 8.5, 4.1, -2.0); // Archway Lintel

// -------------------------------------------------------------------------
// SALON 5: 3 FREESTANDING DOUBLE-SIDED MARBLE ART MONOLITHS
// Visitors can walk completely around each pillar
// -------------------------------------------------------------------------
function createArtMonolith(x, z, label) {
  const monolith = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 3.6, 0.45),
    matAccentWall
  );
  monolith.position.set(x, 1.8, z);
  monolith.castShadow = true;
  monolith.receiveShadow = true;
  scene.add(monolith);

  // Brass plinth base
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.15, 0.65),
    matBrass
  );
  plinth.position.set(x, 0.075, z);
  scene.add(plinth);

  houseColliders.push({
    id: `monolith_${label}`,
    minX: x - 1.35, maxX: x + 1.35,
    minZ: z - 0.4, maxZ: z + 0.4,
    floor: 0
  });

  cameraObstacles.push(monolith);
}

// 3 Freestanding pillars in open Monolith Hall
createArtMonolith(7.5, -4.625, 'south');
createArtMonolith(10.5, -6.925, 'center');
createArtMonolith(7.5, -9.325, 'north');

// -------------------------------------------------------------------------
// SALON 6 (Starlight Orangery) & SALON 7 (The Promise Alcove)
// -------------------------------------------------------------------------
// Orangery South Partition (Z: -7.0, X: -5 to +5 with grand central portal)
createWall(3.0, 4.8, 0.35, -3.5, 2.4, -7.0);
createWall(3.0, 4.8, 0.35, 3.5, 2.4, -7.0);
createWall(4.0, 1.4, 0.35, 0.0, 4.1, -7.0); // Portal Arch Lintel

// Glass Wall Overlooking Starlight Garden (Z: -12.5)
const glassWallLeft = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.8), matGlass);
glassWallLeft.position.set(-6.5, 2.4, -12.5);
scene.add(glassWallLeft);

const glassWallRight = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.8), matGlass);
glassWallRight.position.set(6.5, 2.4, -12.5);
scene.add(glassWallRight);

// Promise Alcove Enclosure (Z: -12.5 to -15.5, X: -2.4 to +2.4)
createWall(0.35, 4.8, 3.0, -2.4, 2.4, -14.0, matAccentWall);
createWall(0.35, 4.8, 3.0, 2.4, 2.4, -14.0, matAccentWall);

// =========================================================================
// 4. FURNITURE, LOUNGES, PIANO & FIREPLACE DECOR
// =========================================================================
const matSofaFabric = new THREE.MeshStandardMaterial({ color: 0x98a28e, roughness: 0.82 });
const matPillow = new THREE.MeshStandardMaterial({ color: 0xdfcbaf, roughness: 0.75 });

// Fireside Salon: Plush Sectional Sofa
const sofaGroup = new THREE.Group();
const sofaBase1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.42, 1.1), matSofaFabric);
sofaBase1.position.set(-8.5, 0.21, 1.0);
const sofaBack1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 0.25), matSofaFabric);
sofaBack1.position.set(-8.5, 0.58, 1.55);
sofaGroup.add(sofaBase1, sofaBack1);

const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.36, 1.0), matDarkWood);
coffeeTable.position.set(-8.5, 0.18, -0.2);
coffeeTable.castShadow = true;
scene.add(coffeeTable);

// Persian wool rug in Fireside Salon
const rugFireside = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.4), new THREE.MeshStandardMaterial({
  map: texPersianRug,
  roughness: 0.85
}));
rugFireside.rotation.x = -Math.PI / 2;
rugFireside.position.set(-8.5, 0.01, 0.5);
scene.add(rugFireside);

sofaGroup.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
scene.add(sofaGroup);

// Marble Fireplace in Fireside Salon
const fireplaceHearth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 0.6), matWhiteMarble);
fireplaceHearth.position.set(-8.5, 0.7, -1.8);
fireplaceHearth.castShadow = true;
scene.add(fireplaceHearth);

const fireOpening = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.3), matAccentWall);
fireOpening.position.set(-8.5, 0.55, -1.55);
scene.add(fireOpening);

export const fireLight = new THREE.PointLight(0xff6a20, 1.8, 8, 2.0);
fireLight.position.set(-8.5, 0.55, -1.3);
scene.add(fireLight);

// Music Conservatory: Grand Piano & Stool
const pianoBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.85), matDarkWood);
pianoBody.position.set(8.5, 0.55, 1.2);
pianoBody.castShadow = true;
scene.add(pianoBody);

const pianoKeys = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.28), matWhiteMarble);
pianoKeys.position.set(8.5, 0.68, 1.7);
scene.add(pianoKeys);

const pianoBench = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.48, 0.38), matDarkWood);
pianoBench.position.set(8.5, 0.24, 2.25);
pianoBench.castShadow = true;
scene.add(pianoBench);

// Library Reading Nook: Bookshelves & Armchair
const bookshelf1 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.2, 2.8), matDarkWood);
bookshelf1.position.set(-13.6, 1.6, -7.0);
bookshelf1.castShadow = true;
scene.add(bookshelf1);

const armchair = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.95), matSofaFabric);
armchair.position.set(-8.5, 0.22, -6.5);
const armchairBack = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.65, 0.18), matSofaFabric);
armchairBack.position.set(-8.5, 0.6, -6.9);
armchair.add(armchairBack);
scene.add(armchair);

// Viewing Benches in Rotunda & Promise Alcove
export const galleryBench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.48, 0.65), matDarkWood);
galleryBench.position.set(0.0, 0.24, 0.8);
galleryBench.castShadow = true;
scene.add(galleryBench);

const promiseBench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.48, 0.6), matDarkWood);
promiseBench.position.set(0.0, 0.24, -12.0);
promiseBench.castShadow = true;
scene.add(promiseBench);

// Orangery Botanical Plants
function createBotanicalPlant(x, z) {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.6, 16), matWhiteMarble);
  pot.position.set(x, 0.3, z);
  pot.castShadow = true;
  scene.add(pot);

  const foliage = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.65, 1),
    new THREE.MeshStandardMaterial({ color: 0x224a28, roughness: 0.85 })
  );
  foliage.position.set(x, 0.95, z);
  foliage.castShadow = true;
  scene.add(foliage);

  houseColliders.push({
    id: `plant_${x}_${z}`,
    minX: x - 0.4, maxX: x + 0.4,
    minZ: z - 0.4, maxZ: z + 0.4,
    floor: 0
  });
}

createBotanicalPlant(-4.2, -11.5);
createBotanicalPlant(4.2, -11.5);
createBotanicalPlant(-3.2, 2.5);
createBotanicalPlant(3.2, 2.5);

// =========================================================================
// 5. THE 40 CURATED EXHIBITION ARTWORKS MOUNTED SEAMLESSLY
// =========================================================================
export const interactiveArtworks = [];
export const galleryItems = gallery40Items;

// Dedication Plaque on the Rotunda Centerpiece Wall
const plaqueBack = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 0.55, 0.05),
  matBrass
);
plaqueBack.position.set(0, 0.75, -1.82);
scene.add(plaqueBack);

const plaqueCanvas = document.createElement('canvas');
plaqueCanvas.width = 512;
plaqueCanvas.height = 256;
export const pctx = plaqueCanvas.getContext('2d');

export function updatePlaqueTexture(cfg) {
  if (!pctx) return;
  pctx.fillStyle = '#111319';
  pctx.fillRect(0, 0, 512, 256);
  pctx.strokeStyle = '#c4a470';
  pctx.lineWidth = 6;
  pctx.strokeRect(10, 10, 492, 236);
  pctx.fillStyle = '#c4a470';
  pctx.font = 'bold 22px Georgia, serif';
  pctx.textAlign = 'center';
  pctx.fillText('A PERMANENT COLLECTION', 256, 52);
  pctx.fillStyle = '#ffffff';
  pctx.font = 'italic 34px "Cormorant Garamond", Georgia, serif';
  pctx.fillText(`For ${cfg?.partnerTo || 'Maya'}`, 256, 110);
  pctx.fillStyle = '#b5bac7';
  pctx.font = 'italic 20px Georgia, serif';
  pctx.fillText(`"Our story, hung on the walls, just for you."`, 256, 160);
  pctx.fillStyle = '#c4a470';
  pctx.font = '22px Georgia, serif';
  pctx.fillText(`Love, ${cfg?.partnerFrom || 'Ethan'}`, 256, 210);
  plaqueTex.needsUpdate = true;
}

const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
updatePlaqueTexture({ partnerTo: 'Maya', partnerFrom: 'Ethan' });

const plaqueFace = new THREE.Mesh(
  new THREE.PlaneGeometry(1.15, 0.5),
  new THREE.MeshBasicMaterial({ map: plaqueTex })
);
plaqueFace.position.set(0, 0.75, -1.79);
scene.add(plaqueFace);

export function createFallbackArtCanvas(item) {
  if (typeof item === 'object' && item !== null) {
    return createRomanticPainting(item.id || 1, item.title, item.tag, item.quote);
  }
  return createRomanticPainting(1, String(item || 'Exhibition Piece'), 'A PERMANENT COLLECTION', '');
}

// Mount all 40 Artworks across the 7 Salons with Spotlights
galleryItems.forEach(item => {
  const frameGroup = new THREE.Group();
  const frameDepth = 0.06;

  // Frame Border Molding (Warm gallery bronze)
  const borderMat = new THREE.MeshStandardMaterial({
    color: item.isCenterpiece ? 0x1a1a1e : 0x222226,
    roughness: 0.35,
    metalness: 0.8
  });

  const frameBack = new THREE.Mesh(
    new THREE.BoxGeometry(item.width + 0.14, item.height + 0.14, frameDepth),
    borderMat
  );
  frameBack.castShadow = true;
  frameGroup.add(frameBack);

  // Picture Canvas Face
  const photoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(item.width, item.height),
    new THREE.MeshStandardMaterial({
      roughness: 0.45,
      metalness: 0.05
    })
  );
  photoMesh.position.z = frameDepth / 2 + 0.005;
  photoMesh.material.map = createFallbackArtCanvas(item);
  item.photoMesh = photoMesh;
  item.frameGroup = frameGroup;
  frameGroup.add(photoMesh);
  interactiveArtworks.push(photoMesh);

  frameGroup.position.set(...item.pos);
  frameGroup.rotation.set(...item.rot);
  scene.add(frameGroup);

  // Dedicated $3000K Gallery Spotlight
  const spot = new THREE.SpotLight(0xfffaed, item.isCenterpiece ? 2.8 : 1.6);
  spot.angle = 0.58;
  spot.penumbra = 0.65;
  spot.decay = 1.8;
  spot.distance = 7.0;

  // Position spotlight slightly in front and above frame
  const forwardDir = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(...item.rot));
  spot.position.set(
    item.pos[0] + forwardDir.x * 1.5,
    item.pos[1] + 1.6,
    item.pos[2] + forwardDir.z * 1.5
  );
  spot.target = frameGroup;
  scene.add(spot);
  scene.add(spot.target);

  photoMesh.userData = item;
});

plaqueFace.userData = galleryItems[0];
interactiveArtworks.push(plaqueFace);

// =========================================================================
// 6. INTERACTION POINTS REGISTRY (7 Salons)
// =========================================================================
export const interactionPoints = [
  // Salon 1: Grand Rotunda
  { id: 'sit_rotunda_bench', type: 'sit', label: 'Sit on Rotunda Bench', pos: [0.0, 0.48, 0.7], facing: [0, 0, -1] },
  { id: 'inspect_plaque', type: 'plaque', label: 'Inspect Dedication Plaque 📜', pos: [0.0, 0.85, -1.3], facing: [0, 0, -1] },

  // Salon 2: Fireside Winter Salon
  { id: 'sit_fireplace_sofa', type: 'sit', label: 'Sit by Fireplace', pos: [-8.5, 0.48, 0.8], facing: [0, 0, -1] },
  { id: 'fireplace', type: 'toggle_fire', label: 'Warm Hearth 🔥', pos: [-8.5, 0.8, -1.2] },

  // Salon 3: Music Conservatory
  { id: 'play_piano', type: 'piano', label: 'Play Piano 🎹', pos: [8.5, 0.52, 2.05], facing: [0, 0, -1] },

  // Salon 4: Library Reading Nook
  { id: 'sit_library_chair', type: 'sit', label: 'Sit in Reading Chair', pos: [-8.5, 0.48, -6.3], facing: [0, 0, 1] },

  // Salon 6: Starlight Glass Orangery
  { id: 'orangery_view', type: 'balcony_view', label: 'Look at Stars & Pines 🌌', pos: [0.0, 0.8, -11.8], facing: [0, 0, -1] },

  // Salon 7: The Promise Alcove
  { id: 'sit_promise_bench', type: 'sit', label: 'Sit with Partner in Promise Alcove 💍', pos: [0.0, 0.48, -11.8], facing: [0, 0, -1] }
];

// 7 Interconnected Boutique Rooms Registry
export const houseRooms = {
  rotunda: { floor: 0, spawn: [0.0, 0, 3.5], facingY: Math.PI, name: 'Grand Rotunda' },
  fireside: { floor: 0, spawn: [-8.5, 0, 3.0], facingY: 0, name: 'Fireside Winter Salon' },
  music: { floor: 0, spawn: [8.5, 0, 3.0], facingY: 0, name: 'Music Conservatory' },
  library: { floor: 0, spawn: [-8.5, 0, -5.5], facingY: 0, name: 'Library Reading Nook' },
  monolith: { floor: 0, spawn: [8.5, 0, -5.5], facingY: 0, name: 'Monolith Sculpture Hall' },
  orangery: { floor: 0, spawn: [0.0, 0, -8.5], facingY: 0, name: 'Starlight Glass Orangery' },
  promise: { floor: 0, spawn: [0.0, 0, -12.5], facingY: 0, name: 'The Promise Alcove' }
};

// Furniture Obstacles Colliders
houseColliders.push(
  { id: 'sofa_fireside', minX: -10.2, maxX: -6.8, minZ: 0.5, maxZ: 1.7, floor: 0 },
  { id: 'table_fireside', minX: -9.5, maxX: -7.5, minZ: -0.7, maxZ: 0.3, floor: 0 },
  { id: 'fireplace_hearth', minX: -9.9, maxX: -7.1, minZ: -2.1, maxZ: -1.5, floor: 0 },
  { id: 'piano_body', minX: 7.5, maxX: 9.5, minZ: 0.7, maxZ: 1.7, floor: 0 },
  { id: 'piano_bench', minX: 8.0, maxX: 9.0, minZ: 2.0, maxZ: 2.5, floor: 0 },
  { id: 'bookshelf_lib', minX: -13.9, maxX: -13.3, minZ: -8.5, maxZ: -5.5, floor: 0 },
  { id: 'rotunda_bench', minX: -1.3, maxX: 1.3, minZ: 0.4, maxZ: 1.2, floor: 0 },
  { id: 'promise_bench', minX: -1.2, maxX: 1.2, minZ: -12.4, maxZ: -11.6, floor: 0 }
);

// FIREPLACE INTERACTIVITY & WARM FLICKER
export let isFireplaceActive = true;

export function toggleFireplace() {
  isFireplaceActive = !isFireplaceActive;
  fireLight.intensity = isFireplaceActive ? 1.8 : 0.0;
  return isFireplaceActive;
}

export function updateFireplaceFlicker(time) {
  if (!isFireplaceActive) return;
  const flicker = Math.sin(time * 8.0) * 0.15 + Math.cos(time * 17.0) * 0.1;
  fireLight.intensity = 1.8 + flicker;
}
