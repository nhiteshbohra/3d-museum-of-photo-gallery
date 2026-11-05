// =========================================================================
// AVATAR WORLD — manages remote avatars in the scene.
//
// Responsibilities:
//   • Load character GLBs (shared loader cache, disposed when an avatar leaves)
//   • Load per-character animation clip GLBs (idle/walk/run/jump/emotes/sit)
//   • Drive an AnimationMixer with crossfades so remote avatars animate
//   • Spawn / despawn remote avatars on peer_joined / peer_left
//   • Interpolate remote positions with a ~100ms buffer (no teleport/snap)
//   • Name-tag DOM overlay projected over the head
//   • Push-apart when two avatars overlap (no hard blocking)
// =========================================================================
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'

export const INTERP_BUFFER_MS = 100

const avatarLoadingManager = new THREE.LoadingManager()
const loader = new GLTFLoader(avatarLoadingManager)
const texLoader = new THREE.TextureLoader(avatarLoadingManager)
const modelCache = new Map() // url -> Promise<gltf>

const REQUIRED_CLIPS = new Set(['idle', 'walk', 'run', 'jump', 'sit'])

function loadModelWithTimeout(url, timeoutMs = 45000) {
  if (modelCache.has(url)) return modelCache.get(url)
  const p = new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        modelCache.delete(url)
        reject(new Error(`Model load timed out after ${timeoutMs}ms: ${url}`))
      }
    }, timeoutMs)

    loader.loadAsync(url).then(
      res => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(res)
        }
      },
      err => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          modelCache.delete(url)
          reject(err)
        }
      }
    )
  })
  modelCache.set(url, p)
  return p
}

// Map of logical clip names -> animation file (both characters share the set).
// V4 files; gameplay aliases keep the existing controls stable.
const CLIP_FILES = {
  idle: 'idle_weight_shift.glb',
  walk: 'walk.glb',
  run: 'run.glb',
  jump: 'jump.glb',
  wave: 'wave.glb',
  dance: 'energetic_dance.glb',
  sit: 'seated_idle.glb',
  sitDown: 'sit_down.glb',
  standUp: 'stand_up.glb',
  stepBack: 'step_back.glb',
  nod: 'nod_yes.glb',
  shake: 'shake_head_no.glb',
  turn: 'turn_in_place.glb',
  walkStart: 'walk_start.glb',
  walkStop: 'walk_stop.glb',
  casualDance: 'casual_dance.glb',
  sitLow: 'sit_low_chair.glb',
  sitHigh: 'sit_high_chair.glb',
  lookLeft: 'turn_head_left.glb',
  lookRight: 'turn_head_right.glb',
}
const LOOPING_CLIPS = new Set(['idle', 'walk', 'run', 'dance', 'casualDance', 'sit'])

const NAME_TAG_CONTAINER = (() => {
  let el = document.getElementById('remote-avatar-tags')
  if (!el) {
    el = document.createElement('div')
    el.id = 'remote-avatar-tags'
    el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:900;overflow:hidden;'
    document.body.appendChild(el)
  }
  return el
})()

export class RemoteAvatar {
  constructor({ peerId, name, color, model, scene, camera, appearance = {} }) {
    this.peerId = peerId
    this.name = name
    this.color = color
    this.appearance = appearance
    this.scene = scene
    this.camera = camera
    this.room = null
    this.alive = true

    this.target = { x: 0, y: 0, z: 0, ry: 0, anim: 'idle', moving: false, mode: 'stand', seat: null }
    this.buffer = [] // [{t, x,y,z,ry}]
    this.lastApplied = null

    this.group = new THREE.Group()
    this.group.visible = false
    scene.add(this.group)

    this.modelPromise = null
    this.root = null
    this.model = null
    this.mixer = null
    this.clips = new Map() // logical name -> AnimationClip
    this.actions = new Map() // logical name -> AnimationAction
    this.currentAction = null
    this.emoteAction = null
    this._animationsLoaded = false

    this._loadModel(model)
    this.modelPromise?.catch(() => {}) // Remote failures are logged; local selection awaits readiness.

    // name tag
    this.tag = document.createElement('div')
    this.tag.className = 'remote-avatar-tag'
    this.tag.textContent = name
    this.tag.style.cssText =
      'position:absolute;transform:translate(-50%,-100%);padding:2px 10px;border-radius:8px;' +
      `background:${color};color:#1a1206;font:600 12px/1.2 system-ui,sans-serif;` +
      'box-shadow:0 3px 10px rgba(0,0,0,.5);white-space:nowrap;'
    NAME_TAG_CONTAINER.appendChild(this.tag)
    this.tag.style.display = 'none'
  }

  _loadModel(modelUrl) {
    if (!modelUrl) return
    const url = modelUrl.startsWith('models/') || modelUrl.startsWith('/')
      ? modelUrl
      : `models/ready/characters/${modelUrl}`
    this.modelPromise = loadModelWithTimeout(url, 45000)
      .then(async (gltf) => {
        if (!this.alive) return
        this.root = clone(gltf.scene)
        this.model = { ...gltf, scene: this.root }
        this.mesh = this.root

        this.root.traverse((o) => {
          if (o.isMesh) {
            o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone()
            o.frustumCulled = false
          }
        })

        const texturesReady = this._applyRealismTextures(modelUrl)

        this.root.scale.setScalar(1)
        this.root.updateMatrixWorld(true)
        let box = new THREE.Box3().setFromObject(this.root)
        const bones = new THREE.Box3()
        this.root.traverse(o => { if (o.isBone) bones.expandByPoint(o.getWorldPosition(new THREE.Vector3())) })
        if (!bones.isEmpty() && bones.max.y - bones.min.y > (box.max.y - box.min.y) * 10) {
          // ponytail: V3 exports meter-sized vertices under a centimeter rig.
          // Repair these mismatched assets; a consistent source re-export removes this step.
          this.ownedGeometries = []
          this.root.traverse(o => {
            if (!o.isSkinnedMesh) return
            const scale = 1 / o.getWorldScale(new THREE.Vector3()).y
            o.geometry = o.geometry.clone().scale(scale, scale, scale)
            this.ownedGeometries.push(o.geometry)
            o.boundingBox = null
            o.boundingSphere = null
          })
          box = new THREE.Box3().setFromObject(this.root)
        }
        const size = new THREE.Vector3()
        box.getSize(size)
        this.root.scale.setScalar(1.7 / (size.y || 1))
        this.root.position.y -= box.min.y * this.root.scale.y
        this.group.add(this.root)

        // Make model visible immediately upon attaching root to scene
        this.applyRoom(this._visibleRooms || this.room || 'lobby')

        // Set up the animation mixer on this skeleton
        this.mixer = new THREE.AnimationMixer(this.root)

        // Progressive background loading: textures and animations load non-blockingly
        const animPromise = this._loadAnimations(modelUrl)
        Promise.allSettled([texturesReady, animPromise]).then(() => {
          if (this.alive) this.applyRoom(this._visibleRooms || this.room || 'lobby')
        })

        return this
      })
      .catch((err) => {
        console.warn('[avatars] failed to load model', url, err)
        throw err
      })
  }

  _applyRealismTextures(modelUrl) {
    // V4 texture maps and region masks are required for appearance customization.
    if (!this.root) return
    const base = modelUrl.startsWith('models/') || modelUrl.startsWith('/')
      ? modelUrl.replace(/^\/?(models\/ready\/characters\/)?/, '')
      : modelUrl
    const gender = base.toLowerCase().replace(/\.glb$/, '')
    const texBase = `models/ready/characters/textures/${gender}/`
    const mats = []
    this.root.traverse((o) => {
      if (o.isMesh) {
        const list = Array.isArray(o.material) ? o.material : [o.material]
        for (const m of list) if (m) mats.push(m)
      }
    })
    if (mats.length === 0) return
    const load = (f) => texLoader.loadAsync(`${texBase}${f}`)
    return Promise.all([load(`${gender}-realism-v2.png`), load(`${gender}-roughness.png`), load(`${gender}-micro-normal.png`), load(`${gender}-masks.png`)])
      .then(([color, rough, normal, mask]) => {
        this.ownedTextures = [color, rough, normal, mask].filter(Boolean)
        if (!this.alive) { this.ownedTextures.forEach(t => t.dispose()); return }
        for (const m of mats) {
          if (color) { m.map = color; m.map.colorSpace = THREE.SRGBColorSpace; m.map.flipY = false; m.needsUpdate = true }
          if (rough) { m.roughnessMap = rough; m.roughnessMap.flipY = false; m.needsUpdate = true }
          if (normal) { m.normalMap = normal; m.normalMap.flipY = false; m.normalScale = new THREE.Vector2(0.35, 0.35); m.needsUpdate = true }
        }
        if (color && mask) {
          const canvas = document.createElement('canvas')
          canvas.width = color.image.width
          canvas.height = color.image.height
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          ctx.drawImage(color.image, 0, 0)
          const original = ctx.getImageData(0, 0, canvas.width, canvas.height)
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(mask.image, 0, 0, canvas.width, canvas.height)
          const masks = ctx.getImageData(0, 0, canvas.width, canvas.height).data
          const map = new THREE.CanvasTexture(canvas)
          map.colorSpace = THREE.SRGBColorSpace
          map.flipY = false
          this.ownedTextures.push(map)
          for (const m of mats) { m.map = map; m.color.setHex(0xffffff); m.needsUpdate = true }
          this.appearanceTexture = { ctx, map, original, masks }
          this.applyAppearance(this.appearance)
        }
      })
  }

  applyAppearance(appearance = {}) {
    const keys = ['skin', 'hair', 'top', 'trousers']
    this.appearance = Object.fromEntries(keys.map(k => [k, /^#[0-9a-f]{6}$/i.test(appearance?.[k]) ? appearance[k] : null]))
    const state = this.appearanceTexture
    if (!state) return
    const signature = JSON.stringify(this.appearance)
    if (signature === this.appearanceSignature) return
    this.appearanceSignature = signature
    const { ctx, map, original, masks } = state
    const image = ctx.createImageData(original.width, original.height)
    image.data.set(original.data)
    const targets = keys.map(k => this.appearance[k] ? [1, 3, 5].map(i => parseInt(this.appearance[k].slice(i, i + 2), 16)) : null)
    // V4 mask RGBA channels identify skin, hair, top and trousers respectively.
    for (let i = 0; i < image.data.length; i += 4) {
      for (let channel = 0; channel < 4; channel++) {
        if (!targets[channel]) continue
        const weight = (channel === 3 ? Math.max(0, (masks[i + 3] - 128) * 2) : masks[i + channel]) / 255 * 0.79
        if (weight < 0.01) continue
        const lum = (0.22 * image.data[i] + 0.67 * image.data[i + 1] + 0.11 * image.data[i + 2]) / 128
        for (let rgb = 0; rgb < 3; rgb++) image.data[i + rgb] = image.data[i + rgb] * (1 - weight) + Math.min(255, targets[channel][rgb] * lum) * weight
      }
      image.data[i + 3] = 255
    }
    ctx.putImageData(image, 0, 0)
    map.needsUpdate = true
  }

  _animationBasePath(modelUrl) {
    // modelUrl is like "woman.glb" / "man.glb"; animations live under
    // characters/animations/<gender>/
    const base = modelUrl.startsWith('models/') || modelUrl.startsWith('/')
      ? modelUrl.replace(/^\/?(models\/ready\/characters\/)?/, '')
      : modelUrl
    const gender = base.toLowerCase().replace(/\.glb$/, '')
    return `models/ready/characters/animations/${gender}/`
  }

  _loadAnimations(modelUrl) {
    const base = this._animationBasePath(modelUrl)
    const entries = Object.entries(CLIP_FILES)

    const registerClip = (logical, clip) => {
      if (!this.alive || !this.mixer || !clip) return
      const reference = this.clips.get('walk') || clip
      const names = new Set(clip.tracks.map(t => t.name))
      const resting = (reference?.tracks || []).filter(t => t.name.endsWith('.quaternion') && !names.has(t.name)).map(t =>
        new THREE.QuaternionKeyframeTrack(t.name, [0], t.values.slice(0, 4)))
      const complete = new THREE.AnimationClip(clip.name, clip.duration, [...clip.tracks, ...resting])
      this.clips.set(logical, complete)
      const action = this.mixer.clipAction(complete)
      action.setLoop(LOOPING_CLIPS.has(logical) ? THREE.LoopRepeat : THREE.LoopOnce, LOOPING_CLIPS.has(logical) ? Infinity : 1)
      action.clampWhenFinished = !LOOPING_CLIPS.has(logical)
      this.actions.set(logical, action)
      if (logical === 'idle' && !this.currentAction) {
        this.currentAction = action
        action.reset().play()
        this._animationsLoaded = true
      }
    }

    // Load idle first for immediate playback
    const idlePromise = loadModelWithTimeout(`${base}${CLIP_FILES.idle}`, 45000)
      .then(gltf => {
        const clip = gltf.animations && gltf.animations[0]
        if (clip) registerClip('idle', clip)
      })
      .catch(err => console.warn('[avatars] idle clip load warning:', err.message))

    // Stream essential clips next (walk, run, jump, sit, wave, dance, nod)
    const essential = ['walk', 'run', 'jump', 'sit', 'wave', 'dance', 'nod']
    for (const logical of essential) {
      const file = CLIP_FILES[logical]
      if (file && logical !== 'idle') {
        loadModelWithTimeout(`${base}${file}`, 45000)
          .then(gltf => {
            const clip = gltf.animations && gltf.animations[0]
            if (clip) registerClip(logical, clip)
          })
          .catch(err => console.warn(`[avatars] clip "${logical}" load warning:`, err.message))
      }
    }

    // Lazy load non-essential animation clips after initial scene settled
    setTimeout(() => {
      if (!this.alive) return
      for (const [logical, file] of entries) {
        if (logical === 'idle' || essential.includes(logical)) continue
        loadModelWithTimeout(`${base}${file}`, 45000)
          .then(gltf => {
            const clip = gltf.animations && gltf.animations[0]
            if (clip) registerClip(logical, clip)
          })
          .catch(() => {})
      }
    }, 4000)

    return idlePromise
  }

  _crossfade(logical, duration = 0.25) {
    if (!this.mixer || !logical) return
    const next = this.actions.get(logical)
    if (!next) return
    if (this.currentAction === next) return
    const prev = this.currentAction
    if (prev) prev.fadeOut(duration)
    next.reset().fadeIn(duration).play()
    this.currentAction = next
  }

  _disposeGltf(gltf) {
    gltf.scene?.traverse?.((o) => {
      if (o.isMesh) {
        // Geometry belongs to the shared model cache; each avatar owns its materials.
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const m of mats) m?.dispose?.()
      }
    })
  }

  applyRoom(roomKey) {
    this._visibleRooms = roomKey
    const myRoom = (this.room || '').trim().toLowerCase()
    const targetRoom = (roomKey || '').trim().toLowerCase()
    const visible = this.alive && (!targetRoom || !myRoom || myRoom === targetRoom)
    this.group.visible = visible && !!this.root
    this.tag.style.display = visible && !!this.root ? 'block' : 'none'
  }

  setData(state) {
    this.room = state.room || state.location || this.room
    if (Array.isArray(state.p) && state.p.length >= 3) {
      if (this.buffer.length === 0) {
        this.group.position.set(state.p[0], state.p[1], state.p[2])
        if (Number.isFinite(state.ry)) this.group.rotation.y = state.ry
      }
      this.buffer.push({
        t: performance.now(),
        x: state.p[0], y: state.p[1], z: state.p[2],
        ry: Number.isFinite(state.ry) ? state.ry : 0,
        anim: state.anim || 'idle',
        moving: Boolean(state.moving),
        mode: state.mode || 'stand',
        seat: state.seat || null,
      })
      if (this.buffer.length > 30) this.buffer.shift()
    }
  }

  setEmote(emoteIdx, start) {
    const map = { 1: 'wave', 2: 'dance', 3: 'nod' }
    const logical = map[emoteIdx]
    if (!logical) return
    if (start) {
      this.emoteAction = logical
      this._crossfade(logical, 0.15)
    } else {
      this.emoteAction = null
      this._applyBaseAnim()
    }
  }

  _applyBaseAnim() {
    if (this.target.mode === 'sit') {
      this._crossfade('sit')
      return
    }
    if (this.target.anim === 'jump') {
      this._crossfade('jump')
      return
    }
    if (this.target.moving) {
      this._crossfade(this.target.anim === 'run' ? 'run' : 'walk', 0.25)
      return
    }
    this._crossfade('idle', 0.25)
  }

  _interpolate(now) {
    const buf = this.buffer
    if (buf.length === 0) return
    const cutoff = now - INTERP_BUFFER_MS
    while (buf.length > 2 && buf[1].t <= cutoff) buf.shift()

    const a = buf[0]
    const b = buf[1] || a
    if (buf.length > 1 && b.t > a.t) {
      const t = Math.max(0, Math.min(1, (cutoff - a.t) / (b.t - a.t)))
      const ix = a.x + (b.x - a.x) * t
      const iy = a.y + (b.y - a.y) * t
      const iz = a.z + (b.z - a.z) * t
      const diff = ((b.ry - a.ry + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      const iry = a.ry + diff * t
      this.group.position.set(ix, iy, iz)
      this.group.rotation.y = iry
      this.target.anim = b.anim
      this.target.moving = b.moving
      this.target.mode = b.mode
      this.target.seat = b.seat
    } else {
      this.group.position.set(a.x, a.y, a.z)
      this.group.rotation.y = a.ry
      this.target.anim = a.anim
      this.target.moving = a.moving
      this.target.mode = a.mode
      this.target.seat = a.seat
    }
  }

  update(now, dt) {
    if (!this.alive) return
    this._interpolate(now)

    if (this.mixer && this.root) {
      this.mixer.update(dt)
      // Select animation: emote beats base locomotion
      if (!this.emoteAction) {
        this._applyBaseAnim()
      }
    }

    // Name tag projection
    if (this.group.visible && this.group.children.length) {
      const headPos = new THREE.Vector3(0, 1.9, 0)
      this.group.localToWorld(headPos)
      const v = headPos.clone().project(this.camera)
      const x = (v.x * 0.5 + 0.5) * window.innerWidth
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight
      if (v.z < 1 && x > -80 && x < window.innerWidth + 80 && y > -40 && y < window.innerHeight + 40) {
        this.tag.style.left = `${x}px`
        this.tag.style.top = `${y}px`
        this.tag.style.display = 'block'
      } else {
        this.tag.style.display = 'none'
      }
    } else {
      this.tag.style.display = 'none'
    }
  }

  dispose() {
    this.alive = false
    if (this.tag) { this.tag.remove(); this.tag = null }
    if (this.mixer) { this.mixer.stopAllAction(); this.mixer = null }
    this.ownedTextures?.forEach(t => t.dispose())
    this.ownedGeometries?.forEach(g => g.dispose())
    if (this.group) {
      this.group.removeFromParent()
      if (this.model) this._disposeGltf(this.model)
    }
  }
}

export class AvatarWorld {
  constructor({ scene, camera, rooms }) {
    this.scene = scene
    this.camera = camera
    this.remote = new Map()
    this.rooms = rooms || (() => null)
  }

  setCamera(camera) {
    this.camera = camera
    for (const av of this.remote.values()) av.camera = camera
  }

  upsertRemote(peer, modelBase) {
    let av = this.remote.get(peer.peerId)
    if (!av) {
      av = new RemoteAvatar({
        peerId: peer.peerId,
        name: peer.name,
        color: peer.color,
        appearance: peer.appearance,
        model: peer.model || modelBase,
        scene: this.scene,
        camera: this.camera,
      })
      this.remote.set(peer.peerId, av)
    } else {
      if (peer.name && av.name !== peer.name) {
        av.name = peer.name
        av.tag.textContent = peer.name
      }
      if (peer.appearance) {
        av.appearance = peer.appearance
        av.applyAppearance()
      }
    }
    av.room = peer.room || peer.location || av.room
    if (peer.p) {
      av.setData(peer)
    }
    const roomKey = this.rooms ? this.rooms() : null
    av.applyRoom(roomKey)
    return av
  }

  removeRemote(peerId) {
    const av = this.remote.get(peerId)
    if (av) { av.dispose(); this.remote.delete(peerId) }
  }

  applyState(state) {
    const av = this.remote.get(state.id)
    if (av) {
      av.setData(state)
      av.applyRoom(this.rooms())
    }
  }

  applyEmote(emote) {
    const av = this.remote.get(emote.id)
    if (av) av.setEmote(emote.e, emote.start)
  }

  refreshRooms() {
    const roomKey = this.rooms()
    for (const av of this.remote.values()) av.applyRoom(roomKey)
  }

  update(dt) {
    const now = performance.now()
    for (const av of this.remote.values()) av.update(now, dt)
  }

  dispose() {
    for (const av of this.remote.values()) av.dispose()
    this.remote.clear()
  }
}
