/**
 * Our Museum 3D — Priority 1 Wall Decor Artifacts
 * W1: Beveled Antique Mirror Panel
 * W2: Gallery Wainscot Panelling (Boiserie)
 */
import * as THREE from 'three'
import { pushDisp, mkGeo, mkMat, getLuxuryMats } from '../decorations.js'

export function buildAntiqueMirror({
	x = 0, y = 2.0, z = 0, rotY = 0, scale = 1.0,
	variant = 'gilded', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const frameMat = variant === 'walnut'
		? mats.walnut
		: variant === 'darkBronze'
			? mats.darkBronze
			: mats.brass

	// Antique Silvered Mercury Mirror Glass Material
	// High specular reflective tint with subtle cool silver radiance
	const mirrorMat = mkMat({
		color: 0xd8e4f0,
		roughness: 0.12,
		metalness: 0.72,
		emissive: 0x182028,
		emissiveIntensity: 0.25,
	}, disposables)

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	const w = 0.90
	const h = 1.80
	const frameThickness = 0.07
	const frameDepth = 0.045

	// Outer Moulded Frame (Extruded or 4 boxed mitred segments)
	const topFrame = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(w, frameThickness, frameDepth), disposables), frameMat)
	topFrame.position.set(0, h / 2 - frameThickness / 2, frameDepth / 2)
	g.add(topFrame)

	const bottomFrame = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(w, frameThickness, frameDepth), disposables), frameMat)
	bottomFrame.position.set(0, -h / 2 + frameThickness / 2, frameDepth / 2)
	g.add(bottomFrame)

	const leftFrame = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(frameThickness, h - frameThickness * 2, frameDepth), disposables), frameMat)
	leftFrame.position.set(-w / 2 + frameThickness / 2, 0, frameDepth / 2)
	g.add(leftFrame)

	const rightFrame = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(frameThickness, h - frameThickness * 2, frameDepth), disposables), frameMat)
	rightFrame.position.set(w / 2 - frameThickness / 2, 0, frameDepth / 2)
	g.add(rightFrame)

	// Arched Crown Crest Detail at top
	const crestGeo = mkGeo(new THREE.TorusGeometry(0.18, 0.02, 16, 32, Math.PI), disposables)
	const crest = new THREE.Mesh(crestGeo, frameMat)
	crest.position.set(0, h / 2 - 0.01, frameDepth / 2 + 0.01)
	g.add(crest)

	// Beveled Mirror Glass Pane (Double-sided with slight thickness)
	const innerW = w - frameThickness * 2
	const innerH = h - frameThickness * 2
	const mirrorPaneGeo = mkGeo(new THREE.BoxGeometry(innerW, innerH, 0.008), disposables)
	const mirrorPane = new THREE.Mesh(mirrorPaneGeo, mirrorMat)
	mirrorPane.position.set(0, 0, frameDepth * 0.4)
	g.add(mirrorPane)

	// Inner Gilded Bevel Lip
	const bevelGeo = mkGeo(new THREE.BoxGeometry(innerW + 0.02, innerH + 0.02, 0.01), disposables)
	const bevelLip = new THREE.Mesh(bevelGeo, mats.brass)
	bevelLip.position.set(0, 0, frameDepth * 0.25)
	g.add(bevelLip)

	if (group) group.add(g)
	return g
}

export function buildWainscotPanelling({
	x = 0, y = 0, z = 0, rotY = 0, scale = 1.0,
	variant = 'ivory', group, disposables = [], obstacles = []
} = {}) {
	const mats = getLuxuryMats(disposables)
	const woodMat = variant === 'walnut'
		? mats.walnut
		: mkMat({ color: 0xf2ece4, roughness: 0.55, metalness: 0.04 }, disposables) // Museum Ivory Boiserie
	const trimMat = mats.brass

	const g = new THREE.Group()
	g.position.set(x, y, z)
	g.rotation.y = rotY
	g.scale.setScalar(scale)

	const width = 2.40
	const height = 1.00
	const depth = 0.035

	// Back Base Panel Flat Slab
	const backGeo = mkGeo(new THREE.BoxGeometry(width, height, depth), disposables)
	const backPanel = new THREE.Mesh(backGeo, woodMat)
	backPanel.position.set(0, height / 2, depth / 2)
	g.add(backPanel)

	// Bottom Baseboard Plinth (Height 0.15m x depth 0.05m)
	const baseboard = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(width, 0.15, 0.05), disposables), woodMat)
	baseboard.position.set(0, 0.075, 0.025)
	g.add(baseboard)

	// Bottom Brass Accent Strip
	const brassStrip = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(width, 0.012, 0.052), disposables), trimMat)
	brassStrip.position.set(0, 0.15, 0.026)
	g.add(brassStrip)

	// Top Dado Rail Chair Rail (Height 0.08m with architectural profile)
	const dadoRail = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(width, 0.08, 0.055), disposables), woodMat)
	dadoRail.position.set(0, height - 0.04, 0.027)
	g.add(dadoRail)

	// 2 Recessed Boiserie Picture Frames
	const panelW = (width - 0.30) / 2
	const panelH = height - 0.32
	const panelOffsets = [-width / 4 + 0.02, width / 4 - 0.02]

	panelOffsets.forEach((px) => {
		// Raised Bolection Moulding Rim
		const rimThickness = 0.04
		const rimGeo = mkGeo(new THREE.BoxGeometry(panelW, panelH, 0.018), disposables)
		const rim = new THREE.Mesh(rimGeo, woodMat)
		rim.position.set(px, 0.15 + panelH / 2 + 0.01, depth + 0.009)
		g.add(rim)

		// Recessed Field Panel
		const fieldGeo = mkGeo(new THREE.BoxGeometry(panelW - rimThickness * 2, panelH - rimThickness * 2, 0.012), disposables)
		const field = new THREE.Mesh(fieldGeo, woodMat)
		field.position.set(px, 0.15 + panelH / 2 + 0.01, depth + 0.015)
		g.add(field)

		// Subtle gilded bead interior line
		const beadGeo = mkGeo(new THREE.BoxGeometry(panelW - rimThickness * 2, 0.006, 0.02), disposables)
		const bead = new THREE.Mesh(beadGeo, trimMat)
		bead.position.set(px, 0.15 + panelH / 2 + 0.01, depth + 0.020)
		g.add(bead)
	})

	if (group) group.add(g)
	return g
}
