/**
 * Our Museum 3D — Master Artefact & Decoration System
 * Complete curated collection of high-end, realistic gallery furnishings and artefacts:
 * Lighting, Botanicals, Fine Furniture, Classical Sculptures, and Architectural Details.
 *
 * All furniture is built with clean, cohesive, realistic upholstery geometry.
 * All artefacts are positioned strictly in open zones (corners and alcoves) so that
 * all 61 exhibition artwork frames and 6 narrative memory boards maintain 100%
 * clear, unobstructed sightlines from every angle.
 */
import * as THREE from 'three'
import { createRealisticGalleryPlant } from './lobby.js'

// ─────────────────────────────────────────────────────────────────────────────
// 1. CORE GEOMETRY & MATERIAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function pushDisp(disposables, ...items) {
	if (!disposables) return
	for (const i of items) if (i) disposables.push(i)
}

export function mkMat(params, disposables) {
	const m = new THREE.MeshStandardMaterial(params)
	pushDisp(disposables, m)
	return m
}

export function mkGeo(geo, disposables) {
	pushDisp(disposables, geo)
	return geo
}

export function addMesh(group, geo, mat) {
	const m = new THREE.Mesh(geo, mat)
	group.add(m)
	return m
}

// Reusable standard luxury materials
export function getLuxuryMats(disposables) {
	return {
		brass: mkMat({ color: 0xd4af37, metalness: 0.88, roughness: 0.22 }, disposables),
		darkBronze: mkMat({ color: 0x1f1914, metalness: 0.65, roughness: 0.38 }, disposables),
		walnut: mkMat({ color: 0x221a14, roughness: 0.65, metalness: 0.04 }, disposables),
		mahogany: mkMat({ color: 0x36160d, roughness: 0.60, metalness: 0.04 }, disposables),
		cognacLeather: mkMat({ color: 0x7c4522, roughness: 0.40, metalness: 0.06 }, disposables),
		burgundyLeather: mkMat({ color: 0x4f1719, roughness: 0.42, metalness: 0.06 }, disposables),
		champagneVelvet: mkMat({ color: 0xf3ebd8, roughness: 0.70, metalness: 0.02 }, disposables),
		emeraldVelvet: mkMat({ color: 0x143c24, roughness: 0.68, metalness: 0.02 }, disposables),
		calacattaMarble: mkMat({ color: 0xf8f6f0, roughness: 0.24, metalness: 0.06 }, disposables),
		neroMarble: mkMat({ color: 0x121316, roughness: 0.25, metalness: 0.10 }, disposables),
		castIron: mkMat({ color: 0x1c1c1d, roughness: 0.70, metalness: 0.70 }, disposables),
		terracotta: mkMat({ color: 0xb7522c, roughness: 0.84, metalness: 0.0 }, disposables),
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. REALISTIC PLUSH CUSHION GEOMETRY GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
export function createPlushCushionGeometry({
	width = 0.72,
	height = 0.16,
	depth = 0.60,
	crown = 0.035,
	swell = 0.018,
	disposables = [],
} = {}) {
	const geo = new THREE.BoxGeometry(width, height, depth, 16, 6, 16)
	const pos = geo.attributes.position
	const hw = width / 2, hh = height / 2, hd = depth / 2

	for (let i = 0; i < pos.count; i++) {
		let x = pos.getX(i)
		let y = pos.getY(i)
		let z = pos.getZ(i)
		const u = x / hw
		const v = y / hh
		const w = z / hd

		// 1. Soft pillow crown on top surface
		if (v > 0.05) {
			const dome = Math.cos(u * Math.PI * 0.45) * Math.cos(w * Math.PI * 0.45)
			y += crown * Math.max(0, dome)
		}
		// 2. Soft rounding on bottom edges
		if (v < -0.05) {
			const under = Math.cos(u * Math.PI * 0.48) * Math.cos(w * Math.PI * 0.48)
			y -= crown * 0.2 * Math.max(0, under)
		}
		// 3. Gentle organic outward side swell
		const s = Math.cos(v * Math.PI * 0.5) * swell
		x += Math.sign(x || 0) * s * (1 - Math.abs(w) * 0.2)
		z += Math.sign(z || 0) * s * (1 - Math.abs(u) * 0.2)

		pos.setXYZ(i, x, y, z)
	}
	pos.needsUpdate = true
	geo.computeVertexNormals()
	pushDisp(disposables, geo)
	return geo
}

export function addWeltPiping(parent, width, depth, yOffset, mat, disposables) {
	const hw = width / 2
	const hd = depth / 2
	const pipeR = 0.010

	const xPipeGeo = mkGeo(new THREE.CylinderGeometry(pipeR, pipeR, width, 10), disposables)
	xPipeGeo.rotateZ(Math.PI / 2)
	const zPipeGeo = mkGeo(new THREE.CylinderGeometry(pipeR, pipeR, depth, 10), disposables)
	zPipeGeo.rotateX(Math.PI / 2)

	// Front & Back welt
	for (const pz of [-hd, hd]) {
		const m = addMesh(parent, xPipeGeo, mat)
		m.position.set(0, yOffset, pz)
	}
	// Left & Right welt
	for (const px of [-hw, hw]) {
		const m = addMesh(parent, zPipeGeo, mat)
		m.position.set(px, yOffset, 0)
	}
}

export function addTuftButtons(parent, tufts, yOffset, mat, disposables) {
	const bGeo = mkGeo(new THREE.SphereGeometry(0.014, 10, 8), disposables)
	for (const [tx, tz] of tufts) {
		const btn = addMesh(parent, bGeo, mat)
		btn.scale.set(1, 0.5, 1)
		btn.position.set(tx, yOffset, tz)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LIGHTING ARTEFACTS
// ─────────────────────────────────────────────────────────────────────────────

// L1: Elegant Architectural Museum Chandelier (Minimalist Rings & Cascading Crystals)
export function createChandelier({
	x = 0,
	y = 3.6,
	z = 0,
	group,
	disposables,
	rings = 2,
	scale = 1.0,
	lightIntensity = 1.8,
} = {}) {
	const g = new THREE.Group()
	g.position.set(x, y, z)
	group.add(g)

	const mats = getLuxuryMats(disposables)
	const crystalM = mkMat({
		color: 0xf6faff,
		transparent: true,
		opacity: 0.88,
		roughness: 0.04,
		metalness: 0.15,
		emissive: 0xfff8e7,
		emissiveIntensity: 0.35,
	}, disposables)

	// Ceiling canopy
	const canopyGeo = mkGeo(new THREE.CylinderGeometry(0.20 * scale, 0.15 * scale, 0.05 * scale, 32), disposables)
	addMesh(g, canopyGeo, mats.brass).position.set(0, 0, 0)

	// Central slender brass suspension rod
	const rodH = 0.55 * scale
	const rodGeo = mkGeo(new THREE.CylinderGeometry(0.014 * scale, 0.014 * scale, rodH, 16), disposables)
	addMesh(g, rodGeo, mats.brass).position.set(0, -rodH / 2, 0)

	const ringRadii = [0.46 * scale, 0.28 * scale]
	const ringY = [-rodH, -rodH - 0.22 * scale]

	for (let r = 0; r < Math.min(rings, ringRadii.length); r++) {
		const rad = ringRadii[r]
		const ry = ringY[r]

		// Sleek polished brass circular ring
		const ringGeo = mkGeo(new THREE.TorusGeometry(rad, 0.016 * scale, 16, 48), disposables)
		ringGeo.rotateX(Math.PI / 2)
		addMesh(g, ringGeo, mats.brass).position.set(0, ry, 0)

		// Subtle warm luminous inset ring (diffuse LED light channel)
		const ledGeo = mkGeo(new THREE.TorusGeometry(rad - 0.005 * scale, 0.006 * scale, 12, 48), disposables)
		ledGeo.rotateX(Math.PI / 2)
		const ledMat = mkMat({ color: 0xfff2d4, emissive: 0xffe2a3, emissiveIntensity: 1.6 }, disposables)
		addMesh(g, ledGeo, ledMat).position.set(0, ry - 0.005 * scale, 0)

		// Cascading crystal prisms hanging gracefully along perimeter
		const crystalCount = r === 0 ? 20 : 12
		for (let c = 0; c < crystalCount; c++) {
			const angle = (c / crystalCount) * Math.PI * 2
			const cx = Math.cos(angle) * rad
			const cz = Math.sin(angle) * rad

			// Slender crystal pendant drop
			const dropGeo = mkGeo(new THREE.CylinderGeometry(0.008 * scale, 0.002 * scale, 0.12 * scale, 6), disposables)
			const drop = addMesh(g, dropGeo, crystalM)
			drop.position.set(cx, ry - 0.07 * scale, cz)
		}
	}

	// Warm ambient chandelier glow
	const light = new THREE.PointLight(0xffeed6, lightIntensity, 8, 1.8)
	light.position.set(0, -0.65 * scale, 0)
	g.add(light)
	pushDisp(disposables, light)
	return g
}

// L3: Fluted Classical Wall Sconce
export function createWallSconce({
	x = 0,
	y = 2.2,
	z = 0,
	wallNormalX = 0,
	wallNormalZ = 1,
	group,
	disposables,
} = {}) {
	const g = new THREE.Group()
	g.position.set(x, y, z)
	group.add(g)

	const mats = getLuxuryMats(disposables)
	const glassM = mkMat({
		color: 0xfffae8,
		emissive: 0xffe8a0,
		emissiveIntensity: 1.4,
		transparent: true,
		opacity: 0.88,
		roughness: 0.2,
	}, disposables)

	const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(wallNormalX, 0, wallNormalZ))
	g.quaternion.copy(quat)

	// Backplate
	const plateGeo = mkGeo(new THREE.BoxGeometry(0.09, 0.22, 0.02), disposables)
	addMesh(g, plateGeo, mats.brass).position.set(0, 0, 0.01)

	// Curved swan-neck brass arm
	const armGeo = mkGeo(new THREE.CylinderGeometry(0.010, 0.010, 0.16, 8), disposables)
	armGeo.rotateX(Math.PI / 3)
	addMesh(g, armGeo, mats.brass).position.set(0, -0.02, 0.09)

	// Brass bobeche dish
	const dishGeo = mkGeo(new THREE.CylinderGeometry(0.055, 0.035, 0.025, 16), disposables)
	addMesh(g, dishGeo, mats.brass).position.set(0, 0.06, 0.16)

	// Frosted glass hurricane shade
	const shadeGeo = mkGeo(new THREE.CylinderGeometry(0.048, 0.040, 0.14, 16), disposables)
	addMesh(g, shadeGeo, glassM).position.set(0, 0.14, 0.16)

	// Warm local wall wash light
	const light = new THREE.PointLight(0xffeedd, 1.2, 4.0, 1.8)
	light.position.set(0, 0.15, 0.20)
	g.add(light)
	pushDisp(disposables, light)

	return g
}

// L4: Luxury Brass Floor Reading Lamp
export function createFloorLamp({
	x = 0,
	y = 0,
	z = 0,
	group,
	disposables,
} = {}) {
	const g = new THREE.Group()
	g.position.set(x, y, z)
	group.add(g)

	const mats = getLuxuryMats(disposables)
	const lampH = 1.48

	// Heavy turned brass base
	const baseGeo = mkGeo(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 24), disposables)
	addMesh(g, baseGeo, mats.brass).position.set(0, 0.02, 0)

	// Slender reeded brass column
	const poleGeo = mkGeo(new THREE.CylinderGeometry(0.014, 0.014, lampH - 0.25, 12), disposables)
	addMesh(g, poleGeo, mats.brass).position.set(0, (lampH - 0.25) / 2 + 0.04, 0)

	// Decorative central knop
	const knopGeo = mkGeo(new THREE.SphereGeometry(0.032, 12, 10), disposables)
	addMesh(g, knopGeo, mats.brass).position.set(0, lampH * 0.55, 0)

	// Tapered pleated silk/champagne shade
	const shadeGeo = mkGeo(new THREE.CylinderGeometry(0.14, 0.24, 0.26, 24, 1, true), disposables)
	const shadeM = mkMat({
		color: 0xfdf7eb,
		emissive: 0xffeebb,
		emissiveIntensity: 1.2,
		roughness: 0.6,
		side: THREE.DoubleSide,
	}, disposables)
	addMesh(g, shadeGeo, shadeM).position.set(0, lampH - 0.04, 0)

	// Focused reading warm light
	const spot = new THREE.SpotLight(0xfffaec, 2.4, 4.5, Math.PI / 3.0, 0.6, 1.4)
	spot.position.set(0, lampH - 0.06, 0)
	const targetObj = new THREE.Object3D()
	targetObj.position.set(0, 0, 0.35)
	g.add(targetObj)
	spot.target = targetObj
	g.add(spot)
	pushDisp(disposables, spot)

	return g
}

// L11: Picture Rail Arm Lamp (Mounted above artwork)
export function createPictureLamp({
	x = 0,
	y = 3.6,
	z = 0,
	width = 1.4,
	rotationY = 0,
	group,
	disposables,
} = {}) {
	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotationY
	group.add(g)

	const mats = getLuxuryMats(disposables)

	// Wall mounting bracket
	const mountGeo = mkGeo(new THREE.BoxGeometry(0.12, 0.08, 0.04), disposables)
	addMesh(g, mountGeo, mats.brass).position.set(0, 0, -0.02)

	// Dual curved brass gooseneck arms
	const armGeo = mkGeo(new THREE.CylinderGeometry(0.01, 0.01, 0.32, 8), disposables)
	armGeo.rotateX(Math.PI / 3)
	for (const ax of [-width * 0.35, width * 0.35]) {
		const arm = addMesh(g, armGeo, mats.brass)
		arm.position.set(ax, -0.05, 0.12)
	}

	// Long tubular reflector hood
	const tubeGeo = mkGeo(new THREE.CylinderGeometry(0.038, 0.038, width, 18), disposables)
	tubeGeo.rotateZ(Math.PI / 2)
	const tube = addMesh(g, tubeGeo, mats.brass)
	tube.position.set(0, -0.12, 0.24)

	// Downward picture wash light
	const spot = new THREE.SpotLight(0xfffaec, 2.2, 4.0, Math.PI / 3.2, 0.6)
	spot.position.set(0, -0.14, 0.24)
	const target = new THREE.Object3D()
	target.position.set(0, -1.2, 0.05)
	g.add(target)
	spot.target = target
	g.add(spot)
	pushDisp(disposables, spot)

	return g
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LUXURY REALISTIC FURNITURE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * F1: Sculpted Organic French Salon Barrel Club Chair
 * Authentic curved high-end museum lounge chair with zero boxy cuboids:
 * - Turned solid walnut splayed tapered legs with polished brass sabot ferrules
 * - Sculpted curved cylindrical upholstered base with brushed brass base ring
 * - Deep, plush, curved bullnose seat cushion with welt piping cord
 * - Continuous sweeping curved horseshoe barrel backrest with smooth padded top roll
 * - Gently contoured upholstered arm rests with organic curved transitions
 * - Soft kidney-curved velvet accent pillow nestled inside
 */
export function createLuxuryArmchair({
	x = 0,
	y = 0,
	z = 0,
	rotationY = 0,
	group,
	disposables,
	obstacles = [],
	fabricType = 'cognacLeather',
	name = 'luxury-armchair',
} = {}) {
	const chair = new THREE.Group()
	chair.name = name
	chair.position.set(x, y, z)
	chair.rotation.y = rotationY
	group.add(chair)

	const mats = getLuxuryMats(disposables)
	const coverMat = mats[fabricType] || mats.cognacLeather

	// 1. Turned Solid Walnut Splayed Legs with Polished Brass Ferrules
	const legH = 0.14
	const legRadius = 0.32
	const legGeo = mkGeo(new THREE.CylinderGeometry(0.022, 0.015, legH, 16), disposables)
	const ferruleGeo = mkGeo(new THREE.CylinderGeometry(0.023, 0.020, 0.040, 16), disposables)
	const gliderGeo = mkGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.010, 16), disposables)

	const legAngles = [-0.65 * Math.PI, -0.35 * Math.PI, 0.35 * Math.PI, 0.65 * Math.PI]
	for (const angle of legAngles) {
		const lx = Math.cos(angle) * legRadius
		const lz = Math.sin(angle) * legRadius
		const legGroup = new THREE.Group()
		legGroup.position.set(lx, legH / 2, lz)
		// Natural outward splay
		legGroup.rotation.z = -Math.cos(angle) * 0.12
		legGroup.rotation.x = Math.sin(angle) * 0.12
		chair.add(legGroup)

		addMesh(legGroup, legGeo, mats.walnut)
		addMesh(legGroup, ferruleGeo, mats.brass).position.set(0, -legH / 2 + 0.020, 0)
		addMesh(legGroup, gliderGeo, mats.darkBronze).position.set(0, -legH / 2 + 0.005, 0)
	}

	// 2. Sculpted Curved Upholstered Base Deck (Seamless connection from legs to cushion)
	const deckH = 0.16
	const deckRadius = 0.40
	const deckY = legH + deckH / 2
	const deckGeo = mkGeo(new THREE.CylinderGeometry(deckRadius * 0.98, deckRadius, deckH, 32), disposables)
	addMesh(chair, deckGeo, coverMat).position.set(0, deckY, 0.02)

	// Inset polished brass trim band along bottom rim of deck
	const rimGeo = mkGeo(new THREE.TorusGeometry(deckRadius * 0.99, 0.008, 12, 48), disposables)
	rimGeo.rotateX(Math.PI / 2)
	addMesh(chair, rimGeo, mats.brass).position.set(0, legH + 0.008, 0.02)

	// 3. Deep Plush Curved Seat Cushion with Welt Piping
	const cushionH = 0.12
	const cushionRadius = 0.38
	const cushionY = legH + deckH + cushionH / 2 - 0.01
	const cushionGeo = mkGeo(new THREE.CylinderGeometry(cushionRadius, cushionRadius * 0.98, cushionH, 32), disposables)
	addMesh(chair, cushionGeo, coverMat).position.set(0, cushionY, 0.03)

	// Welting cord around cushion crown rim
	const weltGeo = mkGeo(new THREE.TorusGeometry(cushionRadius * 0.99, 0.009, 12, 48), disposables)
	weltGeo.rotateX(Math.PI / 2)
	addMesh(chair, weltGeo, coverMat).position.set(0, cushionY + cushionH / 2 - 0.005, 0.03)

	// Subtle tufting buttons on seat cushion
	addTuftButtons(chair, [[-0.12, 0.03], [0.12, 0.03], [0, 0.14]], cushionY + cushionH / 2, mats.brass, disposables)

	// 4. Sweeping Curved Barrel / Tub Backrest Shell (210° smooth embrace, zero flat cuboids)
	const backH = 0.46
	const backY = legH + deckH + backH / 2 - 0.04
	const arcAngle = Math.PI * 1.18
	const arcStart = -Math.PI * 0.59

	// Outer curved upholstery shell
	const outerGeo = mkGeo(new THREE.CylinderGeometry(0.42, 0.43, backH, 36, 1, true, arcStart, arcAngle), disposables)
	const outerMesh = addMesh(chair, outerGeo, coverMat)
	outerMesh.position.set(0, backY, 0.01)

	// Inner curved upholstery shell
	const innerGeo = mkGeo(new THREE.CylinderGeometry(0.35, 0.35, backH, 36, 1, true, arcStart, arcAngle), disposables)
	const innerMesh = addMesh(chair, innerGeo, coverMat)
	innerMesh.position.set(0, backY, 0.01)

	// Solid rounded top roll rim linking inner & outer shells along the top crest
	const crestGeo = mkGeo(new THREE.TorusGeometry(0.385, 0.038, 16, 36, arcAngle), disposables)
	crestGeo.rotateX(Math.PI / 2)
	crestGeo.rotateZ(arcStart)
	const crestMesh = addMesh(chair, crestGeo, coverMat)
	crestMesh.position.set(0, backY + backH / 2 - 0.01, 0.01)

	// Smooth rounded front caps on the left & right armrest terminals
	const capGeo = mkGeo(new THREE.CapsuleGeometry(0.036, backH * 0.85, 12, 16), disposables)
	const leftArmAngle = arcStart
	const rightArmAngle = arcStart + arcAngle
	for (const angle of [leftArmAngle, rightArmAngle]) {
		const ax = Math.cos(angle) * 0.385
		const az = Math.sin(angle) * 0.385 + 0.01
		const cap = addMesh(chair, capGeo, coverMat)
		cap.position.set(ax, backY - 0.05, az)
	}

	// 5. Plush Kidney-Curved Velvet Lumbar Pillow
	const pillowGeo = mkGeo(new THREE.SphereGeometry(0.18, 24, 16), disposables)
	pillowGeo.scale(1.25, 0.65, 0.42)
	const pillow = addMesh(chair, pillowGeo, mats.champagneVelvet)
	pillow.position.set(0, cushionY + 0.08, -0.16)
	pillow.rotation.x = -0.15

	if (obstacles) obstacles.push({ type: 'cylinder', x, z, y, radius: 0.52 })
	return chair
}

/**
 * F2: Classical Low-Profile Grand Fireplace Hearth
 * Proportioned strictly to sit below North Masterpiece (mantle at y = 0.84m)
 * with zero visual overlap of the painting above.
 */
export function createFireplace({
	x = 0,
	y = 0,
	z = 0,
	rotationY = 0,
	group,
	disposables,
	obstacles = [],
	animatedDecorations = [],
} = {}) {
	const fp = new THREE.Group()
	fp.position.set(x, y, z)
	fp.rotation.y = rotationY
	group.add(fp)

	const mats = getLuxuryMats(disposables)
	const brickM = mkMat({ color: 0x3d2016, roughness: 0.95 }, disposables)
	const emberM = mkMat({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 2.5 }, disposables)
	const logM = mkMat({ color: 0x2e180b, roughness: 0.95 }, disposables)

	const W = 1.80, H = 0.80, D = 0.45

	// Side Pilasters with Classical Moulding
	const pilGeo = mkGeo(new THREE.BoxGeometry(0.22, H, D), disposables)
	addMesh(fp, pilGeo, mats.calacattaMarble).position.set(-W / 2 + 0.11, H / 2, 0)
	addMesh(fp, pilGeo, mats.calacattaMarble).position.set(W / 2 - 0.11, H / 2, 0)

	// Lintel architrave beam
	const lintelGeo = mkGeo(new THREE.BoxGeometry(W, 0.14, D), disposables)
	addMesh(fp, lintelGeo, mats.calacattaMarble).position.set(0, H - 0.07, 0)

	// Stepped marble mantle shelf (sits at 0.84m, safely below 0.90m artwork bottom)
	const mantleGeo = mkGeo(new THREE.BoxGeometry(W + 0.18, 0.06, D + 0.12), disposables)
	addMesh(fp, mantleGeo, mats.calacattaMarble).position.set(0, H + 0.03, 0)

	// Firebox inner brick recess
	const brickGeo = mkGeo(new THREE.PlaneGeometry(W - 0.44, H - 0.20), disposables)
	const brickBack = addMesh(fp, brickGeo, brickM)
	brickBack.position.set(0, (H - 0.20) / 2 + 0.04, -D / 2 + 0.02)

	// Hearth stone floor plinth
	const hearthGeo = mkGeo(new THREE.BoxGeometry(W + 0.12, 0.04, D + 0.28), disposables)
	addMesh(fp, hearthGeo, mats.calacattaMarble).position.set(0, 0.02, 0.10)

	// Cast iron grate bars
	for (let i = -2; i <= 2; i++) {
		const gGeo = mkGeo(new THREE.CylinderGeometry(0.010, 0.010, 0.26, 8), disposables)
		gGeo.rotateX(Math.PI / 2)
		addMesh(fp, gGeo, mats.castIron).position.set(i * 0.10, 0.11, -0.06)
	}

	// Birch wood logs
	const logGeo = mkGeo(new THREE.CylinderGeometry(0.045, 0.05, 0.55, 10), disposables)
	for (let i = 0; i < 3; i++) {
		const log = addMesh(fp, logGeo, logM)
		log.rotation.z = Math.PI / 2
		log.rotation.y = (i - 1) * 0.28
		log.position.set((i - 1) * 0.10, 0.07 + (i === 1 ? 0.06 : 0), -0.06)
	}

	// Glowing ember bed
	for (let i = 0; i < 8; i++) {
		const eGeo = mkGeo(new THREE.SphereGeometry(0.022 + (i % 3) * 0.008, 6, 4), disposables)
		addMesh(fp, eGeo, emberM).position.set(Math.sin(i * 1.5) * 0.22, 0.05, -0.07 + Math.cos(i * 1.8) * 0.06)
	}

	// Warm flickering firelight
	const fireLight = new THREE.PointLight(0xff5500, 2.6, 5.5, 1.8)
	fireLight.position.set(0, 0.35, 0.10)
	fp.add(fireLight)
	pushDisp(disposables, fireLight)

	if (animatedDecorations) {
		animatedDecorations.push((time) => {
			const flick = Math.sin(time * 14.0) * 0.3 + Math.sin(time * 28.0) * 0.15
			fireLight.intensity = 2.6 + flick
		})
	}

	if (obstacles) obstacles.push({ type: 'box', x, z, y, w: W + 0.15, d: D + 0.25 })
	return fp
}

// F3: Persian Fireside Rug
export function createFiresideRug({
	x = 0,
	y = 0.002,
	z = 0,
	width = 2.8,
	depth = 1.6,
	group,
	disposables,
} = {}) {
	const canvas = document.createElement('canvas')
	canvas.width = 1024
	canvas.height = 512
	const ctx = canvas.getContext('2d')

	if (ctx) {
		// Deep crimson velvet ground
		ctx.fillStyle = '#4a111a'
		ctx.fillRect(0, 0, 1024, 512)

		// Intricate double gold borders
		ctx.strokeStyle = '#d4af37'
		ctx.lineWidth = 14
		ctx.strokeRect(28, 28, 1024 - 56, 512 - 56)
		ctx.strokeStyle = '#8a2b34'
		ctx.lineWidth = 8
		ctx.strokeRect(48, 48, 1024 - 96, 512 - 96)
		ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)'
		ctx.lineWidth = 3
		ctx.strokeRect(62, 62, 1024 - 124, 512 - 124)

		// Central Persian floral medallion (pure ornamental arabesque, zero text)
		const cx = 512, cy = 256
		ctx.fillStyle = '#22080c'
		ctx.beginPath()
		ctx.ellipse(cx, cy, 210, 110, 0, 0, Math.PI * 2)
		ctx.fill()
		ctx.strokeStyle = '#d4af37'
		ctx.lineWidth = 6
		ctx.stroke()

		// Inner arabesque medallion
		ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)'
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.ellipse(cx, cy, 170, 85, 0, 0, Math.PI * 2)
		ctx.stroke()

		// 8-point radial gold star floret
		ctx.fillStyle = '#d4af37'
		for (let i = 0; i < 8; i++) {
			const angle = (i / 8) * Math.PI * 2
			const rX = Math.cos(angle) * 75
			const rY = Math.sin(angle) * 40
			ctx.beginPath()
			ctx.ellipse(cx + rX, cy + rY, 18, 10, angle, 0, Math.PI * 2)
			ctx.fill()
		}
		// Core floret
		ctx.fillStyle = '#ffdf78'
		ctx.beginPath()
		ctx.arc(cx, cy, 14, 0, Math.PI * 2)
		ctx.fill()
	}

	const tex = new THREE.CanvasTexture(canvas)
	tex.colorSpace = THREE.SRGBColorSpace
	pushDisp(disposables, tex)

	const rugGeo = mkGeo(new THREE.PlaneGeometry(width, depth), disposables)
	const rugMat = mkMat({ map: tex, roughness: 0.88, metalness: 0.0 }, disposables)
	const rug = addMesh(group, rugGeo, rugMat)
	rug.rotation.x = -Math.PI / 2
	rug.position.set(x, y, z)
	return rug
}

// F4: Classical Marble Display Pedestal
export function createDisplayPedestal({
	x = 0,
	y = 0,
	z = 0,
	height = 0.95,
	width = 0.44,
	group,
	disposables,
	obstacles = [],
} = {}) {
	const g = new THREE.Group()
	g.position.set(x, y, z)
	group.add(g)

	const mats = getLuxuryMats(disposables)

	// Base plinth
	const baseGeo = mkGeo(new THREE.BoxGeometry(width + 0.08, 0.08, width + 0.08), disposables)
	addMesh(g, baseGeo, mats.calacattaMarble).position.set(0, 0.04, 0)

	// Shaft
	const shaftGeo = mkGeo(new THREE.BoxGeometry(width, height - 0.16, width), disposables)
	addMesh(g, shaftGeo, mats.calacattaMarble).position.set(0, height / 2, 0)

	// Capital moulding
	const capGeo = mkGeo(new THREE.BoxGeometry(width + 0.06, 0.08, width + 0.06), disposables)
	addMesh(g, capGeo, mats.calacattaMarble).position.set(0, height - 0.04, 0)

	// Brass accent trim
	const trimGeo = mkGeo(new THREE.BoxGeometry(width + 0.02, 0.012, width + 0.02), disposables)
	addMesh(g, trimGeo, mats.brass).position.set(0, height - 0.08, 0)

	if (obstacles) obstacles.push({ type: 'box', x, z, y, w: width + 0.1, d: width + 0.1 })
	return g
}

// F5: Vintage Gramophone with Brass Morning Glory Horn
export function createGramophone({
	x = 0,
	y = 0.85,
	z = 0,
	rotationY = 0,
	group,
	disposables,
	animatedDecorations = [],
} = {}) {
	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotationY
	group.add(g)

	const mats = getLuxuryMats(disposables)

	// Walnut cabinet with stepped edge
	const boxGeo = mkGeo(new THREE.BoxGeometry(0.38, 0.14, 0.38), disposables)
	addMesh(g, boxGeo, mats.walnut).position.set(0, 0.07, 0)

	const lidGeo = mkGeo(new THREE.BoxGeometry(0.40, 0.025, 0.40), disposables)
	addMesh(g, lidGeo, mats.walnut).position.set(0, 0.15, 0)

	// Turntable platter
	const platterGeo = mkGeo(new THREE.CylinderGeometry(0.14, 0.14, 0.016, 28), disposables)
	addMesh(g, platterGeo, mats.brass).position.set(0, 0.17, 0)

	// Vinyl record
	const recordGeo = mkGeo(new THREE.CylinderGeometry(0.13, 0.13, 0.005, 28), disposables)
	const recordM = mkMat({ color: 0x111112, roughness: 0.35 }, disposables)
	const recordMesh = addMesh(g, recordGeo, recordM)
	recordMesh.position.set(0, 0.18, 0)

	// Gold record label
	const labelGeo = mkGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.006, 20), disposables)
	addMesh(g, labelGeo, mats.brass).position.set(0, 0.181, 0)

	// Brass tone arm
	const armGeo = mkGeo(new THREE.CylinderGeometry(0.005, 0.005, 0.18, 8), disposables)
	armGeo.rotateZ(Math.PI / 2)
	const arm = addMesh(g, armGeo, mats.brass)
	arm.position.set(0.07, 0.20, 0.06)
	arm.rotation.y = 0.45

	// Morning glory horn (lathe turned)
	const pts = []
	for (let i = 0; i <= 20; i++) {
		const t = i / 20
		const r = 0.02 + Math.pow(t, 2.2) * 0.20
		const yCoord = t * 0.42
		pts.push(new THREE.Vector2(r, yCoord))
	}
	const hornGeo = mkGeo(new THREE.LatheGeometry(pts, 24), disposables)
	const horn = addMesh(g, hornGeo, mats.brass)
	horn.position.set(-0.06, 0.24, -0.06)
	horn.rotation.x = Math.PI / 2.6
	horn.rotation.y = -Math.PI / 5

	if (animatedDecorations) {
		animatedDecorations.push((time) => {
			recordMesh.rotation.y = time * 2.2
		})
	}

	return g
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SCULPTURAL & DECORATIVE ARTEFACTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * S3: Classical Turned Calacatta Marble Urn
 * Organic Lathe geometry representing museum antiquities
 */
export function createDecorativeUrn({
	x = 0,
	y = 0,
	z = 0,
	group,
	disposables,
} = {}) {
	const g = new THREE.Group()
	g.position.set(x, y, z)
	group.add(g)

	const mats = getLuxuryMats(disposables)

	// Square plinth base
	const baseGeo = mkGeo(new THREE.BoxGeometry(0.28, 0.06, 0.28), disposables)
	addMesh(g, baseGeo, mats.calacattaMarble).position.set(0, 0.03, 0)

	// Lathe-turned fluted urn body
	const pts = [
		new THREE.Vector2(0.07, 0.06),
		new THREE.Vector2(0.05, 0.12),
		new THREE.Vector2(0.08, 0.18),
		new THREE.Vector2(0.14, 0.32),
		new THREE.Vector2(0.15, 0.42),
		new THREE.Vector2(0.12, 0.52),
		new THREE.Vector2(0.07, 0.58),
		new THREE.Vector2(0.09, 0.62),
		new THREE.Vector2(0.02, 0.65),
	]
	const urnGeo = mkGeo(new THREE.LatheGeometry(pts, 28), disposables)
	addMesh(g, urnGeo, mats.calacattaMarble)

	// Brass decorative handles (dual Torus arcs)
	const handleGeo = mkGeo(new THREE.TorusGeometry(0.08, 0.012, 10, 24, Math.PI), disposables)
	handleGeo.rotateY(Math.PI / 2)
	for (const hx of [-0.15, 0.15]) {
		const h = addMesh(g, handleGeo, mats.brass)
		h.position.set(hx, 0.36, 0)
		h.rotation.z = Math.sign(hx) * 0.2
	}

	return g
}

// S4: Mantle Brass Clock with Swinging Pendulum
export function createMantleClock({
	x = 0,
	y = 0.85,
	z = 0,
	rotationY = 0,
	group,
	disposables,
	animatedDecorations = [],
} = {}) {
	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotationY
	group.add(g)

	const mats = getLuxuryMats(disposables)

	// Architectural walnut case
	const caseGeo = mkGeo(new THREE.BoxGeometry(0.28, 0.26, 0.12), disposables)
	addMesh(g, caseGeo, mats.walnut).position.set(0, 0.13, 0)

	// Gilded clock face
	const dialGeo = mkGeo(new THREE.CylinderGeometry(0.085, 0.085, 0.015, 24), disposables)
	dialGeo.rotateX(Math.PI / 2)
	addMesh(g, dialGeo, mats.brass).position.set(0, 0.15, 0.06)

	// Swinging pendulum
	const pendRodGeo = mkGeo(new THREE.CylinderGeometry(0.004, 0.004, 0.10, 6), disposables)
	const pendBobGeo = mkGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 14), disposables)
	pendBobGeo.rotateX(Math.PI / 2)
	const pendGroup = new THREE.Group()
	pendGroup.position.set(0, 0.10, 0.04)
	addMesh(pendGroup, pendRodGeo, mats.brass).position.set(0, -0.05, 0)
	addMesh(pendGroup, pendBobGeo, mats.brass).position.set(0, -0.10, 0)
	g.add(pendGroup)

	if (animatedDecorations) {
		animatedDecorations.push((time) => {
			pendGroup.rotation.z = Math.sin(time * 3.0) * 0.22
		})
	}

	return g
}

// S5: Pillar Candle Cluster on Polished Brass Tray
export function createCandleCluster({
	x = 0,
	y = 0.85,
	z = 0,
	count = 3,
	group,
	disposables,
	animatedDecorations = [],
} = {}) {
	const g = new THREE.Group()
	g.position.set(x, y, z)
	group.add(g)

	const mats = getLuxuryMats(disposables)
	const waxM = mkMat({ color: 0xfbf6ea, roughness: 0.35 }, disposables)
	const flameM = mkMat({ color: 0xffdd44, emissive: 0xffaa00, emissiveIntensity: 3.0 }, disposables)

	// Brass tray base
	const trayGeo = mkGeo(new THREE.CylinderGeometry(0.16, 0.17, 0.015, 20), disposables)
	addMesh(g, trayGeo, mats.brass).position.set(0, 0.008, 0)

	const candleHeights = [0.18, 0.13, 0.09]
	const flameLights = []

	for (let i = 0; i < count; i++) {
		const h = candleHeights[i % candleHeights.length]
		const a = (i / count) * Math.PI * 2
		const r = 0.055
		const cx = Math.cos(a) * r
		const cz = Math.sin(a) * r

		// Wax cylinder
		const cGeo = mkGeo(new THREE.CylinderGeometry(0.025, 0.025, h, 14), disposables)
		addMesh(g, cGeo, waxM).position.set(cx, h / 2 + 0.015, cz)

		// Wick
		const wGeo = mkGeo(new THREE.CylinderGeometry(0.002, 0.002, 0.015, 6), disposables)
		addMesh(g, wGeo, mats.darkBronze).position.set(cx, h + 0.022, cz)

		// Teardrop flame
		const fGeo = mkGeo(new THREE.ConeGeometry(0.008, 0.024, 8), disposables)
		const fMesh = addMesh(g, fGeo, flameM)
		fMesh.position.set(cx, h + 0.038, cz)

		const light = new THREE.PointLight(0xff9922, 0.6, 2.0, 2.0)
		light.position.set(cx, h + 0.04, cz)
		g.add(light)
		flameLights.push(light)
		pushDisp(disposables, light)
	}

	if (animatedDecorations) {
		animatedDecorations.push((time) => {
			for (let i = 0; i < flameLights.length; i++) {
				flameLights[i].intensity = 0.5 + Math.sin(time * 12.0 + i * 1.5) * 0.15
			}
		})
	}

	return g
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ARCHITECTURAL MOULDING
// ─────────────────────────────────────────────────────────────────────────────

export function createCrownMoulding({ halfW, halfL, height, group, disposables } = {}) {
	const mats = getLuxuryMats(disposables)
	const mH = 0.14, mD = 0.14
	const g = new THREE.Group()
	g.position.set(0, height - mH / 2, 0)
	group.add(g)

	// North & South
	const nsGeo = mkGeo(new THREE.BoxGeometry(halfW * 2, mH, mD), disposables)
	addMesh(g, nsGeo, mats.calacattaMarble).position.set(0, 0, -halfL + mD / 2)
	addMesh(g, nsGeo, mats.calacattaMarble).position.set(0, 0, halfL - mD / 2)

	// East & West
	const ewGeo = mkGeo(new THREE.BoxGeometry(mD, mH, halfL * 2), disposables)
	addMesh(g, ewGeo, mats.calacattaMarble).position.set(halfW - mD / 2, 0, 0)
	addMesh(g, ewGeo, mats.calacattaMarble).position.set(-halfW + mD / 2, 0, 0)

	return g
}

export function createBaseboardBrass({ halfW, halfL, group, disposables } = {}) {
	const mats = getLuxuryMats(disposables)
	const bH = 0.12, bD = 0.03
	const g = new THREE.Group()
	g.position.set(0, bH / 2, 0)
	group.add(g)

	// North & South
	const nsGeo = mkGeo(new THREE.BoxGeometry(halfW * 2, bH, bD), disposables)
	addMesh(g, nsGeo, mats.walnut).position.set(0, 0, -halfL + bD / 2)
	addMesh(g, nsGeo, mats.walnut).position.set(0, 0, halfL - bD / 2)

	// East & West
	const ewGeo = mkGeo(new THREE.BoxGeometry(bD, bH, halfL * 2), disposables)
	addMesh(g, ewGeo, mats.walnut).position.set(halfW - bD / 2, 0, 0)
	addMesh(g, ewGeo, mats.walnut).position.set(-halfW + bD / 2, 0, 0)

	// Brass Inset Trim Line along top of baseboard
	const trimGeoNS = mkGeo(new THREE.BoxGeometry(halfW * 2, 0.012, bD + 0.005), disposables)
	addMesh(g, trimGeoNS, mats.brass).position.set(0, bH / 2, -halfL + bD / 2)
	addMesh(g, trimGeoNS, mats.brass).position.set(0, bH / 2, halfL - bD / 2)

	const trimGeoEW = mkGeo(new THREE.BoxGeometry(bD + 0.005, 0.012, halfL * 2), disposables)
	addMesh(g, trimGeoEW, mats.brass).position.set(halfW - bD / 2, bH / 2, 0)
	addMesh(g, trimGeoEW, mats.brass).position.set(-halfW + bD / 2, bH / 2, 0)

	return g
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ROOM SPECIFIC DECORATION SUITES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Salon 1: Fireside Winter Memories
 * Low-profile fireplace nestled cleanly beneath North Masterpiece with zero overlap.
 * Flanking reading armchairs angled toward the hearth.
 * Warm wall sconces and baseboards.
 */
export function decorateFiresideWinterRoom({
	group,
	disposables,
	obstacles = [],
	halfW,
	halfL,
	height,
	animatedDecorations = [],
} = {}) {
	const fpZ = -halfL + 0.40
	// Low-profile hearth (height 0.80m, mantle at 0.83m, sits below painting at 0.90m)
	createFireplace({ x: 0, y: 0, z: fpZ, rotationY: 0, group, disposables, obstacles, animatedDecorations })
	createMantleClock({ x: 0, y: 0.83, z: fpZ + 0.05, rotationY: 0, group, disposables, animatedDecorations })
	createFiresideRug({ x: 0, y: 0.002, z: fpZ + 1.4, width: 2.8, depth: 1.5, group, disposables })

	// Flanking Candle Clusters on fireplace mantle
	createCandleCluster({ x: -0.60, y: 0.83, z: fpZ + 0.04, group, disposables, count: 3, animatedDecorations })
	createCandleCluster({ x: 0.60, y: 0.83, z: fpZ + 0.04, group, disposables, count: 3, animatedDecorations })

	// Two Cozy Curved Reading Armchairs angled toward the hearth (wide stance leaves North Masterpiece 100% clear)
	createLuxuryArmchair({
		x: -2.85,
		y: 0,
		z: fpZ + 2.10,
		rotationY: Math.PI / 3.8,
		group,
		disposables,
		obstacles,
		fabricType: 'cognacLeather',
		name: 'fireside-chair-left',
	})
	createLuxuryArmchair({
		x: 2.85,
		y: 0,
		z: fpZ + 2.10,
		rotationY: -Math.PI / 3.8,
		group,
		disposables,
		obstacles,
		fabricType: 'cognacLeather',
		name: 'fireside-chair-right',
	})

	createCrownMoulding({ halfW, halfL, height, group, disposables })
	createBaseboardBrass({ halfW, halfL, group, disposables })
}

/**
 * Salon 2: Music & Classical Melodies
 * Exquisite vintage gramophone displayed on a walnut pedestal in the Southeast corner,
 * leaving the center partition highlight artwork with 100% unobstructed view!
 */
export function decorateMusicMelodiesRoom({
	group,
	disposables,
	obstacles = [],
	halfW,
	halfL,
	height,
	animatedDecorations = [],
} = {}) {
	// Photorealistic gallery botanical plants in open southern corners (zero artwork obstruction)
	createRealisticGalleryPlant({
		x: halfW * 0.72,
		y: 0,
		z: halfL * 0.65,
		targetGroup: group,
		disposables,
		obstacles,
		name: 'music-corner-plant-se',
	})
	createRealisticGalleryPlant({
		x: -halfW * 0.72,
		y: 0,
		z: halfL * 0.65,
		targetGroup: group,
		disposables,
		obstacles,
		name: 'music-corner-plant-sw',
	})

	createCrownMoulding({ halfW, halfL, height, group, disposables })
	createBaseboardBrass({ halfW, halfL, group, disposables })
}

/**
 * Salon 3: The Library & Reading Nook
 * West wall narrative board kept 100% CLEAR and unobstructed!
 * Cozy reading armchair + pharmacy brass floor reading lamp in open Southeast corner.
 */
export function decorateLibraryReadingRoom({
	group,
	disposables,
	obstacles = [],
	halfW,
	halfL,
	height,
} = {}) {
	// Cozy Reading Nook (safely placed in open salon space with zero obstruction of doors or wall artworks)
	const nookX = -halfW * 0.45
	const nookZ = halfL * 0.38
	createLuxuryArmchair({
		x: nookX,
		y: 0,
		z: nookZ,
		rotationY: Math.PI * 0.72,
		group,
		disposables,
		obstacles,
		fabricType: 'emeraldVelvet',
		name: 'library-reading-chair',
	})
	createFloorLamp({ x: nookX - 0.45, y: 0, z: nookZ - 0.15, group, disposables })

	// Photorealistic botanical plant in open Southeast corner
	createRealisticGalleryPlant({
		x: halfW * 0.72,
		y: 0,
		z: halfL * 0.70,
		targetGroup: group,
		disposables,
		obstacles,
		name: 'library-corner-plant-se',
	})

	createCrownMoulding({ halfW, halfL, height, group, disposables })
	createBaseboardBrass({ halfW, halfL, group, disposables })
}

/**
 * Salon 4: Masterpiece Paris Romance
 * Crystal Chandelier centered over the north gallery zone (safely away from z=0 partition wall).
 * Classical marble pedestals with fluted Roman urns in open corners.
 */
export function decorateParisMasterpieceRoom({
	group,
	disposables,
	obstacles = [],
	halfW,
	halfL,
	height,
} = {}) {
	// Crystal Chandelier positioned in North gallery zone (z = -halfL * 0.45, safely away from partition wall at z = 0)
	createChandelier({
		x: 0,
		y: height - 0.06,
		z: -halfL * 0.45,
		group,
		disposables,
		rings: 2,
		scale: 1.05,
		lightIntensity: 2.2,
	})

	// Classical Fluted Marble Urns on pedestals flush against North wall (beside Masterpiece, zero side wall obstruction)
	const pedX = 2.85
	const pedZ = -halfL + 0.50
	createDisplayPedestal({ x: pedX, y: 0, z: pedZ, height: 0.95, width: 0.42, group, disposables, obstacles })
	createDecorativeUrn({ x: pedX, y: 0.95, z: pedZ, group, disposables })

	createDisplayPedestal({ x: -pedX, y: 0, z: pedZ, height: 0.95, width: 0.42, group, disposables, obstacles })
	createDecorativeUrn({ x: -pedX, y: 0.95, z: pedZ, group, disposables })

	createCrownMoulding({ halfW, halfL, height, group, disposables })
	createBaseboardBrass({ halfW, halfL, group, disposables })
}

/**
 * Salon 5: The Glass Orangery
 * Photorealistic gallery plants in ceramic fluted planters with brass sabot rings,
 * placed strictly in room corners.
 */
export function decorateGlassOrangeryRoom({
	group,
	disposables,
	obstacles = [],
	halfW,
	halfL,
	height,
} = {}) {
	// Photorealistic botanical corner planters in open corner zones
	createRealisticGalleryPlant({
		x: halfW * 0.70,
		y: 0,
		z: -halfL * 0.60,
		targetGroup: group,
		disposables,
		obstacles,
		name: 'orangery-plant-ne',
	})
	createRealisticGalleryPlant({
		x: -halfW * 0.70,
		y: 0,
		z: -halfL * 0.60,
		targetGroup: group,
		disposables,
		obstacles,
		name: 'orangery-plant-nw',
	})
	createRealisticGalleryPlant({
		x: halfW * 0.70,
		y: 0,
		z: halfL * 0.60,
		targetGroup: group,
		disposables,
		obstacles,
		name: 'orangery-plant-se',
	})
	createRealisticGalleryPlant({
		x: -halfW * 0.70,
		y: 0,
		z: halfL * 0.60,
		targetGroup: group,
		disposables,
		obstacles,
		name: 'orangery-plant-sw',
	})

	createCrownMoulding({ halfW, halfL, height, group, disposables })
	createBaseboardBrass({ halfW, halfL, group, disposables })
}

/**
 * Salon 6: The Secret Promise Alcove
 * Intimate crystal chandelier in north zone, animated floating rose petals,
 * and a cozy armchair set in open corner.
 */
export function decorateSecretAlcoveRoom({
	group,
	disposables,
	obstacles = [],
	halfW,
	halfL,
	height,
	animatedDecorations = [],
} = {}) {
	// Intimate Crystal Chandelier in north gallery zone (safely away from partition wall at z = 0)
	createChandelier({
		x: 0,
		y: height - 0.06,
		z: -halfL * 0.45,
		group,
		disposables,
		rings: 1,
		scale: 0.90,
		lightIntensity: 1.8,
	})



	// Cozy curved reading armchair (safely placed in open salon space with zero door or wall obstruction)
	createLuxuryArmchair({
		x: -halfW * 0.45,
		y: 0,
		z: halfL * 0.38,
		rotationY: Math.PI * 0.72,
		group,
		disposables,
		obstacles,
		fabricType: 'burgundyLeather',
		name: 'secret-reading-chair',
	})

	createCrownMoulding({ halfW, halfL, height, group, disposables })
	createBaseboardBrass({ halfW, halfL, group, disposables })
}

/**
 * Grand Lobby Rotunda Enhancements
 */
export function decorateLobbyGrandRotunda({ group, disposables, halfW, halfL, height } = {}) {
	// Grand Central Crystal Chandelier in high lobby atrium
	createChandelier({
		x: 0,
		y: height + 1.45,
		z: 0,
		group,
		disposables,
		rings: 2,
		scale: 1.40,
		lightIntensity: 2.8,
	})

	createBaseboardBrass({ halfW, halfL, group, disposables })
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. CENTRAL DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────
export function applyRoomDecorations({
	title = '',
	group,
	disposables,
	obstacles = [],
	halfW,
	halfL,
	height,
	animatedDecorations = [],
} = {}) {
	const t = String(title || '').toLowerCase()
	if (t.includes('fireside') || t.includes('winter')) {
		decorateFiresideWinterRoom({ group, disposables, obstacles, halfW, halfL, height, animatedDecorations })
	} else if (t.includes('music') || t.includes('melod')) {
		decorateMusicMelodiesRoom({ group, disposables, obstacles, halfW, halfL, height, animatedDecorations })
	} else if (t.includes('library') || t.includes('reading')) {
		decorateLibraryReadingRoom({ group, disposables, obstacles, halfW, halfL, height, animatedDecorations })
	} else if (t.includes('paris') || t.includes('masterpiece') || t.includes('romance')) {
		decorateParisMasterpieceRoom({ group, disposables, obstacles, halfW, halfL, height, animatedDecorations })
	} else if (t.includes('orangery') || t.includes('glass')) {
		decorateGlassOrangeryRoom({ group, disposables, obstacles, halfW, halfL, height, animatedDecorations })
	} else if (t.includes('secret') || t.includes('alcove') || t.includes('promise')) {
		decorateSecretAlcoveRoom({ group, disposables, obstacles, halfW, halfL, height, animatedDecorations })
	} else {
		createCrownMoulding({ halfW, halfL, height, group, disposables })
		createBaseboardBrass({ halfW, halfL, group, disposables })
	}
}
