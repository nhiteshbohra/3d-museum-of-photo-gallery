import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { coupleSalons, ROOM_KEY_TO_TITLE } from '../src/data/coupleMuseum.js'

test('all seven rooms build and apply all 61 local photo textures', async () => {
	const context = new Proxy({
		measureText: text => ({ width: String(text).length * 12 }),
		createLinearGradient: () => ({ addColorStop() {} }),
		createRadialGradient: () => ({ addColorStop() {} }),
		getImageData: () => ({ data: new Uint8ClampedArray(512 * 512 * 4) }),
	}, { get: (target, key) => target[key] ?? (() => {}) })
	const originalDocument = globalThis.document
	globalThis.document = { createElement: () => ({ width: 512, height: 512, getContext: () => context, toDataURL: () => 'data:image/png;base64,' }) }
	try {
		const bundle = await build({
			entryPoints: ['src/game/room.js'], bundle: true, write: false, format: 'esm', platform: 'node',
			loader: { '.png': 'dataurl' },
			plugins: [{ name: 'omit-model-downloads', setup(builder) {
				builder.onLoad({ filter: /[\\/]placedItems\.js$/ }, () => ({ contents: 'export function applyPlacedItems() {} export function spawnGlbItem() { return Promise.resolve(null) } export function getPlantsConfig() { return { overrides: [] } }' }))
			} }],
		})
		const { buildRoom } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text + '\n//# sourceURL=room-photo-test.mjs').toString('base64')}`)
		let total = 0
		for (const [roomKey, title] of [['lobby', 'Lobby'], ...Object.entries(ROOM_KEY_TO_TITLE)]) {
			const room = buildRoom({ width: 21, length: 18, height: 4, mode: roomKey === 'lobby' ? 'lobby' : 'gallery', roomKey, gallery: coupleSalons[title] || {}, lobby: { categories: Object.values(ROOM_KEY_TO_TITLE) } })
			const expected = roomKey === 'lobby' ? 1 : 10
			assert.equal(room.deferredTextureLoads.length, expected, roomKey + ' load requests')
			assert.equal(room.pickableMeshes.filter(mesh => mesh.userData.isPhoto).length, expected, roomKey + ' photo meshes')
			for (const job of room.deferredTextureLoads) {
				assert.ok(existsSync('public' + job.url), job.url)
				const mesh = room.pickableMeshes.find(mesh => mesh.userData.photoUrl === job.url)
				// The lobby changes its picking URL when the local texture arrives.
				const texture = { image: { width: 1080, height: 1920 }, repeat: { set() {} }, offset: { set() {} } }
				job.onLoad(texture)
				const photo = mesh || room.pickableMeshes.find(mesh => mesh.userData.photoUrl === job.url)
				assert.equal(photo?.material.map, texture, roomKey + ' applied ' + job.url)
				total++
			}
		}
		assert.equal(total, 61)
	} finally {
		globalThis.document = originalDocument
	}
})

test('a stalled photo does not block the other room photos', async () => {
	const source = readFileSync(new URL('../src/engine/engine.js', import.meta.url), 'utf8')
	const start = source.indexOf('async function runDeferredTextureLoads(')
	const end = source.indexOf('\n\tconst holdAnchor', start)
	const applied = []
	let finishFirst
	const room = { deferredTextureLoads: ['slow', 'second', 'third'].map(url => ({ url, onLoad: () => applied.push(url) })) }
	const load = runInNewContext('(' + source.slice(start, end).trim() + ')', {
		deferredTextureLoadToken: 1, currentRoom: room,
		loadedPhotoTextureCache: new Map(),
		window: { requestAnimationFrame: callback => callback() },
		loadTextureAsync: url => url === 'slow' ? new Promise(resolve => { finishFirst = resolve }) : Promise.resolve({}),
	})
	const done = load(room, 1)
	await new Promise(resolve => setImmediate(resolve))
	assert.deepEqual(applied, ['second', 'third'])
	finishFirst({})
	await done
	assert.equal(applied.length, 3)
})
