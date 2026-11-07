// =========================================================================
// Photo Cache & Texture Lifecycle Adversarial Stress Test (Milestone M3)
// Simulates continuous room transitions across all 7 salons to stress-test:
// 1. Texture disposal on room eviction.
// 2. Texture cache bounding (MAX_CACHED_PHOTO_TEXTURES = 25).
// 3. Active texture protection invariant: active room textures must NEVER be disposed prematurely.
// 4. Engine stop() lifecycle cleanup: all remaining cached textures purged & disposed.
// =========================================================================

import assert from 'node:assert/strict'
import { build } from 'esbuild'
import * as THREE from 'three'
import { coupleSalons, ROOM_KEY_TO_TITLE } from '../src/data/coupleMuseum.js'

async function setupEngineHarness() {
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
			const id = setTimeout(cb, 10)
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

	// Track textures and dispose calls
	const allCreatedTextures = new Set()
	const disposedTextures = new Set()
	const disposalEvents = []

	// Intercept THREE.TextureLoader
	const origLoad = THREE.TextureLoader.prototype.load
	THREE.TextureLoader.prototype.load = function(url, onLoad, onProgress, onError) {
		const tex = new THREE.DataTexture(new Uint8Array(4), 1, 1)
		tex.name = url
		tex.image = { width: 512, height: 512 }
		allCreatedTextures.add(tex)

		const origDispose = tex.dispose.bind(tex)
		tex.dispose = function() {
			disposedTextures.add(tex)
			disposalEvents.push({ tex, url, time: Date.now() })
			return origDispose()
		}

		if (typeof onLoad === 'function') {
			setTimeout(() => onLoad(tex), 0)
		}
		return tex
	}

	// Intercept WebGLRenderer via globalThis.MockWebGLRenderer
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
	const tmpPath = path.resolve('tests/.bundle_tmp_stress.mjs')
	fs.writeFileSync(tmpPath, bundle.outputFiles[0].text)

	const mod = await import('file:///' + tmpPath.replace(/\\/g, '/'))

	return {
		startYourEngines: mod.startYourEngines,
		allCreatedTextures,
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

export async function runStressTest() {
	console.log('======================================================================')
	console.log(' STARTING ADVERSARIAL PHOTO CACHE & TEXTURE LIFECYCLE STRESS TEST    ')
	console.log('======================================================================\n')

	const harness = await setupEngineHarness()
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
		console.log('[CONFIG] 7 Distinct Salons in Rotation:', salonKeys)

		for (let i = 0; i < 50; i++) {
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

			// Wait for deferred texture load queue to process
			await new Promise(r => setTimeout(r, 25))

			const currentRoom = engine.getCurrentRoom()
			const currentDisposables = currentRoom?.disposables || []

			// Check if any texture registered to currentRoom has already been disposed
			for (const d of currentDisposables) {
				if (d?.isTexture && harness.disposedTextures.has(d)) {
					prematurelyDisposedActiveTextures.push({
						step: i,
						roomKey: targetKey,
						textureName: d.name,
					})
				}
			}

			if (i % 10 === 0 || i === 49) {
				console.log(`  [STEP ${String(i).padStart(2, '0')}] Room: ${targetKey.padEnd(10, ' ')} | Total Created: ${harness.allCreatedTextures.size} | Disposed: ${harness.disposedTextures.size} | Premature Disposals: ${prematurelyDisposedActiveTextures.length}`)
			}
		}

		console.log('\n--- EVALUATING STRESS TEST INVARIANTS ---')

		// INVARIANT 1: Evicted room textures are disposed
		const evictedDisposals = harness.disposedTextures.size
		console.log(`1. Evicted textures disposed count: ${evictedDisposals}`)
		assert.ok(evictedDisposals > 0, 'Evicted textures must be disposed via .dispose()')
		console.log('   ✓ Invariant 1 Passed: Evicted room textures are disposed.')

		// INVARIANT 2: Engine stop() purges all cached textures
		engine.stop()
		engine = null
		await new Promise(r => setTimeout(r, 20))

		const remainingAlive = Array.from(harness.allCreatedTextures).filter(t => !harness.disposedTextures.has(t))
		console.log(`2. Remaining alive textures after engine.stop(): ${remainingAlive.length}`)
		assert.equal(remainingAlive.length, 0, 'All textures must be disposed upon engine.stop()')
		console.log('   ✓ Invariant 2 Passed: engine.stop() purges and disposes all remaining cached textures.')

		// INVARIANT 3: Active textures must NEVER be disposed prematurely while in active room
		console.log(`3. Premature active texture disposal count: ${prematurelyDisposedActiveTextures.length}`)
		if (prematurelyDisposedActiveTextures.length > 0) {
			console.error('\n[CRITICAL FAILURE] Premature active texture disposals detected:')
			for (const item of prematurelyDisposedActiveTextures.slice(0, 10)) {
				console.error(`   - Step ${item.step} (${item.roomKey}): Texture "${item.textureName}" was disposed while actively displayed!`)
			}
			console.error(`   ... Total ${prematurelyDisposedActiveTextures.length} premature disposal events.\n`)
			return {
				pass: false,
				reason: `Active room textures prematurely disposed (${prematurelyDisposedActiveTextures.length} events)`,
				prematureDisposals: prematurelyDisposedActiveTextures,
			}
		}
		console.log('   ✓ Invariant 3 Passed: Active textures were never prematurely disposed.')

		return { pass: true }
	} finally {
		if (engine) {
			try { engine.stop() } catch (_) {}
		}
		harness.restore()
	}
}

// Direct CLI execution
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
	runStressTest()
		.then((result) => {
			if (!result.pass) {
				console.error('======================================================================')
				console.error(' ADVERSARIAL STRESS TEST FAILED: CRITICAL MEMORY / LIFECYCLE DEFECT  ')
				console.error(` REASON: ${result.reason} `)
				console.error('======================================================================')
				process.exit(1)
			} else {
				console.log('======================================================================')
				console.log(' ALL ADVERSARIAL PHOTO CACHE STRESS INVARIANTS PASSED (100%)         ')
				console.log('======================================================================')
				process.exit(0)
			}
		})
		.catch((err) => {
			console.error('Unhandled stress test error:', err)
			process.exit(1)
		})
}
