/**
 * staticCache.js — Shared static texture and material cache for room building.
 *
 * Items in this cache are created once and reused across all room loads:
 *   - photoFrameBackTex   : neutral gray-white backing for photo frames
 *   - noPhotoTex          : "NO PHOTO" placeholder (default 1024 px)
 *   - noPhotoTexSmall     : "NO PHOTO" placeholder (512 px, for small frames)
 *   - lobbyMedallionTex   : "RETURN TO LOBBY" button canvas
 *   - luxuryMats          : shared MeshStandardMaterial instances (no map, same params)
 *
 * RULES:
 *   - None of these items may be disposed per-room; they live until the engine stops.
 *   - They must NOT be pushed into a room's disposables[] array.
 *   - Call disposeStaticCache() only when the entire engine is torn down.
 */
import * as THREE from 'three'
import { configureGalleryTexture } from '../../misc/helper.js'

let cache = null

export function getStaticCache() {
	if (cache) return cache

	// ── Photo Frame Back Texture (neutral gray-white linen backdrop) ─────────
	const frameBackCanvas = document.createElement('canvas')
	frameBackCanvas.width = 1024
	frameBackCanvas.height = 1024
	const fbCtx = frameBackCanvas.getContext('2d')
	if (fbCtx) {
		fbCtx.clearRect(0, 0, 1024, 1024)
		fbCtx.fillStyle = '#e0e0d4'
		fbCtx.fillRect(0, 0, 1024, 1024)
		fbCtx.strokeStyle = 'rgba(0,0,0,0.18)'
		fbCtx.lineWidth = Math.max(6, Math.floor(1024 * 0.01))
		fbCtx.strokeRect(24, 24, 1024 - 48, 1024 - 48)
	}
	const photoFrameBackTex = new THREE.CanvasTexture(frameBackCanvas)
	photoFrameBackTex.colorSpace = THREE.SRGBColorSpace
	photoFrameBackTex.premultiplyAlpha = true
	configureGalleryTexture(photoFrameBackTex)

	// ── "NO PHOTO" Placeholder Texture (1024 px) ─────────────────────────────
	const noPhotoCanvas = document.createElement('canvas')
	noPhotoCanvas.width = 1024
	noPhotoCanvas.height = 1024
	const npCtx = noPhotoCanvas.getContext('2d')
	if (npCtx) {
		npCtx.fillStyle = '#c0c0a9'
		npCtx.fillRect(0, 0, 1024, 1024)
		npCtx.strokeStyle = 'rgba(0,0,0,0.18)'
		npCtx.lineWidth = Math.max(6, Math.floor(1024 * 0.01))
		npCtx.strokeRect(24, 24, 1024 - 48, 1024 - 48)
		npCtx.fillStyle = 'rgba(0,0,0,0.9)'
		npCtx.textAlign = 'center'
		npCtx.textBaseline = 'middle'
		npCtx.font = `800 ${Math.floor(1024 * 0.11)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`
		npCtx.fillText('NO PHOTO', 512, 512 - Math.floor(1024 * 0.01))
		npCtx.font = `600 ${Math.floor(1024 * 0.045)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`
		npCtx.fillStyle = 'rgba(0,0,0,0.7)'
		npCtx.fillText('No image available', 512, 512 + Math.floor(1024 * 0.09))
	}
	const noPhotoTex = new THREE.CanvasTexture(noPhotoCanvas)
	noPhotoTex.colorSpace = THREE.SRGBColorSpace
	configureGalleryTexture(noPhotoTex)

	// ── "RETURN TO LOBBY" Medallion Canvas Texture ───────────────────────────
	const medallionCanvas = document.createElement('canvas')
	medallionCanvas.width = 512
	medallionCanvas.height = 512
	const mCtx = medallionCanvas.getContext('2d')
	if (mCtx) {
		mCtx.clearRect(0, 0, 512, 512)
		mCtx.strokeStyle = '#d4af37'
		mCtx.lineWidth = 6
		mCtx.beginPath()
		mCtx.arc(256, 256, 240, 0, Math.PI * 2)
		mCtx.stroke()
		mCtx.lineWidth = 2
		mCtx.beginPath()
		mCtx.arc(256, 256, 226, 0, Math.PI * 2)
		mCtx.stroke()
		mCtx.textAlign = 'center'
		mCtx.textBaseline = 'middle'
		mCtx.font = '36px "Montserrat", sans-serif'
		mCtx.fillStyle = '#e8c872'
		mCtx.fillText('✦  ✦  ✦', 256, 135)
		mCtx.font = '700 56px "Cormorant Garamond", Georgia, serif'
		mCtx.fillStyle = '#ffffff'
		mCtx.fillText('RETURN TO', 256, 225)
		mCtx.font = '900 66px "Cormorant Garamond", Georgia, serif'
		mCtx.fillStyle = '#e8c872'
		mCtx.fillText('LOBBY', 256, 305)
		mCtx.font = '600 24px "Montserrat", sans-serif'
		mCtx.fillStyle = 'rgba(255,255,255,0.78)'
		mCtx.fillText('GRAND ROTUNDA', 256, 380)
	}
	const lobbyMedallionTex = new THREE.CanvasTexture(medallionCanvas)
	lobbyMedallionTex.colorSpace = THREE.SRGBColorSpace
	configureGalleryTexture(lobbyMedallionTex)
	lobbyMedallionTex.needsUpdate = true

	// ── Shared luxury material instances (no texture maps, pure colour/PBR) ──
	// These are identical across all rooms so we create once and share.
	// NOTE: Do NOT push these into disposables[].
	const luxuryMats = {
		brass:            new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.88, roughness: 0.22 }),
		darkBronze:       new THREE.MeshStandardMaterial({ color: 0x1f1914, metalness: 0.65, roughness: 0.38 }),
		walnut:           new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.65, metalness: 0.04 }),
		mahogany:         new THREE.MeshStandardMaterial({ color: 0x36160d, roughness: 0.60, metalness: 0.04 }),
		cognacLeather:    new THREE.MeshStandardMaterial({ color: 0x7c4522, roughness: 0.40, metalness: 0.06 }),
		burgundyLeather:  new THREE.MeshStandardMaterial({ color: 0x4f1719, roughness: 0.42, metalness: 0.06 }),
		champagneVelvet:  new THREE.MeshStandardMaterial({ color: 0xf3ebd8, roughness: 0.70, metalness: 0.02 }),
		emeraldVelvet:    new THREE.MeshStandardMaterial({ color: 0x143c24, roughness: 0.68, metalness: 0.02 }),
		calacattaMarble:  new THREE.MeshStandardMaterial({ color: 0xf8f6f0, roughness: 0.24, metalness: 0.06 }),
		neroMarble:       new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.25, metalness: 0.10 }),
		castIron:         new THREE.MeshStandardMaterial({ color: 0x1c1c1d, roughness: 0.70, metalness: 0.70 }),
		terracotta:       new THREE.MeshStandardMaterial({ color: 0xb7522c, roughness: 0.84, metalness: 0.0  }),
	}

	// Shared common geometries ── plain tubes, spheres used by decorations.
	// Keyed by a compact descriptor so callers can share them.
	const geoCache = new Map()

	function getGeo(key, factory) {
		if (geoCache.has(key)) return geoCache.get(key)
		const g = factory()
		geoCache.set(key, g)
		return g
	}

	cache = {
		photoFrameBackTex,
		noPhotoTex,
		lobbyMedallionTex,
		luxuryMats,
		geoCache,
		getGeo,
	}
	return cache
}

export function disposeStaticCache() {
	if (!cache) return
	cache.photoFrameBackTex?.dispose()
	cache.noPhotoTex?.dispose()
	cache.lobbyMedallionTex?.dispose()
	for (const mat of Object.values(cache.luxuryMats)) mat?.dispose()
	for (const geo of cache.geoCache.values()) geo?.dispose()
	cache = null
}

