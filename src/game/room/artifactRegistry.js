/**
 * Our Museum 3D — Model Artifact Registry
 *
 * Central catalog of the approved GLB 3D model artifacts (normalised in
 * Step 1, see public/models/ready/models.manifest.json). Each artifact has:
 *  - id, name, category, pri (Priority 1/2/3)
 *  - kind: 'glb' — the artifact is a 3D model loaded from `path`
 *  - contact: 'floor' | 'wall' | 'ceiling'
 *  - footprint: { shape: 'cylinder'|'box', radius?, w?, d?, height } used by
 *    the Placement Studio validator and for collision
 *  - defaultScale: scale factor that maps the model's native units to real
 *    metres, so a placed model renders at its real-world size
 *  - path: path to the ready .glb model
 *  - seats: [{ id, x, z, yaw, height }] where x/z offsets and height are in REAL METRES
 *    at final size relative to the model's base centre. Never multiply by scale.
 *
 * The procedural artifact builders were removed (see git history) in favour of
 * these real 3D models.
 */
import * as THREE from 'three'

const registry = new Map()

export function findArtifactByPath(path) {
	const p = String(path || '')
	if (!p) return null
	for (const a of registry.values()) {
		if (a.path && (a.path === p || p.endsWith(a.path) || a.path.endsWith(p))) return a
	}
	return null
}

export function registerArtifact(def) {
	if (!def || !def.id) {
		console.warn('[ArtifactRegistry] Cannot register invalid artifact definition', def)
		return
	}
	registry.set(def.id, {
		id: def.id,
		name: def.name || def.id,
		category: def.category || 'misc',
		contact: def.contact || 'floor',
		pri: def.pri || 1,
		kind: def.kind || 'glb',
		path: def.path || null,
		defaultScale: def.defaultScale || 1,
		footprint: def.footprint || { shape: 'cylinder', radius: 0.3, height: 1.0 },
		clearance: {
			minDoorDistance: 2.0,
			minArtworkDistance: def.contact === 'wall' ? 1.5 : 0.4,
			walkableGap: 0.8,
			...(def.clearance || {}),
		},
		lightCount: def.lightCount || 0,
		variants: Array.isArray(def.variants) && def.variants.length > 0 ? def.variants : ['default'],
		build: typeof def.build === 'function' ? def.build : null,
		...def,
	})
}

export function getArtifact(id) {
	return registry.get(id) || null
}

export function hasArtifact(id) {
	return registry.has(id)
}

export function getAllArtifacts() {
	return Array.from(registry.values())
}

export function getArtifactsByCategory(category) {
	return getAllArtifacts().filter((a) => a.category === category)
}

// ─────────────────────────────────────────────────────────────────────────────
// GLB MODEL ARTIFACT DEFINITIONS (from public/models/ready/models.manifest.json)
// ─────────────────────────────────────────────────────────────────────────────

// Furniture
registerArtifact({
	id: 'model_bookcase',
	name: 'Bookcase (3D model)',
	category: 'furniture',
	contact: 'floor',
	pri: 1,
	path: 'models/ready/furniture/furniture_bookcase.glb',
	defaultScale: 0.01254,
	footprint: { shape: 'box', w: 1.2, d: 0.55, height: 2.0 },
})

registerArtifact({
	id: 'model_chinese_commode',
	name: 'Chinese Commode (3D model)',
	category: 'furniture',
	contact: 'floor',
	pri: 1,
	path: 'models/ready/furniture/furniture_chinese_commode.glb',
	defaultScale: 0.4456,
	footprint: { shape: 'box', w: 1.05, d: 0.55, height: 0.9 },
})

registerArtifact({
	id: 'model_couch_large',
	name: 'Couch Large (3D model)',
	category: 'furniture',
	contact: 'floor',
	pri: 1,
	path: 'models/ready/furniture/furniture_couch_large.glb',
	defaultScale: 0.4036,
	footprint: { shape: 'box', w: 2.1, d: 1.0, height: 0.85 },
	seats: [
		{ id: 'couch_l_1', x: -0.65, z: 0.35, yaw: 0, height: 0.46 },
		{ id: 'couch_l_2', x: 0.65, z: 0.35, yaw: 0, height: 0.46 },
	],
})

registerArtifact({
	id: 'model_couch_wide',
	name: 'Couch Wide (3D model)',
	category: 'furniture',
	contact: 'floor',
	pri: 1,
	path: 'models/ready/furniture/furniture_couch_wide.glb',
	defaultScale: 1.6569,
	footprint: { shape: 'box', w: 2.4, d: 1.0, height: 0.85 },
	seats: [
		{ id: 'couch_w_1', x: -0.75, z: 0.35, yaw: 0, height: 0.46 },
		{ id: 'couch_w_2', x: 0, z: 0.35, yaw: 0, height: 0.46 },
		{ id: 'couch_w_3', x: 0.75, z: 0.35, yaw: 0, height: 0.46 },
	],
})

registerArtifact({
	id: 'model_delica_couch',
	name: 'Delica Couch (3D model)',
	category: 'furniture',
	contact: 'floor',
	pri: 1,
	path: 'models/ready/furniture/furniture_delica_couch.glb',
	defaultScale: 0.577,
	footprint: { shape: 'box', w: 2.0, d: 0.95, height: 0.85 },
	seats: [
		{ id: 'delica_1', x: -0.6, z: 0.35, yaw: 0, height: 0.46 },
		{ id: 'delica_2', x: 0.6, z: 0.35, yaw: 0, height: 0.46 },
	],
})

registerArtifact({
	id: 'model_gothiccabinet',
	name: 'Gothic Cabinet (3D model)',
	category: 'furniture',
	contact: 'floor',
	pri: 1,
	path: 'models/ready/furniture/furniture_gothiccabinet.glb',
	defaultScale: 0.9318,
	footprint: { shape: 'box', w: 1.2, d: 0.65, height: 2.2 },
})

// Lighting
registerArtifact({
	id: 'model_chandelier_01',
	name: 'Chandelier 01 (3D model)',
	category: 'lighting',
	contact: 'ceiling',
	pri: 1,
	path: 'models/ready/lighting/lighting_chandelier_01.glb',
	defaultScale: 1.0025,
	footprint: { shape: 'cylinder', radius: 0.75, height: 0.8 },
})

registerArtifact({
	id: 'model_chandelier_03',
	name: 'Chandelier 03 (3D model)',
	category: 'lighting',
	contact: 'ceiling',
	pri: 1,
	path: 'models/ready/lighting/lighting_chandelier_03.glb',
	defaultScale: 0.9606,
	footprint: { shape: 'cylinder', radius: 0.8, height: 1.0 },
})

registerArtifact({
	id: 'model_chandelier_osgona',
	name: 'Osgona Chandelier (3D model)',
	category: 'lighting',
	contact: 'ceiling',
	pri: 1,
	path: 'models/ready/lighting/lighting_chandelier_osgona.glb',
	defaultScale: 0.0006224,
	footprint: { shape: 'cylinder', radius: 0.9, height: 1.1 },
})

registerArtifact({
	id: 'model_chandelier_unitario',
	name: 'Unitario Chandelier (3D model)',
	category: 'lighting',
	contact: 'ceiling',
	pri: 1,
	path: 'models/ready/lighting/lighting_chandelier_unitario.glb',
	defaultScale: 0.001929,
	footprint: { shape: 'cylinder', radius: 0.7, height: 0.9 },
})

registerArtifact({
	id: 'model_wall_light_antique',
	name: 'Antique Wall Light (3D model)',
	category: 'lighting',
	contact: 'wall',
	pri: 1,
	path: 'models/ready/lighting/lighting_wall_light_antique.glb',
	defaultScale: 0.225,
	footprint: { shape: 'box', w: 0.5, d: 0.35, height: 0.45 },
})

// Plants
registerArtifact({
	id: 'model_potted_plant_04',
	name: 'Potted Plant (3D model)',
	category: 'plants',
	contact: 'floor',
	pri: 1,
	path: 'models/ready/plants/plants_potted_plant_04.glb',
	defaultScale: 5.618,
	footprint: { shape: 'cylinder', radius: 0.45, height: 1.5 },
})

// ─────────────────────────────────────────────────────────────────────────────
// ADDITIONAL MODELS (imported from the '3d models/' source folder)
// ─────────────────────────────────────────────────────────────────────────────

// Furniture — Sofa 1 | 3DX (Snowism, CC-BY-4.0)
registerArtifact({
	id: 'model_sofa_1_3dx',
	name: 'Sofa 1 (3D model)',
	category: 'furniture',
	contact: 'floor',
	pri: 1,
	path: 'models/ready/furniture/furniture_sofa_1_3dx/scene.gltf',
	defaultScale: 0.018,
	footprint: { shape: 'box', w: 2.3, d: 1.0, height: 0.85 },
	seats: [
		{ id: 'sofa1_1', x: -0.7, z: 0.45, yaw: 0, height: 0.50 },
		{ id: 'sofa1_2', x: 0, z: 0.45, yaw: 0, height: 0.50 },
		{ id: 'sofa1_3', x: 0.7, z: 0.45, yaw: 0, height: 0.50 },
	],
})

// Furniture — Curved Sofa Set (white)
registerArtifact({
	id: 'model_curved_sofa_set_white',
	name: 'Curved Sofa Set White (3D model)',
	category: 'furniture',
	contact: 'floor',
	pri: 1,
	path: 'models/ready/furniture/3d_pbr_curved_sofa.glb',
	defaultScale: 0.010,
	footprint: { shape: 'box', w: 3.2, d: 1.6, height: 0.85 },
	seats: [
		{ id: 'curved_1', x: -1.0, z: 0.7, yaw: 0, height: 0.48 },
		{ id: 'curved_2', x: 0, z: 0.7, yaw: 0, height: 0.48 },
		{ id: 'curved_3', x: 1.0, z: 0.7, yaw: 0, height: 0.48 },
	],
})

// Furniture — Bench 3 USSR (game ready)
registerArtifact({
	id: 'model_bench_ussr',
	name: 'Bench USSR (3D model)',
	category: 'furniture',
	contact: 'floor',
	pri: 1,
	path: 'models/ready/furniture/furniture_bench_ussr.glb',
	defaultScale: 0.9,
	footprint: { shape: 'box', w: 2.0, d: 0.6, height: 0.9 },
	seats: [
		{ id: 'bench_1', x: -0.5, z: 0.25, yaw: 0, height: 0.50 },
		{ id: 'bench_2', x: 0.5, z: 0.25, yaw: 0, height: 0.50 },
	],
})

// Plants — Monstera
registerArtifact({
	id: 'model_monstera',
	name: 'Monstera Plant (3D model)',
	category: 'plants',
	contact: 'floor',
	pri: 1,
	path: 'models/ready/plants/plants_monstera.glb',
	defaultScale: 1.0,
	footprint: { shape: 'cylinder', radius: 0.5, height: 1.5 },
})

// Plants — Potted Plant 01 (4k)
registerArtifact({
	id: 'model_potted_plant_01',
	name: 'Potted Plant 01 (3D model)',
	category: 'plants',
	contact: 'floor',
	pri: 1,
	path: 'models/ready/plants/plants_potted_plant_01_4k/potted_plant_01_4k.gltf',
	defaultScale: 0.8,
	footprint: { shape: 'cylinder', radius: 0.4, height: 1.4 },
})

// Lighting — Marmara Lightstar chandelier (LIGHTSTAR GROUP)
registerArtifact({
	id: 'model_chandelier_marmara',
	name: 'Marmara Lightstar Chandelier (3D model)',
	category: 'lighting',
	contact: 'ceiling',
	pri: 1,
	path: 'models/ready/lighting/lighting_marmara_lightstar/scene.gltf',
	defaultScale: 0.004,
	footprint: { shape: 'cylinder', radius: 0.9, height: 1.1 },
})
