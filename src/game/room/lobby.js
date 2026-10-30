import * as THREE from 'three'
import { clamp, roundTo } from '../../misc/helper.js'
import lobbyPhotoUrl from '../../assets/lobbyphoto.png'
import { makeMarbleTexture } from './doors.js'

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

	// 1. Dark Solid American Walnut / Ebonized Plinth Base
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

	// 2. Segmented Cognac Saddle Leather Cushions (3 luxury tufted pads)
	const segmentCount = 3
	const gap = 0.02
	const totalGaps = (segmentCount - 1) * gap
	const segW = (plinthW - 0.08 - totalGaps) / segmentCount
	const segD = plinthD - 0.04
	const segH = 0.13

	const cushionGeo = new THREE.BoxGeometry(segW, segH, segD)
	const leatherMat = new THREE.MeshStandardMaterial({
		color: 0x7e4922, // Rich warm cognac saddle leather
		roughness: 0.40,
		metalness: 0.08,
	})
	disposables.push(cushionGeo, leatherMat)

	const tuftGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.01, 16)
	const tuftMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.6 })
	disposables.push(tuftGeo, tuftMat)

	for (let i = 0; i < segmentCount; i += 1) {
		const segX = -plinthW / 2 + 0.04 + segW / 2 + i * (segW + gap)
		const cushion = new THREE.Mesh(cushionGeo, leatherMat)
		cushion.position.set(segX, seatBaseY + plinthH / 2 + segH / 2, 0)
		b.add(cushion)

		const t1 = new THREE.Mesh(tuftGeo, tuftMat)
		t1.position.set(segX, seatBaseY + plinthH / 2 + segH + 0.002, -segD * 0.22)
		b.add(t1)

		const t2 = new THREE.Mesh(tuftGeo, tuftMat)
		t2.position.set(segX, seatBaseY + plinthH / 2 + segH + 0.002, segD * 0.22)
		b.add(t2)
	}

	// 3. Slender Tapered Cylindrical Brushed Brass Legs + Foot Gliders
	const legH = seatBaseY - plinthH / 2
	const legGeo = new THREE.CylinderGeometry(0.022, 0.015, legH, 18)
	const legMat = new THREE.MeshStandardMaterial({
		color: 0xd4af37,
		metalness: 0.88,
		roughness: 0.22,
	})
	const footGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.014, 18)
	const footMat = new THREE.MeshStandardMaterial({ color: 0x161513, roughness: 0.7 })
	disposables.push(legGeo, legMat, footGeo, footMat)

	const lx = plinthW / 2 - 0.16
	const lz = plinthD / 2 - 0.14
	const legCoords = [
		[-lx, -lz],
		[lx, -lz],
		[-lx, lz],
		[lx, lz],
	]
	for (const [cx, cz] of legCoords) {
		const leg = new THREE.Mesh(legGeo, legMat)
		leg.position.set(cx, legH / 2, cz)
		b.add(leg)

		const foot = new THREE.Mesh(footGeo, footMat)
		foot.position.set(cx, 0.007, cz)
		b.add(foot)
	}

	const stretchGeo = new THREE.CylinderGeometry(0.009, 0.009, lz * 2, 12)
	stretchGeo.rotateX(Math.PI / 2)
	const bar1 = new THREE.Mesh(stretchGeo, legMat)
	bar1.position.set(-lx, legH * 0.42, 0)
	b.add(bar1)
	const bar2 = new THREE.Mesh(stretchGeo, legMat)
	bar2.position.set(lx, legH * 0.42, 0)
	b.add(bar2)
	disposables.push(stretchGeo)

	if (obstacles) obstacles.push({ type: 'box', x, z, y, w: plinthW * 1.05, d: plinthD * 1.15 })
	return b
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
				meta: { category: eastCategory },
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
				meta: { category: westCategory },
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

		const frameW = roundTo(clamp(width * 0.72, 2.4, 5.8), 0.05)
		const frameH = roundTo(clamp(height * 0.58, 1.2, 2.0), 0.05)
		const frameDepth = 0.08
		const frameThickness = 0.12
		const frameY = height * 0.7

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
		matte.rotation.y = Math.PI
		frameGroup.add(matte)
		disposables.push(matteGeo)

		const photoTexture = new THREE.TextureLoader().load(lobbyPhotoUrl)
		photoTexture.colorSpace = THREE.SRGBColorSpace

		const photoGeo = new THREE.PlaneGeometry(frameW + frameThickness * 2, frameH + frameThickness * 2)
		const photoMat = new THREE.MeshBasicMaterial({
			map: photoTexture,
			side: THREE.DoubleSide
		})
		const photo = new THREE.Mesh(photoGeo, photoMat)
		photo.position.set(0, 0, frameDepth / 2 + 0.01)
		photo.rotation.y = Math.PI
		photo.userData = {
			pickable: true,
			isPhoto: true,
			pickableType: 'wall-photo',
			photoUrl: lobbyPhotoUrl,
			photoTitle: 'Grand Sanctuary Masterpiece'
		}
		pickableMeshes.push(photo)
		frameGroup.add(photo)
		disposables.push(photoGeo, photoMat, photoTexture)
	}

	// Center Lounge Suite (Round marble/brass table + two luxury cognac leather armchairs/sofas)
	{
		const loungeGroup = new THREE.Group()
		loungeGroup.name = 'lobby-center-lounge'
		loungeGroup.position.set(0, 0, 0.3)
		group.add(loungeGroup)

		const brassMat = new THREE.MeshStandardMaterial({
			color: 0xd4af37,
			roughness: 0.22,
			metalness: 0.88,
		})
		const walnutMat = new THREE.MeshStandardMaterial({
			color: 0x221a14,
			roughness: 0.65,
			metalness: 0.05,
		})
		const leatherMat = new THREE.MeshStandardMaterial({
			color: 0x7e4922, // Rich warm cognac saddle leather
			roughness: 0.40,
			metalness: 0.08,
		})
		const velvetMat = new THREE.MeshStandardMaterial({
			color: 0xf0e6d2, // Champagne ivory lumbar pillow
			roughness: 0.75,
			metalness: 0.02,
		})
		disposables.push(brassMat, walnutMat, leatherMat, velvetMat)

		// 1. Classical Round Pedestal Table (Center of Grand Lobby)
		const tableGroup = new THREE.Group()
		tableGroup.position.set(0, 0, 0)
		loungeGroup.add(tableGroup)

		// Calacatta / Carrara White Marble Tabletop
		const marbleTex = makeMarbleTexture({ size: 512, seed: 0x4d617262 })
		const marbleMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			map: marbleTex,
			roughness: 0.24,
			metalness: 0.08,
		})
		disposables.push(marbleTex, marbleMat)

		const tableH = 0.58
		const tableRadius = 0.64
		const topGeo = new THREE.CylinderGeometry(tableRadius, tableRadius, 0.045, 48)
		const topMesh = new THREE.Mesh(topGeo, marbleMat)
		topMesh.position.set(0, tableH, 0)
		tableGroup.add(topMesh)

		// Beveled Brass Table Rim / Apron
		const rimGeo = new THREE.CylinderGeometry(tableRadius + 0.015, tableRadius + 0.015, 0.025, 48)
		const rimMesh = new THREE.Mesh(rimGeo, brassMat)
		rimMesh.position.set(0, tableH - 0.025, 0)
		tableGroup.add(rimMesh)

		// Fluted Architectural Brass Pedestal Column
		const pedestalGeo = new THREE.CylinderGeometry(0.10, 0.20, tableH - 0.08, 32)
		const pedestalMesh = new THREE.Mesh(pedestalGeo, brassMat)
		pedestalMesh.position.set(0, (tableH - 0.08) / 2 + 0.04, 0)
		tableGroup.add(pedestalMesh)

		// Heavy Stepped Brass Disc Floor Base
		const baseGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.04, 36)
		const baseMesh = new THREE.Mesh(baseGeo, brassMat)
		baseMesh.position.set(0, 0.02, 0)
		tableGroup.add(baseMesh)
		disposables.push(topGeo, rimGeo, pedestalGeo, baseGeo)

		// Centerpiece: Sculpted Marble Floral Bowl & Leather Guestbook
		const bowlGeo = new THREE.CylinderGeometry(0.14, 0.08, 0.07, 24)
		const bowlMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 })
		const bowl = new THREE.Mesh(bowlGeo, bowlMat)
		bowl.position.set(0, tableH + 0.055, 0)
		tableGroup.add(bowl)

		const blossomGeo = new THREE.SphereGeometry(0.11, 16, 16)
		const blossomMat = new THREE.MeshStandardMaterial({ color: 0xfdf6ee, roughness: 0.65 })
		const blossoms = new THREE.Mesh(blossomGeo, blossomMat)
		blossoms.position.set(0, tableH + 0.12, 0)
		blossoms.scale.set(1, 0.75, 1)
		tableGroup.add(blossoms)

		const bookGeo = new THREE.BoxGeometry(0.20, 0.025, 0.15)
		const bookMat = new THREE.MeshStandardMaterial({ color: 0x54181a, roughness: 0.55 }) // Burgundy leather
		const book = new THREE.Mesh(bookGeo, bookMat)
		book.position.set(0.26, tableH + 0.035, -0.10)
		book.rotation.y = 0.35
		tableGroup.add(book)
		disposables.push(bowlGeo, bowlMat, blossomGeo, blossomMat, bookGeo, bookMat)

		obstacles.push({ type: 'cylinder', x: 0, z: 0.3, radius: 0.72 })

		// 2. Two Luxury Lounge Armchairs / Sofas
		function createLoungeArmchair(x, rotationY, name) {
			const chair = new THREE.Group()
			chair.name = name
			chair.position.set(x, 0, 0)
			chair.rotation.y = rotationY
			loungeGroup.add(chair)

			const chairW = 0.90
			const chairD = 0.82

			// Solid American Walnut Plinth Base
			const plinthGeo = new THREE.BoxGeometry(chairW, 0.06, chairD)
			const plinth = new THREE.Mesh(plinthGeo, walnutMat)
			plinth.position.set(0, 0.18, 0)
			chair.add(plinth)

			// Plush Tufted Cognac Leather Seat Cushion
			const seatGeo = new THREE.BoxGeometry(chairW - 0.06, 0.16, chairD - 0.06)
			const seat = new THREE.Mesh(seatGeo, leatherMat)
			seat.position.set(0, 0.28, 0)
			chair.add(seat)

			// Curved Tub Backrest & Side Armrests
			const backGeo = new THREE.BoxGeometry(chairW, 0.40, 0.16)
			const back = new THREE.Mesh(backGeo, leatherMat)
			back.position.set(0, 0.48, -(chairD / 2 - 0.08))
			chair.add(back)

			const armGeo = new THREE.BoxGeometry(0.14, 0.30, chairD - 0.12)
			const leftArm = new THREE.Mesh(armGeo, leatherMat)
			leftArm.position.set(-(chairW / 2 - 0.07), 0.40, 0.04)
			chair.add(leftArm)

			const rightArm = new THREE.Mesh(armGeo, leatherMat)
			rightArm.position.set(chairW / 2 - 0.07, 0.40, 0.04)
			chair.add(rightArm)

			// Champagne Lumbar Pillow
			const pillowGeo = new THREE.BoxGeometry(0.44, 0.20, 0.09)
			const pillow = new THREE.Mesh(pillowGeo, velvetMat)
			pillow.position.set(0, 0.38, -(chairD / 2 - 0.18))
			chair.add(pillow)

			// 4 Tapered Cylindrical Brushed Brass Legs
			const legGeo = new THREE.CylinderGeometry(0.020, 0.015, 0.18, 16)
			const gliderGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.015, 16)
			const legPositions = [
				[-chairW * 0.40, -chairD * 0.38],
				[chairW * 0.40, -chairD * 0.38],
				[-chairW * 0.40, chairD * 0.38],
				[chairW * 0.40, chairD * 0.38],
			]
			for (const [lx, lz] of legPositions) {
				const leg = new THREE.Mesh(legGeo, brassMat)
				leg.position.set(lx, 0.09, lz)
				chair.add(leg)

				const glider = new THREE.Mesh(gliderGeo, brassMat)
				glider.position.set(lx, 0.008, lz)
				chair.add(glider)
			}

			disposables.push(plinthGeo, seatGeo, backGeo, armGeo, pillowGeo, legGeo, gliderGeo)
			obstacles.push({ type: 'cylinder', x, z: 0.3, radius: 0.55 })
		}

		createLoungeArmchair(-1.35, Math.PI / 2, 'armchair-west')
		createLoungeArmchair(1.35, -Math.PI / 2, 'armchair-east')
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
