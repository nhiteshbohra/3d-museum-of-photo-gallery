/**
 * Our Museum 3D — Priority 1 Botanical & Plant Artifacts
 * P1: Ficus Lyrata in Fluted Ceramic Pot
 * P2: Boxwood Topiary Sphere Pair
 */
import * as THREE from 'three'
import { pushDisp, mkGeo, mkMat, getLuxuryMats } from '../decorations.js'

export function buildFicusLyrata({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'white-ceramic', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const potMat = variant === 'terracotta'
		? mkMat({ color: 0xb55a30, roughness: 0.8 }, disposables)
		: variant === 'black-fluted'
			? mats.neroMarble
			: mkMat({ color: 0xf5f3ee, roughness: 0.35, metalness: 0.05 }, disposables) // Fluted White Glazed Ceramic
	const rimMat = mats.brass
	const soilMat = mkMat({ color: 0x1f1915, roughness: 0.95 }, disposables)
	const leafMat = mkMat({ color: 0x1c4424, roughness: 0.38, side: THREE.DoubleSide }, disposables)

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	const potRadiusTop = 0.28
	const potRadiusBottom = 0.20
	const potHeight = 0.52

	// 1. Spun Brass Base Saucer / Plinth
	const baseGeo = mkGeo(new THREE.CylinderGeometry(potRadiusBottom + 0.02, potRadiusBottom + 0.03, 0.03, 32), disposables)
	const baseMesh = new THREE.Mesh(baseGeo, rimMat)
	baseMesh.position.y = 0.015
	g.add(baseMesh)

	// 2. Fluted Ceramic Planter Vessel
	const potGeo = mkGeo(new THREE.CylinderGeometry(potRadiusTop, potRadiusBottom, potHeight, 32), disposables)
	const potMesh = new THREE.Mesh(potGeo, potMat)
	potMesh.position.y = 0.03 + potHeight / 2
	g.add(potMesh)

	// Upper Brass Bullnose Lip Rim
	const rimGeo = mkGeo(new THREE.TorusGeometry(potRadiusTop, 0.016, 16, 32), disposables)
	const rimMesh = new THREE.Mesh(rimGeo, rimMat)
	rimMesh.rotation.x = Math.PI / 2
	rimMesh.position.y = 0.03 + potHeight
	g.add(rimMesh)

	// Soil Bed
	const soilGeo = mkGeo(new THREE.CylinderGeometry(potRadiusTop - 0.015, potRadiusTop - 0.015, 0.02, 32), disposables)
	const soilMesh = new THREE.Mesh(soilGeo, soilMat)
	soilMesh.position.y = 0.03 + potHeight - 0.02
	g.add(soilMesh)

	// 3. Central Gnarled Woody Trunk with Split Branches
	const trunkGroup = new THREE.Group()
	trunkGroup.position.set(0, 0.03 + potHeight - 0.02, 0)

	const mainStemGeo = mkGeo(new THREE.CylinderGeometry(0.026, 0.042, 0.95, 12), disposables)
	const mainStem = new THREE.Mesh(mainStemGeo, mats.walnut)
	mainStem.position.y = 0.47
	trunkGroup.add(mainStem)

	// Secondary branch fork
	const forkStemGeo = mkGeo(new THREE.CylinderGeometry(0.018, 0.024, 0.65, 10), disposables)
	const forkStem = new THREE.Mesh(forkStemGeo, mats.walnut)
	forkStem.position.set(0.06, 0.90, 0.04)
	forkStem.rotation.z = -0.22
	forkStem.rotation.x = 0.15
	trunkGroup.add(forkStem)

	// 4. Broad Architectural Fiddle Leaves (24 gracefully angled planar leaves)
	const leafCount = 28
	for (let i = 0; i < leafCount; i++) {
		const angle = (i / leafCount) * Math.PI * 2 * 3.4 // spiral distribution
		const heightRatio = i / leafCount
		const ly = 0.40 + heightRatio * 1.25
		const rad = 0.16 + (1 - heightRatio * 0.4) * 0.22

		// Leaf blade geometry (fiddle shaped plane)
		const leafGeo = mkGeo(new THREE.PlaneGeometry(0.22, 0.34), disposables)
		const leaf = new THREE.Mesh(leafGeo, leafMat)
		leaf.position.set(Math.cos(angle) * rad, ly, Math.sin(angle) * rad)
		leaf.rotation.x = 0.42 + (i % 3) * 0.15
		leaf.rotation.y = angle + Math.PI / 2
		leaf.rotation.z = (i % 2 === 0 ? 0.12 : -0.12)
		trunkGroup.add(leaf)
	}

	g.add(trunkGroup)

	if (group) group.add(g)

	if (Array.isArray(obstacles)) {
		obstacles.push({
			type: 'cylinder',
			x, z,
			radius: potRadiusTop * scale,
		})
	}
	return g
}

export function buildBoxwoodTopiaryPair({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'bronze', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const planterMat = variant === 'lead'
		? mats.castIron
		: mats.darkBronze
	const foliageMat = mkMat({
		color: 0x1e4922,
		roughness: 0.70,
		metalness: 0.04,
	}, disposables)
	const foliageAccentMat = mkMat({
		color: 0x2a5e2f,
		roughness: 0.65,
		metalness: 0.04,
	}, disposables)
	const brass = mats.brass

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	// Pair of Symmetrical Boxwood Urns (Placed side-by-side with 0.84m spacing)
	const pairOffsets = [-0.42, 0.42]

	pairOffsets.forEach((px) => {
		const topiary = new THREE.Group()
		topiary.position.set(px, 0, 0)

		// 1. Classical French Paneled Versailles Planter Box (0.42m square x 0.46m height)
		// Baseboard Plinth
		const basePlinth = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.44, 0.05, 0.44), disposables), planterMat)
		basePlinth.position.y = 0.025
		topiary.add(basePlinth)

		// Main Box Body
		const urnBody = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.40, 0.38, 0.40), disposables), planterMat)
		urnBody.position.y = 0.05 + 0.19
		topiary.add(urnBody)

		// 4 Recessed Field Panels with Brass Trim
		for (let side = 0; side < 4; side++) {
			const panelTrim = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.28, 0.28, 0.01), disposables), brass)
			panelTrim.position.y = 0.24
			panelTrim.rotation.y = (side * Math.PI) / 2
			panelTrim.translateZ(0.201)
			topiary.add(panelTrim)
		}

		// Top Moulding Rim
		const urnRim = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.43, 0.035, 0.43), disposables), planterMat)
		urnRim.position.y = 0.44
		topiary.add(urnRim)

		// 4 Corner Acorn / Ball Finials
		const finialOffsets = [
			[-0.19, -0.19], [0.19, -0.19],
			[-0.19, 0.19], [0.19, 0.19]
		]
		finialOffsets.forEach(([fx, fz]) => {
			const finial = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.022, 12, 12), disposables), brass)
			finial.position.set(fx, 0.47, fz)
			topiary.add(finial)
		})

		// Soil Bed
		const soilGeo = mkGeo(new THREE.BoxGeometry(0.36, 0.02, 0.36), disposables)
		const soil = new THREE.Mesh(soilGeo, mkMat({ color: 0x1f1915, roughness: 0.95 }, disposables))
		soil.position.y = 0.44
		topiary.add(soil)

		// Central Sturdy Woody Stem
		const stem = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.024, 0.028, 0.26, 16), disposables), mats.walnut)
		stem.position.y = 0.57
		topiary.add(stem)

		// 2. Clipped Boxwood Sphere with organic micro-faceted leaf texture
		const sphereCenterY = 0.88
		const sphereGeo = mkGeo(new THREE.IcosahedronGeometry(0.27, 4), disposables)
		const pos = sphereGeo.attributes.position
		const v = new THREE.Vector3()
		for (let i = 0; i < pos.count; i++) {
			v.fromBufferAttribute(pos, i)
			const noise = Math.sin(v.x * 28) * Math.cos(v.y * 28) * Math.sin(v.z * 28) * 0.014
			v.addScaledVector(v.clone().normalize(), noise)
			pos.setXYZ(i, v.x, v.y, v.z)
		}
		sphereGeo.computeVertexNormals()

		const coreSphere = new THREE.Mesh(sphereGeo, foliageMat)
		coreSphere.position.y = sphereCenterY
		topiary.add(coreSphere)

		g.add(topiary)
	})

	if (group) group.add(g)

	if (Array.isArray(obstacles)) {
		obstacles.push({
			type: 'box',
			x, y: 0, z,
			w: 1.25 * scale,
			d: 0.50 * scale,
		})
	}
	return g
}
