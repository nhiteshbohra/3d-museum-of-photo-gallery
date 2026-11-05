import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import * as THREE from 'three'
import { fitPhotoToFrame } from '../src/misc/helper.js'

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

test('local salon photos keep the five-photo wall when legacy gallery photos are empty', () => {
	const source = readFileSync(new URL('../src/game/room.js', import.meta.url), 'utf8')
	const condition = source.match(/if \((imagePhotos\.length === 0[^\n]*)\) \{/)[1]
	assert.equal(runInNewContext(condition, { imagePhotos: [], localPhotoPath: () => '/photos/room/photo.png' }), false)
	assert.equal(runInNewContext(condition, { imagePhotos: [], localPhotoPath: () => null }), true)
})
