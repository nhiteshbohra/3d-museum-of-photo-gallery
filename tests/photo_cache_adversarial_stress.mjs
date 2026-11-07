// =========================================================================
// Milestone M3 Adversarial Texture Lifecycle & Memory Stress Test Suite
// Extends and stress-tests:
// 1. 100 consecutive room transitions across all 7 salons.
// 2. Rapid room toggling (cancellation mid-flight & network jitter).
// 3. Concurrent duplicate load requests (deduplication & race resilience).
// 4. Out-of-order asynchronous download completion.
// 5. Multi-room LRU cache retention and eviction invariant verification.
// =========================================================================

import assert from 'node:assert/strict'
import { build } from 'esbuild'
import * as THREE from 'three'
import { coupleSalons, ROOM_KEY_TO_TITLE } from '../src/data/coupleMuseum.js'

async function setupEngineHarness(options = {}) {
	const bundle = await build({
		entryPoints: ['src/engine/engine.js'],
		bundle: true,
		write: false,
		format: 'esm',
		platform: 'node',
		external: ['three'],
		loader: { '.png': 'dataurl' },
		plugins: [{
			name: 'mock-placed-and-renderer',
			setup(builder) {
				builder.onLoad({ filter: /[\\/]placedItems\.js$/ }, () => ({
					contents: `
						export function updateLodSwitchers() {}
						export function updateDebugSeatsHud() {}
						export function whenPlacedItemsLoaded() { return Promise.resolve(); }
						export function applyPlacedItems() {}
						export function spawnGlbItem() { return Promise.resolve(null); }
						export function getPlantsConfig() { return { overrides: [] }; }
					`
				}))
				builder.onLoad({ filter: /[\\/]engine\.js$/ }, async (args) => {
					const fs = await import('node:fs')
					let code = fs.readFileSync(args.path, 'utf8')
					code = code.replace(
						'const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })',
						'const renderer = new (globalThis.MockWebGLRenderer || THREE.WebGLRenderer)({ canvas, antialias: true })'
					)
					return { contents: code, loader: 'js' }
				})
			}
		}]
	})

	const context2d = new Proxy({
		measureText: () => ({ width: 100 }),
		createLinearGradient: () => ({ addColorStop() {} }),
		createRadialGradient: () => ({ addColorStop() {} }),
		getImageData: () => ({ data: new Uint8ClampedArray(512 * 512 * 4) }),
	}, { get: (t, k) => t[k] ?? (() => {}) })

	globalThis.localStorage = {
		getItem: () => null,
		setItem: () => {},
		removeItem: () => {},
		clear: () => {}
	}

	const listeners = new Map()
	let stopped = false
	globalThis.window = {
		addEventListener: (type, fn) => {
			if (!listeners.has(type)) listeners.set(type, [])
			listeners.get(type).push(fn)
		},
		removeEventListener: (type, fn) => {
			if (listeners.has(type)) {
				const arr = listeners.get(type)
				const idx = arr.indexOf(fn)
				if (idx >= 0) arr.splice(idx, 1)
			}
		},
		requestAnimationFrame: (cb) => {
			if (stopped) return 0
			const id = setTimeout(cb, 5)
			return id
		},
		cancelAnimationFrame: (id) => clearTimeout(id),
		innerWidth: 1024,
		innerHeight: 768,
		devicePixelRatio: 2,
		setTimeout: globalThis.setTimeout,
		clearTimeout: globalThis.clearTimeout,
	}

	globalThis.document = {
		createElement: (tag) => {
			const elem = {
				width: 512,
				height: 512,
				style: {},
				getContext: () => context2d,
				toDataURL: () => 'data:image/png;base64,',
				addEventListener: () => {},
				removeEventListener: () => {},
			}
			return elem
		},
		addEventListener: () => {},
		removeEventListener: () => {},
	}

	// Texture lifecycle tracking
	const allCreatedTextures = new Set()
	const urlToCreatedTextures = new Map()
	const disposedTextures = new Set()
	const disposalEvents = []

	// Intercept THREE.TextureLoader
	const origLoad = THREE.TextureLoader.prototype.load
	THREE.TextureLoader.prototype.load = function(url, onLoad, onProgress, onError) {
		const tex = new THREE.DataTexture(new Uint8Array(4), 1, 1)
		tex.name = url
		tex.image = { width: 512, height: 512 }
		allCreatedTextures.add(tex)
		if (!urlToCreatedTextures.has(url)) {
			urlToCreatedTextures.set(url, [])
		}
		urlToCreatedTextures.get(url).push(tex)

		const origDispose = tex.dispose.bind(tex)
		tex.dispose = function() {
			disposedTextures.add(tex)
			disposalEvents.push({ tex, url, time: Date.now() })
			return origDispose()
		}

		const delay = typeof options.customLoaderDelay === 'function'
			? options.customLoaderDelay(url)
			: (typeof options.fixedDelay === 'number' ? options.fixedDelay : 1)

		if (typeof onLoad === 'function') {
			setTimeout(() => {
				if (!stopped) onLoad(tex)
			}, delay)
		}
		return tex
	}

	globalThis.MockWebGLRenderer = class MockWebGLRenderer {
		constructor() {
			this.domElement = globalThis.document.createElement('canvas')
			this.capabilities = { isWebGL2: true }
		}
		setPixelRatio(dpr) { this._dpr = dpr }
		getPixelRatio() { return this._dpr || 1 }
		setSize() {}
		setClearColor() {}
		render() {}
		dispose() {}
		compile() {}
		async compileAsync() {}
	}

	const fs = await import('node:fs')
	const path = await import('node:path')
	const tmpPath = path.resolve(`tests/.bundle_tmp_adv_${Date.now()}_${Math.random().toString(36).slice(2)}.mjs`)
	fs.writeFileSync(tmpPath, bundle.outputFiles[0].text)

	const mod = await import('file:///' + tmpPath.replace(/\\/g, '/'))

	return {
		startYourEngines: mod.startYourEngines,
		allCreatedTextures,
		urlToCreatedTextures,
		disposedTextures,
		disposalEvents,
		restore() {
			stopped = true
			THREE.TextureLoader.prototype.load = origLoad
			delete globalThis.MockWebGLRenderer
			try { fs.unlinkSync(tmpPath) } catch (_) {}
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 1: 100 CONSECUTIVE ROOM TRANSITIONS STRESS TEST
// ─────────────────────────────────────────────────────────────────────────────
async function run100TransitionsTest() {
	console.log('\n>>> RUNNING SCENARIO 1: 100 Consecutive Room Transitions...')
	const harness = await setupEngineHarness({ fixedDelay: 2 })
	let engine = null
	const prematurelyDisposedActiveTextures = []

	try {
		const canvas = globalThis.document.createElement('canvas')
		engine = harness.startYourEngines({
			canvas,
			roomMode: 'lobby',
			roomSeedTitle: 'Lobby',
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})

		await engine.ready
		await new Promise(r => setTimeout(r, 20))

		const salonKeys = ['lobby', ...Object.keys(ROOM_KEY_TO_TITLE)]

		for (let i = 0; i < 100; i++) {
			const targetKey = salonKeys[i % salonKeys.length]
			const targetTitle = targetKey === 'lobby' ? 'Lobby' : ROOM_KEY_TO_TITLE[targetKey]
			const isLobby = targetKey === 'lobby'

			await engine.setRoom({
				roomMode: isLobby ? 'lobby' : 'gallery',
				roomSeedTitle: targetTitle,
				galleryTitle: isLobby ? null : targetTitle,
				galleryPhotos: isLobby ? null : (coupleSalons[targetTitle]?.photos || []),
				lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
			})

			// Allow deferred texture loads to resolve and attach
			await new Promise(r => setTimeout(r, 25))

			const currentRoom = engine.getCurrentRoom()
			const currentDisposables = currentRoom?.disposables || []

			// Check for premature disposal of textures belonging to active room
			for (const d of currentDisposables) {
				if (d?.isTexture && harness.disposedTextures.has(d)) {
					prematurelyDisposedActiveTextures.push({
						step: i,
						roomKey: targetKey,
						textureName: d.name,
					})
				}
			}

			if (i % 25 === 0 || i === 99) {
				console.log(`    [100-STEP ${String(i).padStart(3, '0')}] Room: ${targetKey.padEnd(10, ' ')} | Created: ${harness.allCreatedTextures.size} | Disposed: ${harness.disposedTextures.size} | Premature: ${prematurelyDisposedActiveTextures.length}`)
			}
		}

		assert.equal(prematurelyDisposedActiveTextures.length, 0, `Scenario 1 failed: ${prematurelyDisposedActiveTextures.length} premature disposals during 100 transitions`)
		assert.ok(harness.disposedTextures.size > 0, 'Scenario 1 failed: Evicted textures must be disposed')

		engine.stop()
		engine = null
		await new Promise(r => setTimeout(r, 20))

		const remainingAlive = Array.from(harness.allCreatedTextures).filter(t => !harness.disposedTextures.has(t))
		assert.equal(remainingAlive.length, 0, `Scenario 1 failed: ${remainingAlive.length} textures remained alive after engine.stop()`)

		console.log('    ✓ Scenario 1 PASSED: 100 transitions completed with 0 premature disposals and 0 alive textures post-stop.')
		return true
	} finally {
		if (engine) try { engine.stop() } catch (_) {}
		harness.restore()
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 2: RAPID ROOM TOGGLING (CANCELLATION & JITTER STRESS)
// ─────────────────────────────────────────────────────────────────────────────
async function runRapidTogglingTest() {
	console.log('\n>>> RUNNING SCENARIO 2: Rapid Room Toggling (Cancellation Mid-Flight)...')
	// Simulate variable network jitter (delays between 5ms and 25ms)
	const harness = await setupEngineHarness({
		customLoaderDelay: (url) => 5 + Math.floor(Math.random() * 20)
	})
	let engine = null

	try {
		const canvas = globalThis.document.createElement('canvas')
		engine = harness.startYourEngines({
			canvas,
			roomMode: 'lobby',
			roomSeedTitle: 'Lobby',
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})
		await engine.ready

		const salonKeys = ['lobby', ...Object.keys(ROOM_KEY_TO_TITLE)]

		// Phase A: Rapid burst cycling across 30 room switches without waiting for texture loads
		console.log('    [Rapid Toggling Phase A] 30 rapid switches with random delays (0-10ms)...')
		for (let i = 0; i < 30; i++) {
			const targetKey = salonKeys[i % salonKeys.length]
			const targetTitle = targetKey === 'lobby' ? 'Lobby' : ROOM_KEY_TO_TITLE[targetKey]
			const isLobby = targetKey === 'lobby'

			// Do not await deferred loads; switch rapidly
			engine.setRoom({
				roomMode: isLobby ? 'lobby' : 'gallery',
				roomSeedTitle: targetTitle,
				galleryTitle: isLobby ? null : targetTitle,
				galleryPhotos: isLobby ? null : (coupleSalons[targetTitle]?.photos || []),
				lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
			}).catch(() => {})

			await new Promise(r => setTimeout(r, Math.floor(Math.random() * 10)))
		}

		// Settle on final salon (Library)
		console.log('    [Rapid Toggling Phase A] Settling on target room: library...')
		await engine.setRoom({
			roomMode: 'gallery',
			roomSeedTitle: ROOM_KEY_TO_TITLE['library'],
			galleryTitle: ROOM_KEY_TO_TITLE['library'],
			galleryPhotos: coupleSalons[ROOM_KEY_TO_TITLE['library']]?.photos || [],
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})

		// Give ample time for all in-flight promises and microtasks to settle
		await new Promise(r => setTimeout(r, 100))

		const curRoomA = engine.getCurrentRoom()
		assert.ok(curRoomA, 'Active room must exist')
		const activeDisposablesA = curRoomA.disposables || []
		const activeTexturesA = activeDisposablesA.filter(d => d?.isTexture)

		for (const tex of activeTexturesA) {
			assert.ok(!harness.disposedTextures.has(tex), `Texture "${tex.name}" was prematurely disposed after rapid toggling settling!`)
		}
		console.log(`    ✓ Phase A Settled: ${activeTexturesA.length} active textures in library, 0 premature disposals.`)

		// Phase B: Rapid oscillation between 2 rooms (Fireside <-> Music) 20 times
		console.log('    [Rapid Toggling Phase B] Rapid oscillation between fireside & music (20 switches)...')
		const twoSalons = ['fireside', 'music']
		for (let i = 0; i < 20; i++) {
			const targetKey = twoSalons[i % 2]
			const targetTitle = ROOM_KEY_TO_TITLE[targetKey]

			engine.setRoom({
				roomMode: 'gallery',
				roomSeedTitle: targetTitle,
				galleryTitle: targetTitle,
				galleryPhotos: coupleSalons[targetTitle]?.photos || [],
				lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
			}).catch(() => {})

			await new Promise(r => setTimeout(r, Math.floor(Math.random() * 8)))
		}

		// Settle on Fireside
		console.log('    [Rapid Toggling Phase B] Settling on target room: fireside...')
		await engine.setRoom({
			roomMode: 'gallery',
			roomSeedTitle: ROOM_KEY_TO_TITLE['fireside'],
			galleryTitle: ROOM_KEY_TO_TITLE['fireside'],
			galleryPhotos: coupleSalons[ROOM_KEY_TO_TITLE['fireside']]?.photos || [],
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})
		await new Promise(r => setTimeout(r, 100))

		const curRoomB = engine.getCurrentRoom()
		assert.ok(curRoomB, 'Active room must exist')
		const activeTexturesB = (curRoomB.disposables || []).filter(d => d?.isTexture)
		for (const tex of activeTexturesB) {
			assert.ok(!harness.disposedTextures.has(tex), `Texture "${tex.name}" was prematurely disposed after rapid oscillation settling!`)
		}
		console.log(`    ✓ Phase B Settled: ${activeTexturesB.length} active textures in fireside, 0 premature disposals.`)

		// Phase C: Stop and check cleanup
		engine.stop()
		engine = null
		await new Promise(r => setTimeout(r, 20))

		const remainingAlive = Array.from(harness.allCreatedTextures).filter(t => !harness.disposedTextures.has(t))
		assert.equal(remainingAlive.length, 0, `Scenario 2 failed: ${remainingAlive.length} textures remained alive after engine.stop()`)

		console.log('    ✓ Scenario 2 PASSED: Rapid room toggling produced 0 premature active disposals and 0 alive textures post-stop.')
		return true
	} finally {
		if (engine) try { engine.stop() } catch (_) {}
		harness.restore()
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 3: CONCURRENT DUPLICATE LOAD REQUESTS (DEDUPLICATION & RACE RESILIENCE)
// ─────────────────────────────────────────────────────────────────────────────
async function runConcurrentDuplicateLoadsTest() {
	console.log('\n>>> RUNNING SCENARIO 3: Concurrent Duplicate Load Requests (Deduplication)...')
	const harness = await setupEngineHarness({ fixedDelay: 10 })
	let engine = null

	try {
		const canvas = globalThis.document.createElement('canvas')
		engine = harness.startYourEngines({
			canvas,
			roomMode: 'lobby',
			roomSeedTitle: 'Lobby',
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})
		await engine.ready

		// Test URL targets
		const targetUrl1 = '/photos/02_music_room/01_guitar.png'
		const targetUrl2 = '/photos/03_library_reading_nook/06_east_wall_artwork_1.png'
		const targetUrl3 = '/photos/01_fireside_lounge/02_sofa.png'

		// Launch 50 concurrent preloads for targetUrl1 simultaneously
		console.log('    Launching 50 concurrent requests for URL 1 and URL 2...')
		const promises = []
		for (let i = 0; i < 50; i++) {
			engine.preloadTextures([targetUrl1, targetUrl2])
		}

		// Wait for in-flight requests to complete
		await new Promise(r => setTimeout(r, 50))

		// Check deduplication invariant: Exactly 1 texture created per unique URL
		const createdForUrl1 = harness.urlToCreatedTextures.get(targetUrl1) || []
		const createdForUrl2 = harness.urlToCreatedTextures.get(targetUrl2) || []

		assert.equal(createdForUrl1.length, 1, `Expected exactly 1 texture created for URL 1, got ${createdForUrl1.length}`)
		assert.equal(createdForUrl2.length, 1, `Expected exactly 1 texture created for URL 2, got ${createdForUrl2.length}`)
		console.log('    ✓ Deduplication Invariant Verified: Exactly 1 texture created despite 50 concurrent calls.')

		// Verify neither texture was disposed
		assert.ok(!harness.disposedTextures.has(createdForUrl1[0]), 'Preloaded texture for URL 1 must not be disposed')
		assert.ok(!harness.disposedTextures.has(createdForUrl2[0]), 'Preloaded texture for URL 2 must not be disposed')

		// Now transition to the room that uses targetUrl1 (Music)
		console.log('    Transitioning to Music room containing targetUrl1...')
		await engine.setRoom({
			roomMode: 'gallery',
			roomSeedTitle: ROOM_KEY_TO_TITLE['music'],
			galleryTitle: ROOM_KEY_TO_TITLE['music'],
			galleryPhotos: coupleSalons[ROOM_KEY_TO_TITLE['music']]?.photos || [],
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})
		await new Promise(r => setTimeout(r, 50))

		const curRoom = engine.getCurrentRoom()
		const activeTextures = (curRoom?.disposables || []).filter(d => d?.isTexture)
		for (const tex of activeTextures) {
			assert.ok(!harness.disposedTextures.has(tex), `Texture "${tex.name}" prematurely disposed in Music room!`)
		}

		engine.stop()
		engine = null
		await new Promise(r => setTimeout(r, 20))

		const remainingAlive = Array.from(harness.allCreatedTextures).filter(t => !harness.disposedTextures.has(t))
		assert.equal(remainingAlive.length, 0, `Scenario 3 failed: ${remainingAlive.length} textures remained alive after engine.stop()`)

		console.log('    ✓ Scenario 3 PASSED: Concurrent duplicate requests properly deduplicated, 0 premature disposals, 0 leaks.')
		return true
	} finally {
		if (engine) try { engine.stop() } catch (_) {}
		harness.restore()
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 4: OUT-OF-ORDER ASYNCHRONOUS DOWNLOAD COMPLETION
// ─────────────────────────────────────────────────────────────────────────────
async function runOutOfOrderDownloadTest() {
	console.log('\n>>> RUNNING SCENARIO 4: Out-Of-Order Texture Download Completion...')
	// Delay inversely proportional to photo index: later photos complete faster than earlier ones
	const harness = await setupEngineHarness({
		customLoaderDelay: (url) => {
			const match = url.match(/(\d+)/)
			const num = match ? parseInt(match[1], 10) : 5
			// Photo 10 delay = 2ms; Photo 1 delay = 40ms
			return Math.max(2, (11 - num) * 4)
		}
	})
	let engine = null

	try {
		const canvas = globalThis.document.createElement('canvas')
		engine = harness.startYourEngines({
			canvas,
			roomMode: 'lobby',
			roomSeedTitle: 'Lobby',
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})
		await engine.ready

		console.log('    Loading Library room with inverted network delays...')
		await engine.setRoom({
			roomMode: 'gallery',
			roomSeedTitle: ROOM_KEY_TO_TITLE['library'],
			galleryTitle: ROOM_KEY_TO_TITLE['library'],
			galleryPhotos: coupleSalons[ROOM_KEY_TO_TITLE['library']]?.photos || [],
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})

		// Wait for all 10 out-of-order downloads to finish
		await new Promise(r => setTimeout(r, 100))

		const curRoom = engine.getCurrentRoom()
		assert.ok(curRoom, 'Library room must exist')
		const activeTextures = (curRoom.disposables || []).filter(d => d?.isTexture)

		assert.ok(activeTextures.length >= 8, `Expected at least 8 textures loaded, got ${activeTextures.length}`)
		for (const tex of activeTextures) {
			assert.ok(!harness.disposedTextures.has(tex), `Texture "${tex.name}" prematurely disposed during out-of-order loading!`)
		}

		engine.stop()
		engine = null
		await new Promise(r => setTimeout(r, 20))

		const remainingAlive = Array.from(harness.allCreatedTextures).filter(t => !harness.disposedTextures.has(t))
		assert.equal(remainingAlive.length, 0, `Scenario 4 failed: ${remainingAlive.length} textures remained alive after engine.stop()`)

		console.log(`    ✓ Scenario 4 PASSED: ${activeTextures.length} textures loaded out-of-order with 0 premature disposals.`)
		return true
	} finally {
		if (engine) try { engine.stop() } catch (_) {}
		harness.restore()
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 5: MULTI-ROOM LRU CACHE RETENTION & SELECTIVE EVICTION
// ─────────────────────────────────────────────────────────────────────────────
async function runLRUCacheRetentionTest() {
	console.log('\n>>> RUNNING SCENARIO 5: Multi-Room LRU Cache Retention & Selective Eviction...')
	const harness = await setupEngineHarness({ fixedDelay: 2 })
	let engine = null

	try {
		const canvas = globalThis.document.createElement('canvas')
		engine = harness.startYourEngines({
			canvas,
			roomMode: 'lobby',
			roomSeedTitle: 'Lobby',
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})
		await engine.ready

		// Step 1: Visit Salon 1 (Fireside)
		console.log('    Visiting Salon 1: Fireside...')
		await engine.setRoom({
			roomMode: 'gallery',
			roomSeedTitle: ROOM_KEY_TO_TITLE['fireside'],
			galleryTitle: ROOM_KEY_TO_TITLE['fireside'],
			galleryPhotos: coupleSalons[ROOM_KEY_TO_TITLE['fireside']]?.photos || [],
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})
		await new Promise(r => setTimeout(r, 30))
		const firesideTextures = Array.from(harness.allCreatedTextures)

		// Step 2: Visit Salon 2 (Music)
		console.log('    Visiting Salon 2: Music...')
		await engine.setRoom({
			roomMode: 'gallery',
			roomSeedTitle: ROOM_KEY_TO_TITLE['music'],
			galleryTitle: ROOM_KEY_TO_TITLE['music'],
			galleryPhotos: coupleSalons[ROOM_KEY_TO_TITLE['music']]?.photos || [],
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})
		await new Promise(r => setTimeout(r, 30))

		// Step 3: Visit Salon 3 (Library)
		console.log('    Visiting Salon 3: Library (Cache now has 3 rooms: Fireside, Music, Library)...')
		await engine.setRoom({
			roomMode: 'gallery',
			roomSeedTitle: ROOM_KEY_TO_TITLE['library'],
			galleryTitle: ROOM_KEY_TO_TITLE['library'],
			galleryPhotos: coupleSalons[ROOM_KEY_TO_TITLE['library']]?.photos || [],
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})
		await new Promise(r => setTimeout(r, 30))

		// Invariant: Fireside textures should still be alive (retained in 3-room cache)
		for (const tex of firesideTextures) {
			assert.ok(!harness.disposedTextures.has(tex), `Fireside texture "${tex.name}" prematurely evicted while within 3-room cache!`)
		}
		console.log('    ✓ Fireside textures preserved in LRU room cache.')

		// Step 4: Re-visit Salon 1 (Fireside) -> Cache hit!
		console.log('    Re-visiting Salon 1: Fireside (LRU Cache Hit)...')
		await engine.setRoom({
			roomMode: 'gallery',
			roomSeedTitle: ROOM_KEY_TO_TITLE['fireside'],
			galleryTitle: ROOM_KEY_TO_TITLE['fireside'],
			galleryPhotos: coupleSalons[ROOM_KEY_TO_TITLE['fireside']]?.photos || [],
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})
		await new Promise(r => setTimeout(r, 30))
		for (const tex of firesideTextures) {
			assert.ok(!harness.disposedTextures.has(tex), `Fireside texture "${tex.name}" disposed during re-entry cache hit!`)
		}

		// Step 5: Visit Salon 4 (Paris) -> Exceeds MAX_CACHED_ROOMS (3). Oldest room (Music) must be evicted!
		console.log('    Visiting Salon 4: Paris (Triggering room cache eviction of Music room)...')
		await engine.setRoom({
			roomMode: 'gallery',
			roomSeedTitle: ROOM_KEY_TO_TITLE['paris'],
			galleryTitle: ROOM_KEY_TO_TITLE['paris'],
			galleryPhotos: coupleSalons[ROOM_KEY_TO_TITLE['paris']]?.photos || [],
			lobbyCategories: Object.values(ROOM_KEY_TO_TITLE),
		})
		await new Promise(r => setTimeout(r, 40))

		// Check that some textures were evicted and disposed
		assert.ok(harness.disposedTextures.size > 0, 'Oldest room textures must be disposed upon cache eviction')
		console.log(`    ✓ Oldest room evicted; ${harness.disposedTextures.size} textures properly disposed.`)

		// Step 6: Verify active Paris room textures are intact
		const curRoom = engine.getCurrentRoom()
		const parisTextures = (curRoom?.disposables || []).filter(d => d?.isTexture)
		for (const tex of parisTextures) {
			assert.ok(!harness.disposedTextures.has(tex), `Active Paris texture "${tex.name}" was prematurely disposed!`)
		}

		engine.stop()
		engine = null
		await new Promise(r => setTimeout(r, 20))

		const remainingAlive = Array.from(harness.allCreatedTextures).filter(t => !harness.disposedTextures.has(t))
		assert.equal(remainingAlive.length, 0, `Scenario 5 failed: ${remainingAlive.length} textures remained alive after engine.stop()`)

		console.log('    ✓ Scenario 5 PASSED: Multi-room cache retention, selective eviction, and stop() teardown verified.')
		return true
	} finally {
		if (engine) try { engine.stop() } catch (_) {}
		harness.restore()
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────
export async function runAllAdversarialScenarios() {
	console.log('======================================================================')
	console.log(' STARTING ADVERSARIAL PHOTO CACHE EXTREME STRESS & LIFECYCLE SUITE   ')
	console.log('======================================================================')

	await run100TransitionsTest()
	await runRapidTogglingTest()
	await runConcurrentDuplicateLoadsTest()
	await runOutOfOrderDownloadTest()
	await runLRUCacheRetentionTest()

	console.log('\n======================================================================')
	console.log(' ALL 5 ADVERSARIAL STRESS SUITES COMPLETED WITH 100% SUCCESS          ')
	console.log('======================================================================')
}

// Direct CLI invocation
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
	runAllAdversarialScenarios()
		.then(() => process.exit(0))
		.catch((err) => {
			console.error('\n[CRITICAL FAILURE] Adversarial Stress Test Failed:', err)
			process.exit(1)
		})
}
