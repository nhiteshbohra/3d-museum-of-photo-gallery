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
 *
 * The procedural artifact builders were removed (see git history) in favour of
 * these real 3D models.
 */
import * as THREE from 'three'

const registry = new Map()

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
