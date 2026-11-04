import './style.css'
import { DefaultLoadingManager } from 'three'
import { startYourEngines } from './engine/engine.js'
import { coupleSalons, coupleCategories } from './data/coupleMuseum.js'
import { getArtworkSizes, saveArtworkSizes, resetArtworkSizes, DEFAULT_ARTWORK_SIZES } from './config/artworkSizes.js'

const app = document.querySelector('#app');
app.innerHTML = `
  <div id="top-bar">
    <span id="visitor-badge" hidden></span>
    <button id="btn-audio-toggle" class="top-bar-btn" title="Toggle Romantic Classical Ambience (Press M)">
      <span id="audio-label">Music</span>
      <div id="soundwave-anim" class="soundwave">
        <div class="soundwave-bar"></div>
        <div class="soundwave-bar"></div>
        <div class="soundwave-bar"></div>
        <div class="soundwave-bar"></div>
      </div>
      <span class="top-bar-key">M</span>
    </button>
    <button id="btn-fullscreen-toggle" class="top-bar-btn" title="Toggle Fullscreen (Press F)">
      <span>⛶</span>
      <span class="top-bar-key">F</span>
    </button>
  </div>

  <div id="scene-container">
  	<canvas id="scene" aria-label="3D scene"></canvas>
  </div>
  <div id="room-curtain" aria-hidden="true"></div>

  <div id="overlay" aria-label="Welcome">
    <div id="ticket-card">
      <div class="ticket-header">
        <span class="ticket-tag">PRIVATE EXHIBITION PASS</span>
        <span class="ticket-number">NO. 2026-1030</span>
      </div>
      <h1 class="ticket-title">OUR MUSEUM</h1>
      <div class="ticket-subtitle">A Sanctuary for Maya &amp; Ethan</div>
      <div class="ticket-quote">"In every hall, a memory; in every frame, a promise."</div>
      <div class="ticket-divider"></div>

      <div id="entrance-loading" aria-busy="true">
        <progress id="entrance-progress" max="100" value="0" aria-label="Loading museum"></progress>
        <p id="entrance-status" role="status">Preparing your museum…</p>
      </div>

      <div id="avatar-select" hidden>
        <p class="avatar-prompt">Who is visiting tonight?</p>
        <div id="avatar-grid"></div>
      </div>
      <button id="btn-enter-museum" class="btn-enter" hidden aria-describedby="entrance-status">
        <span class="btn-enter-sparkle">✦</span>
        <span>ENTER SANCTUARY</span>
        <span class="btn-enter-sparkle">✦</span>
      </button>

      <div class="ticket-controls">
        <span class="key-badge">W A S D</span> or <span class="key-badge">↑ ← ↓ →</span> Move
        <span class="sep">·</span>
        <span class="key-badge">SPACE</span> Jump
        <span class="sep">·</span>
        <span class="key-badge">SHIFT</span> Sprint
        <span class="sep">·</span>
        <span class="key-badge">M</span> Music
        <span class="sep">·</span>
        <span class="key-badge">F</span> Fullscreen
        <span class="sep">·</span>
        <span class="key-badge">ESC</span> Unlock Cursor
      </div>
    </div>

    <div id="overlay-footer">
      <p>Curated with ❤️ for Maya &amp; Ethan · Crafted by Hitesh Bohra</p>
    </div>
  </div>

  <div id="hud">
    <div id="crosshair" aria-hidden="true"></div>
  </div>
`

const canvas = document.querySelector('#scene')
const overlayEl = document.querySelector('#overlay')
const crosshairEl = document.querySelector('#crosshair')
const curtainEl = document.querySelector('#room-curtain')
const enterButton = document.querySelector('#btn-enter-museum')
const entranceStatus = document.querySelector('#entrance-status')
const entranceProgress = document.querySelector('#entrance-progress')
let entranceReady = false

// ---- VISITOR / AVATAR SELECTION ----
const AVATARS = [
	{ id: 'maya', name: 'Maya', role: 'The Connoisseur', initials: 'M', c1: '#e6c36c', c2: '#8a5a33' },
	{ id: 'ethan', name: 'Ethan', role: 'The Storyteller', initials: 'E', c1: '#cfa35c', c2: '#6e4a2c' },
	{ id: 'aurelia', name: 'Aurelia', role: 'The Wanderer', initials: 'A', c1: '#d8b06a', c2: '#7d5636' },
	{ id: 'callum', name: 'Callum', role: 'The Protector', initials: 'C', c1: '#bf8f52', c2: '#53402a' },
]
let selectedAvatarId = null
const avatarSelectEl = document.querySelector('#avatar-select')
const avatarGridEl = document.querySelector('#avatar-grid')
const visitorBadgeEl = document.querySelector('#visitor-badge')

function selectAvatar(id) {
	selectedAvatarId = id
	const av = AVATARS.find((a) => a.id === id)
	if (!av) return
	avatarGridEl.querySelectorAll('.avatar-card').forEach((c) => {
		const active = c.dataset.avatarId === id
		c.classList.toggle('selected', active)
		c.setAttribute('aria-pressed', String(active))
	})
	enterButton.hidden = false
	enterButton.disabled = false
	if (visitorBadgeEl) {
		visitorBadgeEl.hidden = false
		visitorBadgeEl.textContent = `✦ ${av.name} · ${av.role}`
	}
	window.__visitor = av
}

function renderAvatarSelection() {
	if (!avatarGridEl) return
	avatarGridEl.innerHTML = ''
	for (const av of AVATARS) {
		const card = document.createElement('button')
		card.type = 'button'
		card.className = 'avatar-card'
		card.dataset.avatarId = av.id
		card.setAttribute('aria-pressed', 'false')
		card.innerHTML = `
			<span class="avatar-medallion" style="--c1:${av.c1};--c2:${av.c2}">
				<span class="avatar-initials">${av.initials}</span>
			</span>
			<span class="avatar-name">${av.name}</span>
			<span class="avatar-role">${av.role}</span>
		`
		card.addEventListener('click', () => selectAvatar(av.id))
		avatarGridEl.appendChild(card)
	}
}

function showAvatarSelection() {
	if (!avatarSelectEl) return
	if (avatarGridEl && avatarGridEl.children.length === 0) renderAvatarSelection()
	avatarSelectEl.hidden = false
}
let assetsLoading = false
let resolveAssetsLoaded = null
DefaultLoadingManager.onStart = () => { assetsLoading = true }
DefaultLoadingManager.onProgress = (_url, loaded, total) => {
	const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0
	entranceProgress.value = percent
	if (!entranceReady) entranceStatus.textContent = `Loading museum assets (${percent}%)…`
}
DefaultLoadingManager.onLoad = () => {
	assetsLoading = false
	entranceProgress.value = 100
	resolveAssetsLoaded?.()
}

async function withFadeTransition(actionFn) {
	if (curtainEl) {
		curtainEl.classList.add('active')
		await new Promise((resolve) => setTimeout(resolve, 150))
	}
	try {
		await actionFn()
	} finally {
		if (curtainEl) {
			await new Promise((resolve) => requestAnimationFrame(resolve))
			curtainEl.classList.remove('active')
		}
	}
}

const preloadedDoorKeys = new Set()
let prebuildQueue = []
let idlePrebuildScheduled = false

function queuePrebuildSalons(salonsToQueue) {
	if (!entranceReady) return
	if (!Array.isArray(salonsToQueue)) return
	for (const title of salonsToQueue) {
		if (title && !prebuildQueue.includes(title)) {
			prebuildQueue.push(title)
		}
	}
	scheduleNextPrebuildSlice()
}

function scheduleNextPrebuildSlice() {
	if (idlePrebuildScheduled || prebuildQueue.length === 0) return
	idlePrebuildScheduled = true

	const requestIdle = window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 15 }), 60))

	requestIdle(async () => {
		idlePrebuildScheduled = false
		if (prebuildQueue.length === 0) return

		const title = prebuildQueue.shift()
		const salon = findCoupleSalon(title)
		if (!salon) {
			scheduleNextPrebuildSlice()
			return
		}

		if (engineApi && typeof engineApi.hasCachedRoom === 'function') {
			const key = 'gallery:' + salon.title.toLowerCase().trim()
			if (engineApi.hasCachedRoom(key)) {
				scheduleNextPrebuildSlice()
				return
			}
		}

		if (engineApi && typeof engineApi.prebuildRoom === 'function') {
			try {
				await engineApi.prebuildRoom({
					mode: 'gallery',
					seedTitle: salon.title,
					galleryEntryWall: 'south',
					galleryRelatedTitles: salon.seeAlso,
					galleryTitle: salon.title,
					galleryDescription: salon.extract,
					galleryMainThumbnailUrl: (salon.photos && salon.photos.length > 0) ? salon.photos[0] : null,
					galleryPhotos: salon.photos,
					galleryVideoUrl: null,
					galleryLongExtract: salon.longExtract,
					galleryTrail: [salon.title],
				})
			} catch (err) {
				console.warn('[Prebuild] Slice failed for salon', title, err)
			}
		}

		// Small delay before next slice so the main loop has zero stutter
		if (prebuildQueue.length > 0) {
			setTimeout(scheduleNextPrebuildSlice, 120)
		}
	}, { timeout: 2500 })
}

function preloadDoorPhotos(door) {
	if (!door) return
	const target = (typeof door?.category === 'string' && door.category.length > 0)
		? door.category
		: (typeof door?.articleTitle === 'string' && door.articleTitle.trim().length > 0 ? door.articleTitle.trim() : null)
	if (!target) return
	if (preloadedDoorKeys.has(target)) return
	preloadedDoorKeys.add(target)

	const salon = findCoupleSalon(target)
	if (!salon) return

	if (Array.isArray(salon.photos) && engineApi && typeof engineApi.preloadTextures === 'function') {
		engineApi.preloadTextures(salon.photos)
	}

	// Prioritize prebuilding this salon right now if not yet cached
	if (!prebuildQueue.includes(salon.title)) {
		prebuildQueue.unshift(salon.title)
		scheduleNextPrebuildSlice()
	}
}

function requestPlay() {
	canvas.requestPointerLock()
}

// -------------------------------------------------------------------------
// ROMANTIC AMBIENT SYNTH (Web Audio API - Chopin / Debussy chord progression)
// -------------------------------------------------------------------------
let audioCtx = null
let isAudioPlaying = false
let chordIntervalId = null

function initAudio() {
	if (audioCtx) return
	const AudioContextClass = window.AudioContext || window.webkitAudioContext
	if (!AudioContextClass) return
	audioCtx = new AudioContextClass()
}

function playRomanticChord(frequencies) {
	if (!audioCtx || audioCtx.state !== 'running') return
	const now = audioCtx.currentTime
	const masterGain = audioCtx.createGain()
	masterGain.gain.setValueAtTime(0.001, now)
	masterGain.gain.exponentialRampToValueAtTime(0.12, now + 1.2)
	masterGain.gain.exponentialRampToValueAtTime(0.001, now + 5.5)

	const filter = audioCtx.createBiquadFilter()
	filter.type = 'lowpass'
	filter.frequency.setValueAtTime(750, now)

	masterGain.connect(filter)
	filter.connect(audioCtx.destination)

	frequencies.forEach((freq, idx) => {
		const osc = audioCtx.createOscillator()
		osc.type = idx % 2 === 0 ? 'sine' : 'triangle'
		osc.frequency.setValueAtTime(freq, now)
		osc.detune.setValueAtTime((idx - 1.5) * 5, now)
		osc.connect(masterGain)
		osc.start(now)
		osc.stop(now + 6.0)
	})
}

const chordProgression = [
	[220.00, 261.63, 329.63, 392.00], // Am7
	[174.61, 220.00, 261.63, 329.63], // Fmaj7
	[130.81, 164.81, 196.00, 246.94], // Cmaj7
	[196.00, 246.94, 293.66, 349.23], // G7
]
let chordIndex = 0

function toggleAmbientAudio() {
	initAudio()
	if (!audioCtx) return

	if (audioCtx.state === 'suspended') {
		audioCtx.resume()
	}

	isAudioPlaying = !isAudioPlaying
	const soundwaveEl = document.querySelector('#soundwave-anim')
	const audioLabelEl = document.querySelector('#audio-label')

	if (isAudioPlaying) {
		soundwaveEl?.classList.add('playing')
		if (audioLabelEl) audioLabelEl.textContent = 'Playing'
		playRomanticChord(chordProgression[chordIndex % chordProgression.length])
		chordIntervalId = setInterval(() => {
			chordIndex++
			playRomanticChord(chordProgression[chordIndex % chordProgression.length])
		}, 5500)
	} else {
		soundwaveEl?.classList.remove('playing')
		if (audioLabelEl) audioLabelEl.textContent = 'Music'
		if (chordIntervalId) {
			clearInterval(chordIntervalId)
			chordIntervalId = null
		}
	}
}

// Event Listeners for UI
let hasEntered = false

function enterMuseum() {
	if (!entranceReady || !selectedAvatarId) return
	hasEntered = true
	document.body.classList.add('in-sanctuary')
	overlayEl.hidden = true
	requestPlay()
	if (!isAudioPlaying) {
		toggleAmbientAudio()
	}
	queuePrebuildSalons(coupleCategories)
}

document.querySelector('#btn-enter-museum')?.addEventListener('click', enterMuseum)

// Resume pointer lock on canvas click if already entered and unlocked
canvas.addEventListener('click', () => {
	if (hasEntered && !document.pointerLockElement && lightboxEl.hidden && !document.body.classList.contains('studio-build-mode')) {
		requestPlay()
	}
})

document.querySelector('#btn-audio-toggle')?.addEventListener('click', (e) => {
	e.stopPropagation()
	toggleAmbientAudio()
})

document.querySelector('#btn-fullscreen-toggle')?.addEventListener('click', (e) => {
	e.stopPropagation()
	if (!document.fullscreenElement) {
		document.documentElement.requestFullscreen().catch(() => {})
	} else {
		document.exitFullscreen().catch(() => {})
	}
})

const params = new URLSearchParams(window.location.search)
const initialTitle = params.get('exhibit')
let engineApi = null

let lastEnteredLobbyCategory = null
let lastEnteredLobbyDoorId = null
let currentGalleryTitle = initialTitle || null

const lobby_title = 'Lobby'

let activeNavId = 0
let activeDoorLabelOverride = null

const trail_key_from_local_storage = 'ourmuseum:trail:v1'
const trail_maximum_length = 30

function loadTrailPersist() {
	try {
		const raw = window.localStorage.getItem(trail_key_from_local_storage)
		const parsed = JSON.parse(raw)
		const items = parsed.items ? parsed.items : parsed
		return items
			.map((t) => t.trim() || '')
			.filter(Boolean)
			.slice(-trail_maximum_length)
	} catch {
		return []
	}
}

function saveTrailPersist(trail) {
	const items = Array.isArray(trail) ? trail.slice(-trail_maximum_length) : []
	window.localStorage.setItem(trail_key_from_local_storage, JSON.stringify({ v: 1, items }))
}

let galleryTrail = loadTrailPersist()

function pushGalleryTrail(displayTitle) {
	const t = typeof displayTitle === 'string' ? displayTitle.trim() : ''
	if (!t) return
	const key = t.toLowerCase()
	const last = galleryTrail.length ? String(galleryTrail[galleryTrail.length - 1] || '') : ''
	if (last && last.toLowerCase() === key) return

	galleryTrail = [...galleryTrail, t]
	if (galleryTrail.length > trail_maximum_length) galleryTrail = galleryTrail.slice(-trail_maximum_length)
	saveTrailPersist(galleryTrail)
}

function setLoading(loading) {
	crosshairEl.classList.toggle('loading', Boolean(loading))
	if (engineApi && typeof engineApi.setInteractionLocked === 'function') {
		engineApi.setInteractionLocked(Boolean(loading))
	}
}

let historyIndex = 0

function setUrlAndState(title, { push = false } = {}) {
	const nextParams = new URLSearchParams(window.location.search)
	if (title) nextParams.set('exhibit', title)
	else nextParams.delete('exhibit')

	const q = nextParams.toString()
	const url = q ? `${window.location.pathname}?${q}` : window.location.pathname
	const nextState = { ourmuseum: true, idx: historyIndex, title: title || null }

	if (push) {
		historyIndex += 1
		nextState.idx = historyIndex
		window.history.pushState(nextState, '', url)
	} else {
		window.history.replaceState(nextState, '', url)
	}
}

function findCoupleSalon(title) {
	if (!title) return null
	if (coupleSalons[title]) return coupleSalons[title]
	const lower = String(title).toLowerCase().trim()
	for (const key of Object.keys(coupleSalons)) {
		if (key.toLowerCase().trim() === lower) return coupleSalons[key]
	}
	for (const key of Object.keys(coupleSalons)) {
		if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) return coupleSalons[key]
	}
	return null
}

async function loadAndEnterGallery(title, { pushHistory = false, spawn, updateUrlState = true, loadingDoorId = null } = {}) {
	if (activeDoorLabelOverride && engineApi && typeof engineApi.setDoorLabelOverride === 'function') {
		engineApi.setDoorLabelOverride(activeDoorLabelOverride.doorId, '')
		activeDoorLabelOverride = null
	}

	const navId = (activeNavId += 1)

	const salon = findCoupleSalon(title) || coupleSalons['Fireside Winter Memories']
	if (!salon) return

	currentGalleryTitle = salon.title
	lastEnteredLobbyCategory = salon.title
	try {
		window.sessionStorage.setItem('ourmuseum:lastSalon', salon.title)
	} catch (_) {}
	pushGalleryTrail(salon.title)
	const trailForBoard = galleryTrail.slice(-3)
	if (updateUrlState) {
		setUrlAndState(salon.title, { push: Boolean(pushHistory) })
	}
	if (engineApi && typeof engineApi.setRoom === 'function') {
		await engineApi.setRoom({
			roomMode: 'gallery',
			roomSeedTitle: salon.title,
			galleryEntryWall: 'south',
			galleryRelatedTitles: salon.seeAlso,
			galleryTitle: salon.title,
			galleryDescription: salon.extract,
			galleryMainThumbnailUrl: (salon.photos && salon.photos.length > 0) ? salon.photos[0] : null,
			galleryPhotos: salon.photos,
			galleryVideoUrl: null,
			galleryLongExtract: salon.longExtract,
			galleryTrail: trailForBoard,
			spawn,
		})
	}
	setLoading(false)
	if (engineApi && typeof engineApi.setInteractionLocked === 'function') {
		engineApi.setInteractionLocked(false)
	}
	if (salon && Array.isArray(salon.seeAlso)) {
		queuePrebuildSalons(salon.seeAlso)
	}
}

async function enterlobby({ push = false } = {}) {
	activeNavId += 1

	pushGalleryTrail(lobby_title)

	if (activeDoorLabelOverride && engineApi && typeof engineApi.setDoorLabelOverride === 'function') {
		engineApi.setDoorLabelOverride(activeDoorLabelOverride.doorId, '')
		activeDoorLabelOverride = null
	}

	setUrlAndState(null, { push })

	let returnSpawn = null
	let rememberedCat = null
	let rememberedDoorId = null
	try {
		rememberedCat = window.sessionStorage.getItem('ourmuseum:lastSalon')
		rememberedDoorId = window.sessionStorage.getItem('ourmuseum:lastDoorId')
	} catch (_) {}

	const targetCat =
		lastEnteredLobbyCategory ||
		(currentGalleryTitle && coupleCategories.find((c) => c.toLowerCase() === currentGalleryTitle.toLowerCase())) ||
		rememberedCat ||
		null

	const targetDoorId = lastEnteredLobbyDoorId || rememberedDoorId || null

	if (targetCat || targetDoorId) {
		returnSpawn = {
			type: 'atDoor',
			category: targetCat,
			doorId: targetDoorId,
		}
	} else {
		returnSpawn = {
			type: 'fromWall',
			wall: 'south',
		}
	}

	if (engineApi && typeof engineApi.setRoom === 'function') {
		await engineApi.setRoom({
			roomMode: 'lobby',
			lobbyCategories: coupleCategories,
			spawn: returnSpawn,
		})
	}
	currentGalleryTitle = null
	setLoading(false)
	if (engineApi && typeof engineApi.setInteractionLocked === 'function') {
		engineApi.setInteractionLocked(false)
	}
	queuePrebuildSalons(coupleCategories)
}

function goBackInApp() {
	setLoading(true)
	if (historyIndex > 0) {
		window.history.back()
		return
	}
	enterlobby({ push: false })
	setLoading(false)
}

function requestRandomExhibit() {
	const currentIdx = coupleCategories.indexOf(currentGalleryTitle)
	const pool = coupleCategories.filter((_, idx) => idx !== currentIdx)
	const randomCat = pool[Math.floor(Math.random() * pool.length)] || coupleCategories[0]
	loadAndEnterGallery(randomCat, {
		pushHistory: true,
		spawn: { type: 'fromWall', wall: 'south' },
	})
}

// Photo Lightbox Modal (Click-to-Enlarge Artworks - Pure Artwork View)
const lightboxEl = document.createElement('div')
lightboxEl.id = 'photo-lightbox-modal'
lightboxEl.className = 'photo-lightbox'
lightboxEl.hidden = true
lightboxEl.innerHTML = `
	<div class="photo-lightbox-backdrop"></div>
	<div class="photo-lightbox-content">
		<button class="photo-lightbox-close" title="Close (Esc)" aria-label="Close">✕</button>
		<div class="photo-lightbox-frame">
			<img class="photo-lightbox-img" src="" alt="Exhibition Artwork" />
		</div>
	</div>
`
document.body.appendChild(lightboxEl)

const lightboxImg = lightboxEl.querySelector('.photo-lightbox-img')
const lightboxCloseBtn = lightboxEl.querySelector('.photo-lightbox-close')
const lightboxBackdrop = lightboxEl.querySelector('.photo-lightbox-backdrop')

let lightboxOpenedAt = 0

function openPhotoLightbox({ url, title }) {
	if (!url) return
	lightboxImg.src = url
	lightboxEl.hidden = false
	lightboxEl.classList.add('active')
	lightboxOpenedAt = Date.now()
}

function closePhotoLightbox(force = false) {
	if (!force && Date.now() - lightboxOpenedAt < 250) {
		return
	}
	lightboxEl.classList.remove('active')
	lightboxEl.hidden = true
	lightboxImg.src = ''
}

lightboxCloseBtn.addEventListener('click', () => closePhotoLightbox(true))
lightboxBackdrop.addEventListener('click', () => closePhotoLightbox(false))
window.addEventListener('keydown', (e) => {
	if (e.key === 'Escape') {
		if (!lightboxEl.hidden) {
			closePhotoLightbox(true)
			return
		}
	}
	// Hotkeys for Music and Fullscreen while moving or unlocked
	if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
		return
	}
	if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
		toggleAmbientAudio()
		return
	}
	if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch(() => {})
		} else {
			document.exitFullscreen().catch(() => {})
		}
		return
	}
})

const initialSalon = initialTitle ? findCoupleSalon(initialTitle) : null
engineApi = startYourEngines({
	canvas,
	roomSeedTitle: initialTitle ?? 'Lobby',
	roomMode: initialTitle ? 'gallery' : 'lobby',
	roomSpawn: { type: 'fromWall', wall: 'south' },
	lobbyCategories: coupleCategories,
	galleryTitle: initialSalon?.title,
	galleryDescription: initialSalon?.extract,
	galleryPhotos: initialSalon?.photos,
	galleryMainThumbnailUrl: initialSalon?.photos?.[0],
	galleryLongExtract: initialSalon?.longExtract,
	galleryRelatedTitles: initialSalon?.seeAlso,
	onRandomExhibitRequested: requestRandomExhibit,
	onPhotoClick: openPhotoLightbox,
	onGoLobbyRequested() {
		setLoading(false)
		if (engineApi && typeof engineApi.setInteractionLocked === 'function') {
			engineApi.setInteractionLocked(false)
		}
		enterlobby({ push: true })
	},
	onPointerLockChange(locked) {
		if (!hasEntered) {
			overlayEl.hidden = locked
		} else {
			overlayEl.hidden = true
		}
		document.body.classList.toggle('locked', locked)
	},
	onDoorHover: preloadDoorPhotos,
	onDoorProximity: preloadDoorPhotos,
	onDoorTrigger(door) {
		withFadeTransition(async () => {
			if (door && (door.target === 'lobby' || door.target === 'back' || door.id === 'entry-door')) {
				setLoading(false)
				if (engineApi && typeof engineApi.setInteractionLocked === 'function') {
					engineApi.setInteractionLocked(false)
				}
				await enterlobby({ push: true })
				return
			}

			const doorTarget = (typeof door?.category === 'string' && door.category.length > 0)
				? door.category
				: (typeof door?.articleTitle === 'string' && door.articleTitle.trim().length > 0 ? door.articleTitle.trim() : null)

			if (doorTarget) {
				lastEnteredLobbyCategory = doorTarget
				lastEnteredLobbyDoorId = typeof door.id === 'string' ? door.id : null
				try {
					window.sessionStorage.setItem('ourmuseum:lastSalon', doorTarget)
					if (lastEnteredLobbyDoorId) {
						window.sessionStorage.setItem('ourmuseum:lastDoorId', lastEnteredLobbyDoorId)
					}
				} catch (_) {}
				await loadAndEnterGallery(doorTarget, {
					pushHistory: true,
					spawn: { type: 'fromWall', wall: 'south' },
					loadingDoorId: typeof door.id === 'string' ? door.id : null,
				})
				return
			}
		})
	},
})

window.__engineApi = engineApi
window.__loadAndEnterGallery = loadAndEnterGallery
window.__enterlobby = enterlobby

if (!initialTitle) {
	pushGalleryTrail(lobby_title)
}

setUrlAndState(initialTitle ? initialTitle : null, { push: false })

window.addEventListener('popstate', (e) => {
	const st = e?.state
	if (st && st.ourmuseum && typeof st.idx === 'number') {
		historyIndex = st.idx
	}

	const p = new URLSearchParams(window.location.search)
	const title = p.get('exhibit')

	if (title) {
		loadAndEnterGallery(title, {
			pushHistory: false,
			updateUrlState: false,
			spawn: { type: 'fromWall', wall: 'south' },
		})
		return
	}

	enterlobby({ push: false })
	setLoading(false)
})

async function prepareEntrance() {
	try {
		await engineApi.ready
		if (initialTitle) {
			await loadAndEnterGallery(initialTitle, {
				pushHistory: false,
				updateUrlState: false,
				spawn: { type: 'fromWall', wall: 'south' },
			})
		}
		if (assetsLoading) await new Promise((resolve) => { resolveAssetsLoaded = resolve })
		entranceStatus.textContent = 'Preparing the room for your visit…'
		await engineApi.renderer.compileAsync(engineApi.scene, engineApi.camera)
		engineApi.renderer.render(engineApi.scene, engineApi.camera)
		entranceReady = true
		entranceProgress.value = 100
		document.querySelector('#entrance-loading').setAttribute('aria-busy', 'false')
		entranceStatus.textContent = 'Your room is ready.'
		enterButton.hidden = true
		enterButton.disabled = true
		showAvatarSelection()
		queuePrebuildSalons(coupleCategories)
	} catch (error) {
		console.error('[Museum] Entrance loading failed:', error)
		entranceProgress.hidden = true
		document.querySelector('#entrance-loading').setAttribute('aria-busy', 'false')
		entranceStatus.textContent = 'The room could not finish loading. Please reload the page to try again.'
	}
}
void prepareEntrance()
