/* =========================================================================
   OUR HOME • TWO-FLOOR 3D WORLD ARCHITECTURE, ROOMS & INTERACTIVE SPACES
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

export const canvas = document.getElementById('webgl-canvas');
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121524);
scene.fog = new THREE.FogExp2(0x121524, 0.010);

// =========================================================================
// CELESTIAL STARRY SKYDOME & ROMANTIC MOON
// =========================================================================
const skyGeo = new THREE.SphereGeometry(85, 24, 16);
skyGeo.scale(-1, 1, 1);
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 512;
skyCanvas.height = 512;
const sctx = skyCanvas.getContext('2d');
const sgrad = sctx.createLinearGradient(0, 0, 0, 512);
sgrad.addColorStop(0, '#0a0d18');
sgrad.addColorStop(0.5, '#121729');
sgrad.addColorStop(1, '#232035');
sctx.fillStyle = sgrad;
sctx.fillRect(0, 0, 512, 512);

sctx.fillStyle = '#ffffff';
for (let i = 0; i < 240; i++) {
  const sx = Math.random() * 512;
  const sy = Math.random() * 320;
  const sr = Math.random() * 1.4;
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
  new THREE.SphereGeometry(3.5, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xfffae6 })
);
moon.position.set(38, 44, -50);
scene.add(moon);

export const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 140);
camera.position.set(0.5, 1.8, 6.0);

export const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// =========================================================================
// LIGHTING RIG (Ambient, Sun & Room Accent Lights)
// =========================================================================
const hemiLight = new THREE.HemisphereLight(0xfffaee, 0x484252, 1.25);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff6e6, 0.95);
sunLight.position.set(12, 18, 14);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 50;
sunLight.shadow.camera.left = -16;
sunLight.shadow.camera.right = 16;
sunLight.shadow.camera.top = 16;
sunLight.shadow.camera.bottom = -16;
sunLight.shadow.bias = -0.0008;
scene.add(sunLight);

// Cozy interior room pointlights
function addRoomLight(x, y, z, color = 0xffe2b8, intensity = 1.4, distance = 12) {
  const light = new THREE.PointLight(color, intensity, distance, 1.4);
  light.position.set(x, y, z);
  scene.add(light);
  return light;
}

export const roomLights = {
  living: addRoomLight(5.0, 2.7, -3.5, 0xffd9aa, 1.6, 11),
  kitchen: addRoomLight(-5.8, 2.7, -3.5, 0xffeedd, 1.3, 10),
  entrance: addRoomLight(0.5, 2.7, 2.5, 0xffe4be, 1.2, 9),
  bedroom: addRoomLight(-5.8, 5.8, -3.5, 0xffcf99, 1.4, 11),
  gallery: addRoomLight(2.0, 5.8, -3.5, 0xffeedb, 1.5, 12),
  study: addRoomLight(6.8, 5.8, -3.5, 0xffe2b8, 1.3, 10)
};

// =========================================================================
// HOUSE DIMENSIONS & MATERIAL PALETTE
// =========================================================================
export const HOUSE_WIDTH = 18;  // X: -9.0 to +9.0
export const HOUSE_DEPTH = 13;  // Z: -6.5 to +6.5
export const FLOOR_HEIGHT = 3.2; // Ground: 0.0, Upper: 3.2

// High-end procedural PBR textures & materials
const texHardwood = createHardwoodTexture();
const texPlaster = createPlasterTexture();
const texMarble = createMarbleTexture();
const texCeiling = createCeilingTexture();
const texRug = createRugTexture();

const matWoodFloor = new THREE.MeshStandardMaterial({
  map: texHardwood,
  roughness: 0.52,
  metalness: 0.04
});
const matGalleryFloor = new THREE.MeshStandardMaterial({
  color: 0xedebe4,
  map: texPlaster,
  roughness: 0.22,
  metalness: 0.12
});
const matBalconyFloor = new THREE.MeshStandardMaterial({
  color: 0x5a544c,
  roughness: 0.6,
  metalness: 0.1
});
const matGrass = new THREE.MeshStandardMaterial({ color: 0x2e472d, roughness: 0.95 });
const matPlasterWall = new THREE.MeshStandardMaterial({
  map: texPlaster,
  roughness: 0.85,
  side: THREE.DoubleSide
});
const matAccentWall = new THREE.MeshStandardMaterial({
  color: 0x293b37,
  roughness: 0.50,
  metalness: 0.10,
  side: THREE.DoubleSide
});
const matCeiling = new THREE.MeshStandardMaterial({
  map: texCeiling,
  roughness: 0.70,
  side: THREE.DoubleSide,
  emissive: 0x383028,
  emissiveIntensity: 0.12
});
const matDarkWood = new THREE.MeshStandardMaterial({ color: 0x49352b, roughness: 0.45, metalness: 0.05 });
const matSofaFabric = new THREE.MeshStandardMaterial({ color: 0xa8b1a0, roughness: 0.85 });
const matPillow = new THREE.MeshStandardMaterial({ color: 0xd7b798, roughness: 0.7 });
const matBrass = new THREE.MeshStandardMaterial({ color: 0xb69a65, roughness: 0.25, metalness: 0.85 });
const matWhiteMarble = new THREE.MeshStandardMaterial({
  map: texMarble,
  roughness: 0.18,
  metalness: 0.04
});
const matRug = new THREE.MeshStandardMaterial({
  map: texRug,
  roughness: 0.90,
  side: THREE.DoubleSide
});

// =========================================================================
// FLOORS, CEILINGS & GARDEN
// =========================================================================
// 1. Ground Floor (Y = 0)
const groundFloorGeo = new THREE.PlaneGeometry(HOUSE_WIDTH, HOUSE_DEPTH);
const groundFloor = new THREE.Mesh(groundFloorGeo, matWoodFloor);
groundFloor.rotation.x = -Math.PI / 2;
groundFloor.receiveShadow = true;
scene.add(groundFloor);

// 2. Garden & Extended Estate Grounds
const estateLawn = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  matGrass
);
estateLawn.position.set(0, -0.02, 6.0);
estateLawn.rotation.x = -Math.PI / 2;
estateLawn.receiveShadow = true;
scene.add(estateLawn);

const gardenGeo = new THREE.PlaneGeometry(16, 9);
const garden = new THREE.Mesh(gardenGeo, matGrass);
garden.position.set(0, -0.01, 10.5);
garden.rotation.x = -Math.PI / 2;
garden.receiveShadow = true;
scene.add(garden);

// Stepping stones path through garden
for (let i = 0; i < 7; i++) {
  const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.04, 8), matWhiteMarble);
  stone.position.set(Math.sin(i * 0.8) * 0.4, 0.02, 6.8 + i * 1.1);
  stone.receiveShadow = true;
  scene.add(stone);
}

// 3. Upper Floor Deck (Y = 3.2m) with Stairwell Cutout
const upperFloorGroup = new THREE.Group();
// Left wing (Bedroom: X from -9 to -3)
const floorLeft = new THREE.Mesh(new THREE.PlaneGeometry(6, HOUSE_DEPTH), matWoodFloor);
floorLeft.position.set(-6, 3.2, 0);
floorLeft.rotation.x = -Math.PI / 2;
floorLeft.receiveShadow = true;
upperFloorGroup.add(floorLeft);

// Right wing (Study: X from +5 to +9)
const floorRight = new THREE.Mesh(new THREE.PlaneGeometry(4, HOUSE_DEPTH), matWoodFloor);
floorRight.position.set(7, 3.2, 0);
floorRight.rotation.x = -Math.PI / 2;
floorRight.receiveShadow = true;
upperFloorGroup.add(floorRight);

// Gallery and stair-top landing (X from -3 to +5, Z from -6.5 to -1.5)
const floorGallery = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), matGalleryFloor);
floorGallery.position.set(1, 3.2, -4.0);
floorGallery.rotation.x = -Math.PI / 2;
floorGallery.receiveShadow = true;
upperFloorGroup.add(floorGallery);

// Center Landing floor (X from -1.4 to +5, Z from -1.5 to +2.5)
const floorLanding = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4), matWoodFloor);
floorLanding.position.set(1.8, 3.2, 0.5);
floorLanding.rotation.x = -Math.PI / 2;
floorLanding.receiveShadow = true;
upperFloorGroup.add(floorLanding);

// Balcony floor (X from -4 to +4, Z from +2.5 to +6.0)
const floorBalcony = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.5), matBalconyFloor);
floorBalcony.position.set(0, 3.2, 4.25);
floorBalcony.rotation.x = -Math.PI / 2;
floorBalcony.receiveShadow = true;
upperFloorGroup.add(floorBalcony);

scene.add(upperFloorGroup);

// =========================================================================
// 4. CEILINGS WITH STAIRWELL CLEARANCE CUTOUT & CAMERA OBSTACLES
// =========================================================================
export const cameraObstacles = [
  floorLeft,
  floorRight,
  floorGallery,
  floorLanding,
  floorBalcony
];

const groundCeilGroup = new THREE.Group();
// Left wing (Kitchen): X from -9 to -3
const ceilLeft = new THREE.Mesh(new THREE.PlaneGeometry(6, HOUSE_DEPTH), matCeiling);
ceilLeft.position.set(-6, 3.0, 0);
ceilLeft.rotation.x = Math.PI / 2;
groundCeilGroup.add(ceilLeft);
cameraObstacles.push(ceilLeft);

// Right wing (Living): X from +2 to +9
const ceilRight = new THREE.Mesh(new THREE.PlaneGeometry(7, HOUSE_DEPTH), matCeiling);
ceilRight.position.set(5.5, 3.0, 0);
ceilRight.rotation.x = Math.PI / 2;
groundCeilGroup.add(ceilRight);
cameraObstacles.push(ceilRight);

// North Center (Dining): X from -3 to +2, Z from -6.5 to -1.6
const ceilDining = new THREE.Mesh(new THREE.PlaneGeometry(5, 4.9), matCeiling);
ceilDining.position.set(-0.5, 3.0, -4.05);
ceilDining.rotation.x = Math.PI / 2;
groundCeilGroup.add(ceilDining);
cameraObstacles.push(ceilDining);

// The stairwell (X: -3 to +2, Z: -1.6 to +6.5) is open to the 2nd floor!
scene.add(groundCeilGroup);

const upperCeil = new THREE.Mesh(new THREE.PlaneGeometry(HOUSE_WIDTH, HOUSE_DEPTH), matCeiling);
upperCeil.position.set(0, 6.4, 0);
upperCeil.rotation.x = Math.PI / 2;
scene.add(upperCeil);
cameraObstacles.push(upperCeil);

// =========================================================================
// WALLS & ROOM PARTITIONS
// =========================================================================
export const wallColliders = [];

function createWall(w, h, d, x, y, z, mat = matPlasterWall) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  wallColliders.push(mesh);
  cameraObstacles.push(mesh);
  return mesh;
}

// Exterior Walls (Ground + Upper = 6.4m total)
createWall(HOUSE_WIDTH, 6.4, 0.3, 0, 3.2, -6.5); // Back Wall (North)
createWall(0.3, 6.4, HOUSE_DEPTH, -9.0, 3.2, 0); // West Wall
createWall(0.3, 6.4, HOUSE_DEPTH, 9.0, 3.2, 0);  // East Wall

// Front Exterior Wall with Ground Entrance + Upper Balcony Opening
createWall(6.5, 3.2, 0.3, -5.75, 1.6, 6.5); // Front left (Kitchen/Powder)
createWall(6.5, 3.2, 0.3, 5.75, 1.6, 6.5);  // Front right (Living)
createWall(5.0, 0.9, 0.3, 0, 2.75, 6.5);    // Entrance lintel above door

// Garden Boundary Stone Walls (Spec §7.2 - Encloses the front garden)
const matGardenWall = new THREE.MeshStandardMaterial({ color: 0x484642, roughness: 0.9 });
createWall(0.3, 2.2, 8.5, -8.0, 1.1, 10.5, matGardenWall); // Garden West Wall
createWall(0.3, 2.2, 8.5, 8.0, 1.1, 10.5, matGardenWall);  // Garden East Wall
createWall(16.3, 2.2, 0.3, 0, 1.1, 14.5, matGardenWall);   // Garden South Perimeter Wall

// Upper Front Wall with Balcony Doorway
createWall(5.0, 3.2, 0.3, -6.5, 4.8, 6.5);
createWall(5.0, 3.2, 0.3, 6.5, 4.8, 6.5);
createWall(8.0, 0.8, 0.3, 0, 6.0, 6.5); // Balcony lintel

// Ground Floor Interior Partitions
// Kitchen/Dining partition (with large open archway)
createWall(0.2, 3.0, 3.0, -3.0, 1.5, -5.0);
createWall(0.2, 3.0, 2.5, -3.0, 1.5, 0.5);
createWall(0.2, 0.8, 2.5, -3.0, 2.6, -2.25); // Arch lintel

// Living Room Partition (West wall of living room)
createWall(0.2, 3.0, 3.2, 2.0, 1.5, -4.9);
createWall(0.2, 0.8, 2.2, 2.0, 2.6, -2.2);

// Upper Floor Interior Partitions
// Bedroom East Wall (separating Bedroom from Upper Landing)
createWall(0.2, 3.2, 8.0, -3.0, 4.8, -2.5);

// Study West Wall (separating Study from Memory Gallery)
createWall(0.2, 3.2, 8.0, 5.0, 4.8, -2.5);

// Memory Gallery Centerpiece Jet-Black Partition Wall
createWall(4.2, 3.2, 0.25, 2.0, 4.8, -6.35, matAccentWall);

// =========================================================================
// 18-STEP STAIRCASE (Ground to Upper Floor Y = 3.2m)
// =========================================================================
export const STAIR_WIDTH = 1.2;
export const STAIR_START_Z = 3.6;
export const STAIR_END_Z = -1.6;
export const STAIR_X = -2.2;
const STEPS_COUNT = 18;
const STEP_RISE = FLOOR_HEIGHT / STEPS_COUNT; // ~0.1778m
const STEP_RUN = (STAIR_START_Z - STAIR_END_Z) / STEPS_COUNT; // ~0.288m

const stairGroup = new THREE.Group();
for (let i = 0; i < STEPS_COUNT; i++) {
  const stepY = i * STEP_RISE + STEP_RISE / 2;
  const stepZ = STAIR_START_Z - (i * STEP_RUN + STEP_RUN / 2);
  
  // Step tread + riser
  const stepMesh = new THREE.Mesh(
    new THREE.BoxGeometry(STAIR_WIDTH, STEP_RISE, STEP_RUN + 0.02),
    matDarkWood
  );
  stepMesh.position.set(STAIR_X, stepY, stepZ);
  stepMesh.castShadow = true;
  stepMesh.receiveShadow = true;
  stairGroup.add(stepMesh);
}

// Handrails along staircase
const railMat = matBrass;
for (let offset of [-STAIR_WIDTH / 2, STAIR_WIDTH / 2]) {
  const railGeo = new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(STAIR_START_Z - STAIR_END_Z, FLOOR_HEIGHT));
  const rail = new THREE.Mesh(railGeo, railMat);
  rail.position.set(STAIR_X + offset, 1.6 + 0.85, 1.0);
  rail.rotation.x = -Math.atan2(STAIR_START_Z - STAIR_END_Z, FLOOR_HEIGHT);
  stairGroup.add(rail);
}
scene.add(stairGroup);

// Railing around upper stairwell cutout
const banisterMat = matBrass;
function addBannister(len, x, z, rotY = 0) {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.05), banisterMat);
  rail.position.set(x, 3.2 + 0.9, z);
  rail.rotation.y = rotY;
  scene.add(rail);

  const posts = Math.floor(len / 0.8) + 1;
  for (let i = 0; i < posts; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9), banisterMat);
    const px = rotY === 0 ? x - len / 2 + (i * len) / (posts - 1) : x;
    const pz = rotY === 0 ? z : z - len / 2 + (i * len) / (posts - 1);
    post.position.set(px, 3.2 + 0.45, pz);
    scene.add(post);
  }
}
addBannister(4.2, -1.4, 0.5, Math.PI / 2); // Stairwell edge
addBannister(8.0, 0, 6.1, 0);              // Balcony edge

// =========================================================================
// FURNITURE & ROOM DECOR (Ground + Upper)
// =========================================================================
// Luxury Ornamental Persian Rugs (Living Room & Master Bedroom)
const livingRug = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.0), matRug);
livingRug.position.set(4.4, 0.015, -3.2);
livingRug.rotation.x = -Math.PI / 2;
livingRug.receiveShadow = true;
scene.add(livingRug);

const bedRug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.8), matRug);
bedRug.position.set(-6.0, 3.2 + 0.015, -3.8);
bedRug.rotation.x = -Math.PI / 2;
bedRug.receiveShadow = true;
scene.add(bedRug);

// Front Living Room Panoramic Glass Windows
const matGlass = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.18,
  roughness: 0.08,
  metalness: 0.1,
  side: THREE.DoubleSide
});
const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x12141a, roughness: 0.4 });
const livingWindow = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), matGlass);
livingWindow.position.set(5.5, 1.4, 6.48);
scene.add(livingWindow);
for (let mx of [3.8, 5.5, 7.2]) {
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 0.08), windowFrameMat);
  mullion.position.set(mx, 1.4, 6.48);
  scene.add(mullion);
}

// Cozy Floor Lamps with Soft Warm Glow
function addCozyFloorLamp(x, y, z) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), matBrass);
  base.position.set(x, y + 0.02, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.6), matBrass);
  pole.position.set(x, y + 0.82, z);
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.28, 0.38, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xfffaea, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffcb78, emissiveIntensity: 0.45 })
  );
  shade.position.set(x, y + 1.55, z);
  group.add(base, pole, shade);
  scene.add(group);

  const lampLight = new THREE.PointLight(0xffd290, 1.1, 7, 1.6);
  lampLight.position.set(x, y + 1.52, z);
  scene.add(lampLight);
}
addCozyFloorLamp(8.4, 0.0, -5.8);  // Living room reading corner
addCozyFloorLamp(-8.4, 3.2, -5.8); // Master bedroom corner

// Leafy corner accents soften the oak, linen and brass palette.
const matLeaves = new THREE.MeshStandardMaterial({ color: 0x526d48, roughness: 0.9 });
const matPlanter = new THREE.MeshStandardMaterial({ color: 0xb7a58c, roughness: 0.85 });
for (const [x, y, z] of [[7.9, 0, 5.6], [-8.2, 0, 5.5], [-8.2, 3.2, 1.8], [8.1, 3.2, 1.8]]) {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.19, 0.42, 16), matPlanter);
  pot.position.set(x, y + 0.21, z);
  pot.castShadow = true;
  scene.add(pot);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.9, 8), matDarkWood);
  stem.position.set(x, y + 0.85, z);
  scene.add(stem);
  for (let i = 0; i < 4; i++) {
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), matLeaves);
    leaves.scale.set(1, 1.35, 0.75);
    leaves.position.set(x + Math.sin(i * 2.4) * 0.18, y + 0.95 + i * 0.15, z + Math.cos(i * 2.4) * 0.15);
    leaves.castShadow = true;
    scene.add(leaves);
  }
}

// 1. Living Room: L-Shaped Sectional Sofa
const sofaGroup = new THREE.Group();
const sofaBase1 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.42, 1.0), matSofaFabric);
sofaBase1.position.set(4.5, 0.21, -3.5);
const sofaBack1 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.5, 0.25), matSofaFabric);
sofaBack1.position.set(4.5, 0.55, -4.0);

const sofaBase2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.42, 2.0), matSofaFabric);
sofaBase2.position.set(5.5, 0.21, -2.5);
const sofaBack2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 2.0), matSofaFabric);
sofaBack2.position.set(6.0, 0.55, -2.5);

sofaGroup.add(sofaBase1, sofaBack1, sofaBase2, sofaBack2);
for (const x of [3.5, 4.4, 5.3]) {
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.1, 0.78), matSofaFabric);
  cushion.position.set(x, 0.45, -3.45);
  sofaGroup.add(cushion);
}
for (const x of [3.35, 5.5]) {
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.16), matPillow);
  pillow.position.set(x, 0.72, -3.79);
  pillow.rotation.z = x < 4 ? 0.12 : -0.12;
  sofaGroup.add(pillow);
}

sofaGroup.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
scene.add(sofaGroup);

// Living Room Coffee Table
const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.9), matDarkWood);
coffeeTable.position.set(4.2, 0.175, -2.4);
coffeeTable.castShadow = true;
scene.add(coffeeTable);

// Living Room Armchair
const armchair = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.9), matSofaFabric);
armchair.position.set(2.8, 0.39, -2.5);
armchair.rotation.y = Math.PI / 4;
armchair.castShadow = true;
scene.add(armchair);
const armchairBack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.65, 0.16), matSofaFabric);
armchairBack.position.set(0, 0.25, -0.38);
armchair.add(armchairBack);


// Fireplace & Hearth with Warm Light
const fireplaceHearth = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.6), matWhiteMarble);
fireplaceHearth.position.set(5.5, 0.7, -6.2);
fireplaceHearth.castShadow = true;
scene.add(fireplaceHearth);

const fireOpening = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.3), matAccentWall);
fireOpening.position.set(5.5, 0.55, -5.95);
scene.add(fireOpening);

export const fireLight = new THREE.PointLight(0xff6a20, 1.8, 7, 2.0);
fireLight.position.set(5.5, 0.55, -5.7);
scene.add(fireLight);

// Grand / Upright Piano & Stool
const pianoBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.75), matDarkWood);
pianoBody.position.set(7.8, 0.55, -2.5);
pianoBody.castShadow = true;
scene.add(pianoBody);

const pianoKeys = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.25), matWhiteMarble);
pianoKeys.position.set(7.8, 0.68, -2.05);
scene.add(pianoKeys);

const pianoBench = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.48, 0.35), matDarkWood);
pianoBench.position.set(7.8, 0.24, -1.55);
pianoBench.castShadow = true;
scene.add(pianoBench);

// Living Room Bookshelf
const bookshelf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.6, 1.8), matDarkWood);
bookshelf.position.set(8.75, 1.3, -4.8);
bookshelf.castShadow = true;
scene.add(bookshelf);

// 2. Kitchen Island & Stools
const island = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 1.2), matWhiteMarble);
island.position.set(-6.0, 0.475, -3.5);
island.castShadow = true;
scene.add(island);

for (let i = 0; i < 3; i++) {
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.65, 12), matDarkWood);
  stool.position.set(-4.35, 0.325, -4.2 + i * 0.7);
  stool.castShadow = true;
  scene.add(stool);
}

// 3. Dining Area: Dining Table & Chairs
const diningTable = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.1), matDarkWood);
diningTable.position.set(-0.5, 0.72, -3.8);
diningTable.castShadow = true;
scene.add(diningTable);
for (const x of [-1.55, 0.55]) {
  for (const z of [-4.15, -3.45]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.66, 0.09), matDarkWood);
    leg.position.set(x, 0.33, z);
    leg.castShadow = true;
    scene.add(leg);
  }
}

for (let x of [-1.2, 0.2]) {
  for (let z of [-4.5, -3.1]) {
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.45), matDarkWood);
    chair.position.set(x, 0.45, z);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.48, 0.07), matDarkWood);
    back.position.set(0, 0.25, z < -3.8 ? -0.2 : 0.2);
    chair.add(back);
    for (const lx of [-0.16, 0.16]) {
      for (const lz of [-0.16, 0.16]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.4, 0.045), matDarkWood);
        leg.position.set(lx, -0.25, lz);
        chair.add(leg);
      }
    }
    chair.castShadow = true;
    scene.add(chair);
  }
}

// 4. Entrance Hall: Console Table, Mirror & Hall Bench
const consoleTable = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.4), matDarkWood);
consoleTable.position.set(1.5, 0.4, 6.2);
consoleTable.castShadow = true;
scene.add(consoleTable);

const hallMirror = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.05), matBrass);
hallMirror.position.set(1.5, 1.8, 6.35);
scene.add(hallMirror);

const hallBench = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.5), matDarkWood);
hallBench.position.set(1.2, 0.225, 4.2);
hallBench.castShadow = true;
scene.add(hallBench);

// 5. Master Bedroom (Upper Floor Y = 3.2m): King Bed
const bedGroup = new THREE.Group();
const bedBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 2.2), matDarkWood);
bedBase.position.set(-6.0, 3.2 + 0.225, -4.5);

const matLinen = new THREE.MeshStandardMaterial({ color: 0xeee5d5, roughness: 0.95 });
const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 2.0), matLinen);
mattress.position.set(-6.0, 3.2 + 0.45, -4.5);

const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.15), matDarkWood);
headboard.position.set(-6.0, 3.2 + 0.8, -5.55);

const pillowL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.4), matPillow);
pillowL.position.set(-6.5, 3.2 + 0.65, -5.2);
const pillowR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.4), matPillow);
pillowR.position.set(-5.5, 3.2 + 0.65, -5.2);

bedGroup.add(bedBase, mattress, headboard, pillowL, pillowR);
bedGroup.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
scene.add(bedGroup);

// Nightstands
for (let nx of [-7.4, -4.6]) {
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.55), matDarkWood);
  stand.position.set(nx, 3.2 + 0.275, -5.3);
  stand.castShadow = true;
  scene.add(stand);
}

// 6. Study / Library (Upper Floor): Desk & Bookshelves
const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.78, 0.9), matDarkWood);
desk.position.set(6.8, 3.2 + 0.39, -4.2);
desk.castShadow = true;
scene.add(desk);

const deskChair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.55), matSofaFabric);
deskChair.position.set(6.8, 3.2 + 0.45, -3.3);
deskChair.rotation.y = Math.PI;
deskChair.castShadow = true;
scene.add(deskChair);

const studyBookshelf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.8, 2.6), matDarkWood);
studyBookshelf.position.set(8.75, 3.2 + 1.4, -4.5);
studyBookshelf.castShadow = true;
scene.add(studyBookshelf);

// 7. Garden Bench & Balcony Chairs
const gardenBench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.48, 0.55), matDarkWood);
gardenBench.position.set(0.0, 0.24, 9.8);
gardenBench.castShadow = true;
scene.add(gardenBench);

for (let bx of [-1.5, 1.5]) {
  const balconyChair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.7), matSofaFabric);
  balconyChair.position.set(bx, 3.2 + 0.375, 4.8);
  balconyChair.castShadow = true;
  scene.add(balconyChair);
}

// =========================================================================
// MEMORY GALLERY (Upper Floor Museum Hall) & ARTWORKS PRESERVATION
// =========================================================================
// Gallery viewing bench
export const galleryBench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.48, 0.65), matDarkWood);
galleryBench.position.set(2.0, 3.2 + 0.24, -3.8);
galleryBench.castShadow = true;
scene.add(galleryBench);

// Dedication Plaque Console on Centerpiece Wall
const plaqueConsole = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.5), matAccentWall);
plaqueConsole.position.set(2.0, 3.2 + 0.8, -6.15);
plaqueConsole.rotation.x = -Math.PI / 8;
scene.add(plaqueConsole);

export const plaqueCanvas = document.createElement('canvas');
plaqueCanvas.width = 512;
plaqueCanvas.height = 256;
export const pctx = plaqueCanvas.getContext('2d');
export const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);

export const plaqueFace = new THREE.Mesh(
  new THREE.PlaneGeometry(1.3, 0.28),
  new THREE.MeshBasicMaterial({ map: plaqueTex })
);
plaqueFace.position.set(2.0, 3.2 + 0.82, -6.12);
plaqueFace.rotation.x = -Math.PI / 8;
scene.add(plaqueFace);

export const interactiveArtworks = [];
export const galleryItems = [
  // Upper Memory Gallery (Original 5 preserved)
  {
    id: 1,
    title: "For Maya",
    tag: "A PERMANENT COLLECTION",
    quote: "Our whole winter, hung on the walls, just for you.",
    sign: "Love, Ethan",
    url: null,
    room: "Memory Gallery",
    pos: [2.0, 3.2 + 2.0, -6.2],
    rot: [0, 0, 0],
    width: 2.8, height: 1.8, isCenterpiece: true
  },
  {
    id: 2,
    title: "The Snowy Whispers",
    tag: "WINTER MEMORIES",
    quote: "You said you hated the cold, but you stayed outside with me anyway.",
    sign: "Love, Ethan",
    url: null,
    room: "Memory Gallery",
    pos: [-0.6, 3.2 + 1.8, -6.3],
    rot: [0, 0, 0],
    width: 1.6, height: 1.8
  },
  {
    id: 3,
    title: "Quiet Bench by the Pines",
    tag: "WINTER MEMORIES",
    quote: "The quiet moments we shared while the world stood completely still.",
    sign: "Love, Ethan",
    url: null,
    room: "Memory Gallery",
    pos: [4.6, 3.2 + 1.8, -6.3],
    rot: [0, 0, 0],
    width: 1.6, height: 1.8
  },
  {
    id: 4,
    title: "Snowy Trails With You",
    tag: "JOURNEY",
    quote: "Every single path I walk, I want to walk with you.",
    sign: "Love, Ethan",
    url: null,
    room: "Memory Gallery",
    pos: [-0.85, 3.2 + 1.8, -3.8],
    rot: [0, Math.PI / 2, 0],
    width: 1.8, height: 1.8
  },
  {
    id: 5,
    title: "Forever Beside You",
    tag: "ETERNAL",
    quote: "When time completely stopped and nothing else in this universe mattered.",
    sign: "Love, Ethan",
    url: null,
    room: "Memory Gallery",
    pos: [4.85, 3.2 + 1.8, -3.8],
    rot: [0, -Math.PI / 2, 0],
    width: 1.8, height: 1.8
  },

  // Living Room Artworks
  {
    id: 6,
    title: "Warm Hearth With You",
    tag: "LIVING ROOM",
    quote: "The cozy glow of our fireplace while the night winds blew outside.",
    sign: "Love, Ethan",
    url: null,
    room: "Living Room",
    pos: [5.5, 2.2, -6.2],
    rot: [0, 0, 0],
    width: 1.8, height: 1.3
  },
  {
    id: 7,
    title: "Melody in the Evening",
    tag: "LIVING ROOM",
    quote: "Every romantic note played on the piano reminds me of your smile.",
    sign: "Love, Ethan",
    url: null,
    room: "Living Room",
    pos: [8.85, 1.85, -3.5],
    rot: [0, -Math.PI / 2, 0],
    width: 1.5, height: 1.6
  },

  // Entrance & Dining Artworks
  {
    id: 8,
    title: "Welcome Home, My Love",
    tag: "ENTRANCE HALL",
    quote: "Coming home to you is my favourite part of every single day.",
    sign: "Love, Ethan",
    url: null,
    room: "Entrance Hall",
    pos: [2.5, 1.85, 6.35],
    rot: [0, Math.PI, 0],
    width: 1.4, height: 1.7
  },
  {
    id: 9,
    title: "Candlelight & Laughter",
    tag: "DINING ROOM",
    quote: "The dinners that lasted for hours because we couldn't stop talking.",
    sign: "Love, Ethan",
    url: null,
    room: "Dining Room",
    pos: [-1.8, 1.9, -6.35],
    rot: [0, 0, 0],
    width: 1.6, height: 1.4
  },

  // Upper Floor Bedroom, Study & Balcony Artworks
  {
    id: 10,
    title: "Sweetest Dreams",
    tag: "MASTER BEDROOM",
    quote: "Falling asleep beside you and waking up to your morning glow.",
    sign: "Love, Ethan",
    url: null,
    room: "Master Bedroom",
    pos: [-5.9, 3.2 + 2.1, -6.35],
    rot: [0, 0, 0],
    width: 2.0, height: 1.4
  },
  {
    id: 11,
    title: "Our Next Chapter",
    tag: "STUDY & LIBRARY",
    quote: "All the dreams, plans, and stories we are writing together.",
    sign: "Love, Ethan",
    url: null,
    room: "Study & Library",
    pos: [6.8, 3.2 + 1.95, -6.35],
    rot: [0, 0, 0],
    width: 1.6, height: 1.5
  },
  {
    id: 12,
    title: "Under the Midnight Sky",
    tag: "BALCONY TERRACE",
    quote: "Standing under the stars together, breathing in the quiet night air.",
    sign: "Love, Ethan",
    url: null,
    room: "Balcony Terrace",
    pos: [-3.85, 3.2 + 1.85, 4.2],
    rot: [0, Math.PI / 2, 0],
    width: 1.4, height: 1.6
  },

  // Kitchen Corners & Archway Artworks
  {
    id: 13,
    title: "Morning Brew & Gentle Smiles",
    tag: "KITCHEN CORNER",
    quote: "Fresh coffee brewing and your morning laughter filling the room.",
    sign: "Love, Ethan",
    url: null,
    room: "Kitchen",
    pos: [-8.85, 1.9, -3.5],
    rot: [0, Math.PI / 2, 0],
    width: 1.5, height: 1.5
  },
  {
    id: 14,
    title: "The Recipe of Us",
    tag: "KITCHEN ALCOVE",
    quote: "Late night midnight snacks and dancing barefoot on the tiles.",
    sign: "Love, Ethan",
    url: null,
    room: "Kitchen",
    pos: [-3.15, 1.9, 0.5],
    rot: [0, -Math.PI / 2, 0],
    width: 1.4, height: 1.6
  },

  // Upper Stair Landing Wall Artwork
  {
    id: 15,
    title: "Steps We Walk Together",
    tag: "STAIR LANDING",
    quote: "Every step we take in this life, we take hand in hand.",
    sign: "Love, Ethan",
    url: null,
    room: "Upper Landing",
    pos: [-2.2, 3.2 + 1.8, -6.3],
    rot: [0, 0, 0],
    width: 1.6, height: 1.7
  },

  // Master Bedroom Vanity Alcove Artwork
  {
    id: 16,
    title: "Moonlit Whispers",
    tag: "BEDROOM ALCOVE",
    quote: "The quiet night hours when the universe narrows down to just us.",
    sign: "Love, Ethan",
    url: null,
    room: "Master Bedroom",
    pos: [-8.85, 3.2 + 2.0, -2.8],
    rot: [0, Math.PI / 2, 0],
    width: 1.5, height: 1.6
  },

  // Living Room South Wall Corner Artwork
  {
    id: 17,
    title: "Golden Hour Moments",
    tag: "LIVING ROOM NOOK",
    quote: "Watching the sun paint warm gold across the floorboards with you.",
    sign: "Love, Ethan",
    url: null,
    room: "Living Room",
    pos: [5.5, 1.85, 6.35],
    rot: [0, Math.PI, 0],
    width: 1.6, height: 1.4
  },

  // Front Porch Garden Nook Artwork
  {
    id: 18,
    title: "Starlight Garden",
    tag: "GARDEN PORCH",
    quote: "Breathing the pine scent of evening under a canopy of countless stars.",
    sign: "Love, Ethan",
    url: null,
    room: "Garden & Porch",
    pos: [-3.5, 1.85, 6.35],
    rot: [0, Math.PI, 0],
    width: 1.5, height: 1.5
  }
];

export function createFallbackArtCanvas(item) {
  if (typeof item === 'object' && item !== null) {
    return createRomanticPainting(item.id || 1, item.title, item.tag, item.quote);
  }
  return createRomanticPainting(1, String(item || 'Exhibition Piece'), 'A PERMANENT COLLECTION', '');
}

galleryItems.forEach(item => {
  const frameGroup = new THREE.Group();
  const frameDepth = 0.06;

  const frameOuter = new THREE.Mesh(
    new THREE.BoxGeometry(item.width + 0.16, item.height + 0.16, frameDepth),
    new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.35, metalness: 0.1 })
  );
  frameOuter.castShadow = true;
  frameGroup.add(frameOuter);

  const photoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(item.width, item.height),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  photoMesh.position.z = frameDepth / 2 + 0.005;
  photoMesh.userData = item;
  photoMesh.material.map = createFallbackArtCanvas(item);
  item.photoMesh = photoMesh;
  item.frameGroup = frameGroup;
  frameGroup.add(photoMesh);
  interactiveArtworks.push(photoMesh);

  frameGroup.position.set(...item.pos);
  frameGroup.rotation.set(...item.rot);
  scene.add(frameGroup);

  // Dedicated spotlight for each picture frame
  const spot = new THREE.SpotLight(0xffeed6, 2.2, 9, Math.PI / 5, 0.45, 1.2);
  const spotY = item.pos[1] + 1.0;
  const spotZ = item.rot[1] === 0 ? item.pos[2] + 1.6 : (item.rot[1] === Math.PI ? item.pos[2] - 1.6 : item.pos[2]);
  const spotX = item.rot[1] === Math.PI / 2 ? item.pos[0] + 1.6 : (item.rot[1] === -Math.PI / 2 ? item.pos[0] - 1.6 : item.pos[0]);
  spot.position.set(spotX, spotY, spotZ);
  spot.target = frameGroup;
  scene.add(spot);
});

plaqueFace.userData = galleryItems[0];
interactiveArtworks.push(plaqueFace);

export function updatePlaqueTexture(plaqueCfg) {
  pctx.fillStyle = '#0d0e12';
  pctx.fillRect(0, 0, 512, 256);
  pctx.strokeStyle = '#e8d0a9';
  pctx.lineWidth = 4;
  pctx.strokeRect(10, 10, 492, 236);
  pctx.fillStyle = '#8e93a0';
  pctx.font = '18px Inter';
  pctx.textAlign = 'center';
  pctx.fillText(plaqueCfg.tag || 'A PERMANENT COLLECTION', 256, 50);
  pctx.fillStyle = '#fff';
  pctx.font = 'bold 36px "Cormorant Garamond", serif';
  pctx.fillText(plaqueCfg.title || 'For Maya', 256, 110);
  pctx.fillStyle = '#e8d0a9';
  pctx.font = 'italic 20px "Cormorant Garamond", serif';
  const quote = String(plaqueCfg.quote || '');
  const dispQuote = quote.length > 38 ? quote.substring(0, 35) + '...' : quote;
  pctx.fillText(`"${dispQuote}"`, 256, 160);
  pctx.fillStyle = '#888';
  pctx.font = '16px Inter';
  pctx.fillText('[Click to inspect dedication]', 256, 210);
  plaqueTex.needsUpdate = true;
}

// =========================================================================
// INTERACTION POINTS & HOUSE ROOMS REGISTRY
// =========================================================================
export const interactionPoints = [
  // Living Room
  { id: 'sit_sofa_1', type: 'sit', label: 'Sit on Sofa', pos: [4.0, 0.5, -3.2], facing: [0, 0, 1] },
  { id: 'sit_sofa_2', type: 'sit', label: 'Sit with Partner', pos: [4.8, 0.5, -3.2], facing: [0, 0, 1] },
  { id: 'sit_armchair', type: 'sit', label: 'Sit in Armchair', pos: [2.8, 0.48, -2.5], facing: [1, 0, 0] },
  { id: 'play_piano', type: 'piano', label: 'Play Piano 🎹', pos: [7.8, 0.52, -1.7], facing: [0, 0, -1] },
  { id: 'fireplace', type: 'toggle_fire', label: 'Warm Hearth 🔥', pos: [5.5, 0.8, -5.6] },

  // Kitchen & Dining
  { id: 'sit_dining_1', type: 'sit', label: 'Sit at Table', pos: [-0.5, 0.5, -3.2], facing: [0, 0, -1] },
  { id: 'sit_dining_2', type: 'sit', label: 'Sit at Table', pos: [-0.5, 0.5, -4.4], facing: [0, 0, 1] },
  { id: 'sit_stool', type: 'sit', label: 'Sit at Island', pos: [-4.35, 0.65, -3.5], facing: [-1, 0, 0] },

  // Entrance & Garden
  { id: 'sit_hall_bench', type: 'sit', label: 'Sit on Hall Bench', pos: [1.2, 0.48, 4.05], facing: [0, 0, -1] },
  { id: 'sit_garden_bench', type: 'sit', label: 'Sit in Garden', pos: [0.0, 0.48, 9.8], facing: [0, 0, -1] },

  // Upper Floor - Bedroom
  { id: 'sit_bed_edge', type: 'sit', label: 'Sit on Bed', pos: [-5.2, 3.2 + 0.55, -4.2], facing: [1, 0, 0] },
  { id: 'lie_bed_maya', type: 'lie', label: 'Lie on Bed', pos: [-6.4, 3.2 + 0.65, -4.5], facing: [0, 0, 1] },
  { id: 'lie_bed_ethan', type: 'lie', label: 'Lie on Bed', pos: [-5.6, 3.2 + 0.65, -4.5], facing: [0, 0, 1] },

  // Upper Floor - Memory Gallery
  { id: 'sit_gallery_bench', type: 'sit', label: 'Sit on Gallery Bench', pos: [2.0, 3.2 + 0.48, -3.98], facing: [0, 0, -1] },
  { id: 'inspect_plaque', type: 'plaque', label: 'Inspect Plaque 📜', pos: [2.0, 3.2 + 0.85, -6.1] },

  // Upper Floor - Study & Balcony
  { id: 'sit_desk_chair', type: 'sit', label: 'Sit at Study Desk', pos: [6.8, 3.2 + 0.48, -3.5], facing: [0, 0, -1] },
  { id: 'sit_balcony_1', type: 'sit', label: 'Sit on Balcony', pos: [-1.5, 3.2 + 0.48, 4.8], facing: [0, 0, 1] },
  { id: 'sit_balcony_2', type: 'sit', label: 'Sit on Balcony', pos: [1.5, 3.2 + 0.48, 4.8], facing: [0, 0, 1] },
  { id: 'lean_balcony', type: 'balcony_view', label: 'Look at Garden & Stars 🌌', pos: [0.0, 3.2 + 1.0, 5.8], facing: [0, 0, 1] }
];

export const houseRooms = {
  entrance: { floor: 0, spawn: [0.65, 0, 2.5], facingY: Math.PI, name: 'Entrance Hall' },
  living: { floor: 0, spawn: [4.2, 0, -0.8], facingY: 0, name: 'Living Room' },
  kitchen: { floor: 0, spawn: [-6.0, 0, -1.8], facingY: 0, name: 'Kitchen' },
  dining: { floor: 0, spawn: [-0.5, 0, -2.5], facingY: 0, name: 'Dining Room' },
  garden: { floor: 0, spawn: [0, 0, 8.5], facingY: 0, name: 'Garden' },
  stairs_bottom: { floor: 0, spawn: [STAIR_X, 0, 3.8], facingY: 0, name: 'Stairs (Bottom)' },
  stairs_top: { floor: 1, spawn: [STAIR_X, 3.2, -1.8], facingY: 0, name: 'Stairs (Top)' },
  landing: { floor: 1, spawn: [0.5, 3.2, 0.5], facingY: 0, name: 'Upper Landing' },
  bedroom: { floor: 1, spawn: [-5.8, 3.2, -2.8], facingY: 0, name: 'Master Bedroom' },
  gallery: { floor: 1, spawn: [2.0, 3.2, -2.2], facingY: 0, name: 'Memory Gallery' },
  study: { floor: 1, spawn: [6.8, 3.2, -2.2], facingY: 0, name: 'Study & Library' },
  balcony: { floor: 1, spawn: [0, 3.2, 3.8], facingY: Math.PI, name: 'Balcony Terrace' }
};

// =========================================================================
// HOUSE COLLISION BOUNDARIES (Spec §9.3 - Wall Sliding & Collision Mesh)
// =========================================================================
export const houseColliders = [
  // Ground Floor Partitions & Large Obstacles
  { id: 'g_living_wall', minX: 1.85, maxX: 2.15, minZ: -6.5, maxZ: -3.3, floor: 0 },
  { id: 'g_kitchen_wall_north', minX: -3.1, maxX: -2.9, minZ: -6.5, maxZ: -3.5, floor: 0 },
  { id: 'g_kitchen_wall_south', minX: -3.1, maxX: -2.9, minZ: -0.75, maxZ: 1.75, floor: 0 },
  { id: 'g_kitchen_island', minX: -7.2, maxX: -4.8, minZ: -4.1, maxZ: -2.9, floor: 0 },
  { id: 'g_dining_table', minX: -1.8, maxX: 0.8, minZ: -4.35, maxZ: -3.25, floor: 0 },
  { id: 'g_fireplace', minX: 4.2, maxX: 6.8, minZ: -6.5, maxZ: -5.8, floor: 0 },
  { id: 'g_piano', minX: 7.0, maxX: 8.6, minZ: -2.9, maxZ: -2.0, floor: 0 },

  { id: 'g_sofa_seats', minX: 3.0, maxX: 6.0, minZ: -4.125, maxZ: -3.0, floor: 0 },
  { id: 'g_sofa_chaise', minX: 5.0, maxX: 6.125, minZ: -3.5, maxZ: -1.5, floor: 0 },
  { id: 'g_coffee_table', minX: 3.4, maxX: 5.0, minZ: -2.85, maxZ: -1.95, floor: 0 },
  { id: 'g_hall_bench', minX: 0.4, maxX: 2.0, minZ: 3.95, maxZ: 4.45, floor: 0 },

  // Ground Floor Front Exterior Walls (leaving entrance doorway X: [-1.8, 1.8] open)
  { id: 'g_front_wall_left', minX: -9.0, maxX: -1.8, minZ: 6.2, maxZ: 6.6, floor: 0 },
  { id: 'g_front_wall_right', minX: 1.8, maxX: 9.0, minZ: 6.2, maxZ: 6.6, floor: 0 },

  // Garden Stone Perimeter Walls
  { id: 'g_garden_wall_west', minX: -8.2, maxX: -7.8, minZ: 6.5, maxZ: 14.8, floor: 0 },
  { id: 'g_garden_wall_east', minX: 7.8, maxX: 8.2, minZ: 6.5, maxZ: 14.8, floor: 0 },
  { id: 'g_garden_wall_south', minX: -8.0, maxX: 8.0, minZ: 14.2, maxZ: 14.8, floor: 0 },

  // Upper Floor Partitions & Void Boundaries
  { id: 'u_bedroom_wall', minX: -3.15, maxX: -2.85, minZ: -6.5, maxZ: 1.5, floor: 1 },
  { id: 'u_study_wall', minX: 4.85, maxX: 5.15, minZ: -6.5, maxZ: 1.5, floor: 1 },
  { id: 'u_gallery_center_wall', minX: -0.2, maxX: 4.2, minZ: -6.5, maxZ: -6.1, floor: 1 },
  { id: 'u_master_bed', minX: -7.0, maxX: -4.8, minZ: -5.5, maxZ: -3.5, floor: 1 },
  { id: 'u_study_desk', minX: 5.9, maxX: 7.7, minZ: -4.65, maxZ: -3.75, floor: 1 },
  { id: 'u_gallery_bench', minX: 0.8, maxX: 3.2, minZ: -4.125, maxZ: -3.475, floor: 1 },
  // Stairwell Void Balustrade (keeps Upper Landing safe from falling into void)
  { id: 'u_stairwell_void', minX: -2.8, maxX: -1.35, minZ: -1.4, maxZ: 2.6, floor: 1 },

  // Upper Balcony Railings
  { id: 'u_balcony_front', minX: -4.0, maxX: 4.0, minZ: 5.8, maxZ: 6.2, floor: 1 },
  { id: 'u_balcony_west', minX: -4.2, maxX: -3.8, minZ: 2.5, maxZ: 5.8, floor: 1 },
  { id: 'u_balcony_east', minX: 3.8, maxX: 4.2, minZ: 2.5, maxZ: 5.8, floor: 1 }
];

// =========================================================================
// FIREPLACE INTERACTIVITY & WARM FLICKER
// =========================================================================
export let isFireplaceActive = true;

export function toggleFireplace() {
  isFireplaceActive = !isFireplaceActive;
  fireLight.intensity = isFireplaceActive ? 1.8 : 0.0;
  return isFireplaceActive;
}

export function updateFireplaceFlicker(time) {
  if (!isFireplaceActive) return;
  fireLight.intensity = 1.6 + Math.sin(time * 12.0) * 0.25 + (Math.random() - 0.5) * 0.12;
}
