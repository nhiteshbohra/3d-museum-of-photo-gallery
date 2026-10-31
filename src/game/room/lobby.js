import * as THREE from 'three'
import { clamp, roundTo } from '../../misc/helper.js'
import lobbyPhotoUrl from '../../assets/lobbyphoto.png'
import { getArtworkSizes } from '../../config/artworkSizes.js'
import {
	createPlushCushionGeometry,
	addWeltPiping,
	addTuftButtons,
	createLuxuryArmchair,
	decorateLobbyGrandRotunda,
} from './decorations.js'

export function createRealisticGalleryPlant({
	x = 0,
	y = 0,
	z = 0,
	targetGroup = null,
	disposables = [],
	obstacles = [],
	name = 'gallery-plant',
} = {}) {
	const plant = new THREE.Group()
	plant.name = name
	plant.position.set(x, y, z)
	if (targetGroup) targetGroup.add(plant)

	// 1. Architectural Fluted Ceramic Planter
	const potTopR = 0.32
	const potBotR = 0.24
	const potH = 0.58
	const potGeo = new THREE.CylinderGeometry(potTopR, potBotR, potH, 32, 1)
	const potMat = new THREE.MeshStandardMaterial({
		color: 0xf5f3ee, // Parisian matte off-white stoneware
		roughness: 0.38,
		metalness: 0.05,
	})
	const pot = new THREE.Mesh(potGeo, potMat)
	pot.position.set(0, potH / 2, 0)
	plant.add(pot)

	const lipGeo = new THREE.CylinderGeometry(potTopR * 1.04, potTopR, 0.04, 32)
	const lip = new THREE.Mesh(lipGeo, potMat)
	lip.position.set(0, potH - 0.02, 0)
	plant.add(lip)

	const baseRingGeo = new THREE.CylinderGeometry(potBotR * 1.05, potBotR * 1.05, 0.035, 32)
	const brassMat = new THREE.MeshStandardMaterial({
		color: 0xd4af37,
		metalness: 0.88,
		roughness: 0.22,
	})
	const baseRing = new THREE.Mesh(baseRingGeo, brassMat)
	baseRing.position.set(0, 0.018, 0)
	plant.add(baseRing)

	// 2. Rich Dark Potting Soil
	const soilGeo = new THREE.CylinderGeometry(potTopR * 0.94, potTopR * 0.94, 0.05, 24)
	const soilMat = new THREE.MeshStandardMaterial({ color: 0x181410, roughness: 0.96 })
	const soil = new THREE.Mesh(soilGeo, soilMat)
	soil.position.set(0, potH - 0.02, 0)
	plant.add(soil)

	// 3. Multi-Stem Branching Woody Stems
	const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a3726, roughness: 0.88 })
	const stemConfigs = [
		{ h: 0.85, leanX: 0.08, leanZ: -0.06 },
		{ h: 1.15, leanX: -0.09, leanZ: 0.07 },
		{ h: 1.35, leanX: 0.05, leanZ: 0.09 },
	]
	for (const s of stemConfigs) {
		const stemGeo = new THREE.CylinderGeometry(0.016, 0.028, s.h, 12)
		const stem = new THREE.Mesh(stemGeo, stemMat)
		stem.position.set(s.leanX * 0.5, potH + s.h / 2 - 0.03, s.leanZ * 0.5)
		stem.rotation.z = -s.leanX * 0.4
		stem.rotation.x = s.leanZ * 0.4
		plant.add(stem)
		disposables.push(stemGeo)
	}

	// 4. Sculpted 3D Broad Tropical Leaves (Curved Waxy Foliage)
	const leafL = 0.52
	const leafW = 0.24
	const leafGeo = new THREE.PlaneGeometry(leafL, leafW, 8, 4)
	const pos = leafGeo.attributes.position
	for (let i = 0; i < pos.count; i += 1) {
		const lx = pos.getX(i)
		const ly = pos.getY(i)
		const u = (lx + leafL / 2) / leafL
		const v = ly / (leafW / 2)

		const arch = Math.sin(u * Math.PI) * 0.07 - Math.pow(u, 1.8) * 0.12
		const fold = Math.abs(v) * 0.025
		pos.setZ(i, arch + fold)
		const taper = Math.sin(Math.pow(u, 0.7) * Math.PI)
		pos.setY(i, ly * Math.max(0.18, taper))
	}
	pos.needsUpdate = true
	leafGeo.computeVertexNormals()
	leafGeo.translate(leafL / 2, 0, 0)

	const leafMat = new THREE.MeshStandardMaterial({
		color: 0x1b4a2c,
		roughness: 0.28,
		metalness: 0.04,
		side: THREE.DoubleSide,
	})

	const leafGroup = new THREE.Group()
	leafGroup.position.set(0, potH, 0)
	plant.add(leafGroup)

	const totalLeaves = 20
	for (let i = 0; i < totalLeaves; i += 1) {
		const leafMesh = new THREE.Mesh(leafGeo, leafMat)
		const fraction = i / totalLeaves
		const stemHeight = 0.25 + fraction * 1.05
		const azimuth = fraction * Math.PI * 4.6 + (i % 3) * 0.4
		const radialDist = 0.04 + fraction * 0.08
		const pitch = -0.35 - Math.sin(fraction * Math.PI) * 0.45

		leafMesh.position.set(
			Math.cos(azimuth) * radialDist,
			stemHeight,
			Math.sin(azimuth) * radialDist
		)
		leafMesh.rotation.y = azimuth
		leafMesh.rotation.z = pitch
		leafMesh.rotation.x = ((i % 4) - 2) * 0.08
		const scale = 0.75 + fraction * 0.45
		leafMesh.scale.set(scale, scale, scale)
		leafGroup.add(leafMesh)
	}

	disposables.push(potGeo, potMat, lipGeo, baseRingGeo, brassMat, soilGeo, soilMat, stemMat, leafGeo, leafMat)
	if (obstacles) obstacles.push({ type: 'cylinder', x, z, y, radius: 0.38 })
	return plant
}

export function createRealisticGalleryBench({
	x = 0,
	y = 0,
	z = 0,
	rotationY = 0,
	targetGroup = null,
	disposables = [],
	obstacles = [],
	hasBenchTex = false,
	benchWoodMap = null,
	benchWoodBump = null,
	name = 'gallery-bench',
} = {}) {
	const b = new THREE.Group()
	b.name = name
	b.position.set(x, y, z)
	b.rotation.y = rotationY
	if (targetGroup) targetGroup.add(b)

	const plinthW = 2.4
	const plinthD = 0.65
	const plinthH = 0.06
	const seatBaseY = 0.36

	// 1. Solid American Walnut Plinth Base with Beveled Edge
	const plinthGeo = new THREE.BoxGeometry(plinthW, plinthH, plinthD)
	const plinthMat = new THREE.MeshStandardMaterial(
		hasBenchTex && benchWoodMap
			? { color: 0x221a14, map: benchWoodMap, bumpMap: benchWoodBump, bumpScale: 0.05, roughness: 0.65 }
			: { color: 0x221a14, roughness: 0.65 }
	)
	const plinth = new THREE.Mesh(plinthGeo, plinthMat)
	plinth.position.set(0, seatBaseY, 0)
	b.add(plinth)
	disposables.push(plinthGeo, plinthMat)

	// Inset Brushed Brass Accent Border Trim
	const brassMat = new THREE.MeshStandardMaterial({
		color: 0xd4af37,
		metalness: 0.88,
		roughness: 0.22,
	})
	disposables.push(brassMat)
	const trimGeo = new THREE.BoxGeometry(plinthW + 0.012, 0.014, plinthD + 0.012)
	const trim = new THREE.Mesh(trimGeo, brassMat)
	trim.position.set(0, seatBaseY + plinthH / 2 + 0.007, 0)
	b.add(trim)
	disposables.push(trimGeo)

	// 2. Ultra-Realistic Sculpted Plush Cognac Leather Cushions (3 segments)
	const segmentCount = 3
	const gap = 0.02
	const totalGaps = (segmentCount - 1) * gap
	const segW = (plinthW - 0.08 - totalGaps) / segmentCount
	const segD = plinthD - 0.04
	const segH = 0.15

	const tufts = [
		[0, -segD * 0.24],
		[0, segD * 0.24],
	]

	const cushionGeo = createPlushCushionGeometry({
		width: segW,
		height: segH,
		depth: segD,
		crown: 0.042,
		swell: 0.020,
		tufts,
		disposables,
	})

	const leatherMat = new THREE.MeshStandardMaterial({
		color: 0x824924, // Warm cognac saddle leather
		roughness: 0.38,
		metalness: 0.08,
	})
	disposables.push(leatherMat)

	for (let i = 0; i < segmentCount; i += 1) {
		const segX = -plinthW / 2 + 0.04 + segW / 2 + i * (segW + gap)
		const cushion = new THREE.Mesh(cushionGeo, leatherMat)
		cushion.position.set(segX, seatBaseY + plinthH / 2 + segH / 2, 0)
		b.add(cushion)

		// French welt piping cord around each cushion
		addWeltPiping(b, segW, segD, seatBaseY + plinthH / 2 + segH * 0.82, leatherMat, disposables)

		// Sunken upholstery tufting buttons with circular collars
		addTuftButtons(
			b,
			tufts.map(([tx, tz]) => [segX + tx, tz]),
			seatBaseY + plinthH / 2 + segH + 0.012,
			brassMat,
			disposables
		)
	}

	// 3. Turned Slender Tapered Cylindrical Brushed Brass Legs + Sabots
	const legH = seatBaseY - plinthH / 2
	const legGeo = new THREE.CylinderGeometry(0.022, 0.015, legH, 18)
	const footGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.016, 18)
	const footMat = new THREE.MeshStandardMaterial({ color: 0x161513, roughness: 0.7 })
	disposables.push(legGeo, footGeo, footMat)

	const lx = plinthW / 2 - 0.16
	const lz = plinthD / 2 - 0.14
	const legCoords = [
		[-lx, -lz],
		[lx, -lz],
		[-lx, lz],
		[lx, lz],
	]
	for (const [cx, cz] of legCoords) {
		const leg = new THREE.Mesh(legGeo, brassMat)
		leg.position.set(cx, legH / 2, cz)
		b.add(leg)

		const foot = new THREE.Mesh(footGeo, footMat)
		foot.position.set(cx, 0.008, cz)
		b.add(foot)
	}

	const stretchGeo = new THREE.CylinderGeometry(0.009, 0.009, lz * 2, 12)
	stretchGeo.rotateX(Math.PI / 2)
	const bar1 = new THREE.Mesh(stretchGeo, brassMat)
	bar1.position.set(-lx, legH * 0.42, 0)
	b.add(bar1)
	const bar2 = new THREE.Mesh(stretchGeo, brassMat)
	bar2.position.set(lx, legH * 0.42, 0)
	b.add(bar2)
	disposables.push(stretchGeo)

	if (obstacles) obstacles.push({ type: 'box', x, z, y, w: plinthW * 1.05, d: plinthD * 1.15 })
	return b
}

export function createLobbyMasterpieceTexture(disposables) {
	if (typeof document === 'undefined') return null
	const canvas = document.createElement('canvas')
	canvas.width = 2400
	canvas.height = 1140
	const ctx = canvas.getContext('2d')
	if (!ctx) return null

	// 1. Sky & Twilight Gradient
	const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.70)
	skyGrad.addColorStop(0, '#060913')
	skyGrad.addColorStop(0.35, '#0e1629')
	skyGrad.addColorStop(0.70, '#1c2844')
	skyGrad.addColorStop(1, '#3b2f44')
	ctx.fillStyle = skyGrad
	ctx.fillRect(0, 0, canvas.width, canvas.height)

	// 2. Twinkling Night Stars
	ctx.fillStyle = '#ffffff'
	for (let i = 0; i < 220; i++) {
		const sx = (Math.sin(i * 1237.9) * 0.5 + 0.5) * canvas.width
		const sy = (Math.cos(i * 449.3) * 0.5 + 0.5) * canvas.height * 0.58
		const size = 1.2 + (i % 4) * 0.9
		ctx.globalAlpha = 0.35 + (i % 5) * 0.16
		ctx.fillRect(sx, sy, size, size)
	}
	ctx.globalAlpha = 1.0

	// 3. Glowing Celestial Full Moon
	const moonX = canvas.width * 0.78
	const moonY = canvas.height * 0.28
	const moonGlow = ctx.createRadialGradient(moonX, moonY, 15, moonX, moonY, 260)
	moonGlow.addColorStop(0, '#fff6db')
	moonGlow.addColorStop(0.25, 'rgba(255, 235, 175, 0.45)')
	moonGlow.addColorStop(0.60, 'rgba(255, 220, 140, 0.12)')
	moonGlow.addColorStop(1, 'rgba(255, 220, 140, 0)')
	ctx.fillStyle = moonGlow
	ctx.fillRect(0, 0, canvas.width, canvas.height)

	ctx.fillStyle = '#fffdf7'
	ctx.beginPath()
	ctx.arc(moonX, moonY, 36, 0, Math.PI * 2)
	ctx.fill()

	// 4. Distant Alpine Mountain Peaks
	ctx.fillStyle = '#101728'
	ctx.beginPath()
	ctx.moveTo(0, canvas.height * 0.68)
	ctx.lineTo(canvas.width * 0.15, canvas.height * 0.42)
	ctx.lineTo(canvas.width * 0.32, canvas.height * 0.58)
	ctx.lineTo(canvas.width * 0.52, canvas.height * 0.36)
	ctx.lineTo(canvas.width * 0.72, canvas.height * 0.54)
	ctx.lineTo(canvas.width * 0.88, canvas.height * 0.40)
	ctx.lineTo(canvas.width, canvas.height * 0.62)
	ctx.lineTo(canvas.width, canvas.height)
	ctx.lineTo(0, canvas.height)
	ctx.closePath()
	ctx.fill()

	// Snow-capped highlights
	ctx.strokeStyle = 'rgba(235, 245, 255, 0.55)'
	ctx.lineWidth = 3
	ctx.beginPath()
	ctx.moveTo(canvas.width * 0.12, canvas.height * 0.45)
	ctx.lineTo(canvas.width * 0.15, canvas.height * 0.42)
	ctx.lineTo(canvas.width * 0.19, canvas.height * 0.47)
	ctx.moveTo(canvas.width * 0.48, canvas.height * 0.40)
	ctx.lineTo(canvas.width * 0.52, canvas.height * 0.36)
	ctx.lineTo(canvas.width * 0.57, canvas.height * 0.43)
	ctx.moveTo(canvas.width * 0.85, canvas.height * 0.43)
	ctx.lineTo(canvas.width * 0.88, canvas.height * 0.40)
	ctx.lineTo(canvas.width * 0.92, canvas.height * 0.46)
	ctx.stroke()

	// 5. Closer Mountain Ridge
	ctx.fillStyle = '#080c14'
	ctx.beginPath()
	ctx.moveTo(0, canvas.height * 0.74)
	ctx.lineTo(canvas.width * 0.24, canvas.height * 0.56)
	ctx.lineTo(canvas.width * 0.46, canvas.height * 0.66)
	ctx.lineTo(canvas.width * 0.68, canvas.height * 0.52)
	ctx.lineTo(canvas.width, canvas.height * 0.70)
	ctx.lineTo(canvas.width, canvas.height)
	ctx.lineTo(0, canvas.height)
	ctx.closePath()
	ctx.fill()

	// 6. Reflective Lake Water
	const waterGrad = ctx.createLinearGradient(0, canvas.height * 0.68, 0, canvas.height)
	waterGrad.addColorStop(0, '#0c1626')
	waterGrad.addColorStop(0.5, '#070b13')
	waterGrad.addColorStop(1, '#030508')
	ctx.fillStyle = waterGrad
	ctx.fillRect(0, canvas.height * 0.68, canvas.width, canvas.height * 0.32)

	// Shimmering Moon Reflections on Water
	ctx.strokeStyle = 'rgba(255, 235, 175, 0.32)'
	ctx.lineWidth = 2
	for (let r = 0; r < 24; r++) {
		const ry = canvas.height * 0.71 + r * 14
		const rw = 30 + Math.sin(r * 2.8) * 75 + r * 6
		ctx.beginPath()
		ctx.moveTo(moonX - rw, ry)
		ctx.lineTo(moonX + rw, ry)
		ctx.stroke()
	}

	// 7. Classical 24k Gold Museum Filigree Double Border Frame
	ctx.strokeStyle = '#c5a059'
	ctx.lineWidth = 14
	ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52)

	ctx.strokeStyle = 'rgba(255, 215, 0, 0.55)'
	ctx.lineWidth = 3
	ctx.strokeRect(44, 44, canvas.width - 88, canvas.height - 88)

	// Gilded Corner Diamonds
	const drawDiamond = (cx, cy, radius) => {
		ctx.fillStyle = '#ffd700'
		ctx.beginPath()
		ctx.moveTo(cx, cy - radius)
		ctx.lineTo(cx + radius, cy)
		ctx.lineTo(cx, cy + radius)
		ctx.lineTo(cx - radius, cy)
		ctx.closePath()
		ctx.fill()
	}
	drawDiamond(44, 44, 10)
	drawDiamond(canvas.width - 44, 44, 10)
	drawDiamond(44, canvas.height - 44, 10)
	drawDiamond(canvas.width - 44, canvas.height - 44, 10)

	// 8. Classical Serif Typography
	ctx.textAlign = 'center'
	ctx.shadowColor = 'rgba(0, 0, 0, 0.88)'
	ctx.shadowBlur = 18

	ctx.fillStyle = '#d4af37'
	ctx.font = '600 24px "Montserrat", sans-serif'
	ctx.fillText('✦   VIRTUAL  ART  SANCTUARY   ✦', canvas.width / 2, canvas.height * 0.81)

	ctx.fillStyle = '#ffffff'
	ctx.font = 'bold 56px "Cormorant Garamond", Georgia, serif'
	ctx.fillText('OUR MUSEUM • GRAND SANCTUARY', canvas.width / 2, canvas.height * 0.88)

	ctx.fillStyle = 'rgba(255, 235, 190, 0.82)'
	ctx.font = 'italic 26px "Cormorant Garamond", Georgia, serif'
	ctx.fillText('Where Eternal Memories Are Preserved', canvas.width / 2, canvas.height * 0.94)

	ctx.shadowBlur = 0

	const tex = new THREE.CanvasTexture(canvas)
	tex.colorSpace = THREE.SRGBColorSpace
	if (disposables) disposables.push(tex)
	return { texture: tex, dataUrl: canvas.toDataURL('image/png') }
}

export function createGrandLobbyWallSconce({
	x = 0,
	y = 2.4,
	z = 0,
	wallNormalX = 0,
	wallNormalZ = -1,
	group,
	disposables,
} = {}) {
	const sconce = new THREE.Group()
	sconce.name = 'grand-lobby-sconce'
	sconce.position.set(x, y, z)

	const rotY = Math.atan2(wallNormalX, wallNormalZ)
	sconce.rotation.y = rotY
	group.add(sconce)

	const brassMat = new THREE.MeshStandardMaterial({
		color: 0xd4af37,
		metalness: 0.88,
		roughness: 0.22,
	})
	const glassMat = new THREE.MeshStandardMaterial({
		color: 0xfffaf0,
		roughness: 0.12,
		metalness: 0.08,
		transparent: true,
		opacity: 0.86,
		emissive: 0xffeed4,
		emissiveIntensity: 0.65,
	})
	const flameMat = new THREE.MeshStandardMaterial({
		color: 0xffeed6,
		emissive: 0xffd08a,
		emissiveIntensity: 2.4,
		roughness: 0.2,
	})
	const crystalMat = new THREE.MeshStandardMaterial({
		color: 0xf5f8ff,
		roughness: 0.05,
		metalness: 0.2,
		transparent: true,
		opacity: 0.85,
	})
	disposables.push(brassMat, glassMat, flameMat, crystalMat)

	// 1. Architectural Cast Brass Backplate (Escutcheon)
	const plateGeo = new THREE.CylinderGeometry(0.10, 0.11, 0.024, 32)
	plateGeo.rotateX(Math.PI / 2)
	const plate = new THREE.Mesh(plateGeo, brassMat)
	plate.position.set(0, 0, 0.012)
	sconce.add(plate)

	// 2. Sculpted Gooseneck Bracket Arm (Swooping outward and upward)
	const armArcGeo = new THREE.TorusGeometry(0.12, 0.014, 16, 28, Math.PI * 0.75)
	const arm = new THREE.Mesh(armArcGeo, brassMat)
	arm.rotation.y = Math.PI / 2
	arm.rotation.z = -Math.PI * 0.15
	arm.position.set(0, 0.04, 0.10)
	sconce.add(arm)

	const armOutZ = 0.22
	const cupY = 0.12

	// 3. Ornate Stepped Candle Cup & Fluted Gallery
	const cupGeo = new THREE.CylinderGeometry(0.046, 0.034, 0.040, 24)
	const cup = new THREE.Mesh(cupGeo, brassMat)
	cup.position.set(0, cupY, armOutZ)
	sconce.add(cup)

	const collarGeo = new THREE.TorusGeometry(0.048, 0.008, 12, 24)
	collarGeo.rotateX(Math.PI / 2)
	const collar = new THREE.Mesh(collarGeo, brassMat)
	collar.position.set(0, cupY + 0.020, armOutZ)
	sconce.add(collar)

	// 4. Hand-Blown Fluted Frosted Glass Hurricane Chimney
	const chimneyGeo = new THREE.CylinderGeometry(0.055, 0.040, 0.20, 24, 1, true)
	const chimney = new THREE.Mesh(chimneyGeo, glassMat)
	chimney.position.set(0, cupY + 0.12, armOutZ)
	sconce.add(chimney)

	// 5. Luminous Warm Flame Core
	const flameGeo = new THREE.ConeGeometry(0.016, 0.065, 16)
	const flame = new THREE.Mesh(flameGeo, flameMat)
	flame.position.set(0, cupY + 0.08, armOutZ)
	sconce.add(flame)

	// 6. Crystal Teardrop Pendant (Hanging below the bracket)
	const crystalGeo = new THREE.ConeGeometry(0.016, 0.050, 6)
	crystalGeo.rotateX(Math.PI)
	const crystal = new THREE.Mesh(crystalGeo, crystalMat)
	crystal.position.set(0, -0.06, armOutZ * 0.70)
	sconce.add(crystal)

	// 7. Warm Atmospheric Cast PointLight
	const light = new THREE.PointLight(0xffecd0, 1.35, 7.0, 1.8)
	light.position.set(0, cupY + 0.14, armOutZ + 0.05)
	sconce.add(light)

	disposables.push(plateGeo, armArcGeo, cupGeo, collarGeo, chimneyGeo, flameGeo, crystalGeo, light)
	return sconce
}

export function buildLobbyRoom(ctx, lobby) {
	const {
		group,
		markers,
		disposables,
		slots,
		doors,
		doorHitMeshes,
		pickableMeshes,
		obstacles,
		palette,
		textures,
		width,
		length,
		height,
		halfW,
		halfL,
		wallThickness,
		addDoor,
	} = ctx

	// Define platform dimensions at the top for use throughout
	const platformHeight = 1.4
	const platformWidth = 4.0
	const centerWidth = width - 2 * platformWidth

	const categories =
		Array.isArray(lobby?.categories) && lobby.categories.length > 0
			? lobby.categories
			: ['Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5', 'Category 6', 'Category 7', 'Category 8', 'Category 9', 'Category 10']

	const perWall = Math.ceil(categories.length / 2)
	const eastCategories = categories.slice(0, perWall).map((c) => String(c))
	const westCategories = categories.slice(perWall).map((c) => String(c))

	function addLobbyDirectoryMonument({ leftItems, rightItems }) {
		const innerNorthZ = -halfL + wallThickness / 2
		const boardDepth = 0.12
		const monumentW = roundTo(clamp(width * 0.72, 3.2, 5.8), 0.05)
		const monumentH = roundTo(clamp(height * 0.55, 1.4, 2.2), 0.05)
		const legH = 0.65
		const boardCenterY = legH + monumentH / 2 + 0.05
		const boardCenter = new THREE.Vector3(0, boardCenterY, innerNorthZ + 1.25)

		const monumentGroup = new THREE.Group()
		monumentGroup.name = 'lobby-directory-monument'
		monumentGroup.position.copy(boardCenter)
		group.add(monumentGroup)

		const brassMat = new THREE.MeshStandardMaterial({
			color: 0xd4af37,
			roughness: 0.24,
			metalness: 0.88,
		})
		const darkBronzeMat = new THREE.MeshStandardMaterial({
			color: 0x181512,
			roughness: 0.45,
			metalness: 0.35,
		})
		disposables.push(brassMat, darkBronzeMat)

		// 1. Classical Pedestal Stanchions (left and right architectural plinths)
		const pedestalX = monumentW * 0.34
		const pedestalGeo = new THREE.BoxGeometry(0.26, legH, 0.26)
		const plinthBaseGeo = new THREE.BoxGeometry(0.36, 0.06, 0.36)
		const plinthCapGeo = new THREE.BoxGeometry(0.32, 0.04, 0.32)
		disposables.push(pedestalGeo, plinthBaseGeo, plinthCapGeo)

		for (const px of [-pedestalX, pedestalX]) {
			// Dark bronze shaft
			const ped = new THREE.Mesh(pedestalGeo, darkBronzeMat)
			ped.position.set(px, -monumentH / 2 - legH / 2, 0)
			monumentGroup.add(ped)

			// Stepped brass base
			const base = new THREE.Mesh(plinthBaseGeo, brassMat)
			base.position.set(px, -monumentH / 2 - legH + 0.03, 0)
			monumentGroup.add(base)

			// Stepped brass cap collar
			const cap = new THREE.Mesh(plinthCapGeo, brassMat)
			cap.position.set(px, -monumentH / 2 - 0.02, 0)
			monumentGroup.add(cap)
		}

		// 2. Heavy Backing Casing & Gilded Bezel Frame
		const casingGeo = new THREE.BoxGeometry(monumentW, monumentH, boardDepth)
		const casingMat = new THREE.MeshStandardMaterial({ color: 0x12100e, roughness: 0.6, metalness: 0.15 })
		const casing = new THREE.Mesh(casingGeo, casingMat)
		monumentGroup.add(casing)
		disposables.push(casingGeo, casingMat)

		// Polished Brass Architectural Outer Molding
		const bezelGeo = new THREE.BoxGeometry(monumentW + 0.08, monumentH + 0.08, boardDepth * 0.8)
		const bezel = new THREE.Mesh(bezelGeo, brassMat)
		bezel.position.set(0, 0, -0.01)
		monumentGroup.add(bezel)
		disposables.push(bezelGeo)

		// 3. High-Resolution Museum Directory Canvas
		const canvas = document.createElement('canvas')
		canvas.width = 2048
		canvas.height = 1024
		const ctx2 = canvas.getContext('2d')

		if (ctx2) {
			// Rich museum noir lacquer background
			ctx2.fillStyle = '#0c0d12'
			ctx2.fillRect(0, 0, canvas.width, canvas.height)

			// Double 24k gold filigree border
			ctx2.strokeStyle = '#d4af37'
			ctx2.lineWidth = 8
			ctx2.strokeRect(20, 20, canvas.width - 40, canvas.height - 40)
			ctx2.strokeStyle = 'rgba(255, 215, 0, 0.45)'
			ctx2.lineWidth = 2
			ctx2.strokeRect(32, 32, canvas.width - 64, canvas.height - 64)

			// Corner diamond accents
			const drawCornerDiamond = (cx, cy, r) => {
				ctx2.fillStyle = '#ffd700'
				ctx2.beginPath()
				ctx2.moveTo(cx, cy - r)
				ctx2.lineTo(cx + r, cy)
				ctx2.lineTo(cx, cy + r)
				ctx2.lineTo(cx - r, cy)
				ctx2.closePath()
				ctx2.fill()
			}
			drawCornerDiamond(32, 32, 10)
			drawCornerDiamond(canvas.width - 32, 32, 10)
			drawCornerDiamond(32, canvas.height - 32, 10)
			drawCornerDiamond(canvas.width - 32, canvas.height - 32, 10)

			// Header Crest
			ctx2.font = '700 24px "Montserrat", sans-serif'
			ctx2.fillStyle = '#d4af37'
			ctx2.textAlign = 'center'
			ctx2.textBaseline = 'top'
			ctx2.letterSpacing = '6px'
			ctx2.fillText('❖   GRAND EXHIBITION DIRECTORY   ❖', canvas.width / 2, 52)

			// Museum Title
			ctx2.font = '700 86px "Cormorant Garamond", Georgia, serif'
			ctx2.fillStyle = '#fff9e6'
			ctx2.shadowColor = 'rgba(255, 215, 0, 0.85)'
			ctx2.shadowBlur = 16
			ctx2.fillText('OUR MUSEUM', canvas.width / 2, 90)
			ctx2.shadowBlur = 0

			// Subtitle
			ctx2.font = '600 26px "Montserrat", sans-serif'
			ctx2.fillStyle = '#c5a059'
			ctx2.letterSpacing = '4px'
			ctx2.fillText('A SANCTUARY FOR MAYA & ETHAN • PERMANENT COLLECTION', canvas.width / 2, 188)

			// Ornamental Gold Divider Bar
			ctx2.strokeStyle = '#d4af37'
			ctx2.lineWidth = 2
			ctx2.beginPath()
			ctx2.moveTo(canvas.width * 0.15, 230)
			ctx2.lineTo(canvas.width * 0.85, 230)
			ctx2.stroke()
			drawCornerDiamond(canvas.width / 2, 230, 8)

			// Two Distinct Wing Columns (Left: West Wing, Right: East Wing)
			const leftColX = canvas.width * 0.28
			const rightColX = canvas.width * 0.72
			const contentStartY = 270

			// Wing Header Pills
			const drawWingHeader = (cx, label) => {
				const pw = 420
				const ph = 52
				ctx2.fillStyle = '#161822'
				ctx2.strokeStyle = '#d4af37'
				ctx2.lineWidth = 2
				ctx2.beginPath()
				ctx2.roundRect(cx - pw / 2, contentStartY, pw, ph, 26)
				ctx2.fill()
				ctx2.stroke()

				ctx2.font = '700 26px "Montserrat", sans-serif'
				ctx2.fillStyle = '#ffd700'
				ctx2.textAlign = 'center'
				ctx2.textBaseline = 'middle'
				ctx2.letterSpacing = '2px'
				ctx2.fillText(label, cx, contentStartY + ph / 2)
			}

			drawWingHeader(leftColX, '← WEST ROTUNDA WING')
			drawWingHeader(rightColX, 'EAST ROTUNDA WING →')

			// Wing Item Lists
			const drawWingItems = (cx, items, subtitleHints) => {
				const startY = contentStartY + 85
				const rowH = 110
				ctx2.textAlign = 'center'

				items.forEach((item, idx) => {
					const y = startY + idx * rowH
					// Category Title
					ctx2.font = '700 40px "Cormorant Garamond", Georgia, serif'
					ctx2.fillStyle = '#ffffff'
					ctx2.shadowColor = 'rgba(255, 220, 120, 0.6)'
					ctx2.shadowBlur = 8
					ctx2.fillText(`✦  ${item.toUpperCase()}`, cx, y)
					ctx2.shadowBlur = 0

					// Subtitle Hint
					if (subtitleHints[idx]) {
						ctx2.font = '500 20px "Montserrat", sans-serif'
						ctx2.fillStyle = '#9c8e76'
						ctx2.letterSpacing = '2px'
						ctx2.fillText(subtitleHints[idx], cx, y + 36)
					}
				})
			}

			const westHints = ['Impressionism, Romance & Paris Memories', 'Botanical Serenity & Glass Architecture', 'Intimate Promises, Keepsakes & Milestones']
			const eastHints = ['Fireside Warmth, Winter Tales & Hearth', 'Classical Nocturnes, Sonatas & Waltzes', 'Literary Romances, Poetry & Quiet Corners']

			drawWingItems(leftColX, leftItems, westHints)
			drawWingItems(rightColX, rightItems, eastHints)

			// Bottom Footer Banner
			ctx2.font = '600 22px "Montserrat", sans-serif'
			ctx2.fillStyle = '#bda062'
			ctx2.textAlign = 'center'
			ctx2.textBaseline = 'bottom'
			ctx2.letterSpacing = '3px'
			ctx2.fillText('✦  ASCEND EITHER GRAND STAIRCASE TO ENTER SALONS  ✦', canvas.width / 2, canvas.height - 46)
		}

		const tex = new THREE.CanvasTexture(canvas)
		tex.colorSpace = THREE.SRGBColorSpace
		tex.needsUpdate = true

		const faceGeo = new THREE.PlaneGeometry(monumentW * 0.98, monumentH * 0.98)
		const faceMat = new THREE.MeshBasicMaterial({ map: tex })
		const face = new THREE.Mesh(faceGeo, faceMat)
		face.position.set(0, 0, boardDepth / 2 + 0.003)
		monumentGroup.add(face)
		disposables.push(tex, faceGeo, faceMat)

		// 4. Overhead Brass Gallery Picture Light
		const lampBarGeo = new THREE.CylinderGeometry(0.024, 0.024, monumentW * 0.62, 24)
		const lampBar = new THREE.Mesh(lampBarGeo, brassMat)
		lampBar.rotation.z = Math.PI / 2
		lampBar.position.set(0, monumentH / 2 + 0.15, 0.32)
		monumentGroup.add(lampBar)

		for (const lx of [-monumentW * 0.22, monumentW * 0.22]) {
			const armGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.35, 12)
			const arm = new THREE.Mesh(armGeo, brassMat)
			arm.rotation.x = Math.PI / 2.8
			arm.position.set(lx, monumentH / 2 + 0.08, 0.16)
			monumentGroup.add(arm)
			disposables.push(armGeo)
		}
		disposables.push(lampBarGeo)

		// Directional spotlight shining down onto the directory board
		const dirSpot = new THREE.SpotLight(0xfffaea, 4.2, 5.5, Math.PI / 2.8, 0.75, 1.4)
		dirSpot.position.set(0, monumentH / 2 + 0.18, 0.36)
		const dirTarget = new THREE.Object3D()
		dirTarget.position.set(0, 0, 0.02)
		monumentGroup.add(dirTarget)
		dirSpot.target = dirTarget
		monumentGroup.add(dirSpot)
		disposables.push(dirSpot)

		obstacles.push({
			type: 'box',
			x: boardCenter.x,
			z: boardCenter.z + 0.05,
			w: monumentW * 0.95,
			d: 0.9,
		})
	}

	addLobbyDirectoryMonument({
		leftItems: westCategories,
		rightItems: eastCategories,
	})

	const doorW = 1.25
	const doorH = 2.25 * 1.1

	const gapU = 1.1
	const endMarginTotal = 4.0
	const totalSpan = perWall * doorW + (perWall - 1) * gapU
	const span = Math.max(perWall * doorW, Math.min(totalSpan, length - endMarginTotal))
	const actualGap = perWall > 1 ? (span - perWall * doorW) / (perWall - 1) : 0
	const uStart = -span / 2 + doorW / 2

	for (let i = 0; i < perWall; i += 1) {
		const u = uStart + i * (doorW + actualGap)

		const eastCategory = categories[i]
		if (eastCategory) {
			addDoor({
				id: `entry-east-${i}`,
				wall: 'east',
				w: doorW,
				h: doorH,
				y: -0.1,
				u,
				meta: { category: eastCategory, articleTitle: eastCategory, platformHeight },
			})
		}

		const westCategory = categories[i + perWall]
		if (westCategory) {
			addDoor({
				id: `entry-west-${i}`,
				wall: 'west',
				w: doorW,
				h: doorH,
				y: -0.1,
				u,
				meta: { category: westCategory, articleTitle: westCategory, platformHeight },
			})
		}
	}

	function addPlantAt(x, customZ = 0, customY = null, targetGroup = group, name = 'plant-lobby') {
		const halfCenterWidth = centerWidth / 2
		const isOnPlatform = Math.abs(x) > halfCenterWidth
		const plantY = customY !== null ? customY : (isOnPlatform ? platformHeight : 0)

		return createRealisticGalleryPlant({
			x,
			y: plantY,
			z: customZ,
			targetGroup,
			disposables,
			obstacles,
			name,
		})
	}

	{
		const innerSouthZ = halfL - wallThickness / 2
		const benchZ = innerSouthZ - 0.45
		const plantZ = innerSouthZ - 0.40

		const decoSouth = new THREE.Group()
		decoSouth.name = 'deco-south-lobby'
		group.add(decoSouth)

		const benchWoodMap = textures?.benchWoodMap
		const benchWoodBump = textures?.benchWoodBump
		const hasBenchTex = Boolean(benchWoodMap && benchWoodBump)

		function addBenchAt(x) {
			const halfCenterWidth = centerWidth / 2
			const isOnPlatform = Math.abs(x) > halfCenterWidth
			const benchY = isOnPlatform ? platformHeight : 0

			return createRealisticGalleryBench({
				x,
				y: benchY,
				z: benchZ,
				rotationY: Math.PI,
				targetGroup: decoSouth,
				disposables,
				obstacles,
				hasBenchTex,
				benchWoodMap,
				benchWoodBump,
				name: 'bench-south-lobby',
			})
		}

		// Two luxury tufted leather benches positioned symmetrically on the south wall
		addBenchAt(-1.6)
		addBenchAt(1.6)

		const artSizes = getArtworkSizes()
		const lobbyCfg = artSizes.lobbyMasterpiece || {}
		const frameW = typeof lobbyCfg.width === 'number' ? lobbyCfg.width : roundTo(clamp(width * 0.72, 2.4, 5.8), 0.05)
		const frameH = typeof lobbyCfg.height === 'number' ? lobbyCfg.height : roundTo(clamp(height * 0.58, 1.2, 2.0), 0.05)
		const frameDepth = 0.08
		const frameThickness = 0.12
		const frameY = typeof lobbyCfg.y === 'number' ? lobbyCfg.y : height * 0.7

		const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.3, metalness: 0.1 })
		const matteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.9, metalness: 0.0 })
		disposables.push(frameMat, matteMat)

		const frameGroup = new THREE.Group()
		frameGroup.name = 'photo-frame-south'
		frameGroup.position.set(0, frameY, innerSouthZ)
		frameGroup.rotation.y = Math.PI
		decoSouth.add(frameGroup)

		const backPanelGeo = new THREE.BoxGeometry(frameW + frameThickness * 2, frameH + frameThickness * 2, frameDepth)
		const backPanelMat = new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.8, metalness: 0.0 })
		const backPanel = new THREE.Mesh(backPanelGeo, backPanelMat)
		backPanel.position.set(0, 0, 0)
		frameGroup.add(backPanel)
		disposables.push(backPanelGeo, backPanelMat)

		const topBorderGeo = new THREE.BoxGeometry(frameW + frameThickness * 2, frameThickness, frameDepth)
		const topBorder = new THREE.Mesh(topBorderGeo, frameMat)
		topBorder.position.set(0, frameH / 2 + frameThickness / 2, frameDepth / 2 + 0.001)
		frameGroup.add(topBorder)
		disposables.push(topBorderGeo)

		const bottomBorderGeo = new THREE.BoxGeometry(frameW + frameThickness * 2, frameThickness, frameDepth)
		const bottomBorder = new THREE.Mesh(bottomBorderGeo, frameMat)
		bottomBorder.position.set(0, -(frameH / 2 + frameThickness / 2), frameDepth / 2 + 0.001)
		frameGroup.add(bottomBorder)
		disposables.push(bottomBorderGeo)

		const leftBorderGeo = new THREE.BoxGeometry(frameThickness, frameH, frameDepth)
		const leftBorder = new THREE.Mesh(leftBorderGeo, frameMat)
		leftBorder.position.set(-(frameW / 2 + frameThickness / 2), 0, frameDepth / 2 + 0.001)
		frameGroup.add(leftBorder)
		disposables.push(leftBorderGeo)

		const rightBorderGeo = new THREE.BoxGeometry(frameThickness, frameH, frameDepth)
		const rightBorder = new THREE.Mesh(rightBorderGeo, frameMat)
		rightBorder.position.set(frameW / 2 + frameThickness / 2, 0, frameDepth / 2 + 0.001)
		frameGroup.add(rightBorder)
		disposables.push(rightBorderGeo)

		const matteGeo = new THREE.PlaneGeometry(frameW * 0.92, frameH * 0.92)
		const matte = new THREE.Mesh(matteGeo, matteMat)
		matte.position.set(0, 0, frameDepth / 2 + 0.002)
		frameGroup.add(matte)
		disposables.push(matteGeo)

		// High-Resolution Original Grand Sanctuary Masterpiece Artwork (Vector-sharp, zero mirroring)
		const lobbyArt = createLobbyMasterpieceTexture(disposables)
		const photoTexture = lobbyArt ? lobbyArt.texture : new THREE.TextureLoader().load(lobbyPhotoUrl)
		const photoDataUrl = lobbyArt ? lobbyArt.dataUrl : lobbyPhotoUrl
		photoTexture.colorSpace = THREE.SRGBColorSpace

		const fullFrameW = frameW + frameThickness * 2
		const fullFrameH = frameH + frameThickness * 2
		const iw = photoTexture?.image?.width
		const ih = photoTexture?.image?.height
		if (typeof iw === 'number' && typeof ih === 'number' && iw > 0 && ih > 0) {
			const imageAspect = iw / ih
			const frameAspect = fullFrameW / fullFrameH
			if (imageAspect > frameAspect) {
				const s = frameAspect / imageAspect
				photoTexture.repeat.set(s, 1)
				photoTexture.offset.set((1 - s) / 2, 0)
			} else {
				const s = imageAspect / frameAspect
				photoTexture.repeat.set(1, s)
				photoTexture.offset.set(0, (1 - s) / 2)
			}
			photoTexture.needsUpdate = true
		}

		const photoGeo = new THREE.PlaneGeometry(fullFrameW, fullFrameH)
		const photoMat = new THREE.MeshBasicMaterial({
			map: photoTexture,
			side: THREE.FrontSide
		})
		const photo = new THREE.Mesh(photoGeo, photoMat)
		photo.position.set(0, 0, frameDepth / 2 + 0.01)
		photo.userData = {
			pickable: true,
			isPhoto: true,
			pickableType: 'wall-photo',
			photoUrl: photoDataUrl,
			photoTitle: 'Grand Sanctuary Masterpiece'
		}
		pickableMeshes.push(photo)
		frameGroup.add(photo)
		disposables.push(photoGeo, photoMat)
	}

	// Architectural Corner Planter Distribution (Strictly corners only, zero plants in paths or blocking doors)
	{
		const innerNorthZ = -halfL + wallThickness / 2
		const innerSouthZ = halfL - wallThickness / 2
		const innerEastX = halfW - wallThickness / 2
		const innerWestX = -halfW + wallThickness / 2

		// 1. Four Corners of the Main Ground Floor Rotunda
		addPlantAt(-centerWidth / 2 + 0.50, innerSouthZ - 0.55, 0, group, 'plant-corner-sw-ground')
		addPlantAt(centerWidth / 2 - 0.50, innerSouthZ - 0.55, 0, group, 'plant-corner-se-ground')
		addPlantAt(-centerWidth / 2 + 0.50, innerNorthZ + 0.75, 0, group, 'plant-corner-nw-ground')
		addPlantAt(centerWidth / 2 - 0.50, innerNorthZ + 0.75, 0, group, 'plant-corner-ne-ground')

		// 2. Four Corners of the Raised Stage / Elevated Platforms
		addPlantAt(innerWestX + 0.75, innerNorthZ + 0.75, platformHeight, group, 'plant-corner-nw-stage')
		addPlantAt(innerWestX + 0.75, innerSouthZ - 0.75, platformHeight, group, 'plant-corner-sw-stage')
		addPlantAt(innerEastX - 0.75, innerNorthZ + 0.75, platformHeight, group, 'plant-corner-ne-stage')
		addPlantAt(innerEastX - 0.75, innerSouthZ - 0.75, platformHeight, group, 'plant-corner-se-stage')
	}

	// Architectural Grand Museum Wall Sconces (Symmetrically distributed, strictly ZERO overlap)
	{
		const innerNorthZ = -halfL + wallThickness / 2
		const innerSouthZ = halfL - wallThickness / 2
		const innerEastX = halfW - wallThickness / 2
		const innerWestX = -halfW + wallThickness / 2

		// 1. South Wall: Flanking the Grand Sanctuary Masterpiece (Clearance > 1.5m from frame & benches)
		createGrandLobbyWallSconce({
			x: -4.50,
			y: 2.75,
			z: innerSouthZ - 0.02,
			wallNormalX: 0,
			wallNormalZ: -1,
			group,
			disposables,
		})
		createGrandLobbyWallSconce({
			x: 4.50,
			y: 2.75,
			z: innerSouthZ - 0.02,
			wallNormalX: 0,
			wallNormalZ: -1,
			group,
			disposables,
		})

		// 2. North Wall: Flanking the Grand Directory Monument (Clearance > 2.0m from directory stanchions)
		createGrandLobbyWallSconce({
			x: -4.50,
			y: 2.75,
			z: innerNorthZ + 0.02,
			wallNormalX: 0,
			wallNormalZ: 1,
			group,
			disposables,
		})
		createGrandLobbyWallSconce({
			x: 4.50,
			y: 2.75,
			z: innerNorthZ + 0.02,
			wallNormalX: 0,
			wallNormalZ: 1,
			group,
			disposables,
		})

		// 3. East Raised Platform Promenade Wall (Elevated Wooden Walkway, Clearance > 2.2m from all salon doors)
		createGrandLobbyWallSconce({
			x: innerEastX - 0.02,
			y: platformHeight + 2.05,
			z: -5.20,
			wallNormalX: -1,
			wallNormalZ: 0,
			group,
			disposables,
		})
		createGrandLobbyWallSconce({
			x: innerEastX - 0.02,
			y: platformHeight + 2.05,
			z: 5.20,
			wallNormalX: -1,
			wallNormalZ: 0,
			group,
			disposables,
		})

		// 4. West Raised Platform Promenade Wall (Elevated Wooden Walkway, Clearance > 2.2m from all salon doors)
		createGrandLobbyWallSconce({
			x: innerWestX + 0.02,
			y: platformHeight + 2.05,
			z: -5.20,
			wallNormalX: 1,
			wallNormalZ: 0,
			group,
			disposables,
		})
		createGrandLobbyWallSconce({
			x: innerWestX + 0.02,
			y: platformHeight + 2.05,
			z: 5.20,
			wallNormalX: 1,
			wallNormalZ: 0,
			group,
			disposables,
		})
	}

	// Add collision for elevated platforms and stairs
	const stepCount = 7
	const stepDepth = 0.35
	const stepWidth = length * 0.35
	const totalStairsDepth = stepCount * stepDepth

	// East platform top surface - walkable
	obstacles.push({
		type: 'floor',
		x: centerWidth / 2 + platformWidth / 2,
		y: platformHeight,
		z: 0,
		w: platformWidth,
		d: length,
	})

	// East platform walls - block sides but leave gap for stairs
	const stairGapHalfWidth = stepWidth / 2 + 0.3
	const northSectionDepth = (length - stairGapHalfWidth * 2) / 2

	// North section of east platform wall
	obstacles.push({
		type: 'box',
		x: centerWidth / 2,
		y: platformHeight / 2,
		z: -(northSectionDepth / 2 + stairGapHalfWidth),
		w: 0.2,
		d: northSectionDepth,
	})

	// South section of east platform wall
	obstacles.push({
		type: 'box',
		x: centerWidth / 2,
		y: platformHeight / 2,
		z: northSectionDepth / 2 + stairGapHalfWidth,
		w: 0.2,
		d: northSectionDepth,
	})

	// West platform top surface - walkable
	obstacles.push({
		type: 'floor',
		x: -(centerWidth / 2 + platformWidth / 2),
		y: platformHeight,
		z: 0,
		w: platformWidth,
		d: length,
	})

	// North section of west platform wall
	obstacles.push({
		type: 'box',
		x: -centerWidth / 2,
		y: platformHeight / 2,
		z: -(northSectionDepth / 2 + stairGapHalfWidth),
		w: 0.2,
		d: northSectionDepth,
	})

	// South section of west platform wall
	obstacles.push({
		type: 'box',
		x: -centerWidth / 2,
		y: platformHeight / 2,
		z: northSectionDepth / 2 + stairGapHalfWidth,
		w: 0.2,
		d: northSectionDepth,
	})

	// Stair collision - each individual step as floor obstacles (walkable, not blocking)
	const stepHeight = platformHeight / stepCount
	const stepThickness = 0.1

	// East stairs - positioned leading up to platform
	const eastStairStartX = centerWidth / 2
	for (let i = 0; i < stepCount; i++) {
		const xPos = eastStairStartX - totalStairsDepth + (i + 0.5) * stepDepth
		const yPos = (i + 1) * stepHeight
		obstacles.push({
			type: 'floor',  // Special type for walkable surfaces that don't block horizontally
			x: xPos,
			y: yPos,
			z: 0,
			w: stepDepth,
			d: stepWidth,
		})
	}

	// East stair side walls
	obstacles.push({
		type: 'box',
		x: eastStairStartX - totalStairsDepth / 2,
		y: platformHeight / 2,
		z: -stepWidth / 2,
		w: totalStairsDepth,
		d: 0.2,
	})

	obstacles.push({
		type: 'box',
		x: eastStairStartX - totalStairsDepth / 2,
		y: platformHeight / 2,
		z: stepWidth / 2,
		w: totalStairsDepth,
		d: 0.2,
	})

	// West stairs - positioned leading up to platform
	const westStairStartX = -centerWidth / 2
	for (let i = 0; i < stepCount; i++) {
		const xPos = westStairStartX + totalStairsDepth - (i + 0.5) * stepDepth
		const yPos = (i + 1) * stepHeight
		obstacles.push({
			type: 'floor',  // Special type for walkable surfaces that don't block horizontally
			x: xPos,
			y: yPos,
			z: 0,
			w: stepDepth,
			d: stepWidth,
		})
	}

	// West stair side walls
	obstacles.push({
		type: 'box',
		x: westStairStartX + totalStairsDepth / 2,
		y: platformHeight / 2,
		z: -stepWidth / 2,
		w: totalStairsDepth,
		d: 0.2,
	})

	obstacles.push({
		type: 'box',
		x: westStairStartX + totalStairsDepth / 2,
		y: platformHeight / 2,
		z: stepWidth / 2,
		w: totalStairsDepth,
		d: 0.2,
	})

	// Add guard rails
	{
		const railMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2f, roughness: 0.6, metalness: 0.4 })
		disposables.push(railMat)

		const railHeight = 1.0
		const railThickness = 0.05
		const postRadius = 0.04
		const postSpacing = 1.2

		function addRailing({ startX, startZ, startY, endX, endZ, endY, name }) {
			const rail = new THREE.Group()
			rail.name = name
			group.add(rail)

			const dx = endX - startX
			const dz = endZ - startZ
			const dy = endY - startY
			const railLength = Math.sqrt(dx * dx + dz * dz)
			const railLength3D = Math.sqrt(dx * dx + dz * dz + dy * dy)
			const angleY = Math.atan2(dz, dx)
			const angleZ = Math.atan2(dy, railLength)


			const topRailGeo = new THREE.CylinderGeometry(railThickness, railThickness, railLength3D, 12)
			const topRail = new THREE.Mesh(topRailGeo, railMat)
			topRail.rotation.z = Math.PI / 2 + angleZ
			topRail.rotation.y = angleY
			topRail.position.set((startX + endX) / 2, (startY + endY) / 2 + railHeight, (startZ + endZ) / 2)
			rail.add(topRail)
			disposables.push(topRailGeo)


			const midRailGeo = new THREE.CylinderGeometry(railThickness * 0.8, railThickness * 0.8, railLength3D, 12)
			const midRail = new THREE.Mesh(midRailGeo, railMat)
			midRail.rotation.z = Math.PI / 2 + angleZ
			midRail.rotation.y = angleY
			midRail.position.set((startX + endX) / 2, (startY + endY) / 2 + railHeight * 0.5, (startZ + endZ) / 2)
			rail.add(midRail)
			disposables.push(midRailGeo)


			const postCount = Math.max(2, Math.ceil(railLength / postSpacing))
			const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, railHeight, 12)
			disposables.push(postGeo)

			for (let i = 0; i < postCount; i++) {
				const t = i / (postCount - 1)
				const post = new THREE.Mesh(postGeo, railMat)
				const postY = startY + dy * t
				post.position.set(
					startX + dx * t,
					postY + railHeight / 2,
					startZ + dz * t
				)
				rail.add(post)
			}
		}

		const eastEdgeX = centerWidth / 2
		addRailing({
			startX: eastEdgeX,
			startZ: -stairGapHalfWidth,
			startY: platformHeight,
			endX: eastEdgeX,
			endZ: -length / 2 + 1.0,
			endY: platformHeight,
			name: 'railing-east-north',
		})

		addRailing({
			startX: eastEdgeX,
			startZ: stairGapHalfWidth,
			startY: platformHeight,
			endX: eastEdgeX,
			endZ: length / 2 - 1.0,
			endY: platformHeight,
			name: 'railing-east-south',
		})

		const westEdgeX = -centerWidth / 2
		addRailing({
			startX: westEdgeX,
			startZ: -stairGapHalfWidth,
			startY: platformHeight,
			endX: westEdgeX,
			endZ: -length / 2 + 1.0,
			endY: platformHeight,
			name: 'railing-west-north',
		})

		addRailing({
			startX: westEdgeX,
			startZ: stairGapHalfWidth,
			startY: platformHeight,
			endX: westEdgeX,
			endZ: length / 2 - 1.0,
			endY: platformHeight,
			name: 'railing-west-south',
		})

		addRailing({
			startX: eastStairStartX - totalStairsDepth,
			startZ: -stepWidth / 2,
			startY: 0,
			endX: eastStairStartX,
			endZ: -stepWidth / 2,
			endY: platformHeight,
			name: 'railing-east-stair-north',
		})

		addRailing({
			startX: eastStairStartX - totalStairsDepth,
			startZ: stepWidth / 2,
			startY: 0,
			endX: eastStairStartX,
			endZ: stepWidth / 2,
			endY: platformHeight,
			name: 'railing-east-stair-south',
		})

		addRailing({
			startX: westStairStartX + totalStairsDepth,
			startZ: -stepWidth / 2,
			startY: 0,
			endX: westStairStartX,
			endZ: -stepWidth / 2,
			endY: platformHeight,
			name: 'railing-west-stair-north',
		})

		addRailing({
			startX: westStairStartX + totalStairsDepth,
			startZ: stepWidth / 2,
			startY: 0,
			endX: westStairStartX,
			endZ: stepWidth / 2,
			endY: platformHeight,
			name: 'railing-west-stair-south',
		})
	}

	decorateLobbyGrandRotunda({
		group,
		disposables,
		halfW,
		halfL,
		height,
	})

	group.add(markers)

	return {
		group,
		disposables,
		slots,
		doors,
		doorHitMeshes,
		pickableMeshes,
		obstacles,
		bounds: {
			halfW,
			halfL,
			height,
		},
	}
}
