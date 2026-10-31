/**
 * Our Museum 3D — Priority 1 Vitrine & Display Artifacts
 * V1: Octagonal Brass & Glass Vitrine
 * V2: Slanted Archival Letter Display Table
 * V3: Nero Marquina Pedestal + Bronze Sculpture
 */
import * as THREE from 'three'
import { pushDisp, mkGeo, mkMat, getLuxuryMats } from '../decorations.js'

export function buildOctagonalVitrine({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'brass', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const metalMat = variant === 'bronze' ? mats.darkBronze : mats.brass
	const glassMat = mkMat({
		color: 0xffffff,
		roughness: 0.05,
		metalness: 0.1,
		transparent: true,
		opacity: 0.35,
		side: THREE.DoubleSide,
	}, disposables)
	const velvetMat = mats.burgundyLeather

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	const radius = 0.38
	const totalHeight = 1.55
	const plinthH = 0.42
	const glassH = 0.88
	const crownH = 0.25

	// 1. Stepped Octagonal Plinth Base (Walnut / Cast Bronze)
	const plinthGeo = mkGeo(new THREE.CylinderGeometry(radius + 0.04, radius + 0.06, plinthH, 8), disposables)
	const plinth = new THREE.Mesh(plinthGeo, mats.walnut)
	plinth.position.y = plinthH / 2
	g.add(plinth)

	// Bottom Brass Accent Band
	const plinthRimGeo = mkGeo(new THREE.CylinderGeometry(radius + 0.07, radius + 0.07, 0.03, 8), disposables)
	const plinthRim = new THREE.Mesh(plinthRimGeo, metalMat)
	plinthRim.position.y = 0.015
	g.add(plinthRim)

	// Plinth Top Brass Collar
	const plinthCapGeo = mkGeo(new THREE.CylinderGeometry(radius + 0.04, radius + 0.04, 0.04, 8), disposables)
	const plinthCap = new THREE.Mesh(plinthCapGeo, metalMat)
	plinthCap.position.y = plinthH + 0.02
	g.add(plinthCap)

	// 2. Interior Velvet Display Deck
	const deckGeo = mkGeo(new THREE.CylinderGeometry(radius - 0.02, radius - 0.02, 0.03, 8), disposables)
	const deck = new THREE.Mesh(deckGeo, velvetMat)
	deck.position.y = plinthH + 0.045
	g.add(deck)

	// Artifact on display: Antique Royal Ruby in Brass Mount
	const gemGeo = mkGeo(new THREE.DodecahedronGeometry(0.04, 1), disposables)
	const gemMat = mkMat({
		color: 0xcc1133,
		roughness: 0.1,
		metalness: 0.2,
		emissive: 0x880015,
		emissiveIntensity: 0.35,
	}, disposables)
	const gem = new THREE.Mesh(gemGeo, gemMat)
	gem.position.set(0, plinthH + 0.12, 0)
	g.add(gem)

	const standGeo = mkGeo(new THREE.CylinderGeometry(0.015, 0.03, 0.05, 16), disposables)
	const stand = new THREE.Mesh(standGeo, metalMat)
	stand.position.set(0, plinthH + 0.07, 0)
	g.add(stand)

	// 3. Octagonal Glass Enclosure
	const glassGeo = mkGeo(new THREE.CylinderGeometry(radius, radius, glassH, 8, 1, true), disposables)
	const glass = new THREE.Mesh(glassGeo, glassMat)
	glass.position.y = plinthH + 0.04 + glassH / 2
	g.add(glass)

	// 4. Eight Slim Vertical Brass Corner Mullions
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * Math.PI * 2
		const mx = Math.cos(angle) * radius
		const mz = Math.sin(angle) * radius

		const mullionGeo = mkGeo(new THREE.CylinderGeometry(0.010, 0.010, glassH, 8), disposables)
		const mullion = new THREE.Mesh(mullionGeo, metalMat)
		mullion.position.set(mx, plinthH + 0.04 + glassH / 2, mz)
		g.add(mullion)
	}

	// 5. Beveled Octagonal Brass Cornice / Crown Roof
	const crownGeo = mkGeo(new THREE.CylinderGeometry(radius - 0.08, radius + 0.02, crownH, 8), disposables)
	const crown = new THREE.Mesh(crownGeo, metalMat)
	crown.position.y = plinthH + 0.04 + glassH + crownH / 2
	g.add(crown)

	// Top Acorn Finial
	const finialGeo = mkGeo(new THREE.SphereGeometry(0.035, 16, 16), disposables)
	const finial = new THREE.Mesh(finialGeo, metalMat)
	finial.position.y = plinthH + 0.04 + glassH + crownH + 0.035
	g.add(finial)

	// Internal Warm Spotlight Puck
	const spotLight = new THREE.PointLight(0xffecc4, 1.2, 2.5, 2.0)
	spotLight.position.set(0, plinthH + 0.04 + glassH - 0.05, 0)
	g.add(spotLight)

	if (group) group.add(g)

	if (Array.isArray(obstacles)) {
		obstacles.push({
			type: 'cylinder',
			x, z,
			radius: (radius + 0.06) * scale,
		})
	}
	return g
}

export function buildLetterDisplayTable({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'brass', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const metalMat = variant === 'bronze' ? mats.darkBronze : mats.brass
	const woodMat = mats.walnut
	const glassMat = mkMat({
		color: 0xf5faff,
		roughness: 0.04,
		metalness: 0.08,
		transparent: true,
		opacity: 0.38,
		side: THREE.DoubleSide,
	}, disposables)
	const velvetMat = mats.emeraldVelvet

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	const w = 1.00
	const d = 0.60
	const tableH = 0.72

	// 1. Turned Tapered Walnut Legs with Brass Sabot Ferrules
	const legOffsets = [
		[-w / 2 + 0.08, -d / 2 + 0.08],
		[w / 2 - 0.08, -d / 2 + 0.08],
		[-w / 2 + 0.08, d / 2 - 0.08],
		[w / 2 - 0.08, d / 2 - 0.08],
	]

	legOffsets.forEach(([lx, lz]) => {
		const leg = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.020, 0.032, tableH, 16), disposables), woodMat)
		leg.position.set(lx, tableH / 2, lz)
		g.add(leg)

		const ferrule = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.030, 0.034, 0.08, 16), disposables), metalMat)
		ferrule.position.set(lx, 0.04, lz)
		g.add(ferrule)
	})

	// 2. Apron Table Stretcher Frame
	const apron = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(w, 0.06, d), disposables), woodMat)
	apron.position.set(0, tableH - 0.03, 0)
	g.add(apron)

	// Vitrine Base Lip / Brass Surround
	const vitrineBase = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(w + 0.02, 0.03, d + 0.02), disposables), metalMat)
	vitrineBase.position.set(0, tableH + 0.015, 0)
	g.add(vitrineBase)

	// 3. Velvet Display Bed
	const velvetBed = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(w - 0.06, 0.02, d - 0.06), disposables), velvetMat)
	velvetBed.position.set(0, tableH + 0.04, 0)
	g.add(velvetBed)

	// 4. Archival Dedication Parchment Letter
	const letterMat = mkMat({ color: 0xf8f1e2, roughness: 0.85 }, disposables)
	const letter = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.38, 0.005, 0.28), disposables), letterMat)
	letter.position.set(0, tableH + 0.055, 0)
	letter.rotation.y = 0.05
	g.add(letter)

	// 5. Enclosed Glass Vitrine Enclosure
	// Slanted showcase: Front height = 0.10m, Rear height = 0.22m
	const frontH = 0.10
	const rearH = 0.22
	const caseY = tableH + 0.03

	// Front Glass Wall
	const frontGlass = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(w - 0.06, frontH, 0.006), disposables), glassMat)
	frontGlass.position.set(0, caseY + frontH / 2, d / 2 - 0.04)
	g.add(frontGlass)

	// Rear Glass Wall
	const rearGlass = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(w - 0.06, rearH, 0.006), disposables), glassMat)
	rearGlass.position.set(0, caseY + rearH / 2, -d / 2 + 0.04)
	g.add(rearGlass)

	// Left & Right Trapezoidal Glass Walls
	// Built using Shape to perfectly bridge frontH to rearH
	const sideShape = new THREE.Shape()
	const halfD = d / 2 - 0.04
	sideShape.moveTo(-halfD, 0)
	sideShape.lineTo(halfD, 0)
	sideShape.lineTo(halfD, frontH)
	sideShape.lineTo(-halfD, rearH)
	sideShape.closePath()

	const sideGlassGeo = mkGeo(new THREE.ExtrudeGeometry(sideShape, { depth: 0.006, bevelEnabled: false }), disposables)
	
	const leftSideGlass = new THREE.Mesh(sideGlassGeo, glassMat)
	leftSideGlass.rotation.y = Math.PI / 2
	leftSideGlass.position.set(-w / 2 + 0.037, caseY, 0)
	g.add(leftSideGlass)

	const rightSideGlass = new THREE.Mesh(sideGlassGeo, glassMat)
	rightSideGlass.rotation.y = Math.PI / 2
	rightSideGlass.position.set(w / 2 - 0.043, caseY, 0)
	g.add(rightSideGlass)

	// Slanted Top Glass Lid (Resting flush across front and rear glass top edges)
	const slantHypot = Math.sqrt(Math.pow(d - 0.08, 2) + Math.pow(rearH - frontH, 2))
	const slantAngle = Math.atan2(rearH - frontH, d - 0.08)
	const topGlass = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(w - 0.04, 0.008, slantHypot + 0.02), disposables), glassMat)
	topGlass.position.set(0, caseY + (frontH + rearH) / 2, 0)
	topGlass.rotation.x = slantAngle
	g.add(topGlass)

	// Brass Ridge Trim along top back hinge
	const ridgeTrim = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.008, 0.008, w - 0.02, 16), disposables), metalMat)
	ridgeTrim.rotation.z = Math.PI / 2
	ridgeTrim.position.set(0, caseY + rearH, -d / 2 + 0.04)
	g.add(ridgeTrim)

	// Brass Edge Trim along front lip
	const frontLipTrim = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(w - 0.02, 0.012, 0.012), disposables), metalMat)
	frontLipTrim.position.set(0, caseY + frontH, d / 2 - 0.04)
	g.add(frontLipTrim)

	if (group) group.add(g)

	if (Array.isArray(obstacles)) {
		obstacles.push({
			type: 'box',
			x, y: 0, z,
			w: w * scale,
			d: d * scale,
		})
	}
	return g
}

export function buildMarquinaPedestal({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'nero', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const marbleMat = variant === 'calacatta' ? mats.calacattaMarble : mats.neroMarble
	const metalMat = mats.brass
	
	// Polished Cast Bronze Sculpture Material (Warm golden bronze with rich highlights)
	const bronzeSculptureMat = mkMat({
		color: 0xc88a4b,
		roughness: 0.22,
		metalness: 0.88,
		emissive: 0x221408,
	}, disposables)

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	const size = 0.40
	const height = 1.10

	// Stepped Base Plinth (0.46m square x 0.08m)
	const basePlinth = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(size + 0.06, 0.08, size + 0.06), disposables), marbleMat)
	basePlinth.position.y = 0.04
	g.add(basePlinth)

	// Bottom Brass Accent Collar
	const brassBase = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(size + 0.02, 0.02, size + 0.02), disposables), metalMat)
	brassBase.position.y = 0.09
	g.add(brassBase)

	// Monolithic Marble Shaft (Height 0.90m)
	const shaft = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(size, 0.90, size), disposables), marbleMat)
	shaft.position.y = 0.10 + 0.45
	g.add(shaft)

	// Top Brass Collar
	const brassTop = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(size + 0.02, 0.02, size + 0.02), disposables), metalMat)
	brassTop.position.y = 1.01
	g.add(brassTop)

	// Top Beveled Capital Cap
	const cap = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(size + 0.04, 0.05, size + 0.04), disposables), marbleMat)
	cap.position.y = 1.045
	g.add(cap)

	// Museum Sculpture: Polished Abstract Bronze Ribbon Form (TorusKnot)
	const sculptureGeo = mkGeo(new THREE.TorusKnotGeometry(0.12, 0.038, 64, 16, 2, 3), disposables)
	const sculpture = new THREE.Mesh(sculptureGeo, bronzeSculptureMat)
	sculpture.position.y = 1.25
	sculpture.rotation.x = 0.35
	g.add(sculpture)

	if (group) group.add(g)

	if (Array.isArray(obstacles)) {
		obstacles.push({
			type: 'box',
			x, y: 0, z,
			w: (size + 0.06) * scale,
			d: (size + 0.06) * scale,
		})
	}
	return g
}
