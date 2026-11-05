/**
 * Our Museum 3D — Placed Items Spawner
 * 
 * Ingests museumLayout.json and spawns placed artifacts additively
 * into each active museum room.
 *
 * Supports GLB models (type "glb", loaded from `path` with a shared GLTFLoader
 * cache, deep-cloned per room so resources can be disposed safely).
 */
import * as THREE from 'three'
import museumLayout from '../../data/museumLayout.json' with { type: 'json' }
import { getArtifact, findArtifactByPath } from './artifactRegistry.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

let activeLayout = museumLayout

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME SEAT REGISTRY (SEAT-01)
// Keyed by full seatId: `${roomKey}:${itemId}:${subSeatId}`
// ─────────────────────────────────────────────────────────────────────────────
const runtimeSeats = new Map()

export function registerRuntimeSeat(seat) {
	if (!seat || !seat.id) return
	runtimeSeats.set(seat.id, seat)
}

export function unregisterRuntimeSeat(seatId) {
	runtimeSeats.delete(seatId)
}

export function clearRuntimeSeats(roomKey = null) {
	if (!roomKey) {
		runtimeSeats.clear()
		return
	}
	for (const [id, s] of runtimeSeats.entries()) {
		if (s.roomKey === roomKey || s.room === roomKey) {
			runtimeSeats.delete(id)
		}
	}
}

export function getRuntimeSeats(roomKey = null) {
	const list = []
	for (const s of runtimeSeats.values()) {
		if (!roomKey || s.roomKey === roomKey || s.room === roomKey) {
			list.push(s)
		}
	}
	return list
}

function attachDebugSeatVisual(anchor, seatRecord, group) {
	if (typeof window === 'undefined') return
	const isDebug = new URLSearchParams(window.location.search).get('debug') === 'seats'
	if (!isDebug || !group) return

	const sphereGeom = new THREE.SphereGeometry(0.08, 12, 12)
	const sphereMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
	const sphere = new THREE.Mesh(sphereGeom, sphereMat)
	sphere.position.set(seatRecord.x, seatRecord.cushionY, seatRecord.z)

	const dir = new THREE.Vector3(Math.sin(seatRecord.yaw), 0, Math.cos(seatRecord.yaw))
	const arrow = new THREE.ArrowHelper(dir, sphere.position, 0.45, 0xffaa00, 0.12, 0.08)

	group.add(sphere)
	group.add(arrow)
}

let debugHudEl = null
let isDebugSeatsCached = null

export function updateDebugSeatsHud(camPos) {
	if (typeof window === 'undefined') return
	if (isDebugSeatsCached === null) {
		try {
			isDebugSeatsCached = new URLSearchParams(window.location.search).get('debug') === 'seats'
		} catch {
			isDebugSeatsCached = false
		}
	}
	if (!isDebugSeatsCached) return
	if (!debugHudEl) {
		debugHudEl = document.createElement('div')
		debugHudEl.id = 'debug-seat-hud'
		debugHudEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
			'background:rgba(14,10,6,0.92);color:#00ffff;padding:8px 16px;border-radius:8px;' +
			'font:500 13px ui-monospace,monospace;z-index:9999;pointer-events:none;border:1px solid #00ffff;' +
			'box-shadow:0 4px 16px rgba(0,0,0,0.6);'
		document.body.appendChild(debugHudEl)
	}
	const list = getRuntimeSeats()
	if (!list.length) {
		debugHudEl.textContent = '[debug=seats] No active seats in room'
		return
	}
	let nearest = null
	let minDist = Infinity
	for (const s of list) {
		const d = Math.hypot(camPos.x - s.x, camPos.z - s.z)
		if (d < minDist) {
			minDist = d
			nearest = s
		}
	}
	if (nearest) {
		debugHudEl.textContent = `[debug=seats] Nearest: ${nearest.id} | Dist: ${minDist.toFixed(2)}m | Yaw: ${nearest.yaw.toFixed(2)}rad | CushionY: ${nearest.cushionY.toFixed(2)}m`
	}
}

export function getPlacedItemsForRoom(roomKey) {
	if (!activeLayout || !activeLayout.rooms) return []
	const items = activeLayout.rooms[roomKey]
	return Array.isArray(items) ? items : []
}

/**
 * Read the plant configuration from museumLayout.json.
 *
 * {
 *   plantsConfig: {
 *     defaultScale: number,      // base size multiplier for every plant
 *     sinkY: number,             // metres the plant base sinks into the floor
 *     overrides: [               // per-plant adjustments by name
 *       { name, scale, sinkY, x, y, z }
 *     ]
 *   }
 * }
 */
export function getPlantsConfig() {
	const cfg = activeLayout?.plantsConfig || {}
	return {
		defaultScale: Number.isFinite(cfg.defaultScale) ? cfg.defaultScale : 1.5,
		sinkY: Number.isFinite(cfg.sinkY) ? cfg.sinkY : 0.001,
		overrides: Array.isArray(cfg.overrides) ? cfg.overrides : [],
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GLB MODEL SUPPORT (type: "glb")
// ─────────────────────────────────────────────────────────────────────────────

/** Shared GLTFLoader cache keyed by model path (load once, reuse everywhere). */
const gltfCache = new Map()

/** Pending GLB spawn promises, so callers/tests can await room load completion. */
const pendingGlbSpawns = new Set()
const failedGlbSpawns = []

/**
 * Active LOD switchers for spawned GLB models. Each entry is a function
 * `(camPos) => void` that shows the full-res model when the camera is close
 * and the decimated `lod/` model when it is far away. Called once per frame
 * from the engine so heavy models are only fully detailed when visible up
 * close.
 */
const activeLodSwitchers = []

let dracoLoader = null

function getDracoLoader() {
	if (dracoLoader) return dracoLoader
	dracoLoader = new DRACOLoader()
	// Local decoders bundled under public/models/ready/draco (self-contained, no CDN).
	dracoLoader.setDecoderPath('models/ready/draco/')
	return dracoLoader
}

/** Resolve the cached GLTF for a path, fetching/parsing exactly once. */
function getGltf(path) {
	let p = gltfCache.get(path)
	if (p) return p
	const loader = new GLTFLoader()
	loader.setDRACOLoader(getDracoLoader())
	p = loader.loadAsync(path)
	gltfCache.set(path, p)
	return p
}

/**
 * Deep-clone a GLTF scene so each room owns its own geometries, materials and
 * textures. Resources are cloned (not shared) so per-room disposal never breaks
 * a model that is also in use elsewhere / cached.
 */
function deepCloneScene(scene) {
	const root = scene.clone()
	const cloned = []

	const cloneMaterial = (mat) => {
		if (Array.isArray(mat)) return mat.map(cloneMaterial)
		if (!mat) return mat
		const m = mat.clone()
		for (const key of Object.keys(m)) {
			const val = m[key]
			if (val && val.isTexture) {
				m[key] = val.clone()
				cloned.push(m[key])
			}
		}
		cloned.push(m)
		return m
	}

	root.traverse((child) => {
		if (!child.isMesh) return
		child.geometry = child.geometry.clone()
		cloned.push(child.geometry)
		child.material = cloneMaterial(child.material)
	})

	return { root, disposables: cloned }
}

/** Static walking footprints; flat ground decoration must not block approach. */
export function modelObstaclesFor(obj) {
	obj.updateWorldMatrix(true, true)
	const bounds = new THREE.Box3().setFromObject(obj)
	if (bounds.isEmpty()) return []
	const bottom = bounds.min.y + 0.08
	const top = bounds.min.y + 1.7
	// ponytail: static 15 cm footprints, rebuilt on spawn. Moving/animated props
	// need refreshed footprints; finer contact would need a physics collider.
	const cellSize = 0.15
	const rows = new Map()
	const triangle = new THREE.Triangle()
	const vertices = [triangle.a, triangle.b, triangle.c]
	const cell = new THREE.Box3()
	obj.traverseVisible((mesh) => {
		if (!mesh.isMesh) return
		const positions = mesh.geometry.getAttribute('position')
		if (!positions) return
		const index = mesh.geometry.index
		const count = index ? index.count : positions.count
		for (let i = 0; i + 2 < count; i += 3) {
			for (let j = 0; j < 3; j++) {
				mesh.getVertexPosition(index ? index.getX(i + j) : i + j, vertices[j])
				vertices[j].applyMatrix4(mesh.matrixWorld)
			}
			const { a, b, c } = triangle
			if (Math.max(a.y, b.y, c.y) <= bottom || Math.min(a.y, b.y, c.y) > top) continue
			const minX = Math.floor(Math.min(a.x, b.x, c.x) / cellSize)
			const maxX = Math.floor(Math.max(a.x, b.x, c.x) / cellSize)
			const minZ = Math.floor(Math.min(a.z, b.z, c.z) / cellSize)
			const maxZ = Math.floor(Math.max(a.z, b.z, c.z) / cellSize)
			for (let z = minZ; z <= maxZ; z++) {
				for (let x = minX; x <= maxX; x++) {
					if (rows.get(z)?.has(x)) continue
					cell.min.set(x * cellSize, bottom, z * cellSize)
					cell.max.set((x + 1) * cellSize, top, (z + 1) * cellSize)
					if (!cell.intersectsTriangle(triangle)) continue
					if (!rows.has(z)) rows.set(z, new Set())
					rows.get(z).add(x)
				}
			}
		}
	})
	const obstacles = []
	const previousRuns = new Map()
	for (const z of [...rows.keys()].sort((a, b) => a - b)) {
		const xs = [...rows.get(z)].sort((a, b) => a - b)
		for (let i = 0; i < xs.length; i++) {
			const start = xs[i]
			while (i + 1 < xs.length && xs[i + 1] === xs[i] + 1) i++
			const end = xs[i] + 1
			const key = `${start}:${end}`
			const previous = previousRuns.get(key)
			if (previous?.lastZ === z - 1) {
				previous.box.d += cellSize
				previous.box.z += cellSize / 2
				previous.lastZ = z
			} else {
				const box = { type: 'box', x: (start + end) * cellSize / 2, y: 0,
					z: (z + 0.5) * cellSize, w: (end - start) * cellSize, d: cellSize }
				obstacles.push(box)
				previousRuns.set(key, { box, lastZ: z })
			}
		}
	}
	return obstacles
}

function parseTransform(itm) {
	const pos = itm.position || {}
	let rotY = typeof itm.rotationY === 'number' ? itm.rotationY : (typeof itm.rotY === 'number' ? itm.rotY : 0)
	if (typeof itm.rotationDeg === 'number') {
		rotY = THREE.MathUtils.degToRad(itm.rotationDeg)
	} else if (Math.abs(rotY) > 2 * Math.PI) {
		console.warn(`[PlacedItems] Item "${itm.id || 'unknown'}" has rotationY ${rotY} > 2π rad. Did you mean rotationDeg?`)
	}
	return {
		x: typeof (itm.x ?? pos.x) === 'number' ? (itm.x ?? pos.x) : 0,
		y: typeof (itm.y ?? pos.y) === 'number' ? (itm.y ?? pos.y) : 0,
		z: typeof (itm.z ?? pos.z) === 'number' ? (itm.z ?? pos.z) : 0,
		rotY,
		scale: typeof itm.scale === 'number' && itm.scale > 0 ? itm.scale : 1,
	}
}

/**
 * Load and spawn a GLB model into the active room.
 * Adds the model to the room group, deep-clones its resources for disposal,
 * and registers a floor collision obstacle when the item sits on the floor.
 */
export function spawnGlbItem(itm, roomKey, ctx = {}) {
	const promise = spawnGlbItemAsync(itm, roomKey, ctx)
	pendingGlbSpawns.add(promise)
	promise.then(
		() => pendingGlbSpawns.delete(promise),
		(error) => { pendingGlbSpawns.delete(promise); failedGlbSpawns.push(error) }
	)
	return promise
}

async function spawnGlbItemAsync(itm, roomKey, ctx = {}) {
	const {
		group,
		disposables = [],
		obstacles = [],
	} = ctx

	const path = typeof itm.path === 'string' ? itm.path : null
	if (!path) {
		throw new Error(`[PlacedItems] glb item in "${roomKey}" is missing a "path"`)
	}

	const gltf = await getGltf(path)
	const { root, disposables: clonedResources } = deepCloneScene(gltf.scene)

	const t = parseTransform(itm)
	root.position.set(t.x, t.y, t.z)
	root.rotation.y = t.rotY
	if (t.scale !== 1) root.scale.setScalar(t.scale)

	// Opt-in bounds placement: exported origins need not touch the model's base.
	if (Number.isFinite(itm.targetHeight) && itm.targetHeight > 0) {
		const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3())
		if (size.y > 0) root.scale.multiplyScalar(itm.targetHeight / size.y)
	}
	if (itm.alignToSurface) {
		const box = new THREE.Box3().setFromObject(root)
		if (!box.isEmpty()) {
			const center = box.getCenter(new THREE.Vector3())
			root.position.x += t.x - center.x
			root.position.z += t.z - center.z
			root.position.y += t.y - (itm.contact === 'ceiling' ? box.max.y : box.min.y)
		}
	}

	// Sink the model into the ground/ceiling after surface alignment.
	// Positive values push it down into the floor (e.g. 0.001 = 1mm).
	if (Number.isFinite(itm.sinkY) && itm.sinkY !== 0) {
		root.position.y -= itm.sinkY
	}

	// Register world seat anchors from the spawned, scaled, and aligned model (SEAT-01)
	const artifact = findArtifactByPath(path)
	if (artifact?.seats && Array.isArray(artifact.seats) && artifact.seats.length > 0) {
		const box = new THREE.Box3().setFromObject(root)
		if (!box.isEmpty()) {
			const baseCenterX = (box.min.x + box.max.x) / 2
			const baseMinY = box.min.y
			const baseCenterZ = (box.min.z + box.max.z) / 2
			const rotY = root.rotation.y

			const seatHolder = new THREE.Group()
			seatHolder.name = `seats_${itm.id || 'item'}`
			if (group) group.add(seatHolder)

			for (const s of artifact.seats) {
				const cos = Math.cos(rotY)
				const sin = Math.sin(rotY)
				const wx = baseCenterX + s.x * cos - s.z * sin
				const wz = baseCenterZ + s.x * sin + s.z * cos
				const wy = baseMinY
				const seatYaw = rotY + (s.yaw || 0)

				const anchor = new THREE.Object3D()
				anchor.position.set(wx, wy, wz)
				anchor.rotation.y = seatYaw
				const seatId = `${roomKey}:${itm.id || 'item'}:${s.id}`
				anchor.userData = {
					seatId,
					roomKey,
					height: s.height,
					cushionY: baseMinY + s.height,
				}
				seatHolder.add(anchor)

				const seatRecord = {
					id: seatId,
					room: roomKey,
					roomKey,
					anchor,
					x: wx,
					y: wy,
					z: wz,
					yaw: seatYaw,
					height: s.height,
					cushionY: baseMinY + s.height,
					occupiedBy: null,
				}
				registerRuntimeSeat(seatRecord)
				disposables.push({
					dispose: () => unregisterRuntimeSeat(seatId),
				})

				attachDebugSeatVisual(anchor, seatRecord, group)
			}
		}
	}

	// Optional decimated "lod/" counterpart. When the camera moves beyond
	// `lodDistance` metres, the full-res model is hidden and the light lod is
	// shown instead (and switched back when approaching). If no lod path is
	// configured, the model always renders at full detail.
	const lodPath = typeof itm.lodPath === 'string' ? itm.lodPath : null
	const lodDistance = typeof itm.lodDistance === 'number' && itm.lodDistance > 0 ? itm.lodDistance : 14
	let lodRoot = null
	let lodCloned = []

	if (lodPath) {
		try {
			const lodGltf = await getGltf(lodPath)
			const clone = deepCloneScene(lodGltf.scene)
			lodRoot = clone.root
			lodCloned = clone.disposables
			lodRoot.position.copy(root.position)
			lodRoot.rotation.copy(root.rotation)
			lodRoot.scale.copy(root.scale)
			lodRoot.userData = { ...root.userData, isLod: true }
			lodRoot.traverse((child) => {
				if (child.isMesh) child.frustumCulled = true
			})
			lodRoot.visible = false
		} catch (err) {
			console.warn(`[PlacedItems] LOD load failed for "${lodPath}":`, err)
			lodRoot = null
		}
	}

	if (lodRoot) {
		if (group) {
			group.add(root)
			group.add(lodRoot)
		}

		const switcher = (camPos) => {
			if (!camPos || typeof camPos.distanceTo !== 'function') return
			const d = camPos.distanceTo(root.position)
			const useLod = d > lodDistance
			if (root.visible === useLod) {
				root.visible = !useLod
				lodRoot.visible = useLod
			}
		}

		// Reflect the current camera state immediately once attached.
		activeLodSwitchers.push(switcher)
		// Measure full-detail geometry before the distance switch can hide it.
		const contact = itm.contact || 'floor'
		if (contact === 'floor' && obstacles && Array.isArray(obstacles)) {
			obstacles.push(...modelObstaclesFor(root))
		}
		const origin = ctx.cameraPos
		if (origin) switcher(origin)

		disposables.push(...clonedResources, ...lodCloned)

		return root
	}

	root.userData = root.userData || {}
	root.userData.placedId = itm.id || `itm_glb_${Math.random().toString(36).slice(2, 9)}`
	root.userData.isPlacedArtifact = true
	root.userData.artifactType = 'glb'
	root.userData.roomKey = roomKey
	root.userData.glbPath = path

	// Enable frustum culling so off-camera models are skipped by the renderer
	// (Box3-based bounds already exist on GLTF meshes; this avoids drawing
	// models that are not visible, a large win for rooms that load many
	// models at once).
	root.traverse((child) => {
		if (child.isMesh) child.frustumCulled = true
	})

	if (group) group.add(root)

	// Owned resources → disposed when the room changes.
	disposables.push(...clonedResources)

	// Floor items block the player.
	const contact = itm.contact || 'floor'
	if (contact === 'floor' && obstacles && Array.isArray(obstacles)) {
		obstacles.push(...modelObstaclesFor(root))
	}

	return root
}

/**
 * Spawns placed items additively for the given roomKey
 * @param {string} roomKey e.g. 'lobby', 'fireside', 'music', 'library', 'paris', 'orangery', 'alcove'
 * @param {object} ctx Context from buildRoom ({ group, disposables, obstacles, animatedDecorations, slots, doors, bounds })
 * @returns {Array<THREE.Object3D>} Spawned meshes
 */
export function applyPlacedItems(roomKey, ctx = {}) {
	const items = getPlacedItemsForRoom(roomKey)
	if (!items || items.length === 0) return []

	const {
		group,
		disposables = [],
		obstacles = [],
		animatedDecorations = [],
		slots = [],
		doors = [],
		bounds = {},
	} = ctx

	const spawned = []

	for (const itm of items) {
		if (!itm || typeof itm !== 'object') continue

		// GLB model items load asynchronously (shared cache, deep-cloned disposal).
		if (itm.type === 'glb') {
			spawnGlbItem(itm, roomKey, ctx).catch((error) => {
				console.error(`[PlacedItems] Failed to load "${itm.path}":`, error)
			})
			continue
		}

		const def = getArtifact(itm.type)
		if (!def) {
			console.warn(`[PlacedItems] Unknown artifact type "${itm.type}" in room "${roomKey}". Skipping.`)
			continue
		}

		try {
			const obj = def.build({
				x: typeof itm.x === 'number' ? itm.x : 0,
				y: typeof itm.y === 'number' ? itm.y : 0,
				z: typeof itm.z === 'number' ? itm.z : 0,
				rotY: typeof itm.rotY === 'number' ? itm.rotY : 0,
				scale: typeof itm.scale === 'number' ? itm.scale : 1.0,
				variant: itm.variant || (def.variants ? def.variants[0] : 'default'),
				contact: itm.contact || def.contact,
				parent: itm.parent || null,
				item: itm,
				group,
				disposables,
				obstacles,
				animatedDecorations,
				slots,
				doors,
				bounds,
			})

			if (obj) {
				obj.userData = obj.userData || {}
				obj.userData.placedId = itm.id || `itm_${Math.random().toString(36).slice(2, 9)}`
				obj.userData.isPlacedArtifact = true
				obj.userData.artifactType = itm.type
				obj.userData.roomKey = roomKey
				spawned.push(obj)
			}
		} catch (err) {
			console.error(`[PlacedItems] Failed to build placed item "${itm.id}" (${itm.type}):`, err)
		}
	}

	return spawned
}

/**
 * Wait for all in-flight GLB spawns to settle. Room building is synchronous,
 * but model loading is async; call this before capturing screenshots / running
 * QA checks so every loaded model is present.
 */
export async function whenPlacedItemsLoaded() {
	while (pendingGlbSpawns.size) await Promise.allSettled(Array.from(pendingGlbSpawns))
	if (failedGlbSpawns.length) throw new AggregateError(failedGlbSpawns, 'Required museum models could not load')
}

/**
 * Advance all active LOD switchers. Call this once per frame from the engine
 * render loop with the current camera position so heavy models swap to their
 * decimated counterpart when the camera is far away (and back when close).
 * @param {THREE.Vector3} camPos current camera world position
 */
export function updateLodSwitchers(camPos) {
	if (!camPos) return
	for (let i = 0; i < activeLodSwitchers.length; i++) {
		activeLodSwitchers[i](camPos)
	}
}

