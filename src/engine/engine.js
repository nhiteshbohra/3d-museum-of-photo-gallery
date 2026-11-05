import * as THREE from 'three'
import { buildRoom, deriveRoomKey } from '../game/room.js'
import { computeDesiredMovement, calculateFacingYaw, smoothAngle } from '../avatars/motionMath.js'
import { updateLodSwitchers, updateDebugSeatsHud, whenPlacedItemsLoaded } from '../game/room/placedItems.js'
import { disposeSharedRoomMaterialTextures } from '../game/room/textures.js'
import { disposeStaticCache } from '../game/room/staticCache.js'
import { hashStringToUint32, mulberry32, randRange, roundTo, setBodyClickableCursor } from '../misc/helper.js'

export function startYourEngines({
	canvas,
	onFps,
	onPointerLockChange,
	onHeading,
	onDoorTrigger,
	onDoorHover,
	onDoorProximity,
	onRandomExhibitRequested,
	onGoLobbyRequested,
	onPhotoClick,
	roomSeedTitle = 'Lobby',
	roomMode = 'gallery',
	lobbyCategories,
	roomSpawn,
	galleryRelatedTitles,
	galleryTitle,
	galleryDescription,
	galleryMainThumbnailUrl,
	galleryPhotos,
	galleryVideoUrl,
	galleryLongExtract,
}) {
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
	renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2))

	if ('outputColorSpace' in renderer) {
		renderer.outputColorSpace = THREE.SRGBColorSpace
	}
	if ('toneMapping' in renderer) {
		renderer.toneMapping = THREE.ACESFilmicToneMapping
		renderer.toneMappingExposure = 1.35
	}

	const scene = new THREE.Scene()
	scene.background = new THREE.Color(0x05030a)

	const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200)
	const eyeHeight = 1.7
	camera.position.set(0, eyeHeight, 3)
	camera.rotation.order = 'YXZ'
	scene.add(camera)

	const flashlightTarget = new THREE.Object3D()
	flashlightTarget.position.set(0, 0, -1)
	camera.add(flashlightTarget)

	const flashlight = new THREE.SpotLight(0xffffff, 3.0, 7, Math.PI / 80, 0.2, 1.6)
	flashlight.position.set(0, 0, 0)
	flashlight.target = flashlightTarget
	camera.add(flashlight)
	flashlight.visible = false
	let flashlightTimeoutId = 0

	let prePlayIdleTime = 0

	const staticDisposables = []
	staticDisposables.push({
		dispose: disposeSharedRoomMaterialTextures,
	})

	let currentRoom = null
	let halfW = 6
	let halfL = 6
	let currentRoomDoors = []
	let doorById = new Map()
	let doorHitMeshes = []
	let doorHitById = new Map()
	let roomObstacles = []
	let pickableMeshes = []
	let interactionLocked = false

	let deferredTextureLoadToken = 0
	let lastDoorTriggerTime = 0
	const loadedPhotoTextureCache = new Map()

	function loadTextureAsync(url) {
		const key = String(url || '').trim()
		if (!key) return Promise.reject(new Error('Empty url'))
		if (loadedPhotoTextureCache.has(key)) {
			return Promise.resolve(loadedPhotoTextureCache.get(key))
		}
		const loader = new THREE.TextureLoader()
		if (typeof loader.setCrossOrigin === 'function') loader.setCrossOrigin('anonymous')
		return new Promise((resolve, reject) => {
			loader.load(
				key,
				(tex) => {
					loadedPhotoTextureCache.set(key, tex)
					resolve(tex)
				},
				undefined,
				reject
			)
		})
	}

	async function runDeferredTextureLoads(room, token) {
		const jobs = Array.isArray(room?.deferredTextureLoads) ? room.deferredTextureLoads : []
		// Each room has at most ten photos; one slow image must not block the rest.
		await Promise.all(jobs.map(async (job) => {
			if (token !== deferredTextureLoadToken || currentRoom !== room) return
			const url = typeof job?.url === 'string' ? job.url.trim() : ''
			if (!url) return
			try {
				if (!loadedPhotoTextureCache.has(url)) {
					await new Promise((resolve) => window.requestAnimationFrame(resolve))
				}
				if (token !== deferredTextureLoadToken || currentRoom !== room) return
				const tex = await loadTextureAsync(url)
				if (token !== deferredTextureLoadToken || currentRoom !== room) return
				if (typeof job.onLoad === 'function') job.onLoad(tex)
			} catch (err) {
				if (token !== deferredTextureLoadToken || currentRoom !== room) return
				if (typeof job.onError === 'function') job.onError(err)
			}
		}))
	}

	const holdAnchor = new THREE.Object3D()
	holdAnchor.position.set(0, 0, -0.6)
	camera.add(holdAnchor)

	let held = null

	function forEachMaterial(obj, fn) {
		if (!obj) return
		obj.traverse((child) => {
			const m = child && child.material
			if (!m) return
			if (Array.isArray(m)) {
				for (const mm of m) fn(mm, child)
			} else {
				fn(m, child)
			}
		})
	}

	function releaseHeld() {
		if (!held) return
		const {
			obj,
			originalParent,
			originalPosition,
			originalQuaternion,
			originalScale,
			originalRenderOrder,
			originalMaterialState,
		} = held

		if (obj && obj.parent) {
			obj.parent.remove(obj)
		}

		if (originalParent) {
			originalParent.add(obj)
			obj.position.copy(originalPosition)
			obj.quaternion.copy(originalQuaternion)
			obj.scale.copy(originalScale)
		}

		if (obj) {
			obj.renderOrder = originalRenderOrder
			forEachMaterial(obj, (mat, child) => {
				const state = originalMaterialState.get(mat)
				if (!state) return
				mat.depthTest = state.depthTest
				mat.depthWrite = state.depthWrite
				if ('transparent' in mat) mat.transparent = state.transparent
				if ('opacity' in mat) mat.opacity = state.opacity
				if (child) child.renderOrder = state.renderOrder
				mat.needsUpdate = true
			})
		}

		held = null
	}

	function holdObject(obj) {
		if (!obj) return

		if (held && held.obj === obj) {
			releaseHeld()
			return
		}

		if (held) releaseHeld()

		const originalParent = obj.parent
		const originalPosition = obj.position.clone()
		const originalQuaternion = obj.quaternion.clone()
		const originalScale = obj.scale.clone()
		const originalRenderOrder = obj.renderOrder
		const originalMaterialState = new Map()

		if (originalParent) originalParent.remove(obj)
		holdAnchor.add(obj)
		obj.position.set(0, 0, 0)
		obj.quaternion.identity()
		obj.scale.copy(originalScale)

		obj.renderOrder = 9999
		forEachMaterial(obj, (mat, child) => {
			if (!originalMaterialState.has(mat)) {
				originalMaterialState.set(mat, {
					depthTest: mat.depthTest,
					depthWrite: mat.depthWrite,
					transparent: 'transparent' in mat ? mat.transparent : undefined,
					opacity: 'opacity' in mat ? mat.opacity : undefined,
					renderOrder: child ? child.renderOrder : 0,
				})
			}

			mat.depthTest = false
			mat.depthWrite = false
			if ('transparent' in mat) mat.transparent = true
			if ('opacity' in mat) mat.opacity = Math.min(1, mat.opacity ?? 1)
			if (child) child.renderOrder = 9999
			mat.needsUpdate = true
		})

		holdAnchor.updateWorldMatrix(true, true)
		obj.updateWorldMatrix(true, true)

		const box = new THREE.Box3().setFromObject(obj)
		const size = new THREE.Vector3()
		const centerWorld = new THREE.Vector3()
		box.getSize(size)

		box.getCenter(centerWorld)
		const centerInHold = holdAnchor.worldToLocal(centerWorld.clone())
		obj.position.sub(centerInHold)
		obj.updateWorldMatrix(true, true)

		const baseDistance = Math.max(0.35, (camera.near ?? 0.1) + 0.15)
		const depthPad = (size.z || 0) * 0.5
		const distance = Math.max(baseDistance, (camera.near ?? 0.1) + 0.1 + depthPad)
		holdAnchor.position.set(0, 0, -distance)

		const vFovRad = THREE.MathUtils.degToRad((camera.fov || 60) * 0.5)
		const viewHeight = 2 * distance * Math.tan(vFovRad)
		const viewWidth = viewHeight * (camera.aspect || 1)

		const safeW = (size.x || 1e-6)
		const safeH = (size.y || 1e-6)

		const marginPx = 50
		const vw = canvas.clientWidth || 0
		const vh = canvas.clientHeight || 0
		const padX = vw > 0 ? Math.max(0.1, (vw - 2 * marginPx) / vw) : 0.94
		const padY = vh > 0 ? Math.max(0.1, (vh - 2 * marginPx) / vh) : 0.94

		const scaleToFit = Math.min((viewWidth * padX) / safeW, (viewHeight * padY) / safeH)
		if (Number.isFinite(scaleToFit) && scaleToFit > 0) {
			obj.scale.copy(originalScale).multiplyScalar(scaleToFit)
		}

		obj.updateWorldMatrix(true, true)
		box.setFromObject(obj)
		box.getCenter(centerWorld)
		const centerInHoldAfterScale = holdAnchor.worldToLocal(centerWorld.clone())
		obj.position.sub(centerInHoldAfterScale)

		held = {
			obj,
			originalParent,
			originalPosition,
			originalQuaternion,
			originalScale,
			originalRenderOrder,
			originalMaterialState,
		}
	}

	let yaw = 0
	let pitch = 0

	const velocity = new THREE.Vector3(0, 0, 0)
	let currentVelX = 0
	let currentVelZ = 0
	let avatarBodyYaw = 0
	let lastMovementInputZ = 0
	let lastMovementViewYaw = 0
	const gravity = -18
	const jumpSpeed = 6.2
	const moveSpeed = 2.4
	const sprintMultiplier = 2.0
	let grounded = false

	function disposeMany(items) {
		for (const d of items) {
			if (d && typeof d.dispose === 'function') {
				if (d.isTexture && Array.from(loadedPhotoTextureCache.values()).includes(d)) continue
				d.dispose()
			}
		}
	}

	function yawForFacingWall(wall) {
		if (wall === 'south') return 0
		if (wall === 'north') return Math.PI
		if (wall === 'west') return Math.PI / 2
		if (wall === 'east') return -Math.PI / 2
		return 0
	}

	function applySpawn(spawn, doors = []) {
		if (!spawn) return

		try {
			if (spawn.type === 'center') {
				camera.position.set(0, eyeHeight, 0)
				yaw = typeof spawn.yaw === 'number' ? spawn.yaw : 0
				pitch = typeof spawn.pitch === 'number' ? spawn.pitch : 0
				camera.rotation.y = yaw
				camera.rotation.x = pitch
				velocity.set(0, 0, 0)
				currentVelX = 0
				currentVelZ = 0
				avatarBodyYaw = yaw
				grounded = true
				return
			}

			if (spawn.type === 'atDoor') {
				const doorList = Array.isArray(doors) && doors.length > 0 ? doors : (Array.isArray(currentRoomDoors) ? currentRoomDoors : [])
				let targetDoor = null
				if (spawn.doorId) {
					targetDoor = doorList.find((d) => d && d.id === spawn.doorId)
				}
				if (!targetDoor && spawn.category) {
					const catLower = String(spawn.category).toLowerCase().trim()
					targetDoor = doorList.find((d) => {
						if (!d) return false
						const c = String(d.category || d.articleTitle || '').toLowerCase().trim()
						return c === catLower || c.includes(catLower) || catLower.includes(c)
					})
				}
				if (!targetDoor && spawn.articleTitle) {
					const artLower = String(spawn.articleTitle).toLowerCase().trim()
					targetDoor = doorList.find((d) => {
						if (!d) return false
						const c = String(d.articleTitle || d.category || '').toLowerCase().trim()
						return c === artLower || c.includes(artLower) || artLower.includes(c)
					})
				}

				if (targetDoor && targetDoor.position && targetDoor.normal) {
					const margin = 1.5
					const spawnX = targetDoor.position.x + targetDoor.normal.x * margin
					const spawnZ = targetDoor.position.z + targetDoor.normal.z * margin

					let floorY = typeof targetDoor.platformHeight === 'number' ? targetDoor.platformHeight : 0
					for (const o of roomObstacles) {
						if (!o || o.type !== 'floor') continue
						const ox = typeof o.x === 'number' ? o.x : 0
						const oz = typeof o.z === 'number' ? o.z : 0
						const w = typeof o.w === 'number' ? o.w : 0
						const d = typeof o.d === 'number' ? o.d : 0
						if (Math.abs(spawnX - ox) <= w / 2 && Math.abs(spawnZ - oz) <= d / 2) {
							if (typeof o.y === 'number' && o.y > floorY) {
								floorY = o.y
							}
						}
					}

					camera.position.set(spawnX, floorY + eyeHeight, spawnZ)
					yaw = Math.atan2(-targetDoor.normal.x, -targetDoor.normal.z)
					pitch = 0
					camera.rotation.y = yaw
					camera.rotation.x = pitch
					velocity.set(0, 0, 0)
					currentVelX = 0
					currentVelZ = 0
					avatarBodyYaw = yaw
					grounded = true
					return
				}

				// Fallback to fromWall south if no door matched
				const margin = 1.5
				camera.position.set(0, eyeHeight, halfL - margin)
				yaw = 0
				pitch = 0
				camera.rotation.y = yaw
				camera.rotation.x = pitch
				velocity.set(0, 0, 0)
				currentVelX = 0
				currentVelZ = 0
				avatarBodyYaw = yaw
				grounded = true
				return
			}

			if (spawn.type === 'fromWall') {
				const wall = spawn.wall
				const margin = 1.5

				let x = 0
				let z = 0
				if (wall === 'west') x = -halfW + margin
				else if (wall === 'east') x = halfW - margin
				else if (wall === 'north') z = -halfL + margin
				else if (wall === 'south') z = halfL - margin

				camera.position.set(x, eyeHeight, z)
				yaw = yawForFacingWall(wall)
				pitch = 0
				camera.rotation.y = yaw
				camera.rotation.x = pitch
				velocity.set(0, 0, 0)
				currentVelX = 0
				currentVelZ = 0
				avatarBodyYaw = yaw
				grounded = true
			}
		} catch (err) {
			console.warn('[OurMuseum] applySpawn error:', err)
			camera.position.set(0, eyeHeight, halfL - 1.5)
			yaw = 0
			pitch = 0
			camera.rotation.y = yaw
			camera.rotation.x = pitch
			velocity.set(0, 0, 0)
			currentVelX = 0
			currentVelZ = 0
			avatarBodyYaw = yaw
			grounded = true
		}
	}

	let lastLoadedRoomParams = null

	// Room LRU Cache (max 3 cached rooms)
	const MAX_CACHED_ROOMS = 3
	const roomCache = new Map()
	const prebuildingPromises = new Map()

	function getRoomCacheKey(params) {
		if (!params || params.mode === 'lobby') return 'lobby'
		const t = params.galleryTitle || params.seedTitle || ''
		return 'gallery:' + String(t).toLowerCase().trim()
	}

	function evictExcessRooms() {
		while (roomCache.size > MAX_CACHED_ROOMS) {
			let oldestKey = null
			for (const [k, r] of roomCache.entries()) {
				if (r !== currentRoom) {
					oldestKey = k
					break
				}
			}
			if (!oldestKey) break
			const evicted = roomCache.get(oldestKey)
			roomCache.delete(oldestKey)
			if (evicted) {
				scene.remove(evicted.group)
				disposeMany(evicted.disposables)
			}
		}
	}

	function buildRoomInstance(params) {
		const {
			mode,
			seedTitle,
			categories,
			galleryEntryWall,
			galleryRelatedTitles: relatedTitles,
			galleryTitle: nextGalleryTitle,
			galleryDescription: nextGalleryDescription,
			galleryMainThumbnailUrl: nextGalleryMainThumbnailUrl,
			galleryPhotos: nextGalleryPhotos,
			galleryVideoUrl: nextGalleryVideoUrl,
			galleryLongExtract: nextGalleryLongExtract,
			galleryTrail: nextGalleryTrail,
		} = params

		const wallThickness = 0.2
		let roomWidth = 21
		let roomLength = 18
		let roomHeight = 4

		if (mode === 'lobby') {
			const catCount = Array.isArray(categories) ? categories.length : 0
			const doorsPerSide = Math.max(1, Math.ceil(catCount / 2))
			const doorW = 1.25
			const gapU = 1.1
			const extraEachSide = 2.0
			const spanNeeded = doorsPerSide * doorW + Math.max(0, doorsPerSide - 1) * gapU
			roomLength = roundTo(spanNeeded + extraEachSide * 3, 0.25)
		} else {
			const seed = hashStringToUint32(String(seedTitle))
			const rand = mulberry32(seed)
			roomWidth = roundTo(randRange(rand, 12, 18), 0.25) // west-east
			roomLength = roundTo(randRange(rand, 14, 16), 0.25) // south-north
		}

		const roomKey = mode === 'lobby' ? 'lobby' : deriveRoomKey({ mode, title: nextGalleryTitle })

		const nextRoom = buildRoom({
			width: roomWidth,
			length: roomLength,
			height: roomHeight,
			wallThickness,
			mode,
			roomKey,
			lobby: {
				categories,
			},
			gallery: {
				entryWall: galleryEntryWall,
				relatedTitles,
				title: nextGalleryTitle,
				description: nextGalleryDescription,
				mainThumbnailUrl: nextGalleryMainThumbnailUrl,
				photos: nextGalleryPhotos,
				videoUrl: nextGalleryVideoUrl,
				longExtract: nextGalleryLongExtract,
				trail: Array.isArray(nextGalleryTrail) ? nextGalleryTrail : [],
			},
		})
		nextRoom.roomKey = roomKey
		return nextRoom
	}

	async function prebuildRoom(params) {
		const key = getRoomCacheKey(params)
		if (roomCache.has(key)) return roomCache.get(key)
		if (prebuildingPromises.has(key)) return await prebuildingPromises.get(key)

		const p = (async () => {
			try {
				const room = buildRoomInstance(params)
				roomCache.set(key, room)
				evictExcessRooms()
				try {
					if (typeof renderer.compile === 'function') {
						renderer.compile(room.group, camera)
					}
				} catch (_) {}
				return room
			} finally {
				prebuildingPromises.delete(key)
			}
		})()

		prebuildingPromises.set(key, p)
		return await p
	}

	async function loadRoom({
		mode,
		seedTitle,
		categories,
		galleryEntryWall,
		galleryRelatedTitles: relatedTitles,
		galleryTitle: nextGalleryTitle,
		galleryDescription: nextGalleryDescription,
		galleryMainThumbnailUrl: nextGalleryMainThumbnailUrl,
		galleryPhotos: nextGalleryPhotos,
		galleryVideoUrl: nextGalleryVideoUrl,
		galleryLongExtract: nextGalleryLongExtract,
		galleryTrail: nextGalleryTrail,
		spawn,
	}) {
		const params = {
			mode,
			seedTitle,
			categories,
			galleryEntryWall,
			galleryRelatedTitles: relatedTitles,
			galleryTitle: nextGalleryTitle,
			galleryDescription: nextGalleryDescription,
			galleryMainThumbnailUrl: nextGalleryMainThumbnailUrl,
			galleryPhotos: nextGalleryPhotos,
			galleryVideoUrl: nextGalleryVideoUrl,
			galleryLongExtract: nextGalleryLongExtract,
			galleryTrail: nextGalleryTrail,
		}
		lastLoadedRoomParams = params

		const cacheKey = getRoomCacheKey(params)
		let nextRoom = roomCache.get(cacheKey)

		if (nextRoom) {
			// Room was prebuilt or cached in LRU!
			roomCache.delete(cacheKey)
			roomCache.set(cacheKey, nextRoom)
		} else if (prebuildingPromises.has(cacheKey)) {
			nextRoom = await prebuildingPromises.get(cacheKey)
			roomCache.delete(cacheKey)
			roomCache.set(cacheKey, nextRoom)
		} else {
			nextRoom = buildRoomInstance(params)
			roomCache.set(cacheKey, nextRoom)
			evictExcessRooms()
		}

		if (currentRoom) {
			if (held) releaseHeld()
			scene.remove(currentRoom.group)
			let isCached = false
			for (const r of roomCache.values()) {
				if (r === currentRoom) { isCached = true; break }
			}
			if (!isCached) {
				disposeMany(currentRoom.disposables)
			}
		}

		currentRoom = nextRoom
		scene.add(currentRoom.group)
		applyAmbiencePreset()
		// Phase 4: Stream placed models in background so room shell renders immediately
		whenPlacedItemsLoaded().catch(err => console.warn('[PlacedItems] Stream warning:', err))

		try {
			if (typeof renderer.compileAsync === 'function') {
				await renderer.compileAsync(scene, camera)
			} else if (typeof renderer.compile === 'function') {
				renderer.compile(scene, camera)
			}
		} catch (_) {}

		deferredTextureLoadToken += 1
		const deferredToken = deferredTextureLoadToken
		// Stream photo textures in the background so the first usable room frame is
		// never blocked on network downloads; textures pop in as they finish.
		Promise.resolve().then(() => runDeferredTextureLoads(nextRoom, deferredToken)).catch(err => console.warn('[OurMuseum] Photo loading failed', err))

		halfW = currentRoom.bounds?.halfW ?? halfW
		halfL = currentRoom.bounds?.halfL ?? halfL

		const doors = Array.isArray(currentRoom.doors) ? currentRoom.doors : []
		currentRoomDoors = doors
		doorById = new Map(doors.map((d) => [d.id, d]))
		doorHitMeshes = Array.isArray(currentRoom.doorHitMeshes) ? currentRoom.doorHitMeshes : []
		doorHitById = new Map(
			doorHitMeshes
				.map((m) => {
					const id = m?.userData?.doorId
					return typeof id === 'string' && id ? [id, m] : null
				})
				.filter(Boolean)
		)
		roomObstacles = Array.isArray(currentRoom.obstacles) ? currentRoom.obstacles : []
		pickableMeshes = Array.isArray(currentRoom.pickableMeshes) ? currentRoom.pickableMeshes : []

		applySpawn(spawn, doors)
		interactionLocked = false

		// Notify Placement Studio of room context change
		try {
			window.dispatchEvent(new CustomEvent('museum:roombuilt', {
				detail: {
					roomKey,
					slots: Array.isArray(currentRoom.slots) ? currentRoom.slots : [],
					doors,
					obstacles: roomObstacles,
					bounds: currentRoom.bounds || { halfW, halfL },
				},
			}))
		} catch (_) {}
	}

	const ready = loadRoom({
		mode: roomMode,
		seedTitle: roomSeedTitle,
		categories: lobbyCategories,
		galleryRelatedTitles,
		galleryTitle,
		galleryDescription,
		galleryMainThumbnailUrl,
		galleryPhotos,
		galleryVideoUrl,
		galleryLongExtract,
		spawn: roomSpawn,
	})
	const raycaster = new THREE.Raycaster()
	const rayNdc = new THREE.Vector2(0, 0)

	function computeIsAimingAtClickable() {
		if (!isPointerLocked()) return false
		if (interactionLocked) return false
		if (held) return true

		const candidates = []
		if (doorHitMeshes.length) candidates.push(...doorHitMeshes)
		if (pickableMeshes.length) candidates.push(...pickableMeshes)
		if (candidates.length === 0) return false

		raycaster.setFromCamera(rayNdc, activeCamera || camera)
		const hits = raycaster.intersectObjects(candidates, true)
		if (hits.length === 0) return false

		const hitPoint = hits[0]?.point
		const interactMaxDistance = 6.0
		if (hitPoint && typeof hitPoint.distanceTo === 'function') {
			const d = hitPoint.distanceTo(camera.position)
			if (d > interactMaxDistance) return false
		}

		const doorId = findDoorId(hits[0]?.object)
		if (doorId) {
			const door = doorById.get(doorId)
			if (!doorHasTriggerTarget(door)) return false
			if (typeof onDoorHover === 'function') {
				onDoorHover(door)
			}
		}
		return true
	}

	const keysDown = new Set()
	let jumpRequested = false
	let touchMoveX = 0
	let touchMoveZ = 0
	let isMobileActive = false

	// Camera modes: 'follow' (third-person rear) vs 'orbit' (independent 360° free orbit)
	let cameraMode = 'follow'
	let cameraYawOffset = 0
	let targetYawOffset = null
	let currentZoomDistance = 3.2
	let targetZoomDistance = 3.2
	let onCameraModeChangeCallback = null

	function onKeyDown(e) {
		// Ignore typing, overlays and pre-entry keys: never accumulate phantom movement.
		if (!document.body.classList.contains('in-sanctuary')) return
		if (document.getElementById('hud-animations-drawer')?.classList.contains('drawer-open')) return
		if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
		keysDown.add(e.code)
		if (e.code === 'Space') jumpRequested = true
		if (isPointerLocked() && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
			e.preventDefault()
		}
	}

	function onKeyUp(e) {
		keysDown.delete(e.code)
	}

	function clearMovementKeys() {
		keysDown.clear()
		jumpRequested = false
		lastMovementInputZ = 0
		currentVelX = 0
		currentVelZ = 0
	}
	window.addEventListener('keydown', onKeyDown)
	window.addEventListener('keyup', onKeyUp)
	window.addEventListener('blur', clearMovementKeys)

	const mouseSensitivity = 0.0022

	function headingFromYaw(yawRad) {
		let deg = ((-yawRad * 180) / Math.PI) % 360
		if (deg < 0) deg += 360
		const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
		const idx = Math.round(deg / 45) % 8
		return { cardinal: dirs[idx] }
	}

	function isPointerLocked() {
		return document.pointerLockElement === canvas
	}

	function onMouseMove(e) {
		if (!isPointerLocked()) return

		if (cameraMode === 'orbit') {
			// Orbit around avatar without rotating the avatar or broadcasting movement
			cameraYawOffset -= e.movementX * mouseSensitivity
			targetYawOffset = null
			pitch -= e.movementY * mouseSensitivity
			pitch = Math.max(-0.65, Math.min(0.75, pitch))
		} else {
			yaw -= e.movementX * mouseSensitivity
			pitch -= e.movementY * mouseSensitivity

			const limit = Math.PI / 2 - 0.01
			pitch = Math.max(-limit, Math.min(limit, pitch))

			camera.rotation.y = yaw
			camera.rotation.x = pitch
		}
	}

	window.addEventListener('mousemove', onMouseMove)

	function onWheel(e) {
		// Mouse wheel zoom
		if (document.body.classList.contains('in-sanctuary')) {
			const delta = e.deltaY * 0.0025
			targetZoomDistance = Math.max(1.2, Math.min(5.5, targetZoomDistance + delta))
		}
	}

	window.addEventListener('wheel', onWheel, { passive: true })

	function handlePointerLockChange() {
		if (!isPointerLocked() && !isMobileActive) clearMovementKeys()
		if (typeof onPointerLockChange === 'function') {
			onPointerLockChange(isPointerLocked())
		}
	}

	document.addEventListener('pointerlockchange', handlePointerLockChange)
	handlePointerLockChange()

	function findDoorId(obj) {
		let cur = obj
		while (cur) {
			if (cur.userData && typeof cur.userData.doorId === 'string') return cur.userData.doorId
			cur = cur.parent
		}
		return null
	}

	function doorHasTriggerTarget(door) {
		if (!door || typeof door !== 'object') return false
		const articleTitle = typeof door.articleTitle === 'string' ? door.articleTitle.trim() : ''
		const category = typeof door.category === 'string' ? door.category.trim() : ''
		const target = typeof door.target === 'string' ? door.target.trim() : ''
		return Boolean(articleTitle || category || target)
	}

	function onMouseDown(e) {
		// A click on a HUD/gesture/menu element must never activate a 3D object.
		if (e.target !== canvas) return
		if (e.button !== 0) return
		if (interactionLocked) return
		const locked = isPointerLocked()
		if (!locked && !document.body.classList.contains('in-sanctuary')) return

		if (locked) {
			flashlight.visible = true
			if (flashlightTimeoutId) window.clearTimeout(flashlightTimeoutId)
			flashlightTimeoutId = window.setTimeout(() => {
				flashlight.visible = false
				flashlightTimeoutId = 0
			}, 120)
		}

		if (locked) {
			raycaster.setFromCamera(rayNdc, activeCamera || camera)
		} else {
			const rect = canvas.getBoundingClientRect()
			const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
			const mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
		raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), activeCamera || camera)
		}
		const candidates = []
		if (doorHitMeshes.length) candidates.push(...doorHitMeshes)
		if (pickableMeshes.length) candidates.push(...pickableMeshes)
		if (candidates.length === 0) return

		const hits = raycaster.intersectObjects(candidates, true)
		if (hits.length === 0) return

		const hitObj = hits[0]?.object
		const hitPoint = hits[0]?.point

		// Check if clicked an artwork / photo (allowed from up to 14 meters away across the gallery)
		{
			let cur = hitObj
			while (cur) {
				if (cur.userData?.isPhoto || cur.userData?.pickableType === 'wall-photo' || cur.userData?.pickableType === 'column-photo') {
					const photoUrl = cur.userData.photoUrl
					if (photoUrl) {
						const d = hitPoint && typeof hitPoint.distanceTo === 'function' ? hitPoint.distanceTo(camera.position) : 0
						if (d <= 14.0) {
							if (document.exitPointerLock) {
								document.exitPointerLock()
							}
							if (typeof onPhotoClick === 'function') {
								onPhotoClick({
									url: photoUrl,
									title: cur.userData.photoTitle || 'Masterpiece',
								})
							}
							return
						}
					}
				}
				cur = cur.parent
			}
		}

		// Check if clicked a door (harmonized 6.0m reach with instant response on first click)
		{
			const doorId = findDoorId(hits[0].object)
			if (doorId) {
				const door = doorById.get(doorId) ?? { id: doorId }
				if (doorHasTriggerTarget(door)) {
					const d = hitPoint && typeof hitPoint.distanceTo === 'function' ? hitPoint.distanceTo(camera.position) : 0
					if (d <= 6.0) {
						if (!locked && canvas && typeof canvas.requestPointerLock === 'function') {
							try { canvas.requestPointerLock() } catch (_) {}
						}
						if (typeof onDoorTrigger === 'function') {
							onDoorTrigger(door)
						}
						return
					}
				}
			}
		}

		const interactMaxDistance = 6.0
		if (hitPoint && typeof hitPoint.distanceTo === 'function') {
			const d = hitPoint.distanceTo(camera.position)
			if (d > interactMaxDistance) return
		}

		{
			let cur = hitObj
			while (cur) {
				const onClick = cur?.userData?.onClick
				if (typeof onClick === 'function') {
					try {
						onClick({ object: cur, hitObject: hitObj, hitPoint, camera })
					} catch (err) {
						console.warn('[OurMuseum] onClick handler failed', err)
					}
					return
				}

				const action = cur?.userData?.action
				if (action === 'random-exhibit') {
					if (typeof onRandomExhibitRequested === 'function') {
						try {
							onRandomExhibitRequested()
						} catch (err) {
							console.warn('[OurMuseum] Random exhibit handler failed', err)
						}
					} else {
						console.info('[OurMuseum] Random exhibit requested')
					}
					return
				}

				if (action === 'go-lobby') {
					if (typeof onGoLobbyRequested === 'function') {
						try {
							onGoLobbyRequested()
						} catch (err) {
							console.warn('[OurMuseum] Go lobby handler failed', err)
						}
					} else {
						console.info('[OurMuseum] Go lobby requested')
					}
					return
				}
				cur = cur.parent
			}
		}

		{
			let cur = hitObj
			while (cur) {
				if (cur.userData && cur.userData.pickable) {
					holdObject(cur)
					return
				}
				cur = cur.parent
			}
		}
	}

	window.addEventListener('mousedown', onMouseDown)

	function clamp(v, min, max) {
		return Math.max(min, Math.min(max, v))
	}

	let seatedSeat = null
	let onStandRequestedCallback = null

	function setSeated(seat) {
		if (seat) {
			seatedSeat = seat
			velocity.set(0, 0, 0)
			currentVelX = 0
			currentVelZ = 0
			grounded = true
			if (!playerAvatar) {
				camera.position.set(seat.x, seat.y + 1.1, seat.z)
				yaw = seat.yaw
				pitch = 0
				camera.rotation.y = yaw
				camera.rotation.x = pitch
			}
		} else {
			if (seatedSeat) {
				// Stand up on the floor 0.7 m in front of the seat along its facing (SEAT-02)
				const fwdX = Math.sin(seatedSeat.yaw)
				const fwdZ = Math.cos(seatedSeat.yaw)
				let standX = seatedSeat.x + fwdX * 0.7
				let standZ = seatedSeat.z + fwdZ * 0.7
				const standY = seatedSeat.y + eyeHeight

				const margin = 0.35
				const maxX = halfW - margin
				const maxZ = halfL - margin
				standX = clamp(standX, -maxX, maxX)
				standZ = clamp(standZ, -maxZ, maxZ)

				// Collision check against room obstacles so you never pop into a wall/obstacle
				const playerRadius = 0.35
				for (const o of roomObstacles) {
					if (!o || o.type !== 'box') continue
					const ox = typeof o.x === 'number' ? o.x : 0
					const oz = typeof o.z === 'number' ? o.z : 0
					const w = typeof o.w === 'number' ? o.w : 0
					const d = typeof o.d === 'number' ? o.d : 0
					if (!(w > 0 && d > 0)) continue
					const buffer = playerRadius + 0.05
					const hx = w / 2 + buffer
					const hz = d / 2 + buffer
					const dx = standX - ox
					const dz = standZ - oz
					if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
						const pushX = hx - Math.abs(dx)
						const pushZ = hz - Math.abs(dz)
						if (pushX < pushZ) {
							standX += (dx === 0 ? 1 : Math.sign(dx)) * pushX
						} else {
							standZ += (dz === 0 ? 1 : Math.sign(dz)) * pushZ
						}
					}
				}

				camera.position.set(standX, standY, standZ)
				currentVelX = 0
				currentVelZ = 0
				velocity.set(0, 0, 0)
				grounded = true
			}
			seatedSeat = null
		}
	}

	function updatePlayer(dt) {
		if (seatedSeat) {
			jumpRequested = false
			const moveKey = keysDown.has('KeyW') || keysDown.has('KeyA') || keysDown.has('KeyS') || keysDown.has('KeyD') ||
				keysDown.has('ArrowUp') || keysDown.has('ArrowDown') || keysDown.has('ArrowLeft') || keysDown.has('ArrowRight') ||
				keysDown.has('Space') || (Math.hypot(touchMoveX, touchMoveZ) > 0.2)
			if (moveKey) {
				if (typeof onStandRequestedCallback === 'function') {
					onStandRequestedCallback()
				} else {
					setSeated(null)
				}
			}
			return
		}

		const isControlActive = isPointerLocked() || isMobileActive || (touchMoveX !== 0 || touchMoveZ !== 0)
		if (!isControlActive) {
			jumpRequested = false
			lastMovementInputZ = 0
			currentVelX = 0
			currentVelZ = 0
			return
		}

		const moveForward = keysDown.has('KeyW') || keysDown.has('ArrowUp')
		const moveBackward = keysDown.has('KeyS') || keysDown.has('ArrowDown')
		const moveLeft = keysDown.has('KeyA') || keysDown.has('ArrowLeft')
		const moveRight = keysDown.has('KeyD') || keysDown.has('ArrowRight')

		let inputX = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0)
		let inputZ = (moveForward ? 1 : 0) - (moveBackward ? 1 : 0)

		if (touchMoveX !== 0 || touchMoveZ !== 0) {
			inputX += touchMoveX
			inputZ += touchMoveZ
		}
		lastMovementInputZ = inputZ
		lastMovementViewYaw = yaw + (cameraMode === 'orbit' ? cameraYawOffset : 0)

		let moveX = 0
		let moveZ = 0

		if (inputX !== 0 || inputZ !== 0) {
			const len = Math.hypot(inputX, inputZ)
			const nx = inputX / (len > 1 ? len : 1)
			const nz = inputZ / (len > 1 ? len : 1)

			// W is relative to what the visitor sees, including Front/Free Orbit.
			// Diagonal input is normalized; Shift alone enables sprint.
			const desired = computeDesiredMovement({
				inputX: nx, inputZ: nz, yaw, cameraYawOffset, cameraMode,
				sprint: keysDown.has('ShiftLeft') || keysDown.has('ShiftRight'),
				walkSpeed: moveSpeed, sprintMultiplier,
			})
			moveX = desired.vx
			moveZ = desired.vz
		}

		// Smooth acceleration and deceleration damping
		const accel = (moveX !== 0 || moveZ !== 0) ? 14.0 : 18.0
		currentVelX += (moveX - currentVelX) * Math.min(1.0, dt * accel)
		currentVelZ += (moveZ - currentVelZ) * Math.min(1.0, dt * accel)

		camera.position.x += currentVelX * dt
		camera.position.z += currentVelZ * dt

		let floorY = 0
		const px = camera.position.x
		const pz = camera.position.z
		const playerRadius = 0.35
		const maxStepHeight = 0.5  // Maximum height player can automatically step up

		for (const o of roomObstacles) {
			if (!o || (o.type !== 'box' && o.type !== 'floor')) continue
			const ox = typeof o.x === 'number' ? o.x : 0
			const oy = typeof o.y === 'number' ? o.y : 0
			const oz = typeof o.z === 'number' ? o.z : 0
			const w = typeof o.w === 'number' ? o.w : 0
			const d = typeof o.d === 'number' ? o.d : 0
			if (!(w > 0 && d > 0)) continue


			const hx = w / 2
			const hz = d / 2
			const dx = Math.abs(px - ox)
			const dz = Math.abs(pz - oz)


			const boundsBuffer = o.type === 'floor' ? playerRadius * 0.2 : -playerRadius * 0.3

			if (dx < hx + boundsBuffer && dz < hz + boundsBuffer) {


				const currentEyeLevel = camera.position.y
				const obstacleTopY = oy + eyeHeight

				if (obstacleTopY <= currentEyeLevel + maxStepHeight && oy > floorY) {
					floorY = oy
				}
			}
		}

		const targetFloorY = floorY + eyeHeight

		if (targetFloorY > camera.position.y && targetFloorY <= camera.position.y + maxStepHeight) {
			camera.position.y = targetFloorY
			velocity.y = 0
			grounded = true
		} else {

			velocity.y += gravity * dt
			if (jumpRequested && grounded) {
				velocity.y = jumpSpeed
				grounded = false
			}
			jumpRequested = false

			camera.position.y += velocity.y * dt

			if (camera.position.y <= targetFloorY) {
				camera.position.y = targetFloorY
				velocity.y = 0
				grounded = true
			}
		}

		const margin = 0.35
		const maxX = halfW - margin
		const maxZ = halfL - margin

		{
			const playerRadius = 0.35
			const px = camera.position.x
			const pz = camera.position.z
			let x = px
			let z = pz

			for (const o of roomObstacles) {
				if (!o || o.type !== 'cylinder') continue
				const ox = typeof o.x === 'number' ? o.x : 0
				const oz = typeof o.z === 'number' ? o.z : 0
				const r = typeof o.radius === 'number' ? o.radius : 0
				const minDist = playerRadius + r + 0.05

				const dx = x - ox
				const dz = z - oz
				const dist = Math.hypot(dx, dz)
				if (dist > 0 && dist < minDist) {
					const push = minDist - dist
					x += (dx / dist) * push
					z += (dz / dist) * push
				} else if (dist === 0 && minDist > 0) {
					x += minDist
				}
			}

			for (const o of roomObstacles) {
				if (!o || o.type !== 'box') continue
				const ox = typeof o.x === 'number' ? o.x : 0
				const oz = typeof o.z === 'number' ? o.z : 0
				const w = typeof o.w === 'number' ? o.w : 0
				const d = typeof o.d === 'number' ? o.d : 0
				if (!(w > 0 && d > 0)) continue

				const buffer = playerRadius + 0.05
				const hx = w / 2 + buffer
				const hz = d / 2 + buffer

				const dx = x - ox
				const dz = z - oz

				if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
					const pushX = hx - Math.abs(dx)
					const pushZ = hz - Math.abs(dz)
					if (pushX < pushZ) {
						x += (dx === 0 ? 1 : Math.sign(dx)) * pushX
					} else {
						z += (dz === 0 ? 1 : Math.sign(dz)) * pushZ
					}
				}
			}

			camera.position.x = x
			camera.position.z = z
		}

		camera.position.x = clamp(camera.position.x, -maxX, maxX)
		camera.position.z = clamp(camera.position.z, -maxZ, maxZ)

		// Seamless walk-through door transition when approaching an active door
		if (!interactionLocked && currentRoomDoors && currentRoomDoors.length > 0 && typeof onDoorTrigger === 'function') {
			const now = performance.now()
			if (now - lastDoorTriggerTime > 1500) {
				const px = camera.position.x
				const pz = camera.position.z
				for (const d of currentRoomDoors) {
					if (!d || !d.position || !doorHasTriggerTarget(d)) continue
					const dx = px - d.position.x
					const dz = pz - d.position.z
					const dist = Math.hypot(dx, dz)
					if (dist < 4.0 && typeof onDoorProximity === 'function') {
						onDoorProximity(d)
					}
					if (dist < 0.50) {
						lastDoorTriggerTime = now
						onDoorTrigger(d)
						break
					}
				}
			}
		}
	}

	let activeCamera = camera
	let playerAvatar = null
	const followCamera = camera.clone()
	const followTarget = new THREE.Vector3()
	const followOffset = new THREE.Vector3()
	const followRay = new THREE.Raycaster()
	let playerState = { p: [0, 0, 0], ry: 0, moving: false, anim: 'idle' }

	function updateAvatar(dt, previousPosition) {
		// Smooth interpolation for cameraYawOffset and zoom distance
		if (targetYawOffset !== null) {
			let diff = (targetYawOffset - cameraYawOffset) % (Math.PI * 2)
			if (diff < -Math.PI) diff += Math.PI * 2
			if (diff > Math.PI) diff -= Math.PI * 2
			if (Math.abs(diff) < 0.005) {
				cameraYawOffset = targetYawOffset
				targetYawOffset = null
			} else {
				cameraYawOffset += diff * Math.min(1.0, dt * 10)
			}
		}
		currentZoomDistance += (targetZoomDistance - currentZoomDistance) * Math.min(1.0, dt * 10)

		const effectivePitch = Math.max(-0.65, Math.min(0.75, pitch))

		if (seatedSeat) {
			playerState = {
				p: [seatedSeat.x, seatedSeat.y, seatedSeat.z],
				ry: seatedSeat.yaw,
				moving: false,
				anim: 'sit',
				mode: 'sit',
				seat: seatedSeat.id,
			}
			if (playerAvatar) {
				playerAvatar.group.position.set(seatedSeat.x, seatedSeat.y, seatedSeat.z)
				playerAvatar.group.rotation.y = seatedSeat.yaw
				Object.assign(playerAvatar.target, playerState)
				playerAvatar.group.visible = !!playerAvatar.root
				playerAvatar.update(performance.now(), dt)
				playerAvatar.tag.style.display = 'none'

				const effectiveSeatedYaw = seatedSeat.yaw + cameraYawOffset
				const seatedDistance = Math.max(1.2, currentZoomDistance * 0.8)
				followTarget.set(seatedSeat.x, seatedSeat.y + 0.9, seatedSeat.z)
				followOffset.set(0, 0.4, seatedDistance).applyEuler(new THREE.Euler(effectivePitch, effectiveSeatedYaw, 0, 'YXZ'))
				followRay.set(followTarget, followOffset.clone().normalize())
				followRay.far = followOffset.length()
				const hit = followRay.intersectObjects(currentRoom?.group.children.filter(o => o.isMesh) || [], false)[0]
				if (hit) followOffset.setLength(Math.max(0.25, hit.distance - 0.15))
				followCamera.position.copy(followTarget).add(followOffset)
				followCamera.lookAt(followTarget)
				followCamera.updateMatrixWorld()
			} else {
				camera.position.set(seatedSeat.x, seatedSeat.y + 1.1, seatedSeat.z)
			}
			return
		}

		const velMagnitude = Math.hypot(currentVelX, currentVelZ)
		const distance = Math.hypot(camera.position.x - previousPosition.x, camera.position.z - previousPosition.z)
		const moving = (velMagnitude > 0.08 || distance > 0.001) && (isPointerLocked() || isMobileActive || (touchMoveX !== 0 || touchMoveZ !== 0))

		// Preserve idle heading and face the view while stepping backward.
		const targetYaw = calculateFacingYaw({
			previousYaw: avatarBodyYaw,
			viewYaw: lastMovementViewYaw,
			vx: currentVelX, vz: currentVelZ,
			forwardInput: lastMovementInputZ,
			moving: moving && velMagnitude > 0.15,
		})
		avatarBodyYaw = smoothAngle(avatarBodyYaw, targetYaw, dt)

		playerState = {
			p: [camera.position.x, camera.position.y - eyeHeight, camera.position.z],
			ry: avatarBodyYaw,
			moving,
			anim: !grounded ? 'jump' : moving ? ((keysDown.has('ShiftLeft') || keysDown.has('ShiftRight') || Math.hypot(touchMoveX, touchMoveZ) > 0.8) ? 'run' : 'walk') : 'idle',
			mode: 'stand',
			seat: null,
		}
		if (!playerAvatar) return
		playerAvatar.group.position.fromArray(playerState.p)
		playerAvatar.group.rotation.y = playerState.ry
		Object.assign(playerAvatar.target, playerState)
		playerAvatar.group.visible = !!playerAvatar.root
		playerAvatar.update(performance.now(), dt)
		playerAvatar.tag.style.display = 'none'

		const effectiveStandingYaw = yaw + cameraYawOffset
		followTarget.copy(camera.position).y -= 0.6
		followOffset.set(0, 0.7, currentZoomDistance).applyEuler(new THREE.Euler(effectivePitch, effectiveStandingYaw, 0, 'YXZ'))
		followRay.set(followTarget, followOffset.clone().normalize())
		followRay.far = followOffset.length()
		// ponytail: camera obstruction checks room architecture; detailed furniture
		// camera occlusion can use dedicated low-poly proxies if needed later.
		const hit = followRay.intersectObjects(currentRoom?.group.children.filter(o => o.isMesh) || [], false)[0]
		if (hit) followOffset.setLength(Math.max(0.25, hit.distance - 0.15))
		followCamera.position.copy(followTarget).add(followOffset)
		followCamera.lookAt(followTarget)
		followCamera.updateMatrixWorld()
	}

	let lastClientW = 0
	let lastClientH = 0
	function resize() {
		const width = canvas.clientWidth
		const height = canvas.clientHeight

		if (width <= 0 || height <= 0) return
		if (width === lastClientW && height === lastClientH) return
		lastClientW = width
		lastClientH = height

		renderer.setSize(width, height, false)
		const aspect = width / height
		camera.aspect = aspect
		camera.updateProjectionMatrix()
		followCamera.aspect = aspect
		followCamera.updateProjectionMatrix()

		if (activeCamera && activeCamera.isOrthographicCamera) {
			const size = activeCamera.userData?.frustumHalfSize || 8
			activeCamera.left = -size * aspect
			activeCamera.right = size * aspect
			activeCamera.top = size
			activeCamera.bottom = -size
			activeCamera.updateProjectionMatrix()
		}
	}

	const clock = new THREE.Clock()
	let rafId = 0
	let fpsFrames = 0
	let fpsTime = 0
	let lastFpsReport = 0
	let lastHeadingReport = 0

	function frame() {
		const dt = Math.min(clock.getDelta(), 0.05)

		if (typeof onFps === 'function') {
			fpsFrames += 1
			fpsTime += dt
			const now = clock.elapsedTime

			if (fpsTime >= 0.25 && now - lastFpsReport >= 0.25) {
				const fps = fpsFrames / fpsTime
				onFps(fps)
				fpsFrames = 0
				fpsTime = 0
				lastFpsReport = now
			}
		}

		if (typeof onHeading === 'function' && document.pointerLockElement === canvas) {
			const now = clock.elapsedTime
			if (now - lastHeadingReport >= 0.1) {
				onHeading(headingFromYaw(yaw))
				lastHeadingReport = now
			}
		}

		const previousPosition = camera.position.clone()
		updatePlayer(dt)
		updateAvatar(dt, previousPosition)

		// Animate dynamic room decorations (flickering fire/candles, petals, ceiling fan, clock pendulum, etc.)
		if (currentRoom?.animatedDecorations) {
			const animTime = clock.elapsedTime
			for (let i = 0; i < currentRoom.animatedDecorations.length; i++) {
				currentRoom.animatedDecorations[i](animTime, dt)
			}
		}

		// Cinematic drift before entering
		if (!isPointerLocked()) {
			prePlayIdleTime += dt
			camera.rotation.y = yaw + Math.sin(prePlayIdleTime * 0.25) * 0.06
			camera.rotation.x = pitch + Math.sin(prePlayIdleTime * 0.35) * 0.02
		}

		setBodyClickableCursor(computeIsAimingAtClickable())

		// Advance distance-based LOD switching for placed GLB models.
		updateLodSwitchers(camera.position)

		// Calibration helper when ?debug=seats is active.
		updateDebugSeatsHud(camera.position)

		resize()
		renderer.render(scene, activeCamera || camera)
		rafId = window.requestAnimationFrame(frame)
	}

	window.addEventListener('resize', resize)
	resize()
	rafId = window.requestAnimationFrame(frame)

	function applyAmbiencePreset() {
		if (!currentRoom) return
		renderer.toneMappingExposure = 1.0
		if (scene.background && typeof scene.background.set === 'function') {
			scene.background.set(0x05030a)
		}
		currentRoom.group.traverse((o) => {
			if (o.isLight) {
				if (o.isAmbientLight) { o.color.set(0xf5f8ff); o.intensity = 1.0 }
				else if (o.isDirectionalLight) { o.color.set(0xffffff); o.intensity = 1.55 }
				else if (o.isPointLight) { o.color.set(0xebf2ff); o.intensity = 1.15 }
			}
		})
	}

	return {
		setInteractionLocked(locked) {
			interactionLocked = Boolean(locked)
		},
		setDoorMeta(doorId, patch = null) {
			const id = typeof doorId === 'string' ? doorId : ''
			if (!id) return
			const door = doorById.get(id)
			if (!door) return
			if (!patch || typeof patch !== 'object') return

			try {
				Object.assign(door, patch)
			} catch {

			}
		},
		setDoorLabelOverride(doorId, text) {
			const id = typeof doorId === 'string' ? doorId : ''
			if (!id) return
			const hit = doorHitById.get(id)
			const ctrl = hit?.userData?.labelControl
			if (!ctrl || typeof ctrl.setOverride !== 'function' || typeof ctrl.clearOverride !== 'function') return

			const t = typeof text === 'string' ? text.trim() : ''
			if (t) ctrl.setOverride(t)
			else ctrl.clearOverride()
		},
		async setRoom({
			roomMode: nextMode,
			roomSeedTitle: nextSeedTitle,
			lobbyCategories: nextCategories,
			galleryEntryWall,
			galleryRelatedTitles: nextRelatedTitles,
			galleryTitle: nextGalleryTitle,
			galleryDescription: nextGalleryDescription,
			galleryMainThumbnailUrl: nextGalleryMainThumbnailUrl,
			galleryPhotos: nextGalleryPhotos,
			galleryVideoUrl: nextGalleryVideoUrl,
			galleryLongExtract: nextGalleryLongExtract,
			galleryTrail: nextGalleryTrail,
			spawn,
		} = {}) {
			const hasGalleryTitle = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryTitle')
			const hasGalleryDescription = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryDescription')
			const hasGalleryMainThumbnailUrl = Object.prototype.hasOwnProperty.call(
				arguments.length ? arguments[0] ?? {} : {},
				'galleryMainThumbnailUrl'
			)
			const hasGalleryPhotos = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryPhotos')
			const hasGalleryVideoUrl = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryVideoUrl')
			const hasGalleryLongExtract = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryLongExtract')
			const hasGalleryTrail = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryTrail')

			return await loadRoom({
				mode: typeof nextMode === 'string' ? nextMode : roomMode,
				seedTitle: typeof nextSeedTitle === 'string' ? nextSeedTitle : roomSeedTitle,
				categories: Array.isArray(nextCategories) ? nextCategories : lobbyCategories,
				galleryEntryWall,
				galleryRelatedTitles: Array.isArray(nextRelatedTitles) ? nextRelatedTitles : galleryRelatedTitles,
				galleryTitle: hasGalleryTitle ? (typeof nextGalleryTitle === 'string' ? nextGalleryTitle : null) : galleryTitle,
				galleryDescription: hasGalleryDescription ? (typeof nextGalleryDescription === 'string' ? nextGalleryDescription : null) : galleryDescription,
				galleryMainThumbnailUrl: hasGalleryMainThumbnailUrl
					? typeof nextGalleryMainThumbnailUrl === 'string'
						? nextGalleryMainThumbnailUrl
						: null
					: galleryMainThumbnailUrl,
				galleryPhotos: hasGalleryPhotos ? (Array.isArray(nextGalleryPhotos) ? nextGalleryPhotos : null) : galleryPhotos,
				galleryVideoUrl: hasGalleryVideoUrl ? (typeof nextGalleryVideoUrl === 'string' ? nextGalleryVideoUrl : null) : galleryVideoUrl,
				galleryLongExtract: hasGalleryLongExtract ? (typeof nextGalleryLongExtract === 'string' ? nextGalleryLongExtract : null) : galleryLongExtract,
				galleryTrail: hasGalleryTrail ? (Array.isArray(nextGalleryTrail) ? nextGalleryTrail : null) : null,
				spawn,
			})
		},
		preloadTextures(urls) {
			if (!Array.isArray(urls)) return
			for (const url of urls) {
				const key = typeof url === 'string' ? url.trim() : ''
				if (key && !loadedPhotoTextureCache.has(key)) {
					loadTextureAsync(key).catch(() => {})
				}
			}
		},
		prebuildRoom(params) {
			return prebuildRoom(params)
		},
		hasCachedRoom(key) {
			return roomCache.has(key)
		},
		reloadRoomInPlace() {
			if (!lastLoadedRoomParams) return
			const k = getRoomCacheKey(lastLoadedRoomParams)
			roomCache.delete(k)
			loadRoom({
				...lastLoadedRoomParams,
				spawn: null,
			})
		},
		ready,
		getRoomKey() {
			return currentRoom?.roomKey || 'lobby'
		},
		getCurrentRoom() {
			return currentRoom
		},
		scene,
		camera,
		renderer,
		setActiveCamera(cam) {
			activeCamera = cam || camera
			resize()
		},
		getActiveCamera() {
			return activeCamera || camera
		},
		setPlayerAvatar(avatar) {
			playerAvatar = avatar
			activeCamera = avatar ? followCamera : camera
			updateAvatar(0, camera.position)
			resize()
		},
		getPlayerState() {
			return playerState
		},
		setSeated,
		isSeated() {
			return !!seatedSeat
		},
		getSeatedSeat() {
			return seatedSeat
		},
		onStandRequested(fn) {
			onStandRequestedCallback = fn
		},
		triggerResize() {
			resize()
		},
		setCameraPosition(x, y, z, newYaw = 0, newPitch = 0) {
			if (typeof x === 'number') camera.position.x = x
			if (typeof y === 'number') camera.position.y = y
			if (typeof z === 'number') camera.position.z = z
			yaw = Number.isFinite(newYaw) ? newYaw : 0
			pitch = Number.isFinite(newPitch) ? newPitch : 0
			avatarBodyYaw = yaw
			currentVelX = 0
			currentVelZ = 0
			camera.rotation.y = yaw
			camera.rotation.x = pitch
			velocity.set(0, 0, 0)
			grounded = true
		},
		setTouchMoveVector(x, z) {
			touchMoveX = Number.isFinite(x) ? Math.max(-1.5, Math.min(1.5, x)) : 0
			touchMoveZ = Number.isFinite(z) ? Math.max(-1.5, Math.min(1.5, z)) : 0
			if (touchMoveX !== 0 || touchMoveZ !== 0) isMobileActive = true
		},
		addTouchLookDelta(dx, dy) {
			isMobileActive = true
			const touchSensitivity = 0.0032
			if (cameraMode === 'orbit') {
				cameraYawOffset -= dx * touchSensitivity
				targetYawOffset = null
				pitch -= dy * touchSensitivity
				pitch = Math.max(-0.65, Math.min(0.75, pitch))
			} else {
				yaw -= dx * touchSensitivity
				pitch -= dy * touchSensitivity
				const limit = Math.PI / 2 - 0.01
				pitch = Math.max(-limit, Math.min(limit, pitch))
				camera.rotation.y = yaw
				camera.rotation.x = pitch
			}
		},
		getCameraMode() {
			return cameraMode
		},
		setCameraMode(mode) {
			cameraMode = mode === 'orbit' ? 'orbit' : 'follow'
			if (cameraMode === 'follow') {
				targetYawOffset = 0
			}
			if (typeof onCameraModeChangeCallback === 'function') {
				onCameraModeChangeCallback(cameraMode)
			}
		},
		setFrontView() {
			cameraMode = 'orbit'
			targetYawOffset = Math.PI
			if (typeof onCameraModeChangeCallback === 'function') {
				onCameraModeChangeCallback(cameraMode)
			}
		},
		resetCamera() {
			cameraMode = 'follow'
			targetYawOffset = 0
			targetZoomDistance = 3.2
			if (typeof onCameraModeChangeCallback === 'function') {
				onCameraModeChangeCallback(cameraMode)
			}
		},
		onCameraModeChange(fn) {
			onCameraModeChangeCallback = fn
		},
		adjustZoom(delta) {
			targetZoomDistance = Math.max(1.2, Math.min(5.5, targetZoomDistance + delta))
		},
		triggerJump() {
			if (seatedSeat) {
				if (typeof onStandRequestedCallback === 'function') {
					onStandRequestedCallback()
				} else {
					setSeated(null)
				}
				return
			}
			if (grounded) {
				jumpRequested = true
				isMobileActive = true
			}
		},
		setMobileActive(active) {
			isMobileActive = Boolean(active)
		},
		isMobileActive() {
			return isMobileActive
		},
		stop() {
			if (held) releaseHeld()

			window.cancelAnimationFrame(rafId)
			window.removeEventListener('resize', resize)

			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keyup', onKeyUp)
			window.removeEventListener('blur', clearMovementKeys)
			window.removeEventListener('mousemove', onMouseMove)
			window.removeEventListener('mousedown', onMouseDown)
			window.removeEventListener('wheel', onWheel)
			document.removeEventListener('pointerlockchange', handlePointerLockChange)

			if (flashlightTimeoutId) window.clearTimeout(flashlightTimeoutId)

			for (const [k, r] of roomCache.entries()) {
				if (r && r !== currentRoom) {
					scene.remove(r.group)
					disposeMany(r.disposables)
				}
			}
			roomCache.clear()

			if (currentRoom) {
				scene.remove(currentRoom.group)
				disposeMany(currentRoom.disposables)
				currentRoom = null
			}

			disposeMany(staticDisposables)
			disposeStaticCache()
			renderer.dispose()
		},
	}
}
