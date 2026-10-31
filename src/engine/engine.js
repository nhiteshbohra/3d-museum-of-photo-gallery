import * as THREE from 'three'
import { buildRoom, deriveRoomKey } from '../game/room.js'
import { disposeSharedRoomMaterialTextures } from '../game/room/textures.js'
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

	const gl = renderer.getContext()
	if (gl) {
		const track = (name, orig) => {
			return function (...args) {
				if (window.__doorProfile && !window.__doorProfile.t_first_frame_rendered) {
					const t0 = performance.now()
					const res = orig.apply(this, args)
					const dt = performance.now() - t0
					const keyCount = name + 'Count'
					const keyMs = name + 'Ms'
					window.__doorProfile[keyCount] = (window.__doorProfile[keyCount] || 0) + 1
					window.__doorProfile[keyMs] = (window.__doorProfile[keyMs] || 0) + dt
					return res
				}
				return orig.apply(this, args)
			}
		}

		gl.texImage2D = track('texImage2D', gl.texImage2D)
		if (gl.texSubImage2D) gl.texSubImage2D = track('texSubImage2D', gl.texSubImage2D)
		if (gl.texStorage2D) gl.texStorage2D = track('texStorage2D', gl.texStorage2D)
		gl.compileShader = track('compileShader', gl.compileShader)
		gl.linkProgram = track('linkProgram', gl.linkProgram)
		gl.getShaderParameter = track('getShaderParameter', gl.getShaderParameter)
		gl.getProgramParameter = track('getProgramParameter', gl.getProgramParameter)
		gl.bufferData = track('bufferData', gl.bufferData)
		gl.drawElements = track('drawElements', gl.drawElements)
		gl.drawArrays = track('drawArrays', gl.drawArrays)
	}

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
		if (jobs.length === 0) return

		for (const job of jobs) {
			if (token !== deferredTextureLoadToken || currentRoom !== room) return

			const url = typeof job?.url === 'string' ? job.url.trim() : ''
			if (!url) continue

			if (loadedPhotoTextureCache.has(url)) {
				const tex = loadedPhotoTextureCache.get(url)
				if (job && typeof job.onLoad === 'function') job.onLoad(tex)
				continue
			}

			await new Promise((r) => window.requestAnimationFrame(r))
			if (token !== deferredTextureLoadToken || currentRoom !== room) return

			try {
				const tex = await loadTextureAsync(url)
				if (token !== deferredTextureLoadToken || currentRoom !== room) return
				if (job && typeof job.onLoad === 'function') job.onLoad(tex)
			} catch (err) {
				if (token !== deferredTextureLoadToken || currentRoom !== room) return
				if (job && typeof job.onError === 'function') job.onError(err)
			}
		}
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
	const gravity = -18
	const jumpSpeed = 6.2
	const moveSpeed = 4.2
	const sprintMultiplier = 1.75
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
			grounded = true
		}
	}

	let lastLoadedRoomParams = null

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
		lastLoadedRoomParams = {
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

		if (window.__doorProfile) {
			window.__doorProfile.t_buildRoom_start = performance.now()
		}

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

		if (window.__doorProfile) {
			window.__doorProfile.t_buildRoom_end = performance.now()
		}

		if (currentRoom) {
			if (held) releaseHeld()
			if (window.__doorProfile) window.__doorProfile.t_dispose_start = performance.now()
			scene.remove(currentRoom.group)
			disposeMany(currentRoom.disposables)
			if (window.__doorProfile) window.__doorProfile.t_dispose_end = performance.now()
		}

		currentRoom = nextRoom
		scene.add(currentRoom.group)
		applyAmbiencePreset()

		currentRoom.group.traverse((obj) => {
			if (obj.isMesh) {
				let t0 = 0
				obj.onBeforeRender = () => { t0 = performance.now() }
				obj.onAfterRender = () => {
					const dt = performance.now() - t0
					if (dt > 2.0) {
						console.log(`[SLOW MESH] ${obj.name || obj.geometry?.type || 'mesh'}: ${dt.toFixed(2)}ms (mat: ${obj.material?.type}, geo: ${obj.geometry?.type})`)
					}
				}
			}
		})

		if (window.__doorProfile) window.__doorProfile.t_compile_start = performance.now()
		try {
			if (typeof renderer.compileAsync === 'function') {
				await renderer.compileAsync(scene, camera)
			} else {
				renderer.compile(scene, camera)
			}
		} catch (_) {}
		if (window.__doorProfile) window.__doorProfile.t_compile_end = performance.now()

		deferredTextureLoadToken += 1
		void runDeferredTextureLoads(currentRoom, deferredTextureLoadToken)

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
		if (window.__doorProfile) {
			window.__doorProfile.t_setRoom_end = performance.now()
		}

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

	loadRoom({
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

		raycaster.setFromCamera(rayNdc, camera)
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

	function onKeyDown(e) {
		keysDown.add(e.code)
		if (e.code === 'Space') jumpRequested = true
		if (isPointerLocked() && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
			e.preventDefault()
		}
	}

	function onKeyUp(e) {
		keysDown.delete(e.code)
	}

	window.addEventListener('keydown', onKeyDown)
	window.addEventListener('keyup', onKeyUp)

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

		yaw -= e.movementX * mouseSensitivity
		pitch -= e.movementY * mouseSensitivity

		const limit = Math.PI / 2 - 0.01
		pitch = Math.max(-limit, Math.min(limit, pitch))

		camera.rotation.y = yaw
		camera.rotation.x = pitch
	}

	window.addEventListener('mousemove', onMouseMove)

	function handlePointerLockChange() {
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
			raycaster.setFromCamera(rayNdc, camera)
		} else {
			const rect = canvas.getBoundingClientRect()
			const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
			const mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
			raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera)
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

	function updatePlayer(dt) {
		if (!isPointerLocked()) {
			jumpRequested = false
			return
		}

		const moveForward = keysDown.has('KeyW') || keysDown.has('ArrowUp')
		const moveBackward = keysDown.has('KeyS') || keysDown.has('ArrowDown')
		const moveLeft = keysDown.has('KeyA') || keysDown.has('ArrowLeft')
		const moveRight = keysDown.has('KeyD') || keysDown.has('ArrowRight')

		const inputX = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0)
		const inputZ = (moveForward ? 1 : 0) - (moveBackward ? 1 : 0)

		let moveX = 0
		let moveZ = 0

		if (inputX !== 0 || inputZ !== 0) {
			const len = Math.hypot(inputX, inputZ)
			const nx = inputX / len
			const nz = inputZ / len

			const isSprinting = keysDown.has('ShiftLeft') || keysDown.has('ShiftRight')
			const speed = moveSpeed * (isSprinting ? sprintMultiplier : 1)

			const sin = Math.sin(yaw)
			const cos = Math.cos(yaw)
			moveX = (cos * nx + -sin * nz) * speed
			moveZ = (-sin * nx + -cos * nz) * speed
		}

		camera.position.x += moveX * dt
		camera.position.z += moveZ * dt

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

	function resize() {
		const width = canvas.clientWidth
		const height = canvas.clientHeight

		if (width <= 0 || height <= 0) return

		renderer.setSize(width, height, false)
		const aspect = width / height
		camera.aspect = aspect
		camera.updateProjectionMatrix()

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
		const dt = clock.getDelta()

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

		updatePlayer(dt)

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

		resize()
		if (window.__doorProfile && window.__doorProfile.t_setRoom_end && !window.__doorProfile.t_first_frame_rendered) {
			const t_frame_start = performance.now()
			window.__doorProfile.t_first_frame_start = t_frame_start
			const t_render_start = performance.now()
			renderer.render(scene, activeCamera || camera)
			const t_render_end = performance.now()
			const glCtx = renderer.getContext()
			if (glCtx) glCtx.finish()
			const t_gl_finish = performance.now()
			window.__doorProfile.t_first_render_start = t_render_start
			window.__doorProfile.t_first_render_end = t_render_end
			window.__doorProfile.t_first_frame_rendered = t_gl_finish
			console.log('[DOOR_PROFILE_RESULT]', JSON.stringify(window.__doorProfile))
		} else {
			renderer.render(scene, activeCamera || camera)
		}
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
		reloadRoomInPlace() {
			if (!lastLoadedRoomParams) return
			loadRoom({
				...lastLoadedRoomParams,
				spawn: null,
			})
		},
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
		triggerResize() {
			resize()
		},
		setCameraPosition(x, y, z, newYaw = 0, newPitch = 0) {
			if (typeof x === 'number') camera.position.x = x
			if (typeof y === 'number') camera.position.y = y
			if (typeof z === 'number') camera.position.z = z
			yaw = Number.isFinite(newYaw) ? newYaw : 0
			pitch = Number.isFinite(newPitch) ? newPitch : 0
			camera.rotation.y = yaw
			camera.rotation.x = pitch
			velocity.set(0, 0, 0)
			grounded = true
		},
		stop() {
			if (held) releaseHeld()

			window.cancelAnimationFrame(rafId)
			window.removeEventListener('resize', resize)

			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keyup', onKeyUp)
			window.removeEventListener('mousemove', onMouseMove)
			window.removeEventListener('mousedown', onMouseDown)
			document.removeEventListener('pointerlockchange', handlePointerLockChange)

			if (flashlightTimeoutId) window.clearTimeout(flashlightTimeoutId)

			if (currentRoom) {
				scene.remove(currentRoom.group)
				disposeMany(currentRoom.disposables)
				currentRoom = null
			}

			disposeMany(staticDisposables)
			renderer.dispose()
		},
	}
}
