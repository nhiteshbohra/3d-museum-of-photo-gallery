/**
 * Our Museum 3D — Placed Items Spawner
 * 
 * Ingests museumLayout.json (exported from Placement Studio) and spawns
 * all customized artifacts additively into the active room.
 * Reusable by both public index.html and admin Studio without duplicate logic.
 */
import museumLayout from '../../data/museumLayout.json'
import { getArtifact } from './artifactRegistry.js'

let activeLayout = museumLayout

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

