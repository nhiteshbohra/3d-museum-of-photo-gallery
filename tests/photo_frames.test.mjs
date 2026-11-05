import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import * as THREE from 'three'
import { fitPhotoToFrame } from '../src/misc/helper.js'
import { getArtworkSizes } from '../src/config/artworkSizes.js'

test('whole photos fit inside frames without cropping or distortion', () => {
	for (const [iw, ih] of [[4000, 1000], [1000, 4000], [1000, 1000]]) {
		for (const [width, height] of [[1.5, 1.55], [6, 2.85], [3.29, 2.35]]) {
			const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height))
			const texture = new THREE.Texture({ width: iw, height: ih })
			texture.repeat.set(0.4, 0.8)
			texture.offset.set(0.3, 0.1)
			fitPhotoToFrame(mesh, texture, width, height)
			const w = width * mesh.scale.x
			const h = height * mesh.scale.y
			assert.ok(w <= width + 1e-9 && h <= height + 1e-9)
			assert.ok(Math.abs(w / h - iw / ih) < 1e-9)
			assert.ok(Math.abs(w - width) < 1e-9 || Math.abs(h - height) < 1e-9)
			assert.deepEqual(texture.repeat.toArray(), [1, 1])
			assert.deepEqual(texture.offset.toArray(), [0, 0])
		}
	}
})

test('old saved artwork settings cannot remove the five fixed photo slots', () => {
	const previousWindow = globalThis.window
	const previousStorage = globalThis.localStorage
	globalThis.window = {}
	globalThis.localStorage = { getItem: () => JSON.stringify({ eastWall: { count: 0, width: 1.8 } }) }
	try {
		assert.equal(getArtworkSizes().eastWall.count, 5)
		assert.equal(getArtworkSizes().eastWall.width, 1.8)
	} finally {
		if (previousWindow === undefined) delete globalThis.window
		else globalThis.window = previousWindow
		if (previousStorage === undefined) delete globalThis.localStorage
		else globalThis.localStorage = previousStorage
	}
})

test('local salon photos keep the five-photo wall when legacy gallery photos are empty', () => {
	const source = readFileSync(new URL('../src/game/room.js', import.meta.url), 'utf8')
	const condition = source.match(/if \((imagePhotos\.length === 0[^\n]*)\) \{/)[1]
	assert.equal(runInNewContext(condition, { imagePhotos: [], localPhotoPath: () => '/photos/room/photo.png' }), false)
	assert.equal(runInNewContext(condition, { imagePhotos: [], localPhotoPath: () => null }), true)
})

test('PHOTO-01: photo backplate and slot outline synchrony for portrait, landscape, and panorama', () => {
	const baseW = 2.4
	const baseH = 1.8
	const slot = {
		width: baseW,
		height: baseH,
		center: new THREE.Vector3(0, 2, 0),
		normal: new THREE.Vector3(0, 0, 1),
		outlineObject: new THREE.Group()
	}
	const backplate = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, 0.04))

	// Test portrait (800x1200), landscape (1600x900), ultra-wide panorama (2400x600), square (1000x1000)
	for (const [iw, ih] of [[800, 1200], [1600, 900], [2400, 600], [1000, 1000]]) {
		const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1))
		const tex = { image: { width: iw, height: ih }, repeat: new THREE.Vector2(), offset: new THREE.Vector2() }
		fitPhotoToFrame(mesh, tex, baseW, baseH)

		const fittedW = mesh.scale.x
		const fittedH = mesh.scale.y
		const padW = 0.08
		const padH = 0.08
		const frameW = Math.min(baseW, fittedW + padW)
		const frameH = Math.min(baseH, fittedH + padH)

		backplate.scale.set(frameW / baseW, frameH / baseH, 1)
		slot.outlineObject.scale.set(frameW / slot.width, frameH / slot.height, 1)

		assert.ok(Math.abs(backplate.scale.x - (frameW / baseW)) < 1e-6)
		assert.ok(Math.abs(backplate.scale.y - (frameH / baseH)) < 1e-6)
		assert.ok(Math.abs(slot.outlineObject.scale.x - (frameW / slot.width)) < 1e-6)
		assert.ok(Math.abs(slot.outlineObject.scale.y - (frameH / slot.height)) < 1e-6)
		// Aspect ratio and actual pixel dimensions of scaled outline and backplate must be perfectly matched
		assert.ok(Math.abs((slot.outlineObject.scale.x * slot.width) - (backplate.scale.x * baseW)) < 1e-6)
		assert.ok(Math.abs((slot.outlineObject.scale.y * slot.height) - (backplate.scale.y * baseH)) < 1e-6)
		// Frame dimensions must strictly encompass fitted photo with padding
		assert.ok(frameW >= fittedW)
		assert.ok(frameH >= fittedH)
	}
})
