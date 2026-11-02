import * as THREE from 'three'
import { makeOutlineRect } from '../../misc/helper.js'

const doorPlaqueTextureCache = new Map()

function getOrCreateDoorPlaqueTexture(labelText) {
	const key = String(labelText || '').trim().toUpperCase()
	if (doorPlaqueTextureCache.has(key)) {
		return doorPlaqueTextureCache.get(key)
	}

	const canvas = document.createElement('canvas')
	canvas.width = 1024
	canvas.height = 256
	const ctx2 = canvas.getContext('2d')

	if (ctx2) {
		const safeText = key
		ctx2.clearRect(0, 0, canvas.width, canvas.height)

		// Rich dark lacquered background
		ctx2.fillStyle = '#0c0d11'
		ctx2.fillRect(0, 0, canvas.width, canvas.height)

		// Gilded double filigree border
		ctx2.strokeStyle = '#d4af37'
		ctx2.lineWidth = 5
		ctx2.strokeRect(12, 12, canvas.width - 24, canvas.height - 24)
		ctx2.strokeStyle = 'rgba(255, 215, 0, 0.65)'
		ctx2.lineWidth = 2
		ctx2.strokeRect(20, 20, canvas.width - 40, canvas.height - 40)

		// Corner diamond ornaments
		const drawDiamond = (cx, cy, r) => {
			ctx2.fillStyle = '#ffd700'
			ctx2.beginPath()
			ctx2.moveTo(cx, cy - r)
			ctx2.lineTo(cx + r, cy)
			ctx2.lineTo(cx, cy + r)
			ctx2.lineTo(cx - r, cy)
			ctx2.closePath()
			ctx2.fill()
		}
		drawDiamond(20, 20, 6)
		drawDiamond(canvas.width - 20, 20, 6)
		drawDiamond(20, canvas.height - 20, 6)
		drawDiamond(canvas.width - 20, canvas.height - 20, 6)

		// Header tag (bright gold)
		ctx2.font = '700 24px "Montserrat", sans-serif'
		ctx2.fillStyle = '#e8c264'
		ctx2.textAlign = 'center'
		ctx2.textBaseline = 'top'
		ctx2.letterSpacing = '4px'
		ctx2.fillText('MEMORABILIA SALON', canvas.width / 2, 34)

		// Main Title (Luminous high-contrast typography)
		ctx2.font = '700 50px "Cormorant Garamond", Georgia, serif'
		ctx2.fillStyle = '#ffffff'
		ctx2.shadowColor = 'rgba(255, 225, 140, 0.9)'
		ctx2.shadowBlur = 12
		ctx2.textBaseline = 'bottom'
		ctx2.fillText(safeText, canvas.width / 2, canvas.height - 32)
		ctx2.shadowBlur = 0
	}

	const tex = new THREE.CanvasTexture(canvas)
	tex.colorSpace = THREE.SRGBColorSpace
	tex.generateMipmaps = false
	tex.minFilter = THREE.LinearFilter
	tex.magFilter = THREE.LinearFilter
	tex.needsUpdate = true
	doorPlaqueTextureCache.set(key, tex)
	return tex
}

export function addDoor(ctx, opts = {}) {
	const options = opts && typeof opts === 'object' && Object.keys(opts).length > 0 ? opts : (ctx || {})
	const context = opts && typeof opts === 'object' && Object.keys(opts).length > 0 ? (ctx || {}) : (options || {})

	const {
		walls = {},
		height = 3.5,
		halfW = 7.0,
		halfL = 7.0,
		wallThickness = 0.2,
		group = new THREE.Group(),
		markers = new THREE.Group(),
		disposables = [],
		doorHitMeshes = [],
		doors = [],
		doorStyle = null,
		textures = {},
	} = context

	const {
		id = 'door',
		wall = 'north',
		w = 1.25,
		h = 2.4,
		y = 0,
		u = 0,
		color = 0x22ffee,
		meta = {},
	} = options

	const doorWoodMap = textures?.doorWoodMap
	const doorWoodBump = textures?.doorWoodBump
	const hasWoodTex = Boolean(doorWoodMap && doorWoodBump)

	let wallNormal = new THREE.Vector3()
	let wallRight = new THREE.Vector3()
	let wallUp = new THREE.Vector3(0, 1, 0)
	let baseCenter = new THREE.Vector3()

	const wallInfo = walls && walls[wall]
	if (wallInfo && wallInfo.normal) {
		wallNormal.copy(wallInfo.normal).normalize()
		wallRight = wall === 'east' || wall === 'west' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0)
		baseCenter = wallInfo.center
			.clone()
			.add(wallRight.clone().multiplyScalar(u))
			.add(wallUp.clone().multiplyScalar(y - height / 2))
			.add(wallNormal.clone().multiplyScalar(wallThickness / 2 + 0.03))
	} else if (wall === 'north') {
		wallNormal.set(0, 0, 1)
		wallRight.set(1, 0, 0)
		baseCenter.set(u, y, -halfL + 0.03)
	} else if (wall === 'south') {
		wallNormal.set(0, 0, -1)
		wallRight.set(-1, 0, 0)
		baseCenter.set(u, y, halfL - 0.03)
	} else if (wall === 'east') {
		wallNormal.set(-1, 0, 0)
		wallRight.set(0, 0, 1)
		baseCenter.set(halfW - 0.03, y, u)
	} else if (wall === 'west') {
		wallNormal.set(1, 0, 0)
		wallRight.set(0, 0, -1)
		baseCenter.set(-halfW + 0.03, y, u)
	}

	const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), wallNormal)

	const doorFrameGroup = new THREE.Group()
	doorFrameGroup.name = `door-frame-${id}`

	// Materials
	const frameStyle = doorStyle?.frame || null
	const frameMat = frameStyle
		? new THREE.MeshStandardMaterial({
			color: frameStyle.color ?? 0x1a0f09,
			roughness: frameStyle.roughness ?? 0.58,
			metalness: frameStyle.metalness ?? 0.0,
		})
		: new THREE.MeshStandardMaterial({
			color: 0x1c1714,
			roughness: 0.48,
			metalness: 0.1,
		})

	const doorPanelMat = new THREE.MeshStandardMaterial({
		color: doorStyle?.color ?? (hasWoodTex ? 0xffffff : 0x3d2716),
		map: hasWoodTex ? doorWoodMap : null,
		bumpMap: hasWoodTex ? doorWoodBump : null,
		bumpScale: 0.05,
		roughness: doorStyle?.roughness ?? 0.42,
		metalness: doorStyle?.metalness ?? 0.05,
	})
	const brassMat = new THREE.MeshStandardMaterial({
		color: 0xd4af37,
		roughness: 0.24,
		metalness: 0.88,
	})
	disposables.push(frameMat, doorPanelMat, brassMat)

	const frameW = 0.08
	const frameDepth = 0.08
	const frameInsetX = 0.012

	// 1. Solid Recessed Door Base
	const panelInset = 0.04
	const innerW = Math.max(0.2, w - panelInset * 2)
	const innerH = Math.max(0.2, h - panelInset * 2)
	const doorSlabGeo = new THREE.BoxGeometry(innerW, innerH, 0.035)
	const doorSlab = new THREE.Mesh(doorSlabGeo, doorPanelMat)
	doorSlab.position.set(0, h / 2, -0.012)
	doorFrameGroup.add(doorSlab)
	disposables.push(doorSlabGeo)

	// 2. Classical Raised Molding Frames (Upper & Lower Field Panels)
	const moldingMat = new THREE.MeshStandardMaterial({
		color: doorStyle?.color ?? 0x2e1d11,
		roughness: 0.45,
		metalness: 0.05,
	})
	disposables.push(moldingMat)

	const panelFieldW = innerW * 0.76
	const upperFieldH = innerH * 0.38
	const lowerFieldH = innerH * 0.38
	const upperCenterY = h * 0.70
	const lowerCenterY = h * 0.28

	// Upper fielded molding frame
	const upperTrimGeo = new THREE.BoxGeometry(panelFieldW, upperFieldH, 0.012)
	const upperTrim = new THREE.Mesh(upperTrimGeo, moldingMat)
	upperTrim.position.set(0, upperCenterY, 0.01)
	doorFrameGroup.add(upperTrim)

	// Lower fielded molding frame
	const lowerTrimGeo = new THREE.BoxGeometry(panelFieldW, lowerFieldH, 0.012)
	const lowerTrim = new THREE.Mesh(lowerTrimGeo, moldingMat)
	lowerTrim.position.set(0, lowerCenterY, 0.01)
	doorFrameGroup.add(lowerTrim)
	disposables.push(upperTrimGeo, lowerTrimGeo)

	// 3. Realistic Architectural Polished Brass Lever Handle & Escutcheon
	const handleHeight = Math.min(1.05, h * 0.44)
	const handleX = innerW / 2 - 0.12

	// Circular Brass Backplate
	const escutcheonGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.01, 24)
	const escutcheon = new THREE.Mesh(escutcheonGeo, brassMat)
	escutcheon.rotation.x = Math.PI / 2
	escutcheon.position.set(handleX, handleHeight, 0.012)
	doorFrameGroup.add(escutcheon)

	// Horizontal Brass Lever Handle
	const stemGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.035, 16)
	const stem = new THREE.Mesh(stemGeo, brassMat)
	stem.rotation.x = Math.PI / 2
	stem.position.set(handleX, handleHeight, 0.026)
	doorFrameGroup.add(stem)

	const leverGeo = new THREE.BoxGeometry(0.12, 0.018, 0.018)
	const lever = new THREE.Mesh(leverGeo, brassMat)
	lever.position.set(handleX - 0.048, handleHeight, 0.042)
	doorFrameGroup.add(lever)

	disposables.push(escutcheonGeo, stemGeo, leverGeo)

	// 4. Plaque & Typography
	const labelText =
		typeof meta?.label === 'string' && meta.label.trim().length > 0
			? meta.label.trim()
			: typeof meta?.category === 'string' && meta.category.trim().length > 0
				? meta.category.trim()
				: ''

	let labelControl = null

	if (labelText) {
		const plaqueW = Math.min(w * 0.85, 1.40)
		const plaqueH = 0.28
		const plaqueCenterY = Math.min(h - 0.22, 1.45)

		// Brass beveled plaque backing frame
		const plaqueBackGeo = new THREE.BoxGeometry(plaqueW + 0.04, plaqueH + 0.04, 0.014)
		const plaqueBack = new THREE.Mesh(plaqueBackGeo, brassMat)
		plaqueBack.position.set(0, plaqueCenterY, 0.020)
		doorFrameGroup.add(plaqueBack)
		disposables.push(plaqueBackGeo)

		// Deep obsidian/noir plaque plate with gilded rim
		const plaqueGeo = new THREE.PlaneGeometry(plaqueW, plaqueH)
		const plaqueMat = new THREE.MeshStandardMaterial({
			color: 0x0c0d10,
			roughness: 0.25,
			metalness: 0.80,
		})
		const plaque = new THREE.Mesh(plaqueGeo, plaqueMat)
		plaque.position.set(0, plaqueCenterY, 0.026)
		doorFrameGroup.add(plaque)
		disposables.push(plaqueGeo, plaqueMat)

		const tex = getOrCreateDoorPlaqueTexture(labelText)

		labelControl = {
			originalText: labelText,
			overrideText: null,
			setOverride(nextText) {
				const t = String(nextText || '').trim()
				this.overrideText = t || null
				const activeTex = getOrCreateDoorPlaqueTexture(t || this.originalText)
				textMat.map = activeTex
				textMat.needsUpdate = true
			},
			clearOverride() {
				this.setOverride('')
			},
		}

		// Self-illuminated high-contrast face mesh so text is always crystal-clear
		const textGeo = new THREE.PlaneGeometry(plaqueW * 0.98, plaqueH * 0.98)
		const textMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true })
		const text = new THREE.Mesh(textGeo, textMat)
		text.position.set(0, plaqueCenterY, 0.028)
		doorFrameGroup.add(text)
		disposables.push(textGeo, textMat)
	}

	// 5. Outer Door Jambs & Lintel Frame
	const jambGeo = new THREE.BoxGeometry(frameW, h, frameDepth)
	const headerGeo = new THREE.BoxGeometry(w + frameW * 2 - frameInsetX * 2, frameW, frameDepth)
	disposables.push(jambGeo, headerGeo)

	const leftJamb = new THREE.Mesh(jambGeo, frameMat)
	leftJamb.position.set(-(w / 2 + frameW / 2 - frameInsetX), h / 2, 0)
	doorFrameGroup.add(leftJamb)

	const rightJamb = new THREE.Mesh(jambGeo, frameMat)
	rightJamb.position.set(w / 2 + frameW / 2 - frameInsetX, h / 2, 0)
	doorFrameGroup.add(rightJamb)

	const header = new THREE.Mesh(headerGeo, frameMat)
	header.position.set(0, h - frameW / 2, 0)
	doorFrameGroup.add(header)

	// 6. Dedicated Museum Overhead Plaque Fixture & Focused Spotlight!
	const lightFixtureGroup = new THREE.Group()

	// Brass mounting arm extending outward from wall
	const armGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.28, 16)
	const arm = new THREE.Mesh(armGeo, brassMat)
	arm.rotation.x = Math.PI / 2
	arm.position.set(0, 0, 0.14)
	lightFixtureGroup.add(arm)

	// Polished Brass Downlight Canister
	const canisterGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.06, 24)
	const canister = new THREE.Mesh(canisterGeo, brassMat)
	canister.rotation.x = Math.PI / 3.5
	canister.position.set(0, -0.02, 0.28)
	lightFixtureGroup.add(canister)

	const lensGeo = new THREE.CircleGeometry(0.08, 24)
	const lensMat = new THREE.MeshStandardMaterial({
		color: 0xffffff,
		emissive: 0xffe6b8,
		emissiveIntensity: 2.2,
		roughness: 0.15,
	})
	const lens = new THREE.Mesh(lensGeo, lensMat)
	lens.position.set(0, -0.045, 0.30)
	lens.rotation.x = -Math.PI / 3.5
	lightFixtureGroup.add(lens)

	lightFixtureGroup.position.set(0, h + 0.12, 0.06)
	doorFrameGroup.add(lightFixtureGroup)

	// High-intensity spotlight focused directly onto the salon name plaque!
	const doorSpot = new THREE.SpotLight(0xfff1d6, 5.5, 6.0, Math.PI / 3.2, 0.75, 1.5)
	doorSpot.position.set(0, h + 0.15, 0.38)
	const spotTarget = new THREE.Object3D()
	// Target set precisely at the center of the salon name plaque
	spotTarget.position.set(0, 1.45, 0.02)
	doorFrameGroup.add(spotTarget)
	doorSpot.target = spotTarget
	doorFrameGroup.add(doorSpot)

	disposables.push(armGeo, canisterGeo, lensGeo, lensMat, doorSpot)

	// Orientation and placement
	doorFrameGroup.quaternion.copy(quat)
	doorFrameGroup.position.copy(baseCenter)
	group.add(doorFrameGroup)

	// 7. Raycast Hit Plane
	const hitGeo = new THREE.PlaneGeometry(w, h)
	const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
	const hitMesh = new THREE.Mesh(hitGeo, hitMat)
	hitMesh.name = 'door-hit'
	hitMesh.userData.doorId = id
	if (labelControl) hitMesh.userData.labelControl = labelControl
	hitMesh.quaternion.copy(quat)
	hitMesh.position.copy(baseCenter.clone().add(wallUp.clone().multiplyScalar(h / 2)).add(wallNormal.clone().multiplyScalar(0.04)))
	group.add(hitMesh)
	doorHitMeshes.push(hitMesh)
	disposables.push(hitGeo, hitMat)

	doors.push({
		id,
		wall,
		position: baseCenter.clone(),
		normal: wallNormal.clone(),
		right: wallRight.clone(),
		up: wallUp.clone(),
		u,
		y,
		...meta,
	})

	const { object, disposables: outlineDisposables } = makeOutlineRect({
		width: w,
		height: h,
		center: baseCenter.clone().add(wallUp.clone().multiplyScalar(h / 2)).add(wallNormal.clone().multiplyScalar(0.01)),
		normal: wallNormal,
		color,
	})
	markers.add(object)
	disposables.push(...outlineDisposables)
}
