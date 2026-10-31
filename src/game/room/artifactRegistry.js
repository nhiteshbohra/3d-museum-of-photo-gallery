/**
 * Our Museum 3D — Master Artifact Registry
 * 
 * Central catalog of all procedural and approved 3D model artifacts.
 * Each artifact definition declares:
 *  - id, name, category, pri (Priority 1/2/3)
 *  - contact: 'floor' | 'wall' | 'ceiling' | 'surface'
 *  - footprint: { shape: 'cylinder'|'box', radius?, w?, d?, height }
 *  - clearance: constraints for green/red ghost validator
 *  - lightCount: real dynamic point/spot lights consumed (max 8/room)
 *  - variants: supported material/finish options
 *  - build(ctx): procedural or GLB mesh constructor
 */
import * as THREE from 'three'
import { pushDisp, mkGeo, mkMat, getLuxuryMats } from './decorations.js'

// Import Priority 1 Artifact Builders
import {
	buildTorchereArtDeco,
	buildBankerLamp,
	buildAlabasterLamp,
	buildCandelabraSconce,
} from './artifacts/lighting.js'

import {
	buildGalleryBench,
	buildCurvedBanquette,
	buildOttomanPlanter,
	buildPoufPair,
	buildMarbleSideTable,
} from './artifacts/seating.js'

import {
	buildAntiqueMirror,
	buildWainscotPanelling,
} from './artifacts/walldecor.js'

import {
	buildOctagonalVitrine,
	buildLetterDisplayTable,
	buildMarquinaPedestal,
} from './artifacts/vitrines.js'

import {
	buildFicusLyrata,
	buildBoxwoodTopiaryPair,
} from './artifacts/plants.js'

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
		footprint: def.footprint || { shape: 'cylinder', radius: 0.3, height: 1.0 },
		clearance: {
			minDoorDistance: 2.0,
			minArtworkDistance: def.contact === 'wall' ? 1.5 : 0.4,
			walkableGap: 0.8,
			...(def.clearance || {}),
		},
		lightCount: def.lightCount || 0,
		variants: Array.isArray(def.variants) && def.variants.length > 0 ? def.variants : ['default'],
		build: typeof def.build === 'function' ? def.build : () => new THREE.Group(),
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
// PRIORITY 1 ARTIFACT DEFINITIONS (L1–L4, F1–F5, W1–W2, V1–V3, P1–P2)
// ─────────────────────────────────────────────────────────────────────────────

// L1: Art Deco Fluted Glass Torchère
registerArtifact({
	id: 'torchere_art_deco',
	name: 'Art Deco Fluted Glass Torchère',
	category: 'lighting',
	contact: 'floor',
	pri: 1,
	footprint: { shape: 'cylinder', radius: 0.20, height: 2.05 },
	lightCount: 1,
	variants: ['brass-frosted', 'bronze'],
	build: buildTorchereArtDeco,
})

// L2: Brass Banker's Table Lamp
registerArtifact({
	id: 'banker_lamp',
	name: "Brass Banker's Table Lamp",
	category: 'lighting',
	contact: 'surface',
	pri: 1,
	footprint: { shape: 'box', w: 0.35, d: 0.28, height: 0.45 },
	lightCount: 1,
	variants: ['brass-emerald', 'brass-white'],
	build: buildBankerLamp,
})

// L3: Carved Alabaster Accent Lamp
registerArtifact({
	id: 'alabaster_lamp',
	name: 'Carved Alabaster Accent Lamp',
	category: 'lighting',
	contact: 'surface',
	pri: 1,
	footprint: { shape: 'cylinder', radius: 0.15, height: 0.40 },
	lightCount: 1,
	variants: ['fluted', 'smooth'],
	build: buildAlabasterLamp,
})

// L4: Triple-Arm Candelabra Wall Sconce
registerArtifact({
	id: 'candelabra_sconce',
	name: 'Triple-Arm Candelabra Wall Sconce',
	category: 'lighting',
	contact: 'wall',
	pri: 1,
	footprint: { shape: 'box', w: 0.55, d: 0.25, height: 0.45 },
	lightCount: 1,
	variants: ['brass', 'bronze'],
	build: buildCandelabraSconce,
})

// F1: Gallery Viewing Bench
registerArtifact({
	id: 'gallery_bench',
	name: 'Gallery Viewing Bench',
	category: 'seating',
	contact: 'floor',
	pri: 1,
	footprint: { shape: 'box', w: 1.60, d: 0.48, height: 0.48 },
	lightCount: 0,
	variants: ['cognac', 'burgundy', 'champagne'],
	build: buildGalleryBench,
})

// F2: Curved Velvet Banquette
registerArtifact({
	id: 'curved_banquette',
	name: 'Curved Velvet Banquette',
	category: 'seating',
	contact: 'floor',
	pri: 1,
	footprint: { shape: 'cylinder', radius: 1.45, height: 0.85 },
	lightCount: 0,
	variants: ['burgundy', 'forest-green', 'champagne'],
	build: buildCurvedBanquette,
})

// F3: Tufted Ottoman with Planter Well
registerArtifact({
	id: 'ottoman_planter',
	name: 'Tufted Ottoman with Planter Well',
	category: 'seating',
	contact: 'floor',
	pri: 1,
	footprint: { shape: 'cylinder', radius: 0.85, height: 1.80 },
	lightCount: 0,
	variants: ['burgundy', 'cognac'],
	build: buildOttomanPlanter,
})

// F4: Round Velvet Pouf Pair
registerArtifact({
	id: 'pouf_pair',
	name: 'Round Velvet Pouf Pair',
	category: 'seating',
	contact: 'floor',
	pri: 1,
	footprint: { shape: 'box', w: 1.10, d: 0.50, height: 0.42 },
	lightCount: 0,
	variants: ['champagne', 'burgundy', 'cognac'],
	build: buildPoufPair,
})

// F5: Round Calacatta Marble Side Table
registerArtifact({
	id: 'marble_side_table',
	name: 'Round Calacatta Marble Side Table',
	category: 'seating',
	contact: 'floor',
	pri: 1,
	footprint: { shape: 'cylinder', radius: 0.28, height: 0.55 },
	lightCount: 0,
	variants: ['calacatta', 'nero'],
	build: buildMarbleSideTable,
})

// W1: Beveled Gilt Antique Mirror
registerArtifact({
	id: 'antique_mirror',
	name: 'Beveled Gilt Antique Mirror',
	category: 'walldecor',
	contact: 'wall',
	pri: 1,
	footprint: { shape: 'box', w: 0.90, d: 0.08, height: 1.80 },
	lightCount: 0,
	variants: ['gilt-gold', 'dark-bronze'],
	build: buildAntiqueMirror,
})

// W2: Gallery Wainscot Panelling Module
registerArtifact({
	id: 'wainscot_panelling',
	name: 'Gallery Wainscot Panelling Module',
	category: 'walldecor',
	contact: 'wall',
	pri: 1,
	footprint: { shape: 'box', w: 2.40, d: 0.05, height: 1.05 },
	lightCount: 0,
	variants: ['walnut', 'painted-cream'],
	build: buildWainscotPanelling,
})

// V1: Octagonal Brass & Glass Vitrine
registerArtifact({
	id: 'octagonal_vitrine',
	name: 'Octagonal Brass & Glass Vitrine',
	category: 'vitrines',
	contact: 'floor',
	pri: 1,
	footprint: { shape: 'cylinder', radius: 0.42, height: 1.55 },
	lightCount: 1,
	variants: ['brass', 'bronze'],
	build: buildOctagonalVitrine,
})

// V2: Slanted Archival Letter Display Table
registerArtifact({
	id: 'letter_display_table',
	name: 'Slanted Archival Letter Display Table',
	category: 'vitrines',
	contact: 'floor',
	pri: 1,
	footprint: { shape: 'box', w: 1.00, d: 0.60, height: 0.95 },
	lightCount: 0,
	variants: ['walnut-brass', 'oak-bronze'],
	build: buildLetterDisplayTable,
})

// V3: Nero Marquina Pedestal + Bronze Sculpture
registerArtifact({
	id: 'marquina_pedestal',
	name: 'Nero Marquina Pedestal + Bronze Sculpture',
	category: 'vitrines',
	contact: 'floor',
	pri: 1,
	footprint: { shape: 'box', w: 0.42, d: 0.42, height: 1.55 },
	lightCount: 0,
	variants: ['nero', 'calacatta'],
	build: buildMarquinaPedestal,
})

// P1: Ficus Lyrata in Fluted Ceramic Pot
registerArtifact({
	id: 'ficus_lyrata',
	name: 'Ficus Lyrata in Fluted Ceramic Pot',
	category: 'plants',
	contact: 'floor',
	pri: 1,
	footprint: { shape: 'cylinder', radius: 0.45, height: 2.20 },
	lightCount: 0,
	variants: ['terracotta', 'white-ceramic', 'black-fluted'],
	build: buildFicusLyrata,
})

// P2: Boxwood Topiary Sphere Pair
registerArtifact({
	id: 'boxwood_topiary_pair',
	name: 'Boxwood Topiary Sphere Pair',
	category: 'plants',
	contact: 'floor',
	pri: 1,
	footprint: { shape: 'box', w: 1.60, d: 0.50, height: 1.10 },
	lightCount: 0,
	variants: ['fluted-stone', 'bronze'],
	build: buildBoxwoodTopiaryPair,
})
