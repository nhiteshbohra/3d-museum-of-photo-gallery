/**
 * Our Museum 3D — Priority 1 Lighting Artifacts
 * L1: Art Deco Fluted Glass Torchère
 * L2: Brass Banker's Table Lamp
 * L3: Alabaster Table Lamp
 * L4: Triple-Arm Candelabra Wall Sconce
 */
import * as THREE from 'three'
import { pushDisp, mkGeo, mkMat, getLuxuryMats } from '../decorations.js'

export function buildTorchereArtDeco({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'brass-frosted', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const metalMat = variant === 'bronze' ? mats.darkBronze : mats.brass
	const glassMat = mkMat({
		color: 0xfff6e6,
		roughness: 0.25,
		metalness: 0.1,
		transparent: true,
		opacity: 0.82,
		emissive: 0xffe2a8,
		emissiveIntensity: 0.55,
	}, disposables)

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	// Stepped Spun Brass Base (0.35m diameter)
	const plinthGeo = mkGeo(new THREE.CylinderGeometry(0.18, 0.20, 0.05, 32), disposables)
	const plinth = new THREE.Mesh(plinthGeo, metalMat)
	plinth.position.y = 0.025
	g.add(plinth)

	const stepGeo = mkGeo(new THREE.CylinderGeometry(0.14, 0.16, 0.04, 32), disposables)
	const step = new THREE.Mesh(stepGeo, metalMat)
	step.position.y = 0.07
	g.add(step)

	// Fluted Central Column Shaft (Height 1.45m)
	const shaftGeo = mkGeo(new THREE.CylinderGeometry(0.04, 0.055, 1.40, 24), disposables)
	const shaft = new THREE.Mesh(shaftGeo, metalMat)
	shaft.position.y = 0.79
	g.add(shaft)

	// Decorative Mid-Ring Collars
	for (const ry of [0.45, 0.95, 1.40]) {
		const collarGeo = mkGeo(new THREE.TorusGeometry(0.065, 0.015, 16, 24), disposables)
		const collar = new THREE.Mesh(collarGeo, metalMat)
		collar.rotation.x = Math.PI / 2
		collar.position.y = ry
		g.add(collar)
	}

	// Fluted Cup Capital
	const cupGeo = mkGeo(new THREE.CylinderGeometry(0.16, 0.07, 0.14, 32), disposables)
	const cup = new THREE.Mesh(cupGeo, metalMat)
	cup.position.y = 1.56
	g.add(cup)

	// Fluted Frosted Glass Torchère Shade
	const shadeGeo = mkGeo(new THREE.CylinderGeometry(0.18, 0.12, 0.40, 32, 1, true), disposables)
	const shade = new THREE.Mesh(shadeGeo, glassMat)
	shade.position.y = 1.83
	g.add(shade)

	// Crown Brass Finial Ring
	const crownGeo = mkGeo(new THREE.TorusGeometry(0.18, 0.012, 16, 32), disposables)
	const crown = new THREE.Mesh(crownGeo, metalMat)
	crown.rotation.x = Math.PI / 2
	crown.position.y = 2.03
	g.add(crown)

	// Soft Ambience Light (Within 8 light budget)
	const light = new THREE.PointLight(0xffecc2, 1.1, 5.0, 1.8)
	light.position.set(0, 1.85, 0)
	g.add(light)
	pushDisp(disposables, light)

	if (group) group.add(g)

	if (Array.isArray(obstacles)) {
		obstacles.push({
			type: 'cylinder',
			x, z,
			radius: 0.22 * scale,
		})
	}
	return g
}

export function buildBankerLamp({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'emerald', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const brass = mats.brass

	const shadeMat = variant === 'amber'
		? mkMat({ color: 0xcc7a00, roughness: 0.2, metalness: 0.05, emissive: 0x663300, emissiveIntensity: 0.4 }, disposables)
		: mkMat({ color: 0x0d4722, roughness: 0.18, metalness: 0.05, emissive: 0x052812, emissiveIntensity: 0.4 }, disposables)

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	// Heavy Stepped Lathe Brass Base
	const base1 = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.11, 0.12, 0.025, 32), disposables), brass)
	base1.position.y = 0.0125
	g.add(base1)

	const base2 = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.08, 0.09, 0.025, 32), disposables), brass)
	base2.position.y = 0.035
	g.add(base2)

	// Turned Upright Stem
	const stem = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.016, 0.022, 0.28, 24), disposables), brass)
	stem.position.y = 0.18
	g.add(stem)

	// Curved Gooseneck Arm using TubeGeometry
	const curve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(0, 0.32, 0),
		new THREE.Vector3(0, 0.38, 0.02),
		new THREE.Vector3(0, 0.41, 0.08),
		new THREE.Vector3(0, 0.39, 0.14),
	])
	const armGeo = mkGeo(new THREE.TubeGeometry(curve, 20, 0.012, 16, false), disposables)
	const arm = new THREE.Mesh(armGeo, brass)
	g.add(arm)

	// Horizontal Shade Swivel Bar
	const crossBar = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.01, 0.01, 0.26, 16), disposables), brass)
	crossBar.rotation.z = Math.PI / 2
	crossBar.position.set(0, 0.39, 0.14)
	g.add(crossBar)

	// Half-Cylinder Emerald Shade (0.24m wide)
	const shadeGeo = mkGeo(new THREE.CylinderGeometry(0.07, 0.07, 0.24, 32, 1, false, 0, Math.PI), disposables)
	const shade = new THREE.Mesh(shadeGeo, shadeMat)
	shade.rotation.z = Math.PI / 2
	shade.rotation.x = Math.PI * 0.95
	shade.position.set(0, 0.385, 0.14)
	g.add(shade)

	// Pull Chain & Brass Bead
	const chain = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.002, 0.002, 0.10, 8), disposables), brass)
	chain.position.set(0.08, 0.31, 0.13)
	g.add(chain)
	const bead = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.008, 12, 12), disposables), brass)
	bead.position.set(0.08, 0.255, 0.13)
	g.add(bead)

	// Warm Glowing Bulb interior
	const bulbMat = mkMat({ color: 0xfffaea, emissive: 0xffe29e, emissiveIntensity: 1.2 }, disposables)
	const bulb = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.024, 16, 16), disposables), bulbMat)
	bulb.position.set(0, 0.375, 0.14)
	g.add(bulb)

	if (group) group.add(g)
	return g
}

export function buildAlabasterLamp({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'champagne', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const brass = mats.brass
	const alabasterMat = mkMat({
		color: 0xfcfbf7,
		roughness: 0.28,
		metalness: 0.02,
		emissive: 0xffeed1,
		emissiveIntensity: 0.25,
	}, disposables)

	const shadeMat = mkMat({
		color: variant === 'silk' ? 0xfffcf5 : 0xf7edd5,
		roughness: 0.75,
		metalness: 0.02,
		side: THREE.DoubleSide,
	}, disposables)

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	// Turned Brass Plinth
	const plinth = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.09, 0.10, 0.02, 32), disposables), brass)
	plinth.position.y = 0.01
	g.add(plinth)

	// Carved Alabaster Urn Body (Lathe-curved appearance)
	const lowerUrn = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.085, 0.045, 0.12, 32), disposables), alabasterMat)
	lowerUrn.position.y = 0.08
	g.add(lowerUrn)

	const middleUrn = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.095, 24, 24), disposables), alabasterMat)
	middleUrn.position.y = 0.18
	middleUrn.scale.set(1.0, 0.85, 1.0)
	g.add(middleUrn)

	const neck = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.035, 0.06, 0.08, 24), disposables), alabasterMat)
	neck.position.y = 0.27
	g.add(neck)

	// Brass Collar
	const collar = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 24), disposables), brass)
	collar.position.y = 0.32
	g.add(collar)

	// Pleated Silk Tapered Shade (0.24m base, 0.14m top, 0.18m height)
	const shadeGeo = mkGeo(new THREE.CylinderGeometry(0.08, 0.14, 0.18, 36, 1, true), disposables)
	const shade = new THREE.Mesh(shadeGeo, shadeMat)
	shade.position.y = 0.42
	g.add(shade)

	// Top Brass Finial
	const finial = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.012, 16, 16), disposables), brass)
	finial.position.y = 0.52
	g.add(finial)

	if (group) group.add(g)
	return g
}

export function buildCandelabraSconce({
	x = 0, y = 2.0, z = 0, rotY = 0, scale = 1.0,
	variant = 'brass', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const metalMat = variant === 'bronze' ? mats.darkBronze : mats.brass
	const waxMat = mkMat({ color: 0xfffbee, roughness: 0.35, metalness: 0.02 }, disposables)
	const flameMat = mkMat({
		color: 0xffe6a3,
		emissive: 0xffb733,
		emissiveIntensity: 1.4,
	}, disposables)

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	// Cast Gilded Backplate (Shield-shaped cartouche against wall)
	const backPlateGeo = mkGeo(new THREE.BoxGeometry(0.14, 0.28, 0.024), disposables)
	const backPlate = new THREE.Mesh(backPlateGeo, metalMat)
	backPlate.position.set(0, 0, 0.012)
	g.add(backPlate)

	// Acanthus Crest Detail on Backplate
	const crestGeo = mkGeo(new THREE.TorusGeometry(0.05, 0.012, 12, 24, Math.PI), disposables)
	const crest = new THREE.Mesh(crestGeo, metalMat)
	crest.position.set(0, 0.14, 0.02)
	g.add(crest)

	// 3 Symmetrical Curved Arms
	const armOffsets = [-0.15, 0.0, 0.15]
	const armReaches = [0.18, 0.22, 0.18]
	const armHeights = [0.03, 0.06, 0.03]

	armOffsets.forEach((ox, idx) => {
		const rz = armReaches[idx]
		const hy = armHeights[idx]

		const armCurve = new THREE.CatmullRomCurve3([
			new THREE.Vector3(0, -0.04, 0.02),
			new THREE.Vector3(ox * 0.4, -0.06, rz * 0.4),
			new THREE.Vector3(ox, hy - 0.04, rz * 0.8),
			new THREE.Vector3(ox, hy, rz),
		])
		const armGeo = mkGeo(new THREE.TubeGeometry(armCurve, 16, 0.010, 12, false), disposables)
		const armMesh = new THREE.Mesh(armGeo, metalMat)
		g.add(armMesh)

		// Bobeche Drip Pan
		const bobeche = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.042, 0.02, 0.015, 24), disposables), metalMat)
		bobeche.position.set(ox, hy + 0.01, rz)
		g.add(bobeche)

		// Candle Sleeve
		const candle = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.10, 16), disposables), waxMat)
		candle.position.set(ox, hy + 0.065, rz)
		g.add(candle)

		// Flame Tip
		const flame = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.009, 0.024, 12), disposables), flameMat)
		flame.position.set(ox, hy + 0.125, rz)
		g.add(flame)
	})

	// Gentle warm glow
	const sconceLight = new THREE.PointLight(0xffdfa0, 0.8, 3.5, 2.0)
	sconceLight.position.set(0, 0.12, 0.20)
	g.add(sconceLight)
	pushDisp(disposables, sconceLight)

	if (group) group.add(g)
	return g
}

