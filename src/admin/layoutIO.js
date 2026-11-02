/**
 * Our Museum 3D — Layout I/O
 * Handles export, import, schema validation, and draft persistence
 * for the Placement Studio layout JSON (v1 schema).
 *
 * Layout JSON v1 schema:
 * {
 *   "version": 1,
 *   "exportedAt": "<ISO string>",
 *   "rooms": {
 *     "<roomKey>": [
 *       {
 *         "id": "itm_<6chars>",
 *         "type": "<artifactId>",
 *         "x": 0, "y": 0, "z": 0,          // floor/surface items
 *         "wall": "north", "u": 0.5,         // wall items (instead of x/z)
 *         "rotY": 0,
 *         "scale": 1.0,
 *         "variant": "default",
 *         "contact": "floor",
 *         "locked": false
 *       }
 *     ]
 *   }
 * }
 */

import { getAllArtifacts, hasArtifact, getArtifact } from '../game/room/artifactRegistry.js'

const DRAFT_KEY = 'ourmuseum:layoutDraft:v1'
const SCHEMA_VERSION = 1

// ─── Schema validation ────────────────────────────────────────────────────────

/**
 * Validate a parsed layout object.
 * Returns { valid: bool, errors: string[], warnings: string[], skippedTypes: string[] }
 */
export function validateLayoutSchema(layout) {
	const errors = []
	const warnings = []
	const skippedTypes = []

	if (!layout || typeof layout !== 'object') {
		return { valid: false, errors: ['Layout is not an object'], warnings, skippedTypes }
	}

	if (layout.version !== SCHEMA_VERSION) {
		errors.push(`Expected version ${SCHEMA_VERSION}, got ${layout.version}`)
	}

	if (!layout.rooms || typeof layout.rooms !== 'object') {
		errors.push('Missing "rooms" object')
		return { valid: false, errors, warnings, skippedTypes }
	}

	const validRoomKeys = ['lobby', 'fireside', 'music', 'library', 'paris', 'orangery', 'alcove', 'gallery']

	for (const [roomKey, items] of Object.entries(layout.rooms)) {
		if (!validRoomKeys.includes(roomKey)) {
			warnings.push(`Unknown room key "${roomKey}" — will be kept but may not display`)
		}

		if (!Array.isArray(items)) {
			errors.push(`Room "${roomKey}" items must be an array`)
			continue
		}

		for (let i = 0; i < items.length; i++) {
			const item = items[i]
			const prefix = `Room "${roomKey}" item[${i}]`

			if (!item || typeof item !== 'object') {
				errors.push(`${prefix} is not an object`)
				continue
			}

			if (typeof item.id !== 'string' || !item.id.match(/^itm_[a-z0-9]+$/i)) {
				warnings.push(`${prefix} has invalid/missing id: "${item.id}"`)
			}

			if (typeof item.type !== 'string') {
				errors.push(`${prefix} missing "type" field`)
				continue
			}

			if (!hasArtifact(item.type)) {
				if (!skippedTypes.includes(item.type)) skippedTypes.push(item.type)
				warnings.push(`${prefix} type "${item.type}" not in registry — will be skipped`)
				continue
			}

			// Position check
			const isWallItem = typeof item.wall === 'string'
			if (isWallItem) {
				if (!['north', 'south', 'east', 'west'].includes(item.wall)) {
					warnings.push(`${prefix} has invalid wall "${item.wall}"`)
				}
				if (typeof item.u !== 'number') {
					warnings.push(`${prefix} missing "u" for wall item`)
				}
			} else {
				if (typeof item.x !== 'number' || typeof item.z !== 'number') {
					warnings.push(`${prefix} missing x/z coordinates`)
				}
			}

			if (typeof item.rotY !== 'number') {
				warnings.push(`${prefix} missing "rotY"`)
			}

			const scale = item.scale
			if (typeof scale !== 'number' || scale < 0.85 || scale > 1.2) {
				warnings.push(`${prefix} scale ${scale} out of range [0.85, 1.2] — will be clamped`)
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		skippedTypes,
	}
}

// ─── Export ────────────────────────────────────────────────────────────────────

/**
 * Download a layout object as museum-layout.json.
 * @param {Object} layoutData - The raw layout object (rooms map)
 * @param {string} [roomKey] - Current room key for metadata
 */
export function exportLayout(layoutData, roomKey = '') {
	const payload = {
		version: SCHEMA_VERSION,
		exportedAt: new Date().toISOString(),
		exportedRoom: roomKey || undefined,
		rooms: layoutData,
	}

	const json = JSON.stringify(payload, null, 2)
	const blob = new Blob([json], { type: 'application/json' })
	const url = URL.createObjectURL(blob)

	const a = document.createElement('a')
	a.href = url
	a.download = 'museum-layout.json'
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// ─── Import ────────────────────────────────────────────────────────────────────

/**
 * Parse and validate a layout JSON file.
 * Unknown artifact types are skipped with a warning.
 * Returns a Promise resolving to:
 *   { layout: Object, validation: Object, diff: string }
 * Or rejects with an Error on parse failure.
 *
 * @param {File} file - File from <input type="file"> or drag-drop
 * @param {Object} [currentRooms] - Current layout rooms for diff summary
 */
export function importLayout(file, currentRooms = {}) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()

		reader.onload = (e) => {
			let parsed
			try {
				parsed = JSON.parse(e.target.result)
			} catch (err) {
				reject(new Error(`JSON parse error: ${err.message}`))
				return
			}

			const validation = validateLayoutSchema(parsed)

			// Filter out items with unknown types
			const cleanedRooms = {}
			if (parsed.rooms && typeof parsed.rooms === 'object') {
				for (const [roomKey, items] of Object.entries(parsed.rooms)) {
					if (!Array.isArray(items)) continue
					cleanedRooms[roomKey] = items
						.filter((item) => {
							if (!item || typeof item.type !== 'string') return false
							return hasArtifact(item.type)
						})
						.map((item) => ({
							...item,
							scale: Math.max(0.85, Math.min(1.2, item.scale ?? 1.0)),
						}))
				}
			}

			// Compute diff summary
			const diff = buildDiffSummary(currentRooms, cleanedRooms)

			resolve({
				layout: { ...parsed, rooms: cleanedRooms },
				validation,
				diff,
			})
		}

		reader.onerror = () => reject(new Error('File read error'))
		reader.readAsText(file)
	})
}

/**
 * Build a human-readable diff summary between two room layouts.
 */
function buildDiffSummary(before, after) {
	const lines = []
	const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

	for (const roomKey of allKeys) {
		const prevItems = before[roomKey] || []
		const nextItems = after[roomKey] || []
		const prevIds = new Set(prevItems.map((i) => i.id))
		const nextIds = new Set(nextItems.map((i) => i.id))

		const added = nextItems.filter((i) => !prevIds.has(i.id))
		const removed = prevItems.filter((i) => !nextIds.has(i.id))
		const kept = nextItems.filter((i) => prevIds.has(i.id))

		if (added.length || removed.length) {
			lines.push(`${roomKey}: +${added.length} added, -${removed.length} removed, ${kept.length} unchanged`)
		}
	}

	return lines.length ? lines.join('\n') : 'No changes detected'
}

// ─── Draft persistence ─────────────────────────────────────────────────────────

/**
 * Save current layout to localStorage draft.
 * @param {Object} rooms - The rooms map
 */
export function saveDraft(rooms) {
	try {
		const draft = {
			version: SCHEMA_VERSION,
			savedAt: new Date().toISOString(),
			rooms,
		}
		window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
	} catch (err) {
		console.warn('[LayoutIO] Could not save draft:', err)
	}
}

/**
 * Load draft from localStorage.
 * Returns { rooms, savedAt } or null if no valid draft.
 */
export function loadDraft() {
	try {
		const raw = window.localStorage.getItem(DRAFT_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw)
		if (!parsed || parsed.version !== SCHEMA_VERSION || !parsed.rooms) return null
		return { rooms: parsed.rooms, savedAt: parsed.savedAt || null }
	} catch {
		return null
	}
}

/**
 * Clear the localStorage draft.
 */
export function clearDraft() {
	try {
		window.localStorage.removeItem(DRAFT_KEY)
	} catch {
		// ignore
	}
}

// ─── ID generation ─────────────────────────────────────────────────────────────

/**
 * Generate a unique item ID like "itm_a3f7b2"
 */
export function generateItemId() {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
	let id = 'itm_'
	for (let i = 0; i < 6; i++) {
		id += chars[Math.floor(Math.random() * chars.length)]
	}
	return id
}

// ─── Museum live layout (auto-save from Studio) ────────────────────────────────
//
// The Place Studio edits items in its own schema (type = artifact id, scale =
// relative factor 0.85–1.2). The museum (`placedItems.js`) consumes the layout
// schema (type: "glb", absolute path, absolute scale = relative × defaultScale).
// These helpers convert the Studio rooms into museum layout rooms and persist
// them under a dedicated key so the museum picks up the latest arrangement
// automatically (no manual file edits / export needed).
//
// The museum layout key is a *runtime* override layered over the static
// src/data/museumLayout.json import. To bake an arrangement permanently into
// the repo, still use Export → download museum-layout.json and replace that file.

const MUSEUM_KEY = 'ourmuseum:layoutMuseum:v1'

/**
 * Convert Placement Studio rooms (artifact-id schema) into museum layout rooms
 * (glb schema) so the museum spawner can render them at real-world scale.
 * @param {Object} rooms - Studio rooms map (from placedItems / _saveDraftNow)
 * @returns {Object} Museum-ready rooms map
 */
export function convertStudioRoomsToMuseum(rooms) {
	const out = {}
	for (const [roomKey, items] of Object.entries(rooms || {})) {
		const converted = []
		for (const item of items) {
			if (!item || typeof item !== 'object') continue
			const def = typeof item.type === 'string' ? getArtifact(item.type) : null
			if (!def || def.kind !== 'glb' || !def.path) continue
			converted.push({
				id: item.id,
				type: 'glb',
				path: def.path,
				x: item.x ?? 0,
				y: item.y ?? 0,
				z: item.z ?? 0,
				rotY: item.rotY ?? 0,
				scale: (item.scale ?? 1) * (def.defaultScale || 1),
				variant: 'default',
				contact: item.contact || def.contact || 'floor',
				locked: !!item.locked,
			})
		}
		out[roomKey] = converted
	}
	return out
}

/**
 * Persist the museum-ready rooms to localStorage. Called from the Studio on
 * every change (add / move / remove) so the museum reflects the latest
 * arrangement automatically.
 */
export function saveMuseumLayout(rooms) {
	try {
		const payload = {
			version: SCHEMA_VERSION,
			savedAt: new Date().toISOString(),
			rooms,
		}
		window.localStorage.setItem(MUSEUM_KEY, JSON.stringify(payload))
	} catch (err) {
		console.warn('[LayoutIO] Could not save museum layout:', err)
	}
}

/**
 * Load the museum live layout override, or null if none saved.
 * @returns {{ rooms: Object, savedAt: ?string } | null}
 */
export function loadMuseumLayout() {
	try {
		const raw = window.localStorage.getItem(MUSEUM_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw)
		if (!parsed || parsed.version !== SCHEMA_VERSION || !parsed.rooms) return null
		return { rooms: parsed.rooms, savedAt: parsed.savedAt || null }
	} catch {
		return null
	}
}

/**
 * Forget the museum live layout override (back to the static JSON import).
 */
export function clearMuseumLayout() {
	try {
		window.localStorage.removeItem(MUSEUM_KEY)
	} catch {
		// ignore
	}
}

