import * as THREE from 'three'
import { clamp, roundTo, configureGalleryTexture, isSupportedImageUrl, fitPhotoToFrame } from '../misc/helper.js'
import { buildLobbyRoom, createRealisticGalleryPlant } from './room/lobby.js'
import { applyRoomDecorations } from './room/decorations.js'
import { applyPlacedItems } from './room/placedItems.js'
import { addDoor as addDoorToRoom } from './room/doors.js'
import { addSlot as addSlotToRoom } from './room/slots.js'
import { getSharedRoomMaterialTextures } from './room/textures.js'
import { getArtworkSizes } from '../config/artworkSizes.js'
import { getStaticCache } from './room/staticCache.js'

export function deriveRoomKey({ mode = 'gallery', title = '' } = {}) {
	if (mode === 'lobby') return 'lobby'
	const t = String(title || '').toLowerCase()
	if (t.includes('fireside') || t.includes('winter')) return 'fireside'
	if (t.includes('music') || t.includes('melod')) return 'music'
	if (t.includes('library') || t.includes('reading')) return 'library'
	if (t.includes('paris') || t.includes('masterpiece') || t.includes('romance')) return 'paris'
	if (t.includes('orangery') || t.includes('glass')) return 'orangery'
	if (t.includes('secret') || t.includes('alcove') || t.includes('promise')) return 'alcove'
	return 'gallery'
}

const ROOM_PHOTO_FOLDERS = {
	lobby: '00_grand_lobby',
	fireside: '01_fireside_winter_memories',
	music: '02_music_classical_melodies',
	library: '03_library_reading_nook',
	paris: '04_masterpiece_paris_romance',
	orangery: '05_the_glass_orangery',
	alcove: '06_secret_promise_alcove',
}

const PHOTO_SLOT_FILE = [
	'01_partition_front_highlight',
	'02_partition_back_highlight',
	'03_north_wall_masterpiece',
	'04_south_wall_gate_left',
	'05_south_wall_gate_right',
	'06_east_wall_artwork_1',
	'07_east_wall_artwork_2',
	'08_east_wall_artwork_3',
	'09_east_wall_artwork_4',
	'10_east_wall_artwork_5',
]

export function buildRoom({ width, length, height, wallThickness = 0.2, mode = 'gallery', roomKey, lobby = {}, gallery = {} }) {
	const currentRoomKey = roomKey || deriveRoomKey({ mode, title: gallery?.title })

	// Prefer a real uploaded photo file for a slot; fall back to whatever the
	// gallery data supplied (string URL) or null (placeholder). Missing files
	// gracefully fall through to the placeholder via the texture onError path.
	function localPhotoPath(photoIdx) {
		const folder = ROOM_PHOTO_FOLDERS[currentRoomKey]
		if (!folder) return null
		const file = PHOTO_SLOT_FILE[photoIdx]
		if (!file) return null
		return `/photos/${folder}/${file}.png`
	}
	const group = new THREE.Group()
	group.name = 'room'

	const disposables = []
	const deferredTextureLoads = []
	const animatedDecorations = []
	const artSizes = getArtworkSizes()

	let palette = {}

	switch (mode) {
		case 'lobby':
			palette = {
				floor: 0xf3eedf,
				ceiling: 0xfaf8f5,
				wall: 0xf4f1eb,
				keyLight: 0xffedd0,
				keyLightIntensity: 1.5,
				ambientIntensity: 0.95,
				ceilingLightColor: 0xfffaed,
				ceilingLightIntensity: 1.3,
			}
			break;
		case 'gallery':
			palette = {
				floor: 0x222226,
				ceiling: 0xdeded8,
				wall: 0x3e4046,
				keyLight: 0xffedd0,
				keyLightIntensity: 1.6,
				ambientIntensity: 0.85,
				ceilingLightColor: 0xfffaee,
				ceilingLightIntensity: 1.0,
			}
			break;
		default:
	}

	const ambient = new THREE.AmbientLight(0xffffff, palette.ambientIntensity)
	group.add(ambient)

	const keyLight = new THREE.DirectionalLight(palette.keyLight, palette.keyLightIntensity)
	keyLight.position.set(4, height + 2.5, 3)
	group.add(keyLight)

	const ceilingLightColor = palette.ceilingLightColor
	const ceilingLightIntensity = palette.ceilingLightIntensity
	const ceilingLightDistance = Math.max(width, length) * 2.2
	const ceilingLightDecay = 1.6

	// Ensure imagePhotos is defined before use
	const photos = Array.isArray(gallery.photos)
		? gallery.photos
			.map((u) => (typeof u === 'string' ? u.trim() : ''))
			.filter(Boolean)
		: [];
	const imagePhotos = photos.filter(isSupportedImageUrl);

	function addCeilingDownlight(x, y, z, intensityMult = 1.0) {
		// Architectural Flush-Mount Recessed Ceiling Bezel (Matte Museum White / Ivory Trim)
		const bezelGeo = new THREE.RingGeometry(0.18, 0.23, 32)
		const bezelMat = new THREE.MeshStandardMaterial({
			color: 0xeae6df,
			roughness: 0.65,
			metalness: 0.1,
			side: THREE.DoubleSide,
		})
		const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat)
		bezelMesh.rotation.x = Math.PI / 2
		bezelMesh.position.set(x, y - 0.001, z)
		group.add(bezelMesh)

		const lensGeo = new THREE.CircleGeometry(0.18, 32)
		const lensMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			emissive: ceilingLightColor,
			emissiveIntensity: 1.6,
			roughness: 0.2,
		})
		const lensMesh = new THREE.Mesh(lensGeo, lensMat)
		lensMesh.rotation.x = Math.PI / 2
		lensMesh.position.set(x, y - 0.002, z)
		group.add(lensMesh)

		const spot = new THREE.SpotLight(ceilingLightColor, ceilingLightIntensity * 1.5 * intensityMult, ceilingLightDistance, Math.PI / 3.4, 0.85, ceilingLightDecay)
		spot.position.set(x, y, z)
		const targetObj = new THREE.Object3D()
		targetObj.position.set(x, 0, z)
		group.add(targetObj)
		spot.target = targetObj
		group.add(spot)

		const fill = new THREE.PointLight(ceilingLightColor, ceilingLightIntensity * 0.35 * intensityMult, ceilingLightDistance * 0.7, ceilingLightDecay)
		fill.position.set(x, y - 0.35, z)
		group.add(fill)

		disposables.push(bezelGeo, bezelMat, lensGeo, lensMat, spot, fill)
	}

	if (mode === 'lobby') {
		const platformHeight = 1.4
		const upperCeilingHeight = height + 1.6
		const platformWidth = 4.0
		const centerWidth = width - 2 * platformWidth

		const y2 = upperCeilingHeight - 0.25
		const xEast = centerWidth / 2 + platformWidth / 2

		addCeilingDownlight(xEast, y2, -length * 0.3, 1.1)
		addCeilingDownlight(xEast, y2, 0, 1.1)
		addCeilingDownlight(xEast, y2, length * 0.3, 1.1)

		const xWest = -(centerWidth / 2 + platformWidth / 2)

		addCeilingDownlight(xWest, y2, -length * 0.3, 1.1)
		addCeilingDownlight(xWest, y2, 0, 1.1)
		addCeilingDownlight(xWest, y2, length * 0.3, 1.1)
	} else {
		const y = height - 0.25
		const x = width * 0.35
		const z = length * 0.35

		addCeilingDownlight(-x, y, -z)
		addCeilingDownlight(x, y, -z)
		addCeilingDownlight(-x, y, z)
		addCeilingDownlight(x, y, z)
		addCeilingDownlight(-x, y, 0)
		addCeilingDownlight(x, y, 0)
	}

	const {
		floorWoodMap,
		floorWoodBump,
		doorWoodMap,
		doorWoodBump,
		benchWoodMap,
		benchWoodBump,
		wallStuccoMap,
		wallStuccoBump,
		ceilingStuccoMap,
		ceilingStuccoBump,
		pillarMarbleMap,
		pillarMarbleBump,
		panelMarbleMap,
		panelMarbleBump,
	} = getSharedRoomMaterialTextures({ width, length })

	const panelMarbleBackMat = new THREE.MeshStandardMaterial({
		color: 0x4a4a52,
		map: panelMarbleMap,
		bumpMap: panelMarbleBump,
		bumpScale: 0.05,
		roughness: 0.84,
		metalness: 0.0,
	})
	disposables.push(panelMarbleBackMat)

	if (mode === 'lobby') {
		const platformHeight = 1.4
		const upperCeilingHeight = height + 1.6
		const platformWidth = 4.0  // Fixed width for elevated platforms
		const centerWidth = width - 2 * platformWidth  // Back to using all remaining width

		const floorMat = new THREE.MeshStandardMaterial({
			color: palette.floor,
			map: floorWoodMap,
			bumpMap: floorWoodBump,
			bumpScale: 0.05,
			roughness: 0.42,
			metalness: 0.0,
		})
		disposables.push(floorMat)


		const centralFloorGeo = new THREE.PlaneGeometry(centerWidth, length)
		const centralFloor = new THREE.Mesh(centralFloorGeo, floorMat)
		centralFloor.rotation.x = -Math.PI / 2
		centralFloor.position.y = 0
		centralFloor.name = 'central-floor'
		group.add(centralFloor)
		disposables.push(centralFloorGeo)


		const eastFloorGeo = new THREE.PlaneGeometry(platformWidth, length)
		const eastFloor = new THREE.Mesh(eastFloorGeo, floorMat)
		eastFloor.rotation.x = -Math.PI / 2
		eastFloor.position.set(centerWidth / 2 + platformWidth / 2, platformHeight + 0.001, 0)  // Slight offset to prevent z-fighting
		eastFloor.name = 'east-platform-floor'
		group.add(eastFloor)
		disposables.push(eastFloorGeo)


		const westFloorGeo = new THREE.PlaneGeometry(platformWidth, length)
		const westFloor = new THREE.Mesh(westFloorGeo, floorMat)
		westFloor.rotation.x = -Math.PI / 2
		westFloor.position.set(-(centerWidth / 2 + platformWidth / 2), platformHeight + 0.001, 0)  // Slight offset to prevent z-fighting
		westFloor.name = 'west-platform-floor'
		group.add(westFloor)
		disposables.push(westFloorGeo)


		const platformFaceMat = new THREE.MeshStandardMaterial({
			color: palette.wall,
			map: wallStuccoMap,
			bumpMap: wallStuccoBump,
			bumpScale: 0.09,
			roughness: 0.92,
			metalness: 0.0,
		})
		disposables.push(platformFaceMat)


		const eastFaceGeo = new THREE.BoxGeometry(wallThickness, platformHeight, length)
		const eastFace = new THREE.Mesh(eastFaceGeo, platformFaceMat)
		eastFace.position.set(centerWidth / 2, platformHeight / 2, 0)
		eastFace.name = 'east-platform-face'
		group.add(eastFace)
		disposables.push(eastFaceGeo)


		const westFaceGeo = new THREE.BoxGeometry(wallThickness, platformHeight, length)
		const westFace = new THREE.Mesh(westFaceGeo, platformFaceMat)
		westFace.position.set(-centerWidth / 2, platformHeight / 2, 0)
		westFace.name = 'west-platform-face'
		group.add(westFace)
		disposables.push(westFaceGeo)


		const ceilingMat = new THREE.MeshStandardMaterial({
			color: palette.ceiling,
			map: ceilingStuccoMap,
			bumpMap: ceilingStuccoBump,
			bumpScale: 0.14,
			roughness: 0.94,
			metalness: 0.0,
		})
		disposables.push(ceilingMat)


		const centralCeilingGeo = new THREE.PlaneGeometry(centerWidth, length)
		const centralCeiling = new THREE.Mesh(centralCeilingGeo, ceilingMat)
		centralCeiling.rotation.x = Math.PI / 2
		centralCeiling.position.y = upperCeilingHeight
		centralCeiling.name = 'central-ceiling'
		group.add(centralCeiling)
		disposables.push(centralCeilingGeo)


		const eastCeilingGeo = new THREE.PlaneGeometry(platformWidth, length)
		const eastCeiling = new THREE.Mesh(eastCeilingGeo, ceilingMat)
		eastCeiling.rotation.x = Math.PI / 2
		eastCeiling.position.set(centerWidth / 2 + platformWidth / 2, upperCeilingHeight, 0)
		eastCeiling.name = 'east-platform-ceiling'
		group.add(eastCeiling)
		disposables.push(eastCeilingGeo)

		const westCeilingGeo = new THREE.PlaneGeometry(platformWidth, length)
		const westCeiling = new THREE.Mesh(westCeilingGeo, ceilingMat)
		westCeiling.rotation.x = Math.PI / 2
		westCeiling.position.set(-(centerWidth / 2 + platformWidth / 2), upperCeilingHeight, 0)
		westCeiling.name = 'west-platform-ceiling'
		group.add(westCeiling)
		disposables.push(westCeilingGeo)

		const stepCount = 7
		const stepHeight = platformHeight / stepCount
		const stepDepth = 0.35
		const stepWidth = length * 0.35
		const stepThickness = 0.1
		const totalStairsDepth = stepCount * stepDepth

		const stepMat = new THREE.MeshStandardMaterial({
			color: palette.floor,
			map: floorWoodMap,
			bumpMap: floorWoodBump,
			bumpScale: 0.05,
			roughness: 0.42,
			metalness: 0.0,
		})
		disposables.push(stepMat)

		const eastStairGroup = new THREE.Group()
		eastStairGroup.name = 'east-stairs'
		group.add(eastStairGroup)

		const eastStairStartX = centerWidth / 2

		for (let i = 0; i < stepCount; i++) {
			const stepGeo = new THREE.BoxGeometry(stepDepth, stepThickness, stepWidth)
			const step = new THREE.Mesh(stepGeo, stepMat)
			const xPos = eastStairStartX - totalStairsDepth + (i + 0.5) * stepDepth
			const yPos = (i + 1) * stepHeight - stepThickness / 2 - 0.001  // Slight offset below platform
			step.position.set(xPos, yPos, 0)
			eastStairGroup.add(step)
			if (i === 0) disposables.push(stepGeo)


			if (i < stepCount - 1) {
				const riserGeo = new THREE.BoxGeometry(stepThickness, stepHeight, stepWidth)
				const riser = new THREE.Mesh(riserGeo, platformFaceMat)
				const riserX = eastStairStartX - totalStairsDepth + (i + 1) * stepDepth - stepThickness / 2
				const riserY = (i + 1) * stepHeight + stepHeight / 2
				riser.position.set(riserX, riserY, 0)
				eastStairGroup.add(riser)
				if (i === 0) disposables.push(riserGeo)
			}
		}

		const westStairGroup = new THREE.Group()
		westStairGroup.name = 'west-stairs'
		group.add(westStairGroup)

		const westStairStartX = -centerWidth / 2

		for (let i = 0; i < stepCount; i++) {
			const stepGeo = new THREE.BoxGeometry(stepDepth, stepThickness, stepWidth)
			const step = new THREE.Mesh(stepGeo, stepMat)
			const xPos = westStairStartX + totalStairsDepth - (i + 0.5) * stepDepth
			const yPos = (i + 1) * stepHeight - stepThickness / 2 - 0.001  // Slight offset below platform
			step.position.set(xPos, yPos, 0)
			westStairGroup.add(step)

			if (i < stepCount - 1) {
				const riserGeo = new THREE.BoxGeometry(stepThickness, stepHeight, stepWidth)
				const riser = new THREE.Mesh(riserGeo, platformFaceMat)
				const riserX = westStairStartX + totalStairsDepth - (i + 1) * stepDepth + stepThickness / 2
				const riserY = (i + 1) * stepHeight + stepHeight / 2
				riser.position.set(riserX, riserY, 0)
				westStairGroup.add(riser)
			}
		}

	} else {
		const floorGeo = new THREE.PlaneGeometry(width, length)
		const floorMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			map: floorWoodMap,
			bumpMap: floorWoodBump,
			bumpScale: 0.05,
			roughness: 0.42,
			metalness: 0.0,
		})
		const floor = new THREE.Mesh(floorGeo, floorMat)
		floor.rotation.x = -Math.PI / 2
		floor.position.y = 0
		group.add(floor)
		disposables.push(floorGeo, floorMat)

		const ceilingGeo = new THREE.PlaneGeometry(width, length)
		const ceilingMat = new THREE.MeshStandardMaterial({
			color: palette.ceiling,
			map: ceilingStuccoMap,
			bumpMap: ceilingStuccoBump,
			bumpScale: 0.14,
			roughness: 0.94,
			metalness: 0.0,
		})
		const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat)
		ceiling.rotation.x = Math.PI / 2
		ceiling.position.y = height
		group.add(ceiling)
		disposables.push(ceilingGeo, ceilingMat)
	}

	const wallMat = new THREE.MeshStandardMaterial({
		color: mode === 'lobby' ? palette.wall : 0xffffff,
		map: wallStuccoMap,
		bumpMap: wallStuccoBump,
		bumpScale: 0.04,
		roughness: 0.88,
		metalness: 0.0,
	})

	const halfW = width / 2
	const halfL = length / 2

	if (mode === 'lobby') {

		const platformHeight = 1.4
		const upperCeilingHeight = height + 1.6
		const platformWidth = 4.0
		const centerWidth = width - 2 * platformWidth

		const northCentralGeo = new THREE.BoxGeometry(centerWidth, upperCeilingHeight, wallThickness)
		const northCentral = new THREE.Mesh(northCentralGeo, wallMat)
		northCentral.position.set(0, upperCeilingHeight / 2, -halfL)
		northCentral.name = 'north-wall-central'
		group.add(northCentral)
		disposables.push(northCentralGeo)

		const northEastGeo = new THREE.BoxGeometry(platformWidth, upperCeilingHeight - platformHeight, wallThickness)
		const northEast = new THREE.Mesh(northEastGeo, wallMat)
		northEast.position.set(centerWidth / 2 + platformWidth / 2, platformHeight + (upperCeilingHeight - platformHeight) / 2, -halfL)
		northEast.name = 'north-wall-east'
		group.add(northEast)
		disposables.push(northEastGeo)

		const northWestGeo = new THREE.BoxGeometry(platformWidth, upperCeilingHeight - platformHeight, wallThickness)
		const northWest = new THREE.Mesh(northWestGeo, wallMat)
		northWest.position.set(-(centerWidth / 2 + platformWidth / 2), platformHeight + (upperCeilingHeight - platformHeight) / 2, -halfL)
		northWest.name = 'north-wall-west'
		group.add(northWest)
		disposables.push(northWestGeo)

		const southCentralGeo = new THREE.BoxGeometry(centerWidth, upperCeilingHeight, wallThickness)
		const southCentral = new THREE.Mesh(southCentralGeo, wallMat)
		southCentral.position.set(0, upperCeilingHeight / 2, halfL)
		southCentral.name = 'south-wall-central'
		group.add(southCentral)
		disposables.push(southCentralGeo)

		const southEastGeo = new THREE.BoxGeometry(platformWidth, upperCeilingHeight - platformHeight, wallThickness)
		const southEast = new THREE.Mesh(southEastGeo, wallMat)
		southEast.position.set(centerWidth / 2 + platformWidth / 2, platformHeight + (upperCeilingHeight - platformHeight) / 2, halfL)
		southEast.name = 'south-wall-east'
		group.add(southEast)
		disposables.push(southEastGeo)

		const southWestGeo = new THREE.BoxGeometry(platformWidth, upperCeilingHeight - platformHeight, wallThickness)
		const southWest = new THREE.Mesh(southWestGeo, wallMat)
		southWest.position.set(-(centerWidth / 2 + platformWidth / 2), platformHeight + (upperCeilingHeight - platformHeight) / 2, halfL)
		southWest.name = 'south-wall-west'
		group.add(southWest)
		disposables.push(southWestGeo)

		const eastWallGeo = new THREE.BoxGeometry(wallThickness, upperCeilingHeight, length)
		const eastWall = new THREE.Mesh(eastWallGeo, wallMat)
		eastWall.position.set(halfW, upperCeilingHeight / 2, 0)
		eastWall.name = 'east-wall'
		group.add(eastWall)
		disposables.push(eastWallGeo)

		const westWallGeo = new THREE.BoxGeometry(wallThickness, upperCeilingHeight, length)
		const westWall = new THREE.Mesh(westWallGeo, wallMat)
		westWall.position.set(-halfW, upperCeilingHeight / 2, 0)
		westWall.name = 'west-wall'
		group.add(westWall)
		disposables.push(westWallGeo)
	} else {

		const wallNSGeo = new THREE.BoxGeometry(width, height, wallThickness)
		const wallEWGeo = new THREE.BoxGeometry(wallThickness, height, length)

		const northWall = new THREE.Mesh(wallNSGeo, wallMat)
		northWall.position.set(0, height / 2, -halfL)
		group.add(northWall)

		const southWall = new THREE.Mesh(wallNSGeo, wallMat)
		southWall.position.set(0, height / 2, halfL)
		group.add(southWall)

		const eastWall = new THREE.Mesh(wallEWGeo, wallMat)
		eastWall.position.set(halfW, height / 2, 0)
		group.add(eastWall)

		const westWall = new THREE.Mesh(wallEWGeo, wallMat)
		westWall.position.set(-halfW, height / 2, 0)
		group.add(westWall)

		disposables.push(wallNSGeo, wallEWGeo)
	}

	disposables.push(wallMat)

	const slots = []
	const doors = []
	const doorHitMeshes = []
	const pickableMeshes = []
	const obstacles = []
	const markers = new THREE.Group()
	markers.name = 'display-slots'

	const surfaceOffset = wallThickness / 2 + 0.02

	let walls
	if (mode === 'lobby') {
		const platformHeight = 1.4
		const upperCeilingHeight = height + 1.6
		const platformWidth = 4.0
		const centerWidth = width - 2 * platformWidth

		walls = {
			north: { center: new THREE.Vector3(0, upperCeilingHeight / 2, -halfL), normal: new THREE.Vector3(0, 0, 1), wallWidth: width, wallHeight: upperCeilingHeight },
			south: { center: new THREE.Vector3(0, upperCeilingHeight / 2, halfL), normal: new THREE.Vector3(0, 0, -1), wallWidth: width, wallHeight: upperCeilingHeight },
			east: {
				center: new THREE.Vector3(halfW, platformHeight + (upperCeilingHeight - platformHeight) / 2, 0),
				normal: new THREE.Vector3(-1, 0, 0),
				wallWidth: length,
				wallHeight: upperCeilingHeight - platformHeight
			},
			west: {
				center: new THREE.Vector3(-halfW, platformHeight + (upperCeilingHeight - platformHeight) / 2, 0),
				normal: new THREE.Vector3(1, 0, 0),
				wallWidth: length,
				wallHeight: upperCeilingHeight - platformHeight
			},
		}
	} else {
		walls = {
			north: { center: new THREE.Vector3(0, height / 2, -halfL), normal: new THREE.Vector3(0, 0, 1), wallWidth: width, wallHeight: height },
			south: { center: new THREE.Vector3(0, height / 2, halfL), normal: new THREE.Vector3(0, 0, -1), wallWidth: width, wallHeight: height },
			east: { center: new THREE.Vector3(halfW, height / 2, 0), normal: new THREE.Vector3(-1, 0, 0), wallWidth: length, wallHeight: height },
			west: { center: new THREE.Vector3(-halfW, height / 2, 0), normal: new THREE.Vector3(1, 0, 0), wallWidth: length, wallHeight: height },
		}
	}

	function makeNoPhotoTexture({ size = 512, title = 'NO PHOTO', subtitle = 'No image available' } = {}) {
		const canvas = document.createElement('canvas')
		canvas.width = size
		canvas.height = size
		const ctx = canvas.getContext('2d')
		if (ctx) {
			ctx.clearRect(0, 0, canvas.width, canvas.height)
			ctx.fillStyle = '#c0c0a9ff'
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			ctx.strokeStyle = 'rgba(0,0,0,0.18)'
			ctx.lineWidth = Math.max(6, Math.floor(size * 0.01))
			ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48)

			ctx.fillStyle = 'rgba(0,0,0,0.9)'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.font = `800 ${Math.floor(size * 0.11)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`
			ctx.fillText(String(title), canvas.width / 2, canvas.height / 2 - Math.floor(size * 0.01))

			ctx.font = `600 ${Math.floor(size * 0.045)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`
			ctx.fillStyle = 'rgba(0,0,0,0.7)'
			ctx.fillText(String(subtitle), canvas.width / 2, canvas.height / 2 + Math.floor(size * 0.09))
		}

		const tex = new THREE.CanvasTexture(canvas)
		tex.colorSpace = THREE.SRGBColorSpace
		configureGalleryTexture(tex)
		return tex
	}

	function makePhotoFrameBackTexture({ size = 1024 } = {}) {
		const canvas = document.createElement('canvas')
		canvas.width = size
		canvas.height = size
		const ctx = canvas.getContext('2d')
		if (ctx) {
			ctx.clearRect(0, 0, canvas.width, canvas.height)
			ctx.fillStyle = '#e0e0d4ff'
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			ctx.strokeStyle = 'rgba(0,0,0,0.18)'
			ctx.lineWidth = Math.max(6, Math.floor(size * 0.01))
			ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48)
		}

		const tex = new THREE.CanvasTexture(canvas)
		tex.colorSpace = THREE.SRGBColorSpace
		tex.premultiplyAlpha = true
		configureGalleryTexture(tex)
		return tex
	}

	const roomCtx = {
		group,
		disposables,
		deferredTextureLoads,
		slots,
		doors,
		doorHitMeshes,
		pickableMeshes,
		obstacles,
		markers,
		palette,
		textures: {
			benchWoodMap,
			benchWoodBump,
		},
		width,
		length,
		height,
		halfW,
		halfL,
		wallThickness,
		surfaceOffset,
		walls,
	}

	roomCtx.doorStyle = {
		frame: { color: 0x1a0f09, roughness: 0.58, metalness: 0.0 },
		door: {
			color: 0xc79a6c,
			roughness: 0.44,
			metalness: 0.0,
			map: doorWoodMap,
			bumpMap: doorWoodBump,
			bumpScale: 0.075,
		},
		fill: { color: 0x0d1015, roughness: 0.95, metalness: 0.0 },
	}

	function addSlot(args) {
		return addSlotToRoom(roomCtx, args)
	}

	function addDoor(args) {
		return addDoorToRoom(roomCtx, args)
	}

	roomCtx.addSlot = addSlot
	roomCtx.addDoor = addDoor

	if (mode === 'lobby') {
		const lobbyRoom = buildLobbyRoom(roomCtx, lobby)
		applyPlacedItems('lobby', {
			group: lobbyRoom.group,
			disposables: lobbyRoom.disposables,
			obstacles: lobbyRoom.obstacles,
			animatedDecorations: lobbyRoom.animatedDecorations,
			slots: lobbyRoom.slots,
			doors: lobbyRoom.doors,
			bounds: lobbyRoom.bounds,
		})
		return { ...lobbyRoom, deferredTextureLoads, roomKey: 'lobby' }
	}

	const photoFrameBackTex = getStaticCache().photoFrameBackTex

	const entryDoorW = 1.25
	const entryDoorH = 2.25 * 1.1
	addDoor({ id: 'entry-door', wall: 'south', w: entryDoorW, h: entryDoorH, u: 0, color: 0xff4455, meta: { target: 'lobby', label: 'Return to Grand Lobby' } })

	{
		const innerSouthZ = halfL - wallThickness / 2
		const doorW = entryDoorW
		const doorH = entryDoorH
		const topY = doorH - 0.36

		const mountZ = innerSouthZ - 0.06
		const mountX = -(doorW / 2 + 0.55)

		const buttonGroup = new THREE.Group()
		buttonGroup.name = 'go-lobby-button'
		buttonGroup.position.set(mountX, 0, mountZ)
		buttonGroup.rotation.y = Math.PI
		group.add(buttonGroup)

		const medallionCenterY = topY - 0.26
		const medallionR = 0.25

		// 1. Outer stepped polished brass architectural escutcheon ring
		const ringGeo = new THREE.CylinderGeometry(medallionR, medallionR * 1.05, 0.024, 48)
		const ringMat = new THREE.MeshStandardMaterial({
			color: 0xd4af37,
			metalness: 0.88,
			roughness: 0.22,
		})
		const ring = new THREE.Mesh(ringGeo, ringMat)
		ring.rotation.x = Math.PI / 2
		ring.position.set(0, medallionCenterY, 0.012)
		buttonGroup.add(ring)
		disposables.push(ringGeo, ringMat)

		// 2. Inner concave emerald / noir lacquer medallion plate
		const coreGeo = new THREE.CylinderGeometry(medallionR * 0.88, medallionR * 0.88, 0.018, 48)
		const coreMat = new THREE.MeshStandardMaterial({
			color: 0x14281e,
			roughness: 0.35,
			metalness: 0.2,
		})
		const core = new THREE.Mesh(coreGeo, coreMat)
		core.rotation.x = Math.PI / 2
		core.position.set(0, medallionCenterY, 0.022)
		buttonGroup.add(core)
		disposables.push(coreGeo, coreMat)

		// 3. Circular high-resolution typography plaque (shared static texture)
		const labelTex = getStaticCache().lobbyMedallionTex

		const labelGeo = new THREE.CircleGeometry(medallionR * 0.84, 48)
		const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
		const label = new THREE.Mesh(labelGeo, labelMat)
		label.position.set(0, medallionCenterY, 0.033)
		buttonGroup.add(label)
		disposables.push(labelGeo, labelMat)

		// 4. Circular Raycast Hit Mesh
		const hitGeo = new THREE.CircleGeometry(medallionR * 1.15, 32)
		const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
		const hit = new THREE.Mesh(hitGeo, hitMat)
		hit.position.set(0, medallionCenterY, 0.04)
		hit.userData.action = 'go-lobby'
		buttonGroup.add(hit)
		pickableMeshes.push(hit)
		disposables.push(hitGeo, hitMat)
	}

	{
		const colHeight = height

		const pillarW = roundTo(clamp(5, 3.0, width - 3.0), 0.05)
		const pillarD = roundTo(clamp(0.3, 0.25, 0.5), 0.05)
		const pillarGeo = new THREE.BoxGeometry(pillarW, colHeight, pillarD)
		const pillarMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			map: pillarMarbleMap,
			bumpMap: pillarMarbleBump,
			bumpScale: 0.06,
			roughness: 0.72,
			metalness: 0.0,
		})
		disposables.push(pillarGeo, pillarMat)

		const pillar = new THREE.Mesh(pillarGeo, pillarMat)
		pillar.name = 'column-center'
		pillar.position.set(0, colHeight / 2, 0)
		group.add(pillar)

		{
			const n = 5
			const z = 0
			const radius = Math.max(0.35, pillarD * 0.48)
			for (let i = 0; i < n; i += 1) {
				const t = n === 1 ? 0.5 : i / (n - 1)
				const x = -pillarW * 0.42 + t * (pillarW * 0.84)
				obstacles.push({ type: 'cylinder', x, z, radius })
			}
		}

		{
			// Move botanical plants to the outer corners/ends of the divider partition wall
			const z = -(pillarD / 2 + 0.55)
			const xs = [-pillarW * 0.46, pillarW * 0.46]
			for (const x of xs) {
				createRealisticGalleryPlant({
					x,
					y: 0,
					z,
					targetGroup: group,
					disposables,
					obstacles,
					name: 'gallery-plant-divider',
				})
			}
		}

		const title = typeof gallery.title === 'string' ? gallery.title.trim() : ''
		const description = typeof gallery.description === 'string' ? gallery.description.trim() : ''
		const longExtract = typeof gallery.longExtract === 'string' ? gallery.longExtract.trim() : ''
		const mainThumbnailUrl = typeof gallery.mainThumbnailUrl === 'string' ? gallery.mainThumbnailUrl.trim() : ''

		// Centered Highlight Artwork on FRONT FACE of partition wall (South-facing)
		const centerCfg = artSizes.centerPartition || {}
		const centerPhotoW = typeof centerCfg.width === 'number' ? centerCfg.width : 3.50
		const centerPhotoH = typeof centerCfg.height === 'number' ? centerCfg.height : 2.50
		const customCenterY = typeof centerCfg.y === 'number' ? centerCfg.y : 2.05
		const panelY = clamp(customCenterY, centerPhotoH / 2 + 0.1, height - centerPhotoH / 2 - 0.05)
		const panelZ = pillarD / 2 + 0.08
		const panelDepth = 0.06

		const panelBackGeo = new THREE.BoxGeometry(centerPhotoW, centerPhotoH, panelDepth)
		const panelBackMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			map: photoFrameBackTex,
			roughness: 0.86,
			metalness: 0.0,
		})
		disposables.push(panelBackGeo, panelBackMat)

		const imgBack = new THREE.Mesh(panelBackGeo, panelBackMat)
		imgBack.position.set(0, panelY, panelZ)
		group.add(imgBack)

		const imgGeo = new THREE.PlaneGeometry(centerPhotoW * 0.94, centerPhotoH * 0.94)
		const imgMat = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			depthWrite: false,
			premultipliedAlpha: true,
		})
		const img = new THREE.Mesh(imgGeo, imgMat)
		img.position.set(0, panelY, panelZ + panelDepth / 2 + 0.002)
		group.add(img)
		disposables.push(imgGeo, imgMat)

		const frontPhotoUrl = localPhotoPath(0) || (gallery.photos && gallery.photos[0]) || mainThumbnailUrl || null
		img.userData = {
			pickable: true,
			isPhoto: true,
			pickableType: 'column-photo',
			photoUrl: frontPhotoUrl,
			photoTitle: gallery.title ? `${gallery.title} • Feature Art` : 'Salon Feature Art',
		}
		pickableMeshes.push(img)

		if (frontPhotoUrl) {
			deferredTextureLoads.push({
				url: frontPhotoUrl,
				onLoad(tex) {
					tex.colorSpace = THREE.SRGBColorSpace
					tex.premultiplyAlpha = true
					configureGalleryTexture(tex)
					fitPhotoToFrame(img, tex, centerPhotoW * 0.94, centerPhotoH * 0.94)
					imgMat.map = tex
					imgMat.color.setHex(0xffffff)
					imgMat.needsUpdate = true
					disposables.push(tex)
				},
				onError(err) {
					console.warn('[OurMuseum] Failed to load front column photo', frontPhotoUrl, err)
					imgMat.map = getStaticCache().noPhotoTex
					imgMat.needsUpdate = true
				},
			})
		} else {
			imgMat.map = getStaticCache().noPhotoTex
			imgMat.needsUpdate = true
		}

		// Centered Highlight Artwork on BACK FACE of partition wall (North-facing)
		const panelZNorth = -(pillarD / 2 + 0.08)

		const backGeo = new THREE.BoxGeometry(centerPhotoW, centerPhotoH, panelDepth)
		const backMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			map: photoFrameBackTex,
			roughness: 0.86,
			metalness: 0.0,
		})
		disposables.push(backGeo, backMat)

		const backMesh = new THREE.Mesh(backGeo, backMat)
		backMesh.position.set(0, panelY, panelZNorth)
		backMesh.rotation.y = Math.PI
		group.add(backMesh)

		const imgGeoNorth = new THREE.PlaneGeometry(centerPhotoW * 0.94, centerPhotoH * 0.94)
		const imgMatNorth = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			depthWrite: false,
			premultipliedAlpha: true,
		})
		const imgNorth = new THREE.Mesh(imgGeoNorth, imgMatNorth)
		imgNorth.position.set(0, panelY, panelZNorth - panelDepth / 2 - 0.002)
		imgNorth.rotation.y = Math.PI
		group.add(imgNorth)
		disposables.push(imgGeoNorth, imgMatNorth)

		const backPhotoUrl = localPhotoPath(1) || (gallery.photos && gallery.photos[1]) || (gallery.photos && gallery.photos[0]) || null
		imgNorth.userData = {
			pickable: true,
			isPhoto: true,
			pickableType: 'column-photo',
			photoUrl: backPhotoUrl,
			photoTitle: gallery.title ? `${gallery.title} • North Feature` : 'Salon North Feature',
		}
		pickableMeshes.push(imgNorth)

		if (backPhotoUrl) {
			deferredTextureLoads.push({
				url: backPhotoUrl,
				onLoad(tex) {
					tex.colorSpace = THREE.SRGBColorSpace
					tex.premultiplyAlpha = true
					configureGalleryTexture(tex)
					fitPhotoToFrame(imgNorth, tex, centerPhotoW * 0.94, centerPhotoH * 0.94)
					imgMatNorth.map = tex
					imgMatNorth.color.setHex(0xffffff)
					imgMatNorth.needsUpdate = true
					disposables.push(tex)
				},
				onError(err) {
					console.warn('[OurMuseum] Failed to load back column photo', backPhotoUrl, err)
					imgMatNorth.map = getStaticCache().noPhotoTex
					imgMatNorth.needsUpdate = true
				},
			})
		} else {
			imgMatNorth.map = getStaticCache().noPhotoTex
			imgMatNorth.needsUpdate = true
		}
	}

	{
		const relatedTitles = Array.isArray(gallery.relatedTitles) ? gallery.relatedTitles.filter(Boolean) : []
		const allCategories = Array.isArray(lobby?.categories) && lobby.categories.length > 0
			? lobby.categories
			: ['Fireside Winter Memories', 'Music & Classical Melodies', 'The Library & Reading Nook', 'Masterpiece Paris Romance', 'The Glass Orangery', 'The Secret Promise Alcove']
		const currentTitle = String(gallery?.title || '').toLowerCase().trim()

		// Build guaranteed valid salon destinations for all doors
		const otherSalons = allCategories.filter(
			(cat) => cat && cat.toLowerCase().trim() !== currentTitle
		)

		const assignedDestinations = []
		// 1. Add specific related titles first
		for (const t of relatedTitles) {
			if (t && t.toLowerCase().trim() !== currentTitle && !assignedDestinations.includes(t)) {
				assignedDestinations.push(t)
			}
		}
		// 2. Add other salons from categories
		for (const t of otherSalons) {
			if (!assignedDestinations.includes(t)) {
				assignedDestinations.push(t)
			}
		}
		// 3. Guarantee every base door (all 6 doors including the 2 North wall gates) has a valid destination
		while (assignedDestinations.length < 6) {
			const fallback = otherSalons[assignedDestinations.length % otherSalons.length] || 'Fireside Winter Memories'
			assignedDestinations.push(fallback)
		}

		const doorH = 2.25 * 1.1
		const cornerMargin = 1.6
		const cornerUSouth = Math.max(-halfL + 1.0, halfL - cornerMargin)
		const cornerUNorth = Math.min(halfL - 1.0, -halfL + cornerMargin)
		const northCornerUEast = Math.min(halfW - 1.0, halfW - cornerMargin)
		const northCornerUWest = Math.max(-halfW + 1.0, -halfW + cornerMargin)

		const baseDoors = [
			{ id: 'seealso-0', wall: 'east', u: cornerUSouth },
			{ id: 'seealso-1', wall: 'west', u: cornerUSouth },
			{ id: 'seealso-2', wall: 'east', u: cornerUNorth },
			{ id: 'seealso-3', wall: 'west', u: cornerUNorth },
			{ id: 'seealso-4', wall: 'north', u: northCornerUEast },
			{ id: 'seealso-5', wall: 'north', u: northCornerUWest },
		]

		for (let i = 0; i < baseDoors.length; i++) {
			const spec = baseDoors[i]
			const title = assignedDestinations[i]
			addDoor({
				id: spec.id,
				wall: spec.wall,
				w: 1.1,
				h: doorH,
				u: spec.u,
				meta: { articleTitle: title, category: title, target: title, label: title },
			})
		}

		const remaining = relatedTitles.slice(baseDoors.length)
		const rn = remaining.length
		if (rn > 0) {
			const wall = 'north'
			const gapU = 0.22
			const usable = Math.max(1.0, width - 2.0)
			const doorW = clamp((usable - (rn - 1) * gapU) / rn, 0.45, 1.25)
			const totalSpan = rn * doorW + (rn - 1) * gapU
			const uStart = -totalSpan / 2 + doorW / 2

			for (let i = 0; i < rn; i += 1) {
				const u = uStart + i * (doorW + gapU)
				const title = String(remaining[i])
				addDoor({
					id: 'seealso-' + (i + 6),
					wall,
					w: doorW,
					h: doorH,
					u,
					meta: { articleTitle: title, category: title, target: title, label: title },
				})
			}
		}
	}

	const stdFrameH = roundTo(clamp(height * 0.36, 1.05, 1.35), 0.05)
	const stdFrameW = roundTo(stdFrameH * 0.707, 0.05)
	const stdFrameY = height * 0.5

	const stdPlaqueH = 0.2
	const stdPlaqueY = height * 0.17
	const stdPlaqueW = roundTo(clamp(stdFrameW, 0.5, 1.05), 0.05)

	function addGridWallSlots(wall, { cols = 4, withPlaques = true, frameScale = 1, gapU = 0.2 } = {}) {
		const rows = 1
		const frameW = stdFrameW * frameScale
		const frameH = stdFrameH * frameScale
		const totalW = cols * frameW + (cols - 1) * gapU
		const uStart = -totalW / 2 + frameW / 2

		let idx = 0
		for (let r = 0; r < rows; r += 1) {
			for (let c = 0; c < cols; c += 1) {
				const u = uStart + c * (frameW + gapU)
				const y = stdFrameY

				const frameId = `${wall}-frame-${idx}`
				addSlot({ id: frameId, wall, kind: 'frame', w: frameW, h: frameH, y, u, color: 0xd9d9de, opacity: 1 })
				if (withPlaques) {
					addSlot({ id: `${wall}-plaque-${idx}`, wall, kind: 'plaque', w: stdPlaqueW, h: stdPlaqueH, y: stdPlaqueY, u, color: 0xffff88 })
				}

				idx += 1
			}
		}
	}

	if (mode === 'lobby') {
		addGridWallSlots('east')
		addGridWallSlots('west')
	} else {
		if (imagePhotos.length === 0 && !localPhotoPath(5)) {
			const innerEastX = halfW - wallThickness / 2
			const decoEast = new THREE.Group()
			decoEast.name = 'deco-east'
			group.add(decoEast)

			const plantZ = 2.0
			createRealisticGalleryPlant({
				x: innerEastX - 0.40,
				y: 0,
				z: -plantZ,
				targetGroup: decoEast,
				disposables,
				obstacles,
				name: 'plant-east-1',
			})
			createRealisticGalleryPlant({
				x: innerEastX - 0.40,
				y: 0,
				z: plantZ,
				targetGroup: decoEast,
				disposables,
				obstacles,
				name: 'plant-east-2',
			})
		} else {
			// East Wall: sequential artworks, zero captions
			const eastCfg = artSizes.eastWall || {}
			const count = typeof eastCfg.count === 'number' ? eastCfg.count : 5
			const gapU = typeof eastCfg.gap === 'number' ? eastCfg.gap : 0.30
			const photoW = typeof eastCfg.width === 'number' ? eastCfg.width : 1.70
			const photoH = typeof eastCfg.height === 'number' ? eastCfg.height : 1.55
			const customEastY = typeof eastCfg.y === 'number' ? eastCfg.y : 2.05
			const y = clamp(customEastY, photoH / 2 + 0.1, height - photoH / 2 - 0.05)
			const totalW = count * photoW + (count - 1) * gapU
			const uStart = -totalW / 2 + photoW / 2

			for (let i = 0; i < count; i += 1) {
				const u = uStart + i * (photoW + gapU)
				addSlot({ id: `east-photo-${i}`, wall: 'east', kind: 'frame', w: photoW, h: photoH, y, u, color: 0xd9d9de, opacity: 1 })
			}
		}

		// West Wall: Narrative memory text panel
		{
			const westCfg = artSizes.westNarrativeBoard || {}
			const panelW = typeof westCfg.width === 'number' ? westCfg.width : 6.60
			const panelH = typeof westCfg.height === 'number' ? westCfg.height : 3.00
			const customWestY = typeof westCfg.y === 'number' ? westCfg.y : 2.30
			const y = clamp(customWestY, panelH / 2 + 0.1, height - panelH / 2 - 0.05)

			addSlot({ id: 'west-text-0', wall: 'west', kind: 'frame', w: panelW, h: panelH, y, u: 0, color: 0xd9d9de, opacity: 1 })
		}

		// North Wall: Single big centered masterpiece artwork
		{
			const northCfg = artSizes.northMasterpiece || {}
			const northW = typeof northCfg.width === 'number' ? northCfg.width : 4.50
			const northH = typeof northCfg.height === 'number' ? northCfg.height : 3.00
			const customNorthY = typeof northCfg.y === 'number' ? northCfg.y : 2.40
			const northY = clamp(customNorthY, northH / 2 + 0.1, height - northH / 2 - 0.05)
			addSlot({ id: 'north-photo-0', wall: 'north', kind: 'frame', w: northW, h: northH, y: northY, u: 0, color: 0xd9d9de, opacity: 1 })
		}

		// South Wall: 2 artworks flanking the entrance gate (1 left, 1 right)
		{
			const southCfg = artSizes.southGateArtworks || {}
			const southW = typeof southCfg.width === 'number' ? southCfg.width : 3.00
			const southH = typeof southCfg.height === 'number' ? southCfg.height : 2.15
			const offsetU = typeof southCfg.doorOffsetU === 'number' ? southCfg.doorOffsetU : 3.20
			const customSouthY = typeof southCfg.y === 'number' ? southCfg.y : 2.05
			const southY = clamp(customSouthY, southH / 2 + 0.1, height - southH / 2 - 0.05)
			addSlot({ id: 'south-photo-0', wall: 'south', kind: 'frame', w: southW, h: southH, y: southY, u: -offsetU, color: 0xd9d9de, opacity: 1 })
			addSlot({ id: 'south-photo-1', wall: 'south', kind: 'frame', w: southW, h: southH, y: southY, u: offsetU, color: 0xd9d9de, opacity: 1 })
		}
	}

	if (mode !== 'lobby') {
		{
			const innerNorthZ = -halfL + wallThickness / 2
			const plantZ = innerNorthZ + 0.40

			const decoNorth = new THREE.Group()
			decoNorth.name = 'deco-north'
			group.add(decoNorth)

			const decoSouth = new THREE.Group()
			decoSouth.name = 'deco-south'
			group.add(decoSouth)

			const plantX = Math.max(2.2, halfW - 0.65)
			createRealisticGalleryPlant({
				x: -plantX,
				y: 0,
				z: plantZ,
				targetGroup: decoNorth,
				disposables,
				obstacles,
				name: 'plant-north-corner-nw',
			})
			createRealisticGalleryPlant({
				x: plantX,
				y: 0,
				z: plantZ,
				targetGroup: decoNorth,
				disposables,
				obstacles,
				name: 'plant-north-corner-ne',
			})

			{
				const innerSouthZ = halfL - wallThickness / 2
				const plantZSouth = innerSouthZ - 0.40
				const plantXSouth = Math.max(2.5, halfW - 0.65)

				createRealisticGalleryPlant({
					x: -plantXSouth,
					y: 0,
					z: plantZSouth,
					targetGroup: decoSouth,
					disposables,
					obstacles,
					name: 'plant-south-left',
				})
				createRealisticGalleryPlant({
					x: plantXSouth,
					y: 0,
					z: plantZSouth,
					targetGroup: decoSouth,
					disposables,
					obstacles,
					name: 'plant-south-right',
				})
			}
		}

		const wallPanelDepth = 0.06
		const wallBackMat = new THREE.MeshStandardMaterial({ color: 0x0d1015, roughness: 0.95, metalness: 0.0 })
		const wallFrameBackMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			map: photoFrameBackTex,
			roughness: 0.86,
			metalness: 0.0,
		})
		disposables.push(wallBackMat, wallFrameBackMat)

		const photos = Array.isArray(gallery.photos)
			? gallery.photos
				.map((u) => (typeof u === 'string' ? u.trim() : ''))
				.filter(Boolean)
			: []

		const imagePhotos = photos.filter(isSupportedImageUrl)
		const description = typeof gallery.description === 'string' ? gallery.description.trim() : ''
		const longExtract = typeof gallery.longExtract === 'string' ? gallery.longExtract.trim() : ''

		function slotFrontOffset(slot, extra = 0.002) {
			const normal = slot.normal.clone().normalize()
			return { normal, backOffset: wallPanelDepth / 2 + extra, frontOffset: wallPanelDepth + extra * 2 }
		}

		function ensureOutlineInFront(slot) {
			if (!slot?.outlineObject) return
			const { normal, frontOffset } = slotFrontOffset(slot, 0.003)
			slot.outlineObject.position.copy(slot.center).add(normal.clone().multiplyScalar(frontOffset))
		}

		function addBackplate({ center, normal, w, h, depth = wallPanelDepth, mat = wallBackMat }) {
			const geo = new THREE.BoxGeometry(w, h, depth)
			const mesh = new THREE.Mesh(geo, mat)
			mesh.position.copy(center).add(normal.clone().multiplyScalar(depth / 2 + 0.002))
			mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
			group.add(mesh)
			disposables.push(geo)
			return mesh
		}

		function slotById(id) {
			return slots.find((s) => s && s.id === id) || null
		}

		function placePhotoInSlot(slot, url, { placeholderTitle = 'NO PHOTO', photoTitle = '' } = {}) {
			if (!slot) return

			const baseW = slot.width * 0.96
			const baseH = slot.height * 0.96
			const { normal, frontOffset } = slotFrontOffset(slot)
			const backplate = addBackplate({ center: slot.center, normal, w: baseW, h: baseH, mat: wallFrameBackMat })

			ensureOutlineInFront(slot)

			const geo = new THREE.PlaneGeometry(1, 1)
			const mat = new THREE.MeshBasicMaterial({
				color: 0xffffff,
				transparent: true,
				depthWrite: false,
				premultipliedAlpha: true,
			})
			const mesh = new THREE.Mesh(geo, mat)
			mesh.scale.set(baseW, baseH, 1)
			mesh.position.copy(slot.center).add(normal.clone().multiplyScalar(frontOffset + 0.004))
			mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
			group.add(mesh)
			disposables.push(geo, mat)

			mesh.userData = {
				...(mesh.userData || {}),
				pickable: true,
				isPhoto: true,
				pickableType: 'wall-photo',
				photoUrl: url || null,
				photoTitle: photoTitle || slot.id || 'Gallery Art',
			}
			pickableMeshes.push(mesh)

			function applyTexture(tex) {
				if (!tex) return
				tex.colorSpace = THREE.SRGBColorSpace
				tex.premultiplyAlpha = true
				configureGalleryTexture(tex)

				fitPhotoToFrame(mesh, tex, baseW, baseH)

				mat.map = tex
				mat.color.setHex(0xffffff)
				mat.needsUpdate = true

				const fittedW = (mesh.geometry.parameters?.width || 1) * mesh.scale.x
				const fittedH = (mesh.geometry.parameters?.height || 1) * mesh.scale.y
				const padW = 0.08
				const padH = 0.08
				const frameW = Math.min(baseW, fittedW + padW)
				const frameH = Math.min(baseH, fittedH + padH)

				if (backplate) {
					backplate.scale.set(frameW / baseW, frameH / baseH, 1)
				}

				if (slot?.outlineObject) {
					slot.outlineObject.scale.set(frameW / (slot.width || baseW), frameH / (slot.height || baseH), 1)
					ensureOutlineInFront(slot)
				}

				disposables.push(tex)
			}


			applyTexture(getStaticCache().noPhotoTex)
			if (url) {
				deferredTextureLoads.push({
					url,
					onLoad: (tex) => applyTexture(tex),
					onError: (err) => {
						console.warn('[OurMuseum] Failed to load wall photo', url, err)
						applyTexture(getStaticCache().noPhotoTex)
					},
				})
			}
		}

		function makeWallTextTexture({ size = 1536, title, text, aspect, startLine = 0, withTitle = true, twoColumn = false } = {}) {
			const maxW = typeof size === 'number' && Number.isFinite(size) ? Math.max(512, Math.floor(size)) : 1536
			const a = typeof aspect === 'number' && Number.isFinite(aspect) && aspect > 0 ? aspect : null

			let canvasW = maxW
			let canvasH = maxW
			if (a) {
				canvasH = Math.round(canvasW / a)
				canvasH = Math.max(640, Math.min(1600, canvasH))
				canvasW = Math.round(canvasH * a)
				if (canvasW > maxW) {
					canvasW = maxW
					canvasH = Math.round(canvasW / a)
				}
			}

			const canvas = document.createElement('canvas')
			canvas.width = canvasW
			canvas.height = canvasH
			const ctx = canvas.getContext('2d')

			let nextLine = Math.max(0, Math.floor(startLine || 0))

			if (ctx) {
				const safeText = String(text || '').trim()
				const isShortNarrative = safeText.length < 800

				if (isShortNarrative) {
					// 1. Obsidian Noir Velvet Background
					const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height)
					bgGrad.addColorStop(0, '#0f121a')
					bgGrad.addColorStop(0.5, '#090b10')
					bgGrad.addColorStop(1, '#05070a')
					ctx.fillStyle = bgGrad
					ctx.fillRect(0, 0, canvas.width, canvas.height)

					// 2. 24k Gilded Double Filigree Frame
					ctx.strokeStyle = '#c5a059'
					ctx.lineWidth = 6
					ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56)

					ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)'
					ctx.lineWidth = 2
					ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80)

					const drawDiamond = (cx, cy, r) => {
						ctx.fillStyle = '#ffd700'
						ctx.beginPath()
						ctx.moveTo(cx, cy - r)
						ctx.lineTo(cx + r, cy)
						ctx.lineTo(cx, cy + r)
						ctx.lineTo(cx - r, cy)
						ctx.closePath()
						ctx.fill()
					}
					drawDiamond(40, 40, 7)
					drawDiamond(canvas.width - 40, 40, 7)
					drawDiamond(40, canvas.height - 40, 7)
					drawDiamond(canvas.width - 40, canvas.height - 40, 7)

					// 3. Header: Salon Title
					ctx.textAlign = 'center'
					ctx.textBaseline = 'middle'
					ctx.fillStyle = '#ffd700'
					ctx.font = 'bold 34px "Cormorant Garamond", Georgia, serif'
					ctx.letterSpacing = '3px'
					ctx.fillText(String(title || 'SANCTUARY DEDICATION').toUpperCase(), canvas.width / 2, 68)

					// Gold Divider Rule
					ctx.fillStyle = '#d4af37'
					ctx.font = '20px serif'
					ctx.fillText('✦ ―――――――――― ✦', canvas.width / 2, 102)

					// 4. Parse Dedication & Body Text
					let dedication = ''
					let quoteBody = safeText
					const match = safeText.match(/^(From\s+[^:]+:\s*)(.*)$/is)
					if (match) {
						dedication = match[1].trim()
						quoteBody = match[2].trim()
					}

					if (dedication) {
						ctx.fillStyle = '#d4af37'
						ctx.font = 'bold 20px "Montserrat", sans-serif'
						ctx.letterSpacing = '2px'
						ctx.fillText(dedication.toUpperCase(), canvas.width / 2, 140)
					}

					// Dynamic Font Size for Quote to Fill Board Beautifully
					let fontSize = 34
					let lineHeight = 50
					if (quoteBody.length < 180) {
						fontSize = 42
						lineHeight = 64
					} else if (quoteBody.length < 320) {
						fontSize = 36
						lineHeight = 54
					} else if (quoteBody.length < 520) {
						fontSize = 32
						lineHeight = 48
					} else {
						fontSize = 28
						lineHeight = 42
					}

					ctx.font = `italic 400 ${fontSize}px "Cormorant Garamond", Georgia, serif`
					ctx.fillStyle = '#fcf8f0'
					ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
					ctx.shadowBlur = 8

					function wrapQuoteText(txt, maxWidth) {
						const words = txt.split(/\s+/g)
						const lines = []
						let cur = ''
						for (const w of words) {
							const next = cur ? `${cur} ${w}` : w
							if (ctx.measureText(next).width <= maxWidth) {
								cur = next
							} else {
								if (cur) lines.push(cur)
								cur = w
							}
						}
						if (cur) lines.push(cur)
						return lines
					}

					const maxQuoteW = canvas.width - 260
					const quoteLines = wrapQuoteText(quoteBody, maxQuoteW)

					const totalTextH = quoteLines.length * lineHeight
					const footerY = canvas.height - 54
					const headerBottomY = dedication ? 155 : 125
					const availableH = Math.max(totalTextH, footerY - headerBottomY - 20)
					const startY = headerBottomY + Math.max(15, (availableH - totalTextH) / 2)

					for (let i = 0; i < quoteLines.length; i++) {
						ctx.fillText(quoteLines[i], canvas.width / 2, startY + i * lineHeight)
					}

					ctx.shadowBlur = 0

					// 5. Signature / Footer
					ctx.fillStyle = '#c5a059'
					ctx.font = 'italic 22px "Cormorant Garamond", Georgia, serif'
					const sanctuaryFooter = (typeof window !== 'undefined' && window.__museumConfig?.museum?.sanctuarySignboardFooter) || '— Maya & Ethan • The Eternal Sanctuary —'
					ctx.fillText(sanctuaryFooter, canvas.width / 2, footerY)

					nextLine = quoteLines.length
				} else {
					ctx.clearRect(0, 0, canvas.width, canvas.height)
					ctx.fillStyle = 'rgba(0,0,0,0.85)'
					ctx.fillRect(0, 0, canvas.width, canvas.height)

					ctx.strokeStyle = '#c5a059'
					ctx.lineWidth = 4
					ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48)

					const pad = 52
					let y = pad + 10

					const safeTitle = String(title || 'Wikipedia')
					ctx.textAlign = 'left'
					ctx.textBaseline = 'alphabetic'

					if (withTitle) {
						ctx.fillStyle = '#ffd700'
						const titleFontSize = Math.min(52, Math.floor(maxW * 0.052))
						ctx.font = `800 ${titleFontSize}px "Cormorant Garamond", serif`
						ctx.fillText(safeTitle, pad, y)
						y += 65
					}

					const bodyFontSize = 26
					ctx.font = `500 ${bodyFontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`
					ctx.fillStyle = 'rgba(255,255,255,0.92)'

					function wrapText(txt, maxWidth) {
						const words = String(txt).trim().split(/\s+/g)
						const lines = []
						let cur = ''
						for (const w of words) {
							const next = cur ? `${cur} ${w}` : w
							if (ctx.measureText(next).width <= maxWidth) {
								cur = next
								continue
							}
							if (cur) lines.push(cur)
							cur = w
						}
						if (cur) lines.push(cur)
						return lines
					}

					const maxWidth = canvas.width - pad * 2
					const lineHeight = Math.floor(bodyFontSize * 1.35)
					const allLines = []
					const paragraphs = safeText.split(/\n{2,}/g)
					for (const para of paragraphs) {
						const lines = wrapText(para, (maxWidth - pad) / 2)
						for (const l of lines) allLines.push(l)
						allLines.push('')
					}

					const columnWidth = (maxWidth - pad) / 2
					let i = nextLine
					let leftY = y
					let rightY = y
					let currentColumn = 0

					while (i < allLines.length) {
						const line = allLines[i]
						if (currentColumn === 0) {
							if (line) {
								ctx.fillText(line, pad, leftY)
								leftY += lineHeight
							} else {
								leftY += Math.floor(lineHeight * 0.55)
							}
							if (leftY > canvas.height - pad) currentColumn = 1
						} else {
							if (line) {
								ctx.fillText(line, pad + columnWidth + pad, rightY)
								rightY += lineHeight
							} else {
								rightY += Math.floor(lineHeight * 0.55)
							}
							if (rightY > canvas.height - pad) break
						}
						i += 1
					}
					nextLine = i
				}
			}

			const tex = new THREE.CanvasTexture(canvas)
			tex.colorSpace = THREE.SRGBColorSpace
			configureGalleryTexture(tex)
			tex.needsUpdate = true
			return { tex, nextLine }
		}

		function placeTextInSlot(slot, { title, text, startLine = 0, withTitle = true, twoColumn = false } = {}) {
			if (!slot) return

			const baseW = slot.width * 0.96
			const baseH = slot.height * 0.96

			const { normal, frontOffset } = slotFrontOffset(slot)

			addBackplate({ center: slot.center, normal, w: baseW, h: baseH, mat: panelMarbleBackMat })
			ensureOutlineInFront(slot)

			const geo = new THREE.PlaneGeometry(baseW, baseH)
			const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })
			const mesh = new THREE.Mesh(geo, mat)

			mesh.position.copy(slot.center).add(normal.clone().multiplyScalar(frontOffset + 0.004))
			mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)

			group.add(mesh)
			disposables.push(geo, mat)

			const { tex, nextLine } = makeWallTextTexture({ size: 1024, title, text, aspect: baseW / baseH, startLine, withTitle, twoColumn })
			mat.map = tex
			mat.color.setHex(0xffffff)
			mat.needsUpdate = true
			disposables.push(tex)

			return nextLine
		}

		{
			const galleryTitle = typeof gallery.title === 'string' ? gallery.title.trim() : ''

			// North wall masterpiece (photo index 2)
			const northSlot = slotById('north-photo-0')
			if (northSlot) {
				const northUrl = localPhotoPath(2) || photos[2] || photos[0] || null
				placePhotoInSlot(northSlot, northUrl, { placeholderTitle: 'Masterpiece', photoTitle: galleryTitle ? `${galleryTitle} • Masterpiece` : 'North Masterpiece' })
			}

			// South wall flanking gate (photo indices 3 and 4)
			const southSlot0 = slotById('south-photo-0')
			if (southSlot0) {
				const s0Url = localPhotoPath(3) || photos[3] || photos[1] || null
				placePhotoInSlot(southSlot0, s0Url, { placeholderTitle: 'Gallery Art', photoTitle: galleryTitle ? `${galleryTitle} • South Wing I` : 'South Wing I' })
			}
			const southSlot1 = slotById('south-photo-1')
			if (southSlot1) {
				const s1Url = localPhotoPath(4) || photos[4] || photos[2] || null
				placePhotoInSlot(southSlot1, s1Url, { placeholderTitle: 'Gallery Art', photoTitle: galleryTitle ? `${galleryTitle} • South Wing II` : 'South Wing II' })
			}

			// East wall (sequential photos, zero captions, photo indices starting at 5)
			const eastCount = typeof artSizes.eastWall?.count === 'number' ? artSizes.eastWall.count : 5
			for (let i = 0; i < eastCount; i += 1) {
				const slot = slotById(`east-photo-${i}`)
				if (slot) {
					const photoIdx = 5 + i
					const photoUrl = localPhotoPath(photoIdx) || photos[photoIdx] || photos[i % photos.length] || null
					placePhotoInSlot(slot, photoUrl, { placeholderTitle: 'Gallery Art', photoTitle: galleryTitle ? `${galleryTitle} • Artwork #${i + 1}` : `Artwork #${i + 1}` })
				}
			}
		}

		{
			const galleryTitle = typeof gallery.title === 'string' ? gallery.title.trim() : ''
			const source = (longExtract || description || '').trim() || 'No additional info available'

			const panel0 = slotById('west-text-0')

			placeTextInSlot(panel0, { title: galleryTitle || 'Sanctuary Dedication', text: source, startLine: 0, withTitle: true, twoColumn: source.length > 700 })
		}

		// Apply curated, non-blocking realistic decorations & artefacts for this salon
		applyRoomDecorations({
			title: gallery.title || '',
			roomKey: currentRoomKey,
			group,
			disposables,
			obstacles,
			halfW,
			halfL,
			height,
			animatedDecorations,
		})

		// Apply customized placed items from museumLayout.json
		applyPlacedItems(currentRoomKey, {
			group,
			disposables,
			obstacles,
			animatedDecorations,
			slots,
			doors,
			bounds: {
				halfW,
				halfL,
				height,
			},
		})
	}

	group.add(markers)

	return {
		group,
		disposables,
		deferredTextureLoads,
		slots,
		doors,
		doorHitMeshes,
		pickableMeshes,
		obstacles,
		animatedDecorations,
		roomKey: currentRoomKey,
		bounds: {
			halfW,
			halfL,
			height,
		},
	}
}
