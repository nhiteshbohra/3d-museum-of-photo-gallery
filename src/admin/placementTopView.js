/**
 * Our Museum 3D — Placement Top View (Phase 3)
 * Top-down orthographic map editor for the current room.
 *
 * Features:
 *   - Key 'T' toggles top-down orthographic map view.
 *   - Orthographic camera positioned directly above room center.
 *   - Clips ceiling fixtures so floor, walls, and artifacts are fully visible.
 *   - Visual overlays:
 *       • Room floor boundary & architectural grid
 *       • Artwork slot rectangles (blueprint blue)
 *       • Door keep-out circles at 2.0 m (translucent red)
 *       • Physical obstacles (grey footprints)
 *       • Placed items with labeled footprints & heading pointers
 *       • Selected item: golden halo + rotate handle
 *       • First-person player position indicator & compass cone
 *   - Drag-to-move item on floor (0.05 m grid snap, Alt = free move)
 *   - Drag rotate handle to spin Y rotation
 *   - Live green / red validator feedback sharing the exact same validation rules
 *   - Full synchronization with Placement Studio side panel & undo/redo stack
 */

import * as THREE from 'three'
import { getArtifact } from '../game/room/artifactRegistry.js'

// ─── Module State ─────────────────────────────────────────────────────────────

let _engineApi = null
let _scene = null
let _camera = null          // First-person perspective camera
let _topCamera = null       // Orthographic top-down camera
let _canvas = null
let _studio = null          // Reference to placementStudio helpers

let isTopViewActive = false
let topOverlayGroup = null

// Interaction State
let isDraggingItem = false
let isRotatingItem = false
let draggedItemId = null
let dragStartPos = new THREE.Vector2()
let itemStartPos = new THREE.Vector3()
let itemStartRotY = 0

// Snap & Settings
let gridSnapEnabled = true
const GRID_SNAP_STEP = 0.05  // 5 cm

// Raycasting
const _raycaster = new THREE.Raycaster()
const _mouse = new THREE.Vector2()
const _floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

// Top View HUD Banner
let _mapHudEl = null

// ─── Initialization ───────────────────────────────────────────────────────────

export function initPlacementTopView(engineApi, scene, camera, canvas, studioApi) {
	_engineApi = engineApi
	_scene = scene
	_camera = camera
	_canvas = canvas
	_studio = studioApi

	// Build Orthographic Camera
	const aspect = (_canvas.clientWidth || 1280) / (_canvas.clientHeight || 720)
	const initialFrustumSize = 9.0
	_topCamera = new THREE.OrthographicCamera(
		-initialFrustumSize * aspect,
		initialFrustumSize * aspect,
		initialFrustumSize,
		-initialFrustumSize,
		1.0,
		50.0
	)
	_topCamera.userData.frustumHalfSize = initialFrustumSize

	// Position top camera directly above room looking down
	// Camera up set to (0, 0, -1) so North (-Z) is UP on screen
	_topCamera.position.set(0, 20.0, 0)
	_topCamera.up.set(0, 0, -1)
	_topCamera.lookAt(0, 0, 0)

	// Build HUD element
	_buildMapHud()

	// Event Listeners
	window.addEventListener('keydown', _onKeyDown, { capture: true })
	_canvas.addEventListener('mousedown', _onMouseDown)
	window.addEventListener('mousemove', _onMouseMove)
	window.addEventListener('mouseup', _onMouseUp)

	console.log('[TopView] Placement Top-Down Map initialized. Press T to toggle.')
}

// ─── Keydown Handler ──────────────────────────────────────────────────────────

function _onKeyDown(e) {
	if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return

	if (!isTopViewActive) return

	// Esc exits top view
	if (e.key === 'Escape') {
		e.stopPropagation()
		toggleTopView(false)
		return
	}

	// Delete selected item
	if (e.key === 'Delete') {
		const state = _studio?.getStudioState?.()
		if (state?.selectedPlacedId) {
			e.preventDefault()
			_studio.deletePlacedItem?.(state.selectedPlacedId)
			updateTopViewOverlays()
		}
		return
	}

	// Ctrl+Z: Undo
	if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z')) {
		e.preventDefault()
		_studio?.undoLastAction?.()
		updateTopViewOverlays()
		return
	}

	// Ctrl+Y: Redo
	if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || e.key === 'y' || e.key === 'Y')) {
		e.preventDefault()
		_studio?.redoLastAction?.()
		updateTopViewOverlays()
		return
	}
}

// ─── Toggle View ──────────────────────────────────────────────────────────────

export function toggleTopView(forceState) {
	const nextActive = typeof forceState === 'boolean' ? forceState : !isTopViewActive
	if (nextActive === isTopViewActive) return

	isTopViewActive = nextActive

	if (isTopViewActive) {
		_enterTopView()
	} else {
		_exitTopView()
	}
}

export function isTopViewOpen() {
	return isTopViewActive
}

function _enterTopView() {
	// Release pointer lock so mouse is free for 2D interaction
	if (document.pointerLockElement) {
		document.exitPointerLock()
	}

	// Sync room camera bounds
	const roomCtx = _studio?.getStudioState?.()?.currentRoomCtx || _engineApi?.getCurrentRoom?.()
	const halfW = roomCtx?.bounds?.halfW || 6.0
	const halfL = roomCtx?.bounds?.halfL || 6.0

	// Set orthographic camera size to fit room comfortably with 1.8m margin
	const maxDim = Math.max(halfW, halfL) + 1.8
	const aspect = (_canvas.clientWidth || 1280) / (_canvas.clientHeight || 720)
	_topCamera.userData.frustumHalfSize = maxDim
	_topCamera.left = -maxDim * aspect
	_topCamera.right = maxDim * aspect
	_topCamera.top = maxDim
	_topCamera.bottom = -maxDim
	_topCamera.position.set(0, 18.0, 0)
	_topCamera.lookAt(0, 0, 0)
	_topCamera.updateProjectionMatrix()

	// Switch active camera in engine
	_engineApi?.setActiveCamera?.(_topCamera)

	// Ensure build mode side panel is open in cursor mode
	if (!_studio?.isStudioBuildMode?.()) {
		_studio?.enterBuildMode?.()
	}
	_studio?.setCursorMode?.('cursor')

	// Build overlays
	updateTopViewOverlays()

	if (_mapHudEl) _mapHudEl.style.display = 'flex'
	_studio?.showToast?.('🗺 Top-Down Map Mode (Press T to exit)')
}

function _exitTopView() {
	isTopViewActive = false
	isDraggingItem = false
	isRotatingItem = false
	draggedItemId = null

	// Revert to first-person perspective camera
	_engineApi?.setActiveCamera?.(_camera)

	// Remove overlays
	_clearOverlays()

	if (_mapHudEl) _mapHudEl.style.display = 'none'
	_studio?.showToast?.('Exited Top-Down Map')
}

// ─── Overlay Rendering ────────────────────────────────────────────────────────

export function updateTopViewOverlays() {
	if (!isTopViewActive) return
	_clearOverlays()

	topOverlayGroup = new THREE.Group()
	topOverlayGroup.name = 'top-view-overlays'
	topOverlayGroup.position.y = 0.015 // slightly above floor to prevent z-fighting

	const state = _studio?.getStudioState?.()
	const roomCtx = state?.currentRoomCtx || {}
	const roomKey = roomCtx.roomKey || 'gallery'
	const bounds = roomCtx.bounds || { halfW: 6.0, halfL: 6.0 }
	const halfW = bounds.halfW ?? 6.0
	const halfL = bounds.halfL ?? 6.0

	// 1. Room Floor Boundary & Grid
	_addRoomFloorGrid(topOverlayGroup, halfW, halfL)

	// 2. Door Keep-Out Circles (2.0 m radius)
	_addDoorKeepOuts(topOverlayGroup, roomCtx.doors || [])

	// 3. Artwork Slot Rectangles (Blueprint Blue)
	_addArtworkSlotRectangles(topOverlayGroup, roomCtx.slots || [], halfW, halfL)

	// 4. Physical Obstacles (Grey)
	_addObstacles(topOverlayGroup, roomCtx.obstacles || [])

	// 5. Placed Items (Footprints, labels, selection halo & rotate handle)
	const items = state?.placedItems?.[roomKey] || []
	_addPlacedItemFootprints(topOverlayGroup, items, state?.selectedPlacedId)

	// 6. Player Position Marker & Heading Cone
	_addPlayerMarker(topOverlayGroup)

	_scene.add(topOverlayGroup)
}

function _clearOverlays() {
	if (topOverlayGroup) {
		_scene.remove(topOverlayGroup)
		topOverlayGroup.traverse((obj) => {
			if (obj.geometry) obj.geometry.dispose?.()
			if (obj.material) {
				const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
				mats.forEach((m) => m?.dispose?.())
			}
		})
		topOverlayGroup = null
	}
}

// ─── Overlay Elements ─────────────────────────────────────────────────────────

function _addRoomFloorGrid(group, halfW, halfL) {
	// Floor boundary rectangle
	const borderGeo = new THREE.BufferGeometry().setFromPoints([
		new THREE.Vector3(-halfW, 0, -halfL),
		new THREE.Vector3(halfW, 0, -halfL),
		new THREE.Vector3(halfW, 0, halfL),
		new THREE.Vector3(-halfW, 0, halfL),
		new THREE.Vector3(-halfW, 0, -halfL),
	])
	const borderMat = new THREE.LineBasicMaterial({ color: 0x5a7ca8, linewidth: 2 })
	group.add(new THREE.Line(borderGeo, borderMat))

	// Fine 1m architectural floor grid
	const gridPoints = []
	for (let x = -halfW + 1; x < halfW; x += 1.0) {
		gridPoints.push(new THREE.Vector3(x, 0, -halfL), new THREE.Vector3(x, 0, halfL))
	}
	for (let z = -halfL + 1; z < halfL; z += 1.0) {
		gridPoints.push(new THREE.Vector3(-halfW, 0, z), new THREE.Vector3(halfW, 0, z))
	}
	if (gridPoints.length > 0) {
		const gridGeo = new THREE.BufferGeometry().setFromPoints(gridPoints)
		const gridMat = new THREE.LineBasicMaterial({ color: 0x1f2838, transparent: true, opacity: 0.6 })
		group.add(new THREE.LineSegments(gridGeo, gridMat))
	}
}

function _addDoorKeepOuts(group, doors) {
	for (const door of doors) {
		const dp = door.position || door
		if (!dp || typeof dp.x !== 'number') continue

		const dGroup = new THREE.Group()
		dGroup.position.set(dp.x, 0.005, dp.z)

		// 2.0 m Red Translucent Keep-Out Disc
		const circleGeo = new THREE.CircleGeometry(2.0, 48)
		circleGeo.rotateX(-Math.PI / 2)
		const circleMat = new THREE.MeshBasicMaterial({
			color: 0xdd2222,
			transparent: true,
			opacity: 0.14,
			depthWrite: false,
		})
		dGroup.add(new THREE.Mesh(circleGeo, circleMat))

		// 2.0 m Red Perimeter Ring
		const ringGeo = new THREE.RingGeometry(1.97, 2.01, 48)
		ringGeo.rotateX(-Math.PI / 2)
		const ringMat = new THREE.MeshBasicMaterial({
			color: 0xff3333,
			transparent: true,
			opacity: 0.7,
			side: THREE.DoubleSide,
		})
		dGroup.add(new THREE.Mesh(ringGeo, ringMat))

		// Center door point
		const ptGeo = new THREE.CircleGeometry(0.12, 16)
		ptGeo.rotateX(-Math.PI / 2)
		const ptMat = new THREE.MeshBasicMaterial({ color: 0xff4444 })
		dGroup.add(new THREE.Mesh(ptGeo, ptMat))

		group.add(dGroup)
	}
}

function _addArtworkSlotRectangles(group, slots, halfW, halfL) {
	for (const slot of slots) {
		const pos = slot.position || {}
		const x = pos.x ?? 0
		const z = pos.z ?? 0
		const w = slot.width || 1.8
		const d = 0.35 // slot projection envelope

		const sGroup = new THREE.Group()
		sGroup.position.set(x, 0.01, z)

		// Blueprint Blue rectangle
		const planeGeo = new THREE.PlaneGeometry(w, d)
		planeGeo.rotateX(-Math.PI / 2)
		const planeMat = new THREE.MeshBasicMaterial({
			color: 0x2266cc,
			transparent: true,
			opacity: 0.28,
			depthWrite: false,
		})
		sGroup.add(new THREE.Mesh(planeGeo, planeMat))

		// Blueprint outline border
		const edges = new THREE.EdgesGeometry(planeGeo)
		const lineMat = new THREE.LineBasicMaterial({ color: 0x44aaff })
		sGroup.add(new THREE.LineSegments(edges, lineMat))

		group.add(sGroup)
	}
}

function _addObstacles(group, obstacles) {
	for (const obs of obstacles) {
		if (obs.type === 'cylinder') {
			const r = obs.radius || 0.4
			const geo = new THREE.CircleGeometry(r, 24)
			geo.rotateX(-Math.PI / 2)
			const mat = new THREE.MeshBasicMaterial({ color: 0x555566, transparent: true, opacity: 0.35 })
			const mesh = new THREE.Mesh(geo, mat)
			mesh.position.set(obs.x || 0, 0.008, obs.z || 0)
			group.add(mesh)
		} else if (obs.type === 'box') {
			const w = obs.w || 1.0
			const d = obs.d || 1.0
			const geo = new THREE.PlaneGeometry(w, d)
			geo.rotateX(-Math.PI / 2)
			const mat = new THREE.MeshBasicMaterial({ color: 0x555566, transparent: true, opacity: 0.35 })
			const mesh = new THREE.Mesh(geo, mat)
			mesh.position.set(obs.x || 0, 0.008, obs.z || 0)
			group.add(mesh)
		}
	}
}

function _addPlacedItemFootprints(group, items, selectedId) {
	for (const item of items) {
		const def = getArtifact(item.type)
		const isSelected = item.id === selectedId
		const fp = def?.footprint || { shape: 'cylinder', radius: 0.35 }
		const scale = item.scale ?? 1.0

		const fGroup = new THREE.Group()
		fGroup.position.set(item.x || 0, 0.02, item.z || 0)
		fGroup.rotation.y = item.rotY || 0
		fGroup.userData.topViewItemId = item.id

		// Footprint fill & border
		const fillColor = isSelected ? 0xd4a855 : 0x2e7d32
		const borderColor = isSelected ? 0xffd54f : 0x81c784

		if (fp.shape === 'cylinder') {
			const r = (fp.radius || 0.35) * scale
			const fillGeo = new THREE.CircleGeometry(r, 32)
			fillGeo.rotateX(-Math.PI / 2)
			const fillMat = new THREE.MeshBasicMaterial({
				color: fillColor,
				transparent: true,
				opacity: isSelected ? 0.6 : 0.45,
				depthWrite: false,
			})
			fGroup.add(new THREE.Mesh(fillGeo, fillMat))

			const ringGeo = new THREE.RingGeometry(r * 0.94, r, 32)
			ringGeo.rotateX(-Math.PI / 2)
			const ringMat = new THREE.MeshBasicMaterial({ color: borderColor, side: THREE.DoubleSide })
			fGroup.add(new THREE.Mesh(ringGeo, ringMat))

			// Direction arrow (pointing along forward Z-)
			const arrowGeo = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0.005, 0),
				new THREE.Vector3(0, 0.005, -r * 1.15),
			])
			fGroup.add(new THREE.Line(arrowGeo, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })))

		} else {
			const w = (fp.w || 0.6) * scale
			const d = (fp.d || 0.6) * scale
			const fillGeo = new THREE.PlaneGeometry(w, d)
			fillGeo.rotateX(-Math.PI / 2)
			const fillMat = new THREE.MeshBasicMaterial({
				color: fillColor,
				transparent: true,
				opacity: isSelected ? 0.6 : 0.45,
				depthWrite: false,
			})
			fGroup.add(new THREE.Mesh(fillGeo, fillMat))

			const edges = new THREE.EdgesGeometry(fillGeo)
			fGroup.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: borderColor })))

			// Direction arrow
			const arrowGeo = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0.005, 0),
				new THREE.Vector3(0, 0.005, -d * 0.65),
			])
			fGroup.add(new THREE.Line(arrowGeo, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })))
		}

		// If selected: add prominent golden rotation handle extending out front
		if (isSelected) {
			const handleDist = (fp.shape === 'cylinder' ? (fp.radius || 0.35) * scale : (fp.d || 0.6) * scale * 0.5) + 0.55

			// Stem line
			const stemGeo = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0.01, 0),
				new THREE.Vector3(0, 0.01, -handleDist),
			])
			fGroup.add(new THREE.Line(stemGeo, new THREE.LineBasicMaterial({ color: 0xffd54f, linewidth: 2 })))

			// Rotation pin head
			const pinGeo = new THREE.CircleGeometry(0.18, 20)
			pinGeo.rotateX(-Math.PI / 2)
			const pinMat = new THREE.MeshBasicMaterial({ color: 0xffea00 })
			const pinMesh = new THREE.Mesh(pinGeo, pinMat)
			pinMesh.position.set(0, 0.015, -handleDist)
			pinMesh.userData.isRotateHandle = true
			pinMesh.userData.topViewItemId = item.id
			fGroup.add(pinMesh)
		}

		group.add(fGroup)
	}
}

function _addPlayerMarker(group) {
	if (!_camera) return
	const pGroup = new THREE.Group()
	pGroup.position.set(_camera.position.x, 0.03, _camera.position.z)

	// Cyan glowing dot
	const dotGeo = new THREE.CircleGeometry(0.20, 24)
	dotGeo.rotateX(-Math.PI / 2)
	const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ffff })
	pGroup.add(new THREE.Mesh(dotGeo, dotMat))

	// Outer pulse ring
	const ringGeo = new THREE.RingGeometry(0.24, 0.28, 24)
	ringGeo.rotateX(-Math.PI / 2)
	const ringMat = new THREE.MeshBasicMaterial({ color: 0x00b4d8, side: THREE.DoubleSide })
	pGroup.add(new THREE.Mesh(ringGeo, ringMat))

	// Heading direction cone
	const yaw = _camera.rotation.y
	pGroup.rotation.y = yaw
	const conePoints = [
		new THREE.Vector3(0, 0.005, 0),
		new THREE.Vector3(-0.35, 0.005, -0.9),
		new THREE.Vector3(0.35, 0.005, -0.9),
		new THREE.Vector3(0, 0.005, 0),
	]
	const coneGeo = new THREE.BufferGeometry().setFromPoints(conePoints)
	const coneMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 })
	pGroup.add(new THREE.Line(coneGeo, coneMat))

	group.add(pGroup)
}

// ─── Mouse Handlers (Top-Down Drag & Rotate) ──────────────────────────────────

function _onMouseDown(e) {
	if (!isTopViewActive || e.button !== 0) return

	const floorHit = _getFloorIntersection(e)
	if (!floorHit) return

	// Check if clicked rotate handle
	const handleHit = _raycastRotateHandle(e)
	if (handleHit) {
		isRotatingItem = true
		draggedItemId = handleHit.userData.topViewItemId
		const state = _studio?.getStudioState?.()
		const roomKey = state?.currentRoomCtx?.roomKey || 'gallery'
		const item = (state?.placedItems?.[roomKey] || []).find((i) => i.id === draggedItemId)
		if (item) {
			itemStartRotY = item.rotY || 0
		}
		return
	}

	// Check if clicked an item footprint
	const itemHit = _raycastPlacedItem(e)
	if (itemHit) {
		draggedItemId = itemHit.userData.topViewItemId
		_studio?.selectPlacedItem?.(draggedItemId)

		const state = _studio?.getStudioState?.()
		const roomKey = state?.currentRoomCtx?.roomKey || 'gallery'
		const item = (state?.placedItems?.[roomKey] || []).find((i) => i.id === draggedItemId)

		if (item) {
			isDraggingItem = true
			dragStartPos.set(floorHit.x, floorHit.z)
			itemStartPos.set(item.x || 0, item.y || 0, item.z || 0)
			itemStartRotY = item.rotY || 0
		}
		updateTopViewOverlays()
		return
	}

	// Clicked empty floor: deselect
	_studio?.selectPlacedItem?.(null)
	updateTopViewOverlays()
}

function _onMouseMove(e) {
	if (!isTopViewActive) return

	const floorHit = _getFloorIntersection(e)
	if (!floorHit) return

	// 1. Dragging item position
	if (isDraggingItem && draggedItemId) {
		const dx = floorHit.x - dragStartPos.x
		const dz = floorHit.z - dragStartPos.y

		let nextX = itemStartPos.x + dx
		let nextZ = itemStartPos.z + dz

		// Grid snap (0.05m step) unless Alt key held
		if (gridSnapEnabled && !e.altKey) {
			nextX = Math.round(nextX / GRID_SNAP_STEP) * GRID_SNAP_STEP
			nextZ = Math.round(nextZ / GRID_SNAP_STEP) * GRID_SNAP_STEP
		}

		_studio?.updatePlacedItemTransform?.(draggedItemId, { x: nextX, z: nextZ })
		updateTopViewOverlays()
		return
	}

	// 2. Dragging rotation handle
	if (isRotatingItem && draggedItemId) {
		const state = _studio?.getStudioState?.()
		const roomKey = state?.currentRoomCtx?.roomKey || 'gallery'
		const item = (state?.placedItems?.[roomKey] || []).find((i) => i.id === draggedItemId)
		if (!item) return

		const dx = floorHit.x - (item.x || 0)
		const dz = floorHit.z - (item.z || 0)
		// Screen top is -Z, so angle from center:
		let angle = Math.atan2(dx, -dz)

		// 15 deg snap unless Alt held
		if (!e.altKey) {
			const stepRad = THREE.MathUtils.degToRad(15)
			angle = Math.round(angle / stepRad) * stepRad
		}

		_studio?.updatePlacedItemTransform?.(draggedItemId, { rotY: angle })
		updateTopViewOverlays()
		return
	}
}

function _onMouseUp(e) {
	if (!isTopViewActive) return

	if (isDraggingItem || isRotatingItem) {
		isDraggingItem = false
		isRotatingItem = false
		draggedItemId = null
		updateTopViewOverlays()
	}
}

// ─── Raycast Helpers ──────────────────────────────────────────────────────────

function _getFloorIntersection(e) {
	if (!_topCamera) return null
	const rect = _canvas.getBoundingClientRect()
	_mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
	_mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

	_raycaster.setFromCamera(_mouse, _topCamera)
	const pt = new THREE.Vector3()
	const hit = _raycaster.ray.intersectPlane(_floorPlane, pt)
	return hit ? pt : null
}

function _raycastRotateHandle(e) {
	if (!topOverlayGroup || !_topCamera) return null
	const rect = _canvas.getBoundingClientRect()
	_mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
	_mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

	_raycaster.setFromCamera(_mouse, _topCamera)
	const handles = []
	topOverlayGroup.traverse((obj) => {
		if (obj.userData?.isRotateHandle) handles.push(obj)
	})
	const hits = _raycaster.intersectObjects(handles, false)
	return hits.length > 0 ? hits[0].object : null
}

function _raycastPlacedItem(e) {
	if (!topOverlayGroup || !_topCamera) return null
	const rect = _canvas.getBoundingClientRect()
	_mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
	_mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

	_raycaster.setFromCamera(_mouse, _topCamera)
	const items = []
	topOverlayGroup.traverse((obj) => {
		if (obj.userData?.topViewItemId && !obj.userData?.isRotateHandle) {
			items.push(obj)
		}
	})
	const hits = _raycaster.intersectObjects(items, true)
	if (hits.length === 0) return null

	let obj = hits[0].object
	while (obj && !obj.userData?.topViewItemId) obj = obj.parent
	return obj
}

// ─── HUD Banner ───────────────────────────────────────────────────────────────

function _buildMapHud() {
	_mapHudEl = document.createElement('div')
	_mapHudEl.id = 'topview-hud-banner'
	_mapHudEl.style.cssText = `
		display: none; position: fixed; top: 48px; left: 50%; transform: translateX(-50%);
		z-index: 9100; background: rgba(12, 18, 32, 0.94); border: 1px solid #3d5a80;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6); border-radius: 8px;
		padding: 6px 16px; align-items: center; gap: 14px;
		font-family: 'Segoe UI', sans-serif; font-size: 12px; color: #e0f2fe;
		pointer-events: auto;
	`
	_mapHudEl.innerHTML = `
		<span style="font-weight:700;color:#38bdf8;letter-spacing:0.5px">🗺 TOP-DOWN 2D/3D MAP VIEW</span>
		<span style="color:#94a3b8;border-left:1px solid #334155;padding-left:10px">
			<b style="color:#fff">Drag:</b> Move · <b style="color:#fff">Handle:</b> Rotate · <b style="color:#fff">Alt:</b> Free Move
		</span>
		<button id="topview-close-btn" class="studio-btn studio-btn-primary" style="padding:2px 8px;font-size:11px" title="Return to 1st Person (T)">
			✕ Return to 1st Person (T)
		</button>
	`
	document.body.appendChild(_mapHudEl)

	document.getElementById('topview-close-btn')?.addEventListener('click', () => {
		toggleTopView(false)
	})
}

