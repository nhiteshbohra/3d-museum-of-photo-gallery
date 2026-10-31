/**
 * Our Museum 3D — Priority 1 Furniture & Seating Artifacts
 * F1: Gallery Viewing Bench (Walnut + Brass)
 * F2: Curved Velvet Banquette
 * F3: Round Tufted Ottoman with Planter Well
 * F4: Round Velvet Pouf Pair
 * F5: Round Marble Side Table
 */
import * as THREE from 'three'
import { pushDisp, mkGeo, mkMat, getLuxuryMats } from '../decorations.js'

export function buildGalleryBench({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'cognac', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const leatherMat = variant === 'burgundy'
		? mats.burgundyLeather
		: variant === 'champagne'
			? mats.champagneVelvet
			: mats.cognacLeather
	const woodMat = mats.walnut
	const brass = mats.brass

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	const width = 1.60
	const depth = 0.48
	const baseHeight = 0.04

	// Solid Chamfered Walnut Plinth (1.60m x 0.48m x 0.04m)
	const plinthGeo = mkGeo(new THREE.BoxGeometry(width, baseHeight, depth), disposables)
	const plinth = new THREE.Mesh(plinthGeo, woodMat)
	plinth.position.y = 0.36 + baseHeight / 2
	g.add(plinth)

	// Leather Cushion with Welt Piping and Channel Stitching
	const cushionHeight = 0.08
	const cushionGeo = mkGeo(new THREE.BoxGeometry(width - 0.04, cushionHeight, depth - 0.04), disposables)
	const cushion = new THREE.Mesh(cushionGeo, leatherMat)
	cushion.position.y = 0.40 + cushionHeight / 2
	g.add(cushion)

	// Welt piping border
	const pipeGeo = mkGeo(new THREE.TorusGeometry((width - 0.04) / 2, 0.012, 12, 48), disposables)
	const pipeMesh = new THREE.Mesh(pipeGeo, leatherMat)
	pipeMesh.scale.set(1.0, (depth - 0.04) / (width - 0.04), 1.0)
	pipeMesh.rotation.x = Math.PI / 2
	pipeMesh.position.y = 0.48
	g.add(pipeMesh)

	// Turned Tapered Ebony/Walnut Legs with Spun Brass Sabots
	const legOffsets = [
		[-width / 2 + 0.12, -depth / 2 + 0.08],
		[width / 2 - 0.12, -depth / 2 + 0.08],
		[-width / 2 + 0.12, depth / 2 - 0.08],
		[width / 2 - 0.12, depth / 2 - 0.08],
	]

	legOffsets.forEach(([lx, lz]) => {
		// Main tapered leg shaft
		const legGeo = mkGeo(new THREE.CylinderGeometry(0.022, 0.034, 0.36, 16), disposables)
		const leg = new THREE.Mesh(legGeo, mats.castIron)
		leg.position.set(lx, 0.18, lz)
		g.add(leg)

		// Brass ferrule sabot at base
		const sabotGeo = mkGeo(new THREE.CylinderGeometry(0.025, 0.027, 0.06, 16), disposables)
		const sabot = new THREE.Mesh(sabotGeo, brass)
		sabot.position.set(lx, 0.03, lz)
		g.add(sabot)

		// Top mounting brass collar
		const collarGeo = mkGeo(new THREE.CylinderGeometry(0.036, 0.034, 0.02, 16), disposables)
		const collar = new THREE.Mesh(collarGeo, brass)
		collar.position.set(lx, 0.35, lz)
		g.add(collar)
	})

	// Longitudinal Under-Stretcher Rail (Polished Brass Bar)
	const railGeo = mkGeo(new THREE.CylinderGeometry(0.012, 0.012, width - 0.28, 16), disposables)
	const rail = new THREE.Mesh(railGeo, brass)
	rail.rotation.z = Math.PI / 2
	rail.position.set(0, 0.16, 0)
	g.add(rail)

	if (group) group.add(g)

	// Physical collision footprint
	if (Array.isArray(obstacles)) {
		obstacles.push({
			type: 'box',
			x, y: 0, z,
			w: width * scale,
			d: depth * scale,
		})
	}
	return g
}

export function buildCurvedBanquette({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'champagne', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const velvetMat = variant === 'emerald'
		? mats.emeraldVelvet
		: variant === 'cognac'
			? mats.cognacLeather
			: mats.champagneVelvet
	const brass = mats.brass

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	const rIn = 0.95
	const rOut = 1.45
	const arcAngle = Math.PI * 0.65 // ~117 degrees graceful arc
	// Center arc so the convex back faces rear (-Z) and concave seat faces front (+Z)
	const centerAngle = Math.PI / 2
	const startAngle = centerAngle - arcAngle / 2
	const endAngle = centerAngle + arcAngle / 2

	// 1. Recessed Curved Toe-Kick Plinth (Brushed Brass)
	const plinthShape = new THREE.Shape()
	plinthShape.absarc(0, 0, rOut - 0.03, startAngle, endAngle, false)
	plinthShape.absarc(0, 0, rIn + 0.03, endAngle, startAngle, true)
	plinthShape.closePath()

	const plinthGeo = mkGeo(new THREE.ExtrudeGeometry(plinthShape, {
		depth: 0.06,
		bevelEnabled: false,
		curveSegments: 36,
	}), disposables)
	const plinth = new THREE.Mesh(plinthGeo, brass)
	plinth.rotation.x = -Math.PI / 2
	plinth.position.y = 0
	g.add(plinth)

	// 2. Thick Curved Seat Cushion with Beveled Edges
	const seatShape = new THREE.Shape()
	seatShape.absarc(0, 0, rOut, startAngle, endAngle, false)
	seatShape.absarc(0, 0, rIn, endAngle, startAngle, true)
	seatShape.closePath()

	const seatGeo = mkGeo(new THREE.ExtrudeGeometry(seatShape, {
		depth: 0.38,
		bevelEnabled: true,
		bevelSegments: 4,
		steps: 1,
		bevelSize: 0.02,
		bevelThickness: 0.02,
		curveSegments: 36,
	}), disposables)
	const seat = new THREE.Mesh(seatGeo, velvetMat)
	seat.rotation.x = -Math.PI / 2
	seat.position.y = 0.06
	g.add(seat)

	// 3. Curved Channeled Backrest
	const rBackIn = rOut - 0.16
	const rBackOut = rOut
	const backShape = new THREE.Shape()
	backShape.absarc(0, 0, rBackOut, startAngle, endAngle, false)
	backShape.absarc(0, 0, rBackIn, endAngle, startAngle, true)
	backShape.closePath()

	const backGeo = mkGeo(new THREE.ExtrudeGeometry(backShape, {
		depth: 0.42,
		bevelEnabled: true,
		bevelSegments: 4,
		steps: 1,
		bevelSize: 0.025,
		bevelThickness: 0.025,
		curveSegments: 36,
	}), disposables)
	const back = new THREE.Mesh(backGeo, velvetMat)
	back.rotation.x = -Math.PI / 2
	back.position.y = 0.44
	g.add(back)

	// 4. Vertical Fluting Pleats along the inner backrest
	const fluteCount = 9
	for (let i = 0; i < fluteCount; i++) {
		const angle = startAngle + (i / (fluteCount - 1)) * arcAngle
		const fx = Math.cos(angle) * (rBackIn + 0.01)
		const fz = -Math.sin(angle) * (rBackIn + 0.01)

		const fluteGeo = mkGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 12), disposables)
		const flute = new THREE.Mesh(fluteGeo, velvetMat)
		flute.position.set(fx, 0.44 + 0.19, fz)
		g.add(flute)
	}

	if (group) group.add(g)

	if (Array.isArray(obstacles)) {
		obstacles.push({
			type: 'cylinder',
			x, z,
			radius: rOut * scale,
		})
	}
	return g
}

export function buildOttomanPlanter({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'champagne', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const velvetMat = variant === 'emerald'
		? mats.emeraldVelvet
		: variant === 'burgundy'
			? mats.burgundyLeather
			: mats.champagneVelvet
	const brass = mats.brass
	const soilMat = mkMat({ color: 0x1f1915, roughness: 0.95 }, disposables)
	const leafMat = mkMat({ color: 0x244f2c, roughness: 0.35, side: THREE.DoubleSide }, disposables)

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	const outerRadius = 0.80 // 1.6m diameter
	const innerRadius = 0.26 // 0.52m central well

	// 1. Recessed Brass Toe-Kick Ring (H = 0.06m)
	const plinthGeo = mkGeo(new THREE.CylinderGeometry(outerRadius - 0.04, outerRadius - 0.04, 0.06, 48), disposables)
	const plinth = new THREE.Mesh(plinthGeo, brass)
	plinth.position.y = 0.03
	g.add(plinth)

	// 2. Main Cylinder Seat Cushion Body
	const seatGeo = mkGeo(new THREE.CylinderGeometry(outerRadius, outerRadius, 0.36, 48), disposables)
	const seat = new THREE.Mesh(seatGeo, velvetMat)
	seat.position.y = 0.24
	g.add(seat)

	// 3. Outer Rounded Bullnose Rim (Torus for soft upholstered crown edge)
	const rimGeo = mkGeo(new THREE.TorusGeometry(outerRadius - 0.035, 0.035, 16, 48), disposables)
	const rimMesh = new THREE.Mesh(rimGeo, velvetMat)
	rimMesh.rotation.x = Math.PI / 2
	rimMesh.position.y = 0.42
	g.add(rimMesh)

	// 4. Central Brass Planter Well Collar & Rim
	const wellGeo = mkGeo(new THREE.CylinderGeometry(innerRadius, innerRadius, 0.42, 32), disposables)
	const well = new THREE.Mesh(wellGeo, brass)
	well.position.y = 0.26
	g.add(well)

	const wellRimGeo = mkGeo(new THREE.TorusGeometry(innerRadius, 0.02, 16, 32), disposables)
	const wellRim = new THREE.Mesh(wellRimGeo, brass)
	wellRim.rotation.x = Math.PI / 2
	wellRim.position.y = 0.46
	g.add(wellRim)

	// 5. Radial Button Tufting Indentations
	const tuftCount = 12
	const buttonMat = mats.brass
	for (let i = 0; i < tuftCount; i++) {
		const angle = (i / tuftCount) * Math.PI * 2
		const tr = (innerRadius + outerRadius) / 2
		const tx = Math.cos(angle) * tr
		const tz = Math.sin(angle) * tr

		const btnGeo = mkGeo(new THREE.SphereGeometry(0.016, 12, 12), disposables)
		const btn = new THREE.Mesh(btnGeo, buttonMat)
		btn.position.set(tx, 0.415, tz)
		g.add(btn)
	}

	// 6. Rich Soil Bed
	const soilGeo = mkGeo(new THREE.CylinderGeometry(innerRadius - 0.01, innerRadius - 0.01, 0.02, 32), disposables)
	const soil = new THREE.Mesh(soilGeo, soilMat)
	soil.position.y = 0.45
	g.add(soil)

	// 7. Lush Centerpiece Palm / Ficus in Center Well
	const foliageGroup = new THREE.Group()
	foliageGroup.position.set(0, 0.46, 0)

	// Central woody stems
	const trunkGeo = mkGeo(new THREE.CylinderGeometry(0.028, 0.040, 0.85, 12), disposables)
	const trunk = new THREE.Mesh(trunkGeo, mats.walnut)
	trunk.position.y = 0.42
	foliageGroup.add(trunk)

	// Multiple graceful branching fronds
	const leafCount = 24
	for (let i = 0; i < leafCount; i++) {
		const angle = (i / leafCount) * Math.PI * 2 + (i % 2) * 0.2
		const tier = Math.floor(i / 6)
		const ly = 0.35 + tier * 0.22
		const r = 0.18 + tier * 0.08

		const leafGeo = mkGeo(new THREE.PlaneGeometry(0.24, 0.38), disposables)
		const leaf = new THREE.Mesh(leafGeo, leafMat)
		leaf.position.set(Math.cos(angle) * r, ly, Math.sin(angle) * r)
		leaf.rotation.x = 0.45 + tier * 0.1
		leaf.rotation.y = angle + Math.PI / 2
		foliageGroup.add(leaf)
	}
	g.add(foliageGroup)

	if (group) group.add(g)

	if (Array.isArray(obstacles)) {
		obstacles.push({
			type: 'cylinder',
			x, z,
			radius: outerRadius * scale,
		})
	}
	return g
}

export function buildPoufPair({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'champagne', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const velvetMat = variant === 'emerald'
		? mats.emeraldVelvet
		: variant === 'cognac'
			? mats.cognacLeather
			: mats.champagneVelvet
	const brass = mats.brass

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	const radius = 0.24
	const height = 0.40

	// Pair of Symmetrical Cylindrical Poufs (Placed offset slightly)
	const offsets = [
		[-0.28, 0],
		[0.28, 0],
	]

	offsets.forEach(([px, pz]) => {
		const pouf = new THREE.Group()
		pouf.position.set(px, 0, pz)

		// Recessed Brass Base Plinth Ring
		const baseGeo = mkGeo(new THREE.CylinderGeometry(radius - 0.02, radius - 0.02, 0.04, 32), disposables)
		const baseMesh = new THREE.Mesh(baseGeo, brass)
		baseMesh.position.y = 0.02
		pouf.add(baseMesh)

		// Velvet Drum Cylinder Body
		const drumGeo = mkGeo(new THREE.CylinderGeometry(radius, radius, height - 0.06, 32), disposables)
		const drumMesh = new THREE.Mesh(drumGeo, velvetMat)
		drumMesh.position.y = 0.04 + (height - 0.06) / 2
		pouf.add(drumMesh)

		// Welt Piping Torus Accent Collar
		const pipeGeo = mkGeo(new THREE.TorusGeometry(radius, 0.012, 12, 32), disposables)
		const pipeMesh = new THREE.Mesh(pipeGeo, velvetMat)
		pipeMesh.rotation.x = Math.PI / 2
		pipeMesh.position.y = height - 0.03
		pouf.add(pipeMesh)

		// Dome Crown Seat Top
		const topGeo = mkGeo(new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.28), disposables)
		const topMesh = new THREE.Mesh(topGeo, velvetMat)
		topMesh.position.y = height - 0.05
		pouf.add(topMesh)

		g.add(pouf)
	})

	if (group) group.add(g)

	if (Array.isArray(obstacles)) {
		obstacles.push({
			type: 'box',
			x, y: 0, z,
			w: 0.90 * scale,
			d: 0.50 * scale,
		})
	}
	return g
}

export function buildMarbleSideTable({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'calacatta', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const marbleMat = variant === 'nero' ? mats.neroMarble : mats.calacattaMarble
	const metalMat = mats.brass

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	const radius = 0.26
	const height = 0.55

	// Cast Brass Tri-Pod Claw Feet Base
	const baseHub = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.045, 0.05, 0.06, 16), disposables), metalMat)
	baseHub.position.y = 0.06
	g.add(baseHub)

	// 3 Radial Splayed Legs
	for (let i = 0; i < 3; i++) {
		const angle = (i / 3) * Math.PI * 2
		const legGeo = mkGeo(new THREE.CylinderGeometry(0.015, 0.018, 0.24, 12), disposables)
		const leg = new THREE.Mesh(legGeo, metalMat)
		leg.rotation.z = Math.PI / 5
		leg.position.set(Math.cos(angle) * 0.11, 0.05, Math.sin(angle) * 0.11)
		leg.rotation.y = -angle
		g.add(leg)
	}

	// Turned Central Brass Column Pedestal with Collars
	const shaftGeo = mkGeo(new THREE.CylinderGeometry(0.024, 0.030, 0.44, 24), disposables)
	const shaft = new THREE.Mesh(shaftGeo, metalMat)
	shaft.position.y = 0.30
	g.add(shaft)

	// Mid and Upper Cast Collars
	for (const cy of [0.18, 0.38]) {
		const collar = new THREE.Mesh(mkGeo(new THREE.TorusGeometry(0.038, 0.010, 12, 24), disposables), metalMat)
		collar.rotation.x = Math.PI / 2
		collar.position.y = cy
		g.add(collar)
	}

	// Solid Calacatta Marble Disc Top with Polished Beveled Edge (Ø0.52m x 0.035m)
	const topGeo = mkGeo(new THREE.CylinderGeometry(radius, radius, 0.032, 48), disposables)
	const top = new THREE.Mesh(topGeo, marbleMat)
	top.position.y = height - 0.016
	g.add(top)

	// Brass Perimeter Gallery Rim Edge
	const rimGeo = mkGeo(new THREE.TorusGeometry(radius, 0.012, 12, 48), disposables)
	const rim = new THREE.Mesh(rimGeo, metalMat)
	rim.rotation.x = Math.PI / 2
	rim.position.y = height - 0.016
	g.add(rim)

	if (group) group.add(g)

	if (Array.isArray(obstacles)) {
		obstacles.push({
			type: 'cylinder',
			x, z,
			radius: radius * scale,
		})
	}
	return g
}
