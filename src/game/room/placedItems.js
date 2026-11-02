/**
 * Our Museum 3D — Placed Items Spawner
 * 
 * Ingests museumLayout.json (exported from Placement Studio) and spawns
 * all customized artifacts additively into the active room.
 * Reusable by both public index.html and admin Studio without duplicate logic.
 *
 * Supports two item kinds:
 *  - procedural artifacts (type matches an artifactRegistry id)
 *  - GLB models (type "glb", loaded from `path` with a shared GLTFLoader
 *    cache, deep-cloned per room so resources can be disposed safely).
 */
import * as THREE from 'three'
import museumLayout from '../../data/museumLayout.json'
import { getArtifact } from './artifactRegistry.js'
import { loadMuseumLayout } from '../../admin/layoutIO.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

let activeLayout = museumLayout

// Runtime override: if the Placement Studio has auto-saved an arrangement, the
// museum uses it instead of the static import. This makes Studio edits persist
// automatically across museum sessions (see layoutIO saveMuseumLayout).
const museumOverride = loadMuseumLayout()
if (museumOverride && museumOverride.rooms) {
	activeLayout = museumOverride.rooms
}

export function setRuntimeLayout(layout) {
	if (layout && typeof layout === 'object' && layout.rooms) {
		activeLayout = layout
	}
}

export function getRuntimeLayout() {
	return activeLayout
}

export function getPlacedItemsForRoom(roomKey) {
	if (!activeLayout || !activeLayout.rooms) return []
	const items = activeLayout.rooms[roomKey]
	return Array.isArray(items) ? items : []
}

// ─────────────────────────────────────────────────────────────────────────────
// GLB MODEL SUPPORT (type: "glb")
// ─────────────────────────────────────────────────────────────────────────────

/** Shared GLTFLoader cache keyed by model path (load once, reuse everywhere). */
const gltfCache = new Map()

/** Pending GLB spawn promises, so callers/tests can await room load completion. */
const pendingGlbSpawns = new Set()

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

/** Compute a floor obstacle footprint from a model's world-space bounding box. */
function boxObstacleFor(obj) {
	const box = new THREE.Box3().setFromObject(obj)
	const size = box.getSize(new THREE.Vector3())
	const center = box.getCenter(new THREE.Vector3())
	return {
		type: 'box',
		x: center.x,
		y: 0,
		z: center.z,
		w: Math.max(size.x, 0.05),
		d: Math.max(size.z, 0.05),
	}
}

function parseTransform(itm) {
	const pos = itm.position || {}
	return {
		x: typeof (itm.x ?? pos.x) === 'number' ? (itm.x ?? pos.x) : 0,
		y: typeof (itm.y ?? pos.y) === 'number' ? (itm.y ?? pos.y) : 0,
		z: typeof (itm.z ?? pos.z) === 'number' ? (itm.z ?? pos.z) : 0,
		rotY: typeof itm.rotationY === 'number' ? itm.rotationY : (typeof itm.rotY === 'number' ? itm.rotY : 0),
		scale: typeof itm.scale === 'number' && itm.scale > 0 ? itm.scale : 1,
	}
}

/**
 * Load and spawn a GLB model into the active room.
 * Adds the model to the room group, deep-clones its resources for disposal,
 * and registers a floor collision obstacle when the item sits on the floor.
 */
export async function spawnGlbItem(itm, roomKey, ctx = {}) {
	const {
		group,
		disposables = [],
		obstacles = [],
	} = ctx

	const path = typeof itm.path === 'string' ? itm.path : null
	if (!path) {
		console.error(`[PlacedItems] glb item in "${roomKey}" is missing a "path"`)
		return null
	}

	const gltf = await getGltf(path)
	const { root, disposables: clonedResources } = deepCloneScene(gltf.scene)

	const t = parseTransform(itm)
	root.position.set(t.x, t.y, t.z)
	root.rotation.y = t.rotY
	if (t.scale !== 1) root.scale.setScalar(t.scale)

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
		const origin = ctx.cameraPos
		if (origin) switcher(origin)

		disposables.push(...clonedResources, ...lodCloned)

		// Floor items block the player regardless of which LOD is visible.
		const contact = itm.contact || 'floor'
		if (contact === 'floor' && obstacles && Array.isArray(obstacles)) {
			obstacles.push(boxObstacleFor(root))
		}

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
		obstacles.push(boxObstacleFor(root))
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
			const spawnPromise = spawnGlbItem(itm, roomKey, ctx)
			pendingGlbSpawns.add(spawnPromise)
			spawnPromise.finally(() => pendingGlbSpawns.delete(spawnPromise))
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
	if (pendingGlbSpawns.size === 0) return
	await Promise.allSettled(Array.from(pendingGlbSpawns))
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

