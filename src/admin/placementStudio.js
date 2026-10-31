/**
 * Our Museum 3D — Placement Studio v1
 * Admin-only tool for placing, moving, rotating, and exporting artifacts.
 *
 * Keyboard shortcuts (active in build mode only unless noted):
 *   B         — Toggle Build Mode (admin only, always active)
 *   Tab       — Toggle Walk / Cursor input mode
 *   Q / E     — Rotate ghost -15° / +15°
 *   Wheel     — Rotate ghost ±15° (Shift = ±1°)
 *   Space     — Place at current ghost position and keep artifact selected
 *   Click     — Place item at ghost (Cursor mode) / select item
 *   F         — Drop selected / ghost to floor (intercepts fullscreen handler)
 *   G         — Grab selected placed item back into placement mode
 *   Delete    — Delete selected placed item
 *   Ctrl+D    — Duplicate selected placed item
 *   Ctrl+Z    — Undo last action
 *   Ctrl+Y    — Redo last undone action
 *   Arrows    — Nudge ghost/selected 5 cm (Shift = 1 cm)
 *   Esc       — Exit Build Mode or deselect
 */

import * as THREE from 'three'
import { getAllArtifacts, getArtifact, getArtifactsByCategory } from '../game/room/artifactRegistry.js'
import { pushDisp, mkGeo, mkMat } from '../game/room/decorations.js'
import {
	exportLayout,
	importLayout,
	saveDraft,
	loadDraft,
	clearDraft,
	generateItemId,
} from './layoutIO.js'
import {
	initPlacementTopView,
	toggleTopView,
	updateTopViewOverlays,
	isTopViewOpen,
} from './placementTopView.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const WALL_NAMES = ['north', 'south', 'east', 'west']
const MIN_DOOR_DISTANCE = 2.0          // m — keep-out around doors
const MIN_ARTWORK_DISTANCE = 1.5       // m — wall items from slot edges
const MIN_WALKABLE_GAP = 0.8           // m — gap between floor items
const MAX_LIGHTS_PER_ROOM = 8
const SCALE_MIN = 0.85
const SCALE_MAX = 1.2
const NUDGE_LARGE = 0.05               // m — arrow key nudge
const NUDGE_SMALL = 0.01              // m — Shift+arrow nudge
const ROTATE_LARGE = 15               // degrees
const ROTATE_SMALL = 1                // degrees (Shift+wheel)
const GHOST_FLOOR_Y = 0.001           // slight offset above floor to prevent z-fighting
const CATEGORIES = ['lighting', 'seating', 'walldecor', 'vitrines', 'plants']
const CATEGORY_LABELS = {
	lighting: 'Lighting',
	seating: 'Seating',
	walldecor: 'Wall Decor',
	vitrines: 'Vitrines & Sculpture',
	plants: 'Plants',
}

// ─── State ────────────────────────────────────────────────────────────────────

let _engineApi = null
let _scene = null
let _camera = null
let _renderer = null
let _canvas = null

let buildMode = false
let inputMode = 'walk'        // 'walk' | 'cursor'
let selectedArtifactId = null // catalog selection (for placement)
let selectedPlacedId = null   // placed item selection (for inspector)

let ghostGroup = null
let ghostDisposables = []
let ghostValid = false
let ghostRule = ''
let ghostRotY = 0
let ghostScale = 1.0
let ghostPosition = new THREE.Vector3()

let placedItems = {}          // { [roomKey]: [ itemDef, ... ] }
let undoStack = []
let redoStack = []

let favourites = new Set()    // Set of artifactIds
let recents = []              // array of artifactIds, newest first, max 8

let strictMode = true
let gridSnap = false          // 0.05 m grid snap

let currentRoomCtx = null     // { slots, doors, obstacles, bounds, roomKey }

// Raycasting
const _raycaster = new THREE.Raycaster()
const _mouse = new THREE.Vector2()
let _floorPlane = null        // THREE.Plane for floor y=0

// Panel elements
let _panelEl = null
let _inspectorEl = null
let _catalogEl = null
let _topBarEl = null
let _draftBannerEl = null
let _tooltipEl = null
let _counterEl = null

// Cursor tracking
let _cursorActive = false
let _lastMouseX = 0
let _lastMouseY = 0

// ─── Entry Point ──────────────────────────────────────────────────────────────

/**
 * Initialize the Placement Studio.
 * Called from main.js when isAdmin === true.
 * @param {Object} engineApi - The engineApi object from startYourEngines
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {THREE.WebGLRenderer} renderer
 * @param {HTMLCanvasElement} canvas
 */
export function initPlacementStudio(engineApi, scene, camera, renderer, canvas) {
	_engineApi = engineApi
	_scene = scene
	_camera = camera
	_renderer = renderer
	_canvas = canvas

	_floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

	// Load initial room context
	_syncRoomContext()

	// Listen for room changes via custom event from engine
	window.addEventListener('museum:roombuilt', _onRoomBuilt)

	// Build panel HTML
	_buildPanel()
	_buildTooltip()

	// Wire keyboard & mouse
	window.addEventListener('keydown', _onKeyDown, { capture: true })
	canvas.addEventListener('mousemove', _onMouseMove)
	canvas.addEventListener('click', _onCanvasClick)
	canvas.addEventListener('wheel', _onWheel, { passive: false })

	// Initialize Top-Down Orthographic Map View (Phase 3)
	initPlacementTopView(_engineApi, _scene, _camera, _canvas, {
		getStudioState,
		selectPlacedItem,
		updatePlacedItemTransform,
		deletePlacedItem,
		undoLastAction,
		redoLastAction,
		enterBuildMode,
		setCursorMode,
		showToast,
		isStudioBuildMode,
	})

	// Check for saved draft
	_checkForDraft()

	console.log('[Studio] Placement Studio v1 initialized. Press B to enter Build Mode.')
}

// ─── Room context sync ─────────────────────────────────────────────────────────

function _syncRoomContext() {
	if (!_engineApi) return
	const room = _engineApi.getCurrentRoom?.()
	const roomKey = _engineApi.getRoomKey?.() || 'gallery'
	if (room) {
		currentRoomCtx = {
			slots: room.slots || [],
			doors: room.doors || [],
			obstacles: room.obstacles || [],
			bounds: room.bounds || { halfW: 6, halfL: 6 },
			roomKey,
		}
	}
}

function _onRoomBuilt(e) {
	if (e.detail) {
		currentRoomCtx = e.detail
	} else {
		_syncRoomContext()
	}
	_refreshCounterDisplay()
	_refreshInspector()
}

// ─── Build Mode toggle ────────────────────────────────────────────────────────

function _enterBuildMode() {
	buildMode = true
	inputMode = 'walk'

	document.body.classList.add('studio-build-mode')
	if (_panelEl) _panelEl.style.display = 'flex'
	if (_topBarEl) _topBarEl.style.display = 'flex'

	// Release pointer lock so cursor is free
	if (document.pointerLockElement) {
		document.exitPointerLock()
	}
	// Switch to cursor mode automatically
	_setCursorMode('cursor')
	_refreshPanel()

	_showToast('🏛 Build Mode ON — Tab: Walk/Cursor, B: Exit')
}

function _exitBuildMode() {
	buildMode = false
	_setCursorMode('walk')
	document.body.classList.remove('studio-build-mode')
	if (_panelEl) _panelEl.style.display = 'none'
	if (_topBarEl) _topBarEl.style.display = 'none'
	if (_draftBannerEl) _draftBannerEl.style.display = 'none'

	_clearGhost()
	selectedArtifactId = null
	selectedPlacedId = null
	_hideTooltip()
	_showToast('Build Mode OFF')
}

function _setCursorMode(mode) {
	inputMode = mode
	if (mode === 'cursor') {
		_cursorActive = true
		// Don't request pointer lock — free cursor for panel interaction
		if (document.pointerLockElement) document.exitPointerLock()
		if (_panelEl) _panelEl.style.pointerEvents = 'auto'
		document.body.style.cursor = ''
	} else {
		_cursorActive = false
		if (_panelEl) _panelEl.style.pointerEvents = 'none'
		// Request pointer lock for WASD
		try { _canvas.requestPointerLock() } catch (_) {}
	}
	_updateModeButton()
}

// ─── Keyboard handler ─────────────────────────────────────────────────────────

function _onKeyDown(e) {
	// B key: toggle build mode (always active in admin)
	if ((e.code === 'KeyB' || e.key === 'b' || e.key === 'B') &&
		!['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
		e.stopPropagation()
		if (buildMode) _exitBuildMode()
		else _enterBuildMode()
		return
	}

	// T key: toggle top-down map view (always active in admin)
	if ((e.code === 'KeyT' || e.key === 't' || e.key === 'T') &&
		!['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
		e.stopPropagation()
		toggleTopView()
		return
	}

	if (!buildMode) return

	// Prevent input fields from triggering shortcuts
	if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return

	const key = e.key
	const code = e.code

	// Tab: Walk / Cursor toggle
	if (key === 'Tab') {
		e.preventDefault()
		e.stopPropagation()
		_setCursorMode(inputMode === 'walk' ? 'cursor' : 'walk')
		return
	}

	// Esc: exit build mode or deselect
	if (key === 'Escape') {
		e.stopPropagation()
		if (isTopViewOpen()) {
			toggleTopView(false)
			return
		}
		if (selectedArtifactId || selectedPlacedId) {
			selectedArtifactId = null
			selectedPlacedId = null
			_clearGhost()
			_refreshPanel()
			_refreshInspector()
		} else {
			_exitBuildMode()
		}
		return
	}

	// F key: drop to floor (intercept before fullscreen handler)
	if (code === 'KeyF' || key === 'f' || key === 'F') {
		e.preventDefault()
		e.stopPropagation()
		_dropToFloor()
		return
	}

	// Ctrl+Z: undo
	if ((e.ctrlKey || e.metaKey) && (code === 'KeyZ' || key === 'z' || key === 'Z')) {
		e.preventDefault()
		_undo()
		return
	}

	// Ctrl+Y: redo
	if ((e.ctrlKey || e.metaKey) && (code === 'KeyY' || key === 'y' || key === 'Y')) {
		e.preventDefault()
		_redo()
		return
	}

	// Ctrl+D: duplicate
	if ((e.ctrlKey || e.metaKey) && (code === 'KeyD' || key === 'd' || key === 'D')) {
		e.preventDefault()
		_duplicateSelected()
		return
	}

	// Q: rotate -15
	if (code === 'KeyQ' || key === 'q' || key === 'Q') {
		e.preventDefault()
		ghostRotY -= THREE.MathUtils.degToRad(ROTATE_LARGE)
		_updateGhostTransform()
		return
	}

	// E: rotate +15
	if (code === 'KeyE' || key === 'e' || key === 'E') {
		e.preventDefault()
		ghostRotY += THREE.MathUtils.degToRad(ROTATE_LARGE)
		_updateGhostTransform()
		return
	}

	// G: grab selected placed item
	if (code === 'KeyG' || key === 'g' || key === 'G') {
		e.preventDefault()
		_grabSelected()
		return
	}

	// Space: place and keep
	if (key === ' ') {
		e.preventDefault()
		e.stopPropagation()
		if (ghostValid && selectedArtifactId) _commitPlacement()
		return
	}

	// Delete: remove selected placed item
	if (key === 'Delete') {
		e.preventDefault()
		_deleteSelected()
		return
	}

	// Arrow keys: nudge ghost
	if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
		e.preventDefault()
		e.stopPropagation()
		const step = e.shiftKey ? NUDGE_SMALL : NUDGE_LARGE
		if (key === 'ArrowLeft')  ghostPosition.x -= step
		if (key === 'ArrowRight') ghostPosition.x += step
		if (key === 'ArrowUp')    ghostPosition.z -= step
		if (key === 'ArrowDown')  ghostPosition.z += step
		_updateGhostTransform()
		_validateGhost()
		return
	}
}

// ─── Mouse handlers ────────────────────────────────────────────────────────────

function _onMouseMove(e) {
	if (!buildMode || inputMode !== 'cursor') return

	const rect = _canvas.getBoundingClientRect()
	_lastMouseX = e.clientX
	_lastMouseY = e.clientY

	// Convert to NDC
	_mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
	_mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

	if (selectedArtifactId) {
		_updateGhostFromMouse()
	}
}

function _onCanvasClick(e) {
	if (!buildMode || inputMode !== 'cursor') return

	if (selectedArtifactId) {
		// Place item
		if (ghostValid) {
			_commitPlacement()
		} else {
			_showToast(`⚠ Cannot place here: ${ghostRule}`)
		}
	} else {
		// Try to select a placed item
		_trySelectPlaced(e)
	}
}

function _onWheel(e) {
	if (!buildMode || inputMode !== 'cursor') return
	if (!selectedArtifactId && !selectedPlacedId) return
	e.preventDefault()

	const deg = e.shiftKey ? ROTATE_SMALL : ROTATE_LARGE
	ghostRotY += THREE.MathUtils.degToRad(deg * Math.sign(e.deltaY))
	_updateGhostTransform()
}

// ─── Ghost management ─────────────────────────────────────────────────────────

function _buildGhost(artifactId) {
	_clearGhost()
	if (!artifactId) return

	const def = getArtifact(artifactId)
	if (!def) return

	ghostGroup = new THREE.Group()
	ghostGroup.name = 'studio-ghost'

	// Build ghost using the artifact's build function
	try {
		ghostDisposables = []
		const ctx = _makeGhostBuildCtx(def, ghostGroup, ghostDisposables)
		def.build(ctx)
	} catch (err) {
		console.warn('[Studio] Ghost build error for', artifactId, err)
	}

	// Make all ghost meshes semi-transparent
	ghostGroup.traverse((obj) => {
		if (obj.isMesh) {
			// Clone material to avoid modifying the real one
			if (Array.isArray(obj.material)) {
				obj.material = obj.material.map((m) => {
					const c = m.clone()
					c.transparent = true
					c.opacity = 0.48
					c.depthWrite = false
					return c
				})
			} else if (obj.material) {
				obj.material = obj.material.clone()
				obj.material.transparent = true
				obj.material.opacity = 0.48
				obj.material.depthWrite = false
			}
		}
		// Disable lights in ghost — they aren't real
		if (obj.isLight) obj.visible = false
	})

	_scene.add(ghostGroup)
	_validateGhost()
}

function _makeGhostBuildCtx(def, group, disposables) {
	return {
		group,
		disposables,
		obstacles: [],
		variant: def.variants?.[0] || 'default',
		scale: ghostScale,
		x: 0,
		y: 0,
		z: 0,
		rotY: 0,
	}
}

function _updateGhostFromMouse() {
	if (!ghostGroup || !_camera) return

	_raycaster.setFromCamera(_mouse, _camera)

	// Try to hit floor plane
	const target = new THREE.Vector3()
	const hitFloor = _raycaster.ray.intersectPlane(_floorPlane, target)

	if (hitFloor) {
		let x = target.x
		let z = target.z

		// Grid snap
		if (gridSnap) {
			x = Math.round(x / 0.05) * 0.05
			z = Math.round(z / 0.05) * 0.05
		}

		ghostPosition.set(x, GHOST_FLOOR_Y, z)
	}

	_updateGhostTransform()
	_validateGhost()
}

function _updateGhostTransform() {
	if (!ghostGroup) return
	ghostGroup.position.copy(ghostPosition)
	ghostGroup.rotation.y = ghostRotY
	ghostGroup.scale.setScalar(ghostScale)

	// Update tooltip position
	if (_tooltipEl && !ghostValid) {
		_tooltipEl.style.left = `${_lastMouseX + 14}px`
		_tooltipEl.style.top = `${_lastMouseY - 10}px`
	}
}

function _setGhostColor(valid) {
	ghostValid = valid
	ghostGroup?.traverse((obj) => {
		if (!obj.isMesh) return
		const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
		mats.forEach((m) => {
			if (!m) return
			if (valid) {
				m.color?.set(0x88ffaa)
				m.emissive?.set(0x003311)
			} else {
				m.color?.set(0xff4444)
				m.emissive?.set(0x330000)
			}
		})
	})
}

function _clearGhost() {
	if (ghostGroup) {
		_scene.remove(ghostGroup)
		// Dispose ghost materials
		ghostGroup.traverse((obj) => {
			if (obj.isMesh) {
				const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
				mats.forEach((m) => m?.dispose?.())
			}
		})
		ghostGroup = null
	}
	ghostDisposables.forEach((d) => d?.dispose?.())
	ghostDisposables = []
}

// ─── Validator ─────────────────────────────────────────────────────────────────

function _validateGhost() {
	if (!ghostGroup || !selectedArtifactId) return

	const def = getArtifact(selectedArtifactId)
	if (!def) return

	const result = validatePlacement({
		def,
		x: ghostPosition.x,
		z: ghostPosition.z,
		rotY: ghostRotY,
		excludeId: null,
		roomCtx: currentRoomCtx,
	})

	ghostRule = result.rule || ''
	_setGhostColor(result.valid)

	if (result.valid) {
		_hideTooltip()
	} else {
		_showTooltip(result.rule)
	}
}

/**
 * Core placement validator.
 * @param {Object} opts
 * @returns {{ valid: boolean, rule: string|null }}
 */
function validatePlacement({ def, x, z, rotY, excludeId, roomCtx }) {
	if (!def || !roomCtx) return { valid: true, rule: null }

	const { bounds, doors, obstacles } = roomCtx
	const fp = def.footprint || { shape: 'cylinder', radius: 0.3, height: 1.0 }
	const halfW = bounds?.halfW ?? 6
	const halfL = bounds?.halfL ?? 6

	// Footprint radius for clearance calculations
	const fpRadius = fp.shape === 'cylinder'
		? (fp.radius || 0.3)
		: Math.max(fp.w || 0.3, fp.d || 0.3) / 2

	// 1. Bounds check
	if (Math.abs(x) > halfW - fpRadius - 0.1) {
		return { valid: false, rule: 'Out of bounds (left/right wall)' }
	}
	if (Math.abs(z) > halfL - fpRadius - 0.1) {
		return { valid: false, rule: 'Out of bounds (front/back wall)' }
	}

	// 2. Door keep-out: 2.0 m from each door position
	const doorKeepOut = MIN_DOOR_DISTANCE + fpRadius
	for (const door of (doors || [])) {
		const dp = door.position || door
		if (!dp || typeof dp.x !== 'number') continue
		const dx = x - (dp.x || 0)
		const dz = z - (dp.z || 0)
		const dist = Math.sqrt(dx * dx + dz * dz)
		if (dist < doorKeepOut) {
			return { valid: false, rule: `Too close to door "${door.id || 'door'}" (min ${MIN_DOOR_DISTANCE}m)` }
		}
	}

	// 3. Footprint-vs-footprint: no overlap with existing placed items in this room
	const roomKey = roomCtx.roomKey
	const existing = (placedItems[roomKey] || []).filter((i) => i.id !== excludeId)
	for (const item of existing) {
		const existDef = getArtifact(item.type)
		if (!existDef) continue
		const existFp = existDef.footprint || { shape: 'cylinder', radius: 0.3 }
		const existR = existFp.shape === 'cylinder'
			? (existFp.radius || 0.3)
			: Math.max(existFp.w || 0.3, existFp.d || 0.3) / 2

		const dx = x - (item.x || 0)
		const dz = z - (item.z || 0)
		const dist = Math.sqrt(dx * dx + dz * dz)
		const minDist = fpRadius + existR

		if (dist < minDist) {
			return { valid: false, rule: `Overlaps existing item (${item.type})` }
		}
	}

	// 4. Walkable gap: 0.8 m gap between any two floor items
	if (def.contact !== 'wall' && def.contact !== 'ceiling') {
		for (const item of existing) {
			const existDef = getArtifact(item.type)
			if (!existDef || existDef.contact === 'wall' || existDef.contact === 'ceiling') continue
			const existR = (() => {
				const fp2 = existDef.footprint || { shape: 'cylinder', radius: 0.3 }
				return fp2.shape === 'cylinder'
					? (fp2.radius || 0.3)
					: Math.max(fp2.w || 0.3, fp2.d || 0.3) / 2
			})()

			const dx = x - (item.x || 0)
			const dz = z - (item.z || 0)
			const dist = Math.sqrt(dx * dx + dz * dz)
			const minGap = fpRadius + existR + MIN_WALKABLE_GAP

			if (dist < minGap) {
				return { valid: false, rule: `Walkable gap too small (need ${MIN_WALKABLE_GAP}m between items)` }
			}
		}
	}

	// 5. Light budget
	if ((def.lightCount || 0) > 0) {
		const currentLights = existing.reduce((sum, item) => {
			const d = getArtifact(item.type)
			return sum + (d?.lightCount || 0)
		}, 0)
		if (currentLights + def.lightCount > MAX_LIGHTS_PER_ROOM) {
			return { valid: false, rule: `Light budget exceeded (max ${MAX_LIGHTS_PER_ROOM}/room)` }
		}
	}

	// 6. Strict mode: relaxed allows ≤0.9m tall items under art if ≥0.35m below frame bottom
	// (slot artwork clearance is only strict)
	if (strictMode && def.contact !== 'wall') {
		const slots = roomCtx.slots || []
		for (const slot of slots) {
			if (!slot.position) continue
			const dx = x - (slot.position.x || 0)
			const dz = z - (slot.position.z || 0)
			const dist = Math.sqrt(dx * dx + dz * dz)
			const slotR = slot.radius || 0.5
			if (dist < slotR + fpRadius + MIN_ARTWORK_DISTANCE) {
				return { valid: false, rule: 'Too close to artwork slot (strict mode)' }
			}
		}
	}

	return { valid: true, rule: null }
}

// ─── Placement commit ──────────────────────────────────────────────────────────

function _commitPlacement(keepSelected = true) {
	if (!selectedArtifactId || !ghostValid) return

	const def = getArtifact(selectedArtifactId)
	if (!def) return

	const roomKey = currentRoomCtx?.roomKey || 'gallery'
	if (!placedItems[roomKey]) placedItems[roomKey] = []

	const item = {
		id: generateItemId(),
		type: selectedArtifactId,
		x: ghostPosition.x,
		y: ghostPosition.y,
		z: ghostPosition.z,
		rotY: ghostRotY,
		scale: Math.max(SCALE_MIN, Math.min(SCALE_MAX, ghostScale)),
		variant: def.variants?.[0] || 'default',
		contact: def.contact || 'floor',
		locked: false,
	}

	// Push to undo stack
	_pushUndo({ action: 'place', item: { ...item }, roomKey })

	placedItems[roomKey].push(item)
	_spawnPlacedItem(item, roomKey)
	_saveDraftNow()
	_refreshCounterDisplay()

	// Update recents
	_addToRecents(selectedArtifactId)

	if (!keepSelected) {
		selectedArtifactId = null
		_clearGhost()
	} else {
		// Keep ghost at new position for repeat placing
		ghostPosition.x += 0.1
		_updateGhostTransform()
		_validateGhost()
	}

	_showToast(`✓ Placed ${def.name}`)
}

// ─── Spawn placed item into scene ─────────────────────────────────────────────

function _spawnPlacedItem(item, roomKey) {
	const def = getArtifact(item.type)
	if (!def) return

	const group = new THREE.Group()
	group.name = `studio-placed-${item.id}`
	group.userData.studioItemId = item.id
	group.userData.studioRoomKey = roomKey

	try {
		const disposables = []
		const obstacles = currentRoomCtx?.obstacles || []
		const obsCountBefore = obstacles.length
		const ctx = {
			group,
			disposables,
			obstacles,
			variant: item.variant || def.variants?.[0] || 'default',
			scale: item.scale ?? 1.0,
			x: 0,
			y: 0,
			z: 0,
			rotY: 0,
		}
		def.build(ctx)
		item._disposables = disposables
		item._addedObstacles = obstacles.slice(obsCountBefore)
	} catch (err) {
		console.warn('[Studio] Error building placed item', item.id, err)
	}

	group.position.set(item.x || 0, item.y || 0, item.z || 0)
	group.rotation.y = item.rotY || 0
	group.scale.setScalar(Math.max(SCALE_MIN, Math.min(SCALE_MAX, item.scale ?? 1.0)))

	_scene.add(group)

	// Store reference for inspector and disposal
	item._sceneGroup = group
}

function _removeItemFromScene(item) {
	if (item._sceneGroup) {
		_scene.remove(item._sceneGroup)
		item._sceneGroup.traverse((obj) => {
			if (obj.isMesh) {
				obj.geometry?.dispose?.()
				const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
				mats.forEach((m) => m?.dispose?.())
			}
		})
		item._sceneGroup = null
	}
	if (item._disposables) {
		item._disposables.forEach((d) => {
			if (typeof d?.dispose === 'function') d.dispose()
		})
		item._disposables = []
	}
	if (item._addedObstacles && currentRoomCtx?.obstacles) {
		const toRemove = new Set(item._addedObstacles)
		currentRoomCtx.obstacles = currentRoomCtx.obstacles.filter(o => !toRemove.has(o))
		item._addedObstacles = []
	}
}

// ─── Selection of placed items ────────────────────────────────────────────────

function _trySelectPlaced(e) {
	const rect = _canvas.getBoundingClientRect()
	const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1
	const my = -((e.clientY - rect.top) / rect.height) * 2 + 1

	_raycaster.setFromCamera(new THREE.Vector2(mx, my), _camera)

	// Collect placed item meshes in current room
	const roomKey = currentRoomCtx?.roomKey || 'gallery'
	const items = placedItems[roomKey] || []
	const meshes = []
	for (const item of items) {
		if (item._sceneGroup) {
			item._sceneGroup.traverse((obj) => {
				if (obj.isMesh) meshes.push(obj)
			})
		}
	}

	const hits = _raycaster.intersectObjects(meshes, false)
	if (hits.length === 0) {
		selectedPlacedId = null
		_refreshInspector()
		return
	}

	const hitMesh = hits[0].object
	// Walk up to find the studio-placed group
	let obj = hitMesh
	while (obj && !obj.userData.studioItemId) obj = obj.parent

	if (obj?.userData.studioItemId) {
		selectedPlacedId = obj.userData.studioItemId
		_refreshInspector()
	}
}

// ─── Grab / Delete / Duplicate ────────────────────────────────────────────────

function _grabSelected() {
	if (!selectedPlacedId) return
	const roomKey = currentRoomCtx?.roomKey || 'gallery'
	const items = placedItems[roomKey] || []
	const item = items.find((i) => i.id === selectedPlacedId)
	if (!item) return

	// Pick up the item: enter placement mode with its type
	selectedArtifactId = item.type
	ghostPosition.set(item.x || 0, GHOST_FLOOR_Y, item.z || 0)
	ghostRotY = item.rotY || 0
	ghostScale = item.scale || 1.0

	// Remove from placed
	_pushUndo({ action: 'delete', item: { ...item }, roomKey })
	_removeItemFromScene(item)
	placedItems[roomKey] = items.filter((i) => i.id !== selectedPlacedId)
	selectedPlacedId = null

	_buildGhost(selectedArtifactId)
	_refreshInspector()
	_refreshCounterDisplay()
}

function _deleteSelected() {
	if (!selectedPlacedId) return
	const roomKey = currentRoomCtx?.roomKey || 'gallery'
	const items = placedItems[roomKey] || []
	const item = items.find((i) => i.id === selectedPlacedId)
	if (!item || item.locked) {
		if (item?.locked) _showToast('Item is locked — unlock in inspector first')
		return
	}

	_pushUndo({ action: 'delete', item: { ...item }, roomKey })
	_removeItemFromScene(item)
	placedItems[roomKey] = items.filter((i) => i.id !== selectedPlacedId)
	selectedPlacedId = null

	_refreshInspector()
	_refreshCounterDisplay()
	_saveDraftNow()
	if (isTopViewOpen()) updateTopViewOverlays()
	_showToast('Item deleted')
}

function _duplicateSelected() {
	if (!selectedPlacedId) return
	const roomKey = currentRoomCtx?.roomKey || 'gallery'
	const items = placedItems[roomKey] || []
	const item = items.find((i) => i.id === selectedPlacedId)
	if (!item) return

	const newItem = {
		...item,
		id: generateItemId(),
		x: (item.x || 0) + 0.5,
		z: (item.z || 0) + 0.5,
		locked: false,
		_sceneGroup: null,
	}

	_pushUndo({ action: 'place', item: { ...newItem }, roomKey })
	placedItems[roomKey].push(newItem)
	_spawnPlacedItem(newItem, roomKey)
	selectedPlacedId = newItem.id
	_refreshInspector()
	_refreshCounterDisplay()
	_saveDraftNow()
	_showToast('Duplicated')
}

// ─── Drop to floor ────────────────────────────────────────────────────────────

function _dropToFloor() {
	if (selectedArtifactId) {
		ghostPosition.y = GHOST_FLOOR_Y
		_updateGhostTransform()
		_validateGhost()
	} else if (selectedPlacedId) {
		const roomKey = currentRoomCtx?.roomKey || 'gallery'
		const item = (placedItems[roomKey] || []).find((i) => i.id === selectedPlacedId)
		if (item && item._sceneGroup) {
			item.y = 0
			item._sceneGroup.position.y = 0
		}
		_saveDraftNow()
	}
}

// ─── Undo / Redo ───────────────────────────────────────────────────────────────

function _pushUndo(cmd) {
	undoStack.push(cmd)
	if (undoStack.length > 50) undoStack.shift()
	redoStack = []
}

function _undo() {
	const cmd = undoStack.pop()
	if (!cmd) return

	const roomKey = cmd.roomKey
	if (!placedItems[roomKey]) placedItems[roomKey] = []

	if (cmd.action === 'place') {
		// Undo a placement: remove the item
		const item = placedItems[roomKey].find((i) => i.id === cmd.item.id)
		if (item) {
			_removeItemFromScene(item)
			placedItems[roomKey] = placedItems[roomKey].filter((i) => i.id !== cmd.item.id)
		}
		redoStack.push(cmd)
	} else if (cmd.action === 'delete') {
		// Undo a deletion: restore the item
		const restored = { ...cmd.item, _sceneGroup: null }
		placedItems[roomKey].push(restored)
		_spawnPlacedItem(restored, roomKey)
		redoStack.push(cmd)
	}

	_refreshCounterDisplay()
	_saveDraftNow()
	if (isTopViewOpen()) updateTopViewOverlays()
	_showToast('Undo')
}

function _redo() {
	const cmd = redoStack.pop()
	if (!cmd) return

	const roomKey = cmd.roomKey
	if (!placedItems[roomKey]) placedItems[roomKey] = []

	if (cmd.action === 'place') {
		// Redo a placement: add item back
		const restored = { ...cmd.item, _sceneGroup: null }
		placedItems[roomKey].push(restored)
		_spawnPlacedItem(restored, roomKey)
	} else if (cmd.action === 'delete') {
		// Redo a deletion: remove item
		const item = placedItems[roomKey].find((i) => i.id === cmd.item.id)
		if (item) {
			_removeItemFromScene(item)
			placedItems[roomKey] = placedItems[roomKey].filter((i) => i.id !== cmd.item.id)
		}
	}

	undoStack.push(cmd)
	_refreshCounterDisplay()
	_saveDraftNow()
	if (isTopViewOpen()) updateTopViewOverlays()
	_showToast('Redo')
}

// ─── Draft ────────────────────────────────────────────────────────────────────

let _draftSaveTimer = null

function _saveDraftNow() {
	// Debounce
	if (_draftSaveTimer) clearTimeout(_draftSaveTimer)
	_draftSaveTimer = setTimeout(() => {
		const rooms = {}
		for (const [k, items] of Object.entries(placedItems)) {
			rooms[k] = items.map((i) => {
				const { _sceneGroup, ...rest } = i
				return rest
			})
		}
		saveDraft(rooms)
	}, 300)
}

function _checkForDraft() {
	const draft = loadDraft()
	if (!draft || !draft.rooms) return

	const totalItems = Object.values(draft.rooms).reduce((s, arr) => s + (arr?.length || 0), 0)
	if (totalItems === 0) return

	if (!_draftBannerEl) return

	const timeStr = draft.savedAt
		? new Date(draft.savedAt).toLocaleTimeString()
		: 'unknown time'
	_draftBannerEl.innerHTML = `
		<span>📦 Unsaved draft from ${timeStr} — ${totalItems} items</span>
		<div class="studio-draft-btns">
			<button id="studio-draft-restore" class="studio-btn studio-btn-primary">Restore</button>
			<button id="studio-draft-discard" class="studio-btn studio-btn-secondary">Discard</button>
		</div>
	`
	_draftBannerEl.style.display = 'flex'

	document.getElementById('studio-draft-restore')?.addEventListener('click', () => {
		_restoreFromDraft(draft.rooms)
		_draftBannerEl.style.display = 'none'
	})
	document.getElementById('studio-draft-discard')?.addEventListener('click', () => {
		clearDraft()
		_draftBannerEl.style.display = 'none'
	})
}

function _restoreFromDraft(rooms) {
	// Remove all currently placed items from scene
	for (const items of Object.values(placedItems)) {
		for (const item of items) _removeItemFromScene(item)
	}
	placedItems = {}

	// Restore from draft
	for (const [roomKey, items] of Object.entries(rooms)) {
		if (!Array.isArray(items)) continue
		placedItems[roomKey] = []
		for (const item of items) {
			const restored = { ...item, _sceneGroup: null }
			placedItems[roomKey].push(restored)
			// Only spawn in current room to avoid issues
			if (roomKey === currentRoomCtx?.roomKey) {
				_spawnPlacedItem(restored, roomKey)
			}
		}
	}

	_refreshCounterDisplay()
	_showToast(`✓ Restored ${Object.values(rooms).reduce((s, a) => s + a.length, 0)} items from draft`)
}

// ─── Recents & Favourites ─────────────────────────────────────────────────────

function _addToRecents(id) {
	recents = [id, ...recents.filter((r) => r !== id)].slice(0, 8)
	_refreshRecents()
}

// ─── Panel building ────────────────────────────────────────────────────────────

function _buildPanel() {
	// Top bar
	_topBarEl = document.createElement('div')
	_topBarEl.id = 'studio-topbar'
	_topBarEl.style.cssText = `
		display: none;
		position: fixed; top: 0; left: 0; right: 0; z-index: 9000;
		background: rgba(12,8,24,0.96); border-bottom: 1px solid #3a2d5a;
		padding: 6px 14px; align-items: center; gap: 10px;
		font-family: 'Segoe UI', sans-serif; font-size: 13px; color: #e8d5a0;
		flex-wrap: wrap;
	`
	_topBarEl.innerHTML = `
		<span style="font-weight:700;color:#d4a855;letter-spacing:1px">✦ PLACEMENT STUDIO v1</span>
		<select id="studio-room-select" class="studio-select" title="Current room">
			<option value="lobby">Lobby</option>
			<option value="fireside">Fireside</option>
			<option value="music">Music</option>
			<option value="library">Library</option>
			<option value="paris">Paris</option>
			<option value="orangery">Orangery</option>
			<option value="alcove">Alcove</option>
		</select>
		<label class="studio-toggle-label" title="Strict placement rules">
			<input type="checkbox" id="studio-strict" checked> Strict
		</label>
		<label class="studio-toggle-label" title="Snap to 5 cm grid">
			<input type="checkbox" id="studio-grid"> Grid
		</label>
		<span id="studio-counter" style="color:#aaa;font-size:12px">Items: 0 | Lights: 0/${MAX_LIGHTS_PER_ROOM}</span>
		<button id="studio-mode-btn" class="studio-btn studio-btn-primary" title="Tab">🖱 Cursor</button>
		<button id="studio-map-btn" class="studio-btn" title="Toggle Top-Down Map View (Press T)">🗺 Map (T)</button>
		<button id="studio-export-btn" class="studio-btn" title="Export layout JSON">⬇ Export</button>
		<button id="studio-import-btn" class="studio-btn" title="Import layout JSON">⬆ Import</button>
		<input type="file" id="studio-import-file" accept=".json" style="display:none">
		<button id="studio-reset-btn" class="studio-btn studio-btn-danger" title="Clear all items in current room">🗑 Reset Room</button>
		<button id="studio-exit-btn" class="studio-btn studio-btn-secondary" title="Exit Build Mode (B)">✕ Exit</button>
	`
	document.body.appendChild(_topBarEl)

	// Draft restore banner
	_draftBannerEl = document.createElement('div')
	_draftBannerEl.id = 'studio-draft-banner'
	_draftBannerEl.style.cssText = `
		display: none; position: fixed; top: 42px; left: 0; right: 0; z-index: 8999;
		background: rgba(60,40,10,0.97); border-bottom: 1px solid #b87a20;
		padding: 8px 14px; align-items: center; justify-content: space-between;
		font-family: 'Segoe UI', sans-serif; font-size: 13px; color: #f5c842;
		gap: 10px;
	`
	document.body.appendChild(_draftBannerEl)

	// Side panel
	_panelEl = document.createElement('div')
	_panelEl.id = 'studio-panel'
	_panelEl.style.cssText = `
		display: none; position: fixed; top: 42px; right: 0; bottom: 0; width: 300px;
		z-index: 8998; background: rgba(12,8,24,0.97); border-left: 1px solid #3a2d5a;
		flex-direction: column; overflow: hidden;
		font-family: 'Segoe UI', sans-serif; font-size: 13px; color: #e8d5a0;
	`

	// Category tabs
	const tabs = CATEGORIES.map((cat) =>
		`<button class="studio-tab" data-cat="${cat}">${CATEGORY_LABELS[cat]}</button>`
	).join('')

	_panelEl.innerHTML = `
		<div style="padding:8px; border-bottom:1px solid #2a1f3d">
			<div id="studio-tabs" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">
				${tabs}
			</div>
			<input id="studio-search" type="search" placeholder="Search artifacts…"
				style="width:100%;box-sizing:border-box;background:#1a1228;border:1px solid #3a2d5a;
				color:#e8d5a0;padding:5px 8px;border-radius:4px;font-size:12px">
		</div>
		<div id="studio-recents" style="padding:6px 8px;border-bottom:1px solid #1a1228;display:none">
			<div style="font-size:11px;color:#888;margin-bottom:3px">RECENT</div>
			<div id="studio-recents-list" style="display:flex;gap:4px;flex-wrap:wrap"></div>
		</div>
		<div id="studio-catalog" style="flex:1;overflow-y:auto;padding:6px"></div>
		<div id="studio-inspector" style="border-top:1px solid #2a1f3d;padding:8px;min-height:180px;max-height:260px;overflow-y:auto">
			<div style="color:#666;font-size:12px;text-align:center;padding:20px 0">
				Click a placed item to inspect
			</div>
		</div>
	`
	document.body.appendChild(_panelEl)

	_catalogEl = document.getElementById('studio-catalog')
	_inspectorEl = document.getElementById('studio-inspector')
	_counterEl = document.getElementById('studio-counter')

	// Add styles
	_addStudioStyles()

	// Wire top-bar buttons
	document.getElementById('studio-exit-btn')?.addEventListener('click', _exitBuildMode)
	document.getElementById('studio-mode-btn')?.addEventListener('click', () => {
		_setCursorMode(inputMode === 'walk' ? 'cursor' : 'walk')
	})
	document.getElementById('studio-map-btn')?.addEventListener('click', () => {
		toggleTopView()
	})
	document.getElementById('studio-export-btn')?.addEventListener('click', _doExport)
	document.getElementById('studio-import-btn')?.addEventListener('click', () => {
		document.getElementById('studio-import-file')?.click()
	})
	document.getElementById('studio-import-file')?.addEventListener('change', _doImport)
	document.getElementById('studio-reset-btn')?.addEventListener('click', _resetRoom)
	document.getElementById('studio-strict')?.addEventListener('change', (e) => {
		strictMode = e.target.checked
	})
	document.getElementById('studio-grid')?.addEventListener('change', (e) => {
		gridSnap = e.target.checked
	})
	document.getElementById('studio-room-select')?.addEventListener('change', (e) => {
		// Switch view to show items in that room (informational — actual room change via engine)
		_refreshCounterDisplay()
	})

	// Drag-drop import on panel
	_panelEl.addEventListener('dragover', (e) => { e.preventDefault() })
	_panelEl.addEventListener('drop', (e) => {
		e.preventDefault()
		const file = e.dataTransfer?.files?.[0]
		if (file) _importFile(file)
	})

	// Category tabs
	document.getElementById('studio-tabs')?.addEventListener('click', (e) => {
		const tab = e.target.closest('[data-cat]')
		if (!tab) return
		document.querySelectorAll('.studio-tab').forEach((t) => t.classList.remove('active'))
		tab.classList.add('active')
		_renderCatalog(tab.dataset.cat)
	})

	// Search
	document.getElementById('studio-search')?.addEventListener('input', (e) => {
		_renderCatalogSearch(e.target.value)
	})

	// Show first tab
	document.querySelector('.studio-tab')?.click()
}

function _buildTooltip() {
	_tooltipEl = document.createElement('div')
	_tooltipEl.id = 'studio-tooltip'
	_tooltipEl.style.cssText = `
		display: none; position: fixed; z-index: 9500; pointer-events: none;
		background: rgba(60,10,10,0.92); color: #ff8888; padding: 4px 8px;
		border-radius: 4px; font-size: 12px; white-space: nowrap;
		font-family: 'Segoe UI', sans-serif; border: 1px solid #aa2222;
	`
	document.body.appendChild(_tooltipEl)
}

function _showTooltip(text) {
	if (!_tooltipEl) return
	_tooltipEl.textContent = `⚠ ${text}`
	_tooltipEl.style.display = 'block'
	_tooltipEl.style.left = `${_lastMouseX + 14}px`
	_tooltipEl.style.top = `${_lastMouseY - 10}px`
}

function _hideTooltip() {
	if (_tooltipEl) _tooltipEl.style.display = 'none'
}

// ─── Catalog rendering ────────────────────────────────────────────────────────

function _renderCatalog(category) {
	if (!_catalogEl) return
	const artifacts = getArtifactsByCategory(category)
	_catalogEl.innerHTML = ''

	if (artifacts.length === 0) {
		_catalogEl.innerHTML = '<div style="color:#666;padding:20px;text-align:center">No items in this category</div>'
		return
	}

	for (const def of artifacts) {
		_catalogEl.appendChild(_makeCatalogCard(def))
	}
}

function _renderCatalogSearch(query) {
	if (!_catalogEl) return
	if (!query.trim()) {
		// Restore current tab
		const activeTab = document.querySelector('.studio-tab.active')?.dataset?.cat || CATEGORIES[0]
		_renderCatalog(activeTab)
		return
	}
	const q = query.toLowerCase()
	const all = getAllArtifacts().filter((d) =>
		d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)
	)
	_catalogEl.innerHTML = ''
	for (const def of all) {
		_catalogEl.appendChild(_makeCatalogCard(def))
	}
}

function _makeCatalogCard(def) {
	const card = document.createElement('div')
	card.className = 'studio-card' + (selectedArtifactId === def.id ? ' selected' : '')
	card.dataset.id = def.id

	const isFav = favourites.has(def.id)
	const lightBadge = def.lightCount ? `<span class="studio-badge">💡${def.lightCount}</span>` : ''
	const contactBadge = `<span class="studio-badge">${def.contact}</span>`
	const variantBadge = def.variants?.length > 1
		? `<span class="studio-badge">${def.variants.length} variants</span>`
		: ''

	card.innerHTML = `
		<div class="studio-card-header">
			<span class="studio-card-name">${def.name}</span>
			<button class="studio-fav-btn ${isFav ? 'active' : ''}" data-fav="${def.id}" title="Favourite">★</button>
		</div>
		<div class="studio-card-badges">${contactBadge}${lightBadge}${variantBadge}</div>
		<div class="studio-card-actions">
			<button class="studio-btn studio-btn-primary studio-place-btn" data-id="${def.id}">Place</button>
		</div>
	`

	card.querySelector('.studio-place-btn')?.addEventListener('click', (e) => {
		e.stopPropagation()
		_selectArtifactForPlacement(def.id)
	})

	card.querySelector('.studio-fav-btn')?.addEventListener('click', (e) => {
		e.stopPropagation()
		if (favourites.has(def.id)) favourites.delete(def.id)
		else favourites.add(def.id)
		e.target.classList.toggle('active', favourites.has(def.id))
		_refreshRecents()
	})

	return card
}

function _selectArtifactForPlacement(id) {
	selectedArtifactId = id
	selectedPlacedId = null

	// Update card highlighting
	document.querySelectorAll('.studio-card').forEach((c) => {
		c.classList.toggle('selected', c.dataset.id === id)
	})

	// Build ghost
	_buildGhost(id)
	_setCursorMode('cursor')
	_showToast(`Selected: ${getArtifact(id)?.name} — click to place, Space to repeat`)
}

// ─── Inspector ────────────────────────────────────────────────────────────────

function _refreshInspector() {
	if (!_inspectorEl) return

	const roomKey = currentRoomCtx?.roomKey || 'gallery'
	const item = (placedItems[roomKey] || []).find((i) => i.id === selectedPlacedId)

	if (!item) {
		_inspectorEl.innerHTML = `<div style="color:#666;font-size:12px;text-align:center;padding:20px 0">
			${selectedPlacedId ? 'Item not found in current room' : 'Click a placed item to inspect'}
		</div>`
		return
	}

	const def = getArtifact(item.type)
	const variantOptions = (def?.variants || ['default'])
		.map((v) => `<option value="${v}" ${v === item.variant ? 'selected' : ''}>${v}</option>`)
		.join('')

	_inspectorEl.innerHTML = `
		<div style="font-weight:700;color:#d4a855;margin-bottom:6px;font-size:13px">${def?.name || item.type}</div>
		<div style="font-size:11px;color:#666;margin-bottom:8px">${item.id}</div>
		<div class="studio-inspector-grid">
			<label>X (m)</label>
			<input class="studio-input" id="insp-x" type="number" step="0.05" value="${(item.x||0).toFixed(3)}">
			<label>Y (m)</label>
			<input class="studio-input" id="insp-y" type="number" step="0.05" value="${(item.y||0).toFixed(3)}">
			<label>Z (m)</label>
			<input class="studio-input" id="insp-z" type="number" step="0.05" value="${(item.z||0).toFixed(3)}">
			<label>Rot Y (°)</label>
			<input class="studio-input" id="insp-roty" type="number" step="5"
				value="${(THREE.MathUtils.radToDeg(item.rotY||0)).toFixed(1)}">
			<label>Scale</label>
			<input class="studio-input" id="insp-scale" type="number" step="0.05"
				min="${SCALE_MIN}" max="${SCALE_MAX}" value="${(item.scale||1).toFixed(2)}">
			<label>Variant</label>
			<select class="studio-select" id="insp-variant">${variantOptions}</select>
			<label>Contact</label>
			<span style="color:#888">${item.contact}</span>
		</div>
		<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
			<button class="studio-btn" id="insp-apply">Apply</button>
			<button class="studio-btn ${item.locked ? 'studio-btn-primary' : ''}" id="insp-lock">
				${item.locked ? '🔒 Locked' : '🔓 Lock'}
			</button>
			<button class="studio-btn" id="insp-grab">Grab (G)</button>
			<button class="studio-btn studio-btn-danger" id="insp-delete">Delete</button>
		</div>
		<div id="insp-validation" style="margin-top:6px;font-size:11px;color:#aaa"></div>
	`

	// Wire inspector inputs
	document.getElementById('insp-apply')?.addEventListener('click', () => {
		const x = parseFloat(document.getElementById('insp-x')?.value) || item.x
		const y = parseFloat(document.getElementById('insp-y')?.value) || item.y
		const z = parseFloat(document.getElementById('insp-z')?.value) || item.z
		const rotYDeg = parseFloat(document.getElementById('insp-roty')?.value) || 0
		const scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX,
			parseFloat(document.getElementById('insp-scale')?.value) || 1
		))
		const variant = document.getElementById('insp-variant')?.value || item.variant

		item.x = x; item.y = y; item.z = z
		item.rotY = THREE.MathUtils.degToRad(rotYDeg)
		item.scale = scale
		item.variant = variant

		if (item._sceneGroup) {
			item._sceneGroup.position.set(x, y, z)
			item._sceneGroup.rotation.y = item.rotY
			item._sceneGroup.scale.setScalar(scale)
		}

		_saveDraftNow()
		_showToast('Inspector: changes applied')
	})

	document.getElementById('insp-lock')?.addEventListener('click', () => {
		item.locked = !item.locked
		_refreshInspector()
		_saveDraftNow()
	})

	document.getElementById('insp-grab')?.addEventListener('click', _grabSelected)
	document.getElementById('insp-delete')?.addEventListener('click', _deleteSelected)

	// Run validation
	if (def) {
		const result = validatePlacement({
			def,
			x: item.x,
			z: item.z,
			rotY: item.rotY,
			excludeId: item.id,
			roomCtx: currentRoomCtx,
		})
		const validEl = document.getElementById('insp-validation')
		if (validEl) {
			validEl.textContent = result.valid
				? '✓ Valid placement'
				: `⚠ ${result.rule}`
			validEl.style.color = result.valid ? '#4caf50' : '#ff7070'
		}
	}
}

// ─── Recents display ──────────────────────────────────────────────────────────

function _refreshRecents() {
	const listEl = document.getElementById('studio-recents-list')
	const wrapEl = document.getElementById('studio-recents')
	if (!listEl || !wrapEl) return

	// Combine recents and favourites
	const favIds = [...favourites]
	const allIds = [...new Set([...favIds, ...recents])].slice(0, 8)

	if (allIds.length === 0) {
		wrapEl.style.display = 'none'
		return
	}

	wrapEl.style.display = 'block'
	listEl.innerHTML = allIds.map((id) => {
		const def = getArtifact(id)
		if (!def) return ''
		const isFav = favourites.has(id)
		return `<button class="studio-recent-chip ${isFav ? 'fav' : ''}" data-id="${id}"
			title="${def.name}">${isFav ? '★ ' : ''}${def.name.split(' ').slice(0, 2).join(' ')}</button>`
	}).join('')

	listEl.querySelectorAll('.studio-recent-chip').forEach((chip) => {
		chip.addEventListener('click', () => _selectArtifactForPlacement(chip.dataset.id))
	})
}

// ─── Counter display ──────────────────────────────────────────────────────────

function _refreshCounterDisplay() {
	if (!_counterEl) return
	const roomKey = currentRoomCtx?.roomKey || 'gallery'
	const items = placedItems[roomKey] || []
	const lights = items.reduce((s, i) => {
		const def = getArtifact(i.type)
		return s + (def?.lightCount || 0)
	}, 0)
	_counterEl.textContent = `Items: ${items.length} | Lights: ${lights}/${MAX_LIGHTS_PER_ROOM}`
	_counterEl.style.color = lights >= MAX_LIGHTS_PER_ROOM ? '#ff7070' : '#aaa'
}

// ─── Refresh panel ─────────────────────────────────────────────────────────────

function _refreshPanel() {
	// Sync room selector
	const roomKey = currentRoomCtx?.roomKey || 'gallery'
	const sel = document.getElementById('studio-room-select')
	if (sel) sel.value = roomKey
	_refreshCounterDisplay()
	_refreshRecents()
}

// ─── Mode button ──────────────────────────────────────────────────────────────

function _updateModeButton() {
	const btn = document.getElementById('studio-mode-btn')
	if (!btn) return
	if (inputMode === 'cursor') {
		btn.textContent = '🖱 Cursor'
		btn.classList.add('studio-btn-primary')
	} else {
		btn.textContent = '🚶 Walk'
		btn.classList.remove('studio-btn-primary')
	}
}

// ─── Export / Import ──────────────────────────────────────────────────────────

function _doExport() {
	const roomKey = currentRoomCtx?.roomKey || 'gallery'
	const rooms = {}
	for (const [k, items] of Object.entries(placedItems)) {
		rooms[k] = items.map((i) => {
			const { _sceneGroup, ...rest } = i
			return rest
		})
	}
	exportLayout(rooms, roomKey)
	_showToast('✓ Layout exported as museum-layout.json')
}

function _doImport(e) {
	const file = e.target?.files?.[0]
	if (file) _importFile(file)
}

async function _importFile(file) {
	try {
		const currentRooms = {}
		for (const [k, items] of Object.entries(placedItems)) {
			currentRooms[k] = items.map((i) => { const { _sceneGroup, ...r } = i; return r })
		}

		const { layout, validation, diff } = await importLayout(file, currentRooms)

		if (!validation.valid) {
			_showToast(`⚠ Import errors: ${validation.errors.join('; ')}`)
			return
		}

		if (validation.warnings.length) {
			console.warn('[Studio] Import warnings:', validation.warnings)
		}
		if (validation.skippedTypes.length) {
			_showToast(`⚠ Skipped unknown types: ${validation.skippedTypes.join(', ')}`)
		}

		// Apply diff summary
		console.log('[Studio] Import diff:\n' + diff)

		// Clear current placed items from scene
		for (const items of Object.values(placedItems)) {
			for (const item of items) _removeItemFromScene(item)
		}
		placedItems = {}

		// Apply imported
		const currentRoomKey = currentRoomCtx?.roomKey || 'gallery'
		for (const [rk, items] of Object.entries(layout.rooms)) {
			placedItems[rk] = []
			for (const item of items) {
				const restored = { ...item, _sceneGroup: null }
				placedItems[rk].push(restored)
				if (rk === currentRoomKey) {
					_spawnPlacedItem(restored, rk)
				}
			}
		}

		_refreshCounterDisplay()
		_saveDraftNow()
		_showToast(`✓ Imported layout — ${diff.split('\n')[0]}`)

	} catch (err) {
		console.error('[Studio] Import failed:', err)
		_showToast(`⚠ Import failed: ${err.message}`)
	}

	// Clear the file input
	const fileInput = document.getElementById('studio-import-file')
	if (fileInput) fileInput.value = ''
}

// ─── Reset room ───────────────────────────────────────────────────────────────

function _resetRoom() {
	if (!confirm('Clear ALL placed items in the current room? This cannot be undone.')) return
	const roomKey = currentRoomCtx?.roomKey || 'gallery'
	const items = placedItems[roomKey] || []
	for (const item of items) _removeItemFromScene(item)
	placedItems[roomKey] = []
	selectedPlacedId = null
	_refreshInspector()
	_refreshCounterDisplay()
	_saveDraftNow()
	_showToast('Room cleared')
}

// ─── Toast notification ────────────────────────────────────────────────────────

let _toastEl = null
let _toastTimer = null

function _showToast(msg) {
	if (!_toastEl) {
		_toastEl = document.createElement('div')
		_toastEl.id = 'studio-toast'
		_toastEl.style.cssText = `
			position: fixed; bottom: 70px; left: 50%; transform: translateX(-50%);
			z-index: 9600; background: rgba(20,12,36,0.96); color: #e8d5a0;
			padding: 8px 16px; border-radius: 6px; font-size: 13px;
			border: 1px solid #4a3d6a; pointer-events: none;
			font-family: 'Segoe UI', sans-serif; transition: opacity 0.3s;
			opacity: 0;
		`
		document.body.appendChild(_toastEl)
	}

	_toastEl.textContent = msg
	_toastEl.style.opacity = '1'
	if (_toastTimer) clearTimeout(_toastTimer)
	_toastTimer = setTimeout(() => {
		_toastEl.style.opacity = '0'
	}, 2500)
}

// ─── Styles ────────────────────────────────────────────────────────────────────

function _addStudioStyles() {
	const style = document.createElement('style')
	style.id = 'studio-styles'
	style.textContent = `
		.studio-btn {
			background: rgba(30,20,50,0.9); color: #e8d5a0; border: 1px solid #3a2d5a;
			padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;
			transition: background 0.15s;
		}
		.studio-btn:hover { background: rgba(60,40,90,0.9); }
		.studio-btn-primary { background: rgba(90,60,20,0.9); border-color: #b87a20; color: #f5c842; }
		.studio-btn-primary:hover { background: rgba(120,80,25,0.9); }
		.studio-btn-secondary { background: rgba(40,40,60,0.9); color: #aaa; }
		.studio-btn-danger { background: rgba(80,20,20,0.9); border-color: #aa2222; color: #ff8888; }
		.studio-btn-danger:hover { background: rgba(110,30,30,0.9); }

		.studio-select {
			background: #1a1228; color: #e8d5a0; border: 1px solid #3a2d5a;
			padding: 3px 6px; border-radius: 4px; font-size: 12px; cursor: pointer;
		}
		.studio-input {
			background: #1a1228; color: #e8d5a0; border: 1px solid #3a2d5a;
			padding: 3px 6px; border-radius: 4px; font-size: 12px; width: 80px;
		}
		.studio-toggle-label {
			display: flex; align-items: center; gap: 4px; color: #aaa; font-size: 12px;
			cursor: pointer;
		}

		.studio-tab {
			background: transparent; color: #888; border: 1px solid #2a1f3d;
			padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;
			transition: all 0.15s;
		}
		.studio-tab:hover { color: #e8d5a0; border-color: #3a2d5a; }
		.studio-tab.active { background: rgba(90,60,20,0.9); color: #f5c842; border-color: #b87a20; }

		.studio-card {
			background: rgba(20,14,36,0.9); border: 1px solid #2a1f3d;
			border-radius: 6px; margin-bottom: 6px; padding: 8px;
			cursor: pointer; transition: border-color 0.15s;
		}
		.studio-card:hover { border-color: #4a3d6a; }
		.studio-card.selected { border-color: #b87a20; background: rgba(60,40,10,0.6); }
		.studio-card-header {
			display: flex; justify-content: space-between; align-items: flex-start;
			margin-bottom: 4px;
		}
		.studio-card-name { font-size: 12px; font-weight: 600; color: #e8d5a0; }
		.studio-fav-btn {
			background: none; border: none; color: #444; cursor: pointer; font-size: 14px;
			padding: 0; line-height: 1;
		}
		.studio-fav-btn.active { color: #f5c842; }
		.studio-card-badges {
			display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 4px;
		}
		.studio-badge {
			background: rgba(40,30,60,0.9); color: #888; font-size: 10px;
			padding: 1px 5px; border-radius: 3px; border: 1px solid #2a1f3d;
		}
		.studio-card-actions { margin-top: 4px; }

		.studio-inspector-grid {
			display: grid; grid-template-columns: auto 1fr; gap: 4px 8px;
			align-items: center; font-size: 12px;
		}
		.studio-inspector-grid label { color: #888; white-space: nowrap; }

		.studio-recent-chip {
			background: rgba(30,20,50,0.9); color: #c8b880; border: 1px solid #3a2d5a;
			padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;
		}
		.studio-recent-chip.fav { color: #f5c842; border-color: #b87a20; }
		.studio-recent-chip:hover { background: rgba(60,40,80,0.9); }

		.studio-draft-btns { display: flex; gap: 6px; }

		body.studio-build-mode #scene-container { right: 300px; }
	`
	document.head.appendChild(style)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function isStudioBuildMode() {
	return buildMode
}

export function getPlacedItems() {
	return placedItems
}

export function getStudioState() {
	return {
		buildMode,
		placedItems,
		selectedPlacedId,
		selectedArtifactId,
		currentRoomCtx,
		strictMode,
		gridSnap,
	}
}

export function selectPlacedItem(id) {
	selectedPlacedId = id
	selectedArtifactId = null
	_clearGhost()
	_refreshInspector()
}

export function updatePlacedItemTransform(id, { x, y, z, rotY }) {
	const roomKey = currentRoomCtx?.roomKey || 'gallery'
	const item = (placedItems[roomKey] || []).find((i) => i.id === id)
	if (!item) return

	if (typeof x === 'number') item.x = x
	if (typeof y === 'number') item.y = y
	if (typeof z === 'number') item.z = z
	if (typeof rotY === 'number') item.rotY = rotY

	if (item._sceneGroup) {
		item._sceneGroup.position.set(item.x || 0, item.y || 0, item.z || 0)
		item._sceneGroup.rotation.y = item.rotY || 0
	}

	_saveDraftNow()
	_refreshInspector()
}

export function deletePlacedItem(id) {
	selectedPlacedId = id
	_deleteSelected()
}

export function undoLastAction() {
	_undo()
}

export function redoLastAction() {
	_redo()
}

export function enterBuildMode() {
	_enterBuildMode()
}

export function setCursorMode(mode) {
	_setCursorMode(mode)
}

export function showToast(msg) {
	_showToast(msg)
}

export { toggleTopView, isTopViewOpen, updateTopViewOverlays }

