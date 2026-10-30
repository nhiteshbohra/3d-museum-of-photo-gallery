import './style.css'
import { startYourEngines } from './engine/engine.js'
import { coupleSalons, coupleCategories } from './data/coupleMuseum.js'
import { fetchGalleryRoomData, fetchGalleryRoomRelated, fetchWikipediaRandomTitle } from './wiki/wiki.js'

const app = document.querySelector('#app');
app.innerHTML = `
  <div id="top-bar">
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

      <button id="btn-enter-museum" class="btn-enter">
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
	hasEntered = true
	document.body.classList.add('in-sanctuary')
	overlayEl.hidden = true
	requestPlay()
	if (!isAudioPlaying) {
		toggleAmbientAudio()
	}
}

document.querySelector('#btn-enter-museum')?.addEventListener('click', enterMuseum)

// Resume pointer lock on canvas click if already entered and unlocked
canvas.addEventListener('click', () => {
	if (hasEntered && !document.pointerLockElement && lightboxEl.hidden) {
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

const lobby_title = 'Lobby'

let wikiAbortController = null
let randomAbortController = null
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

function loadAndEnterGallery(title, { pushHistory = false, spawn, updateUrlState = true, loadingDoorId = null } = {}) {
	if (activeDoorLabelOverride && engineApi && typeof engineApi.setDoorLabelOverride === 'function') {
		engineApi.setDoorLabelOverride(activeDoorLabelOverride.doorId, '')
		activeDoorLabelOverride = null
	}

	if (wikiAbortController) wikiAbortController.abort()
	wikiAbortController = new AbortController()
	const navId = (activeNavId += 1)

	setLoading(true)

	const doorId = typeof loadingDoorId === 'string' ? loadingDoorId : ''
	if (doorId && engineApi && typeof engineApi.setDoorLabelOverride === 'function') {
		engineApi.setDoorLabelOverride(doorId, 'Loading...')
		activeDoorLabelOverride = { doorId, navId }
	}

	if (coupleSalons[title]) {
		const salon = coupleSalons[title]
		pushGalleryTrail(salon.title)
		const trailForBoard = galleryTrail.slice(-3)
		if (updateUrlState) {
			setUrlAndState(title, { push: Boolean(pushHistory) })
		}
		if (engineApi && typeof engineApi.setRoom === 'function') {
			engineApi.setRoom({
				roomMode: 'gallery',
				roomSeedTitle: title,
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
			setTimeout(() => {
				for (let i = 0; i < salon.seeAlso.length; i += 1) {
					const doorId = `seealso-${i}`
					const t = salon.seeAlso[i]
					if (engineApi && typeof engineApi.setDoorMeta === 'function' && typeof engineApi.setDoorLabelOverride === 'function') {
						engineApi.setDoorMeta(doorId, { articleTitle: t })
						engineApi.setDoorLabelOverride(doorId, t)
					}
				}
			}, 100)
		}
		setLoading(false)
		return
	}

	fetchGalleryRoomData(title, { signal: wikiAbortController.signal })
		.then((data) => {
			if (navId !== activeNavId) return

			function pickRelatedTitles(items) {
				const pool = Array.isArray(items)
					? items
						.map((p) => (p && typeof p.title === 'string' ? p.title : ''))
						.map((t) => t.trim())
						.filter(Boolean)
					: []

				const seen = new Set()
				const uniquePool = []
				for (const t of pool) {
					const k = t.toLowerCase()
					if (seen.has(k)) continue
					seen.add(k)
					uniquePool.push(t)
				}

				for (let i = uniquePool.length - 1; i > 0; i -= 1) {
					const j = Math.floor(Math.random() * (i + 1))
					const tmp = uniquePool[i]
					uniquePool[i] = uniquePool[j]
					uniquePool[j] = tmp
				}

				return uniquePool.slice(0, 6)
			}

			const displayTitle = typeof data?.room?.title === 'string' ? data.room.title : title
			pushGalleryTrail(displayTitle)
			const trailForBoard = galleryTrail.slice(-3)
			const relatedTitles = pickRelatedTitles(data?.seeAlso)

			if (updateUrlState) {
				setUrlAndState(title, { push: Boolean(pushHistory) })
			}

			if (engineApi && typeof engineApi.setRoom === 'function') {
				engineApi.setRoom({
					roomMode: 'gallery',
					roomSeedTitle: title,
					galleryEntryWall: 'south',
					galleryRelatedTitles: relatedTitles,
					galleryTitle: displayTitle,
					galleryDescription: typeof data?.room?.extract === 'string' ? data.room.extract : '',
					galleryMainThumbnailUrl: typeof data?.mainThumbnailUrl === 'string' ? data.mainThumbnailUrl : null,
					galleryPhotos: Array.isArray(data?.photos) ? data.photos : [],
					galleryVideoUrl: typeof data?.videoUrl === 'string' ? data.videoUrl : null,
					galleryLongExtract: typeof data?.longExtract === 'string' ? data.longExtract : '',
					galleryTrail: trailForBoard,
					spawn,
				})
			}

			fetchGalleryRoomRelated(displayTitle, { signal: wikiAbortController.signal })
				.then((items) => {
					if (navId !== activeNavId) return

					const titles = pickRelatedTitles(items)
					if (!engineApi) return
					if (typeof engineApi.setDoorMeta !== 'function' || typeof engineApi.setDoorLabelOverride !== 'function') return

					for (let i = 0; i < 6; i += 1) {
						const doorId = `seealso-${i}`
						const t = typeof titles[i] === 'string' ? titles[i].trim() : ''
						if (!t) continue
						engineApi.setDoorMeta(doorId, { articleTitle: t })
						engineApi.setDoorLabelOverride(doorId, t)
					}
				})
				.catch((err) => {
					if (err && err.code === 'aborted') return
				})
		})
		.catch((err) => {
			if (err && err.code === 'aborted') return
			console.warn('[OurMuseum] Wiki fetch failed', err)
		})
		.finally(() => {
			if (navId !== activeNavId) return
			if (activeDoorLabelOverride && activeDoorLabelOverride.navId === navId && engineApi && typeof engineApi.setDoorLabelOverride === 'function') {
				engineApi.setDoorLabelOverride(activeDoorLabelOverride.doorId, '')
				activeDoorLabelOverride = null
			}
			setLoading(false)
		})
}

function enterlobby({ push = false } = {}) {
	if (wikiAbortController) {
		wikiAbortController.abort()
		wikiAbortController = null
	}
	activeNavId += 1

	pushGalleryTrail(lobby_title)

	if (activeDoorLabelOverride && engineApi && typeof engineApi.setDoorLabelOverride === 'function') {
		engineApi.setDoorLabelOverride(activeDoorLabelOverride.doorId, '')
		activeDoorLabelOverride = null
	}

	setUrlAndState(null, { push })
	if (engineApi && typeof engineApi.setRoom === 'function') {
		engineApi.setRoom({
			roomMode: 'lobby',
			lobbyCategories: coupleCategories,
			spawn: {
				type: 'fromWall',
				wall: 'south'
			}
		})
	}
	setLoading(false)
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
	if (randomAbortController) {
		randomAbortController.abort()
		randomAbortController = null
	}

	setLoading(true)
	randomAbortController = new AbortController()
	const signal = randomAbortController.signal

	fetchWikipediaRandomTitle({ signal, allow_disambiguation: false })
		.then((title) => {
			if (signal.aborted) return
			loadAndEnterGallery(title, {
				pushHistory: true,
				spawn: { type: 'fromWall', wall: 'south' },
			})
		})
		.catch((err) => {
			if (err && err.code === 'aborted') return
			console.warn('[OurMuseum] Random exhibit failed', err)
			setLoading(false)
		})
}

// Photo Lightbox Modal (Click-to-Enlarge Artworks)
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
		<div class="photo-lightbox-meta">
			<div class="photo-lightbox-badge">✦ SANCTUARY EXHIBITION ✦</div>
			<div class="photo-lightbox-title"></div>
			<div class="photo-lightbox-hint">Click outside or press [ESC] to return to gallery</div>
		</div>
	</div>
`
document.body.appendChild(lightboxEl)

const lightboxImg = lightboxEl.querySelector('.photo-lightbox-img')
const lightboxTitle = lightboxEl.querySelector('.photo-lightbox-title')
const lightboxCloseBtn = lightboxEl.querySelector('.photo-lightbox-close')
const lightboxBackdrop = lightboxEl.querySelector('.photo-lightbox-backdrop')

let lightboxOpenedAt = 0

function openPhotoLightbox({ url, title }) {
	if (!url) return
	lightboxImg.src = url
	lightboxTitle.textContent = title || 'Our Museum Masterpiece'
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
	if (e.key === 'Escape' && !lightboxEl.hidden) {
		closePhotoLightbox(true)
		return
	}
	// Hotkeys for Music and Fullscreen while moving or unlocked
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

engineApi = startYourEngines({
	canvas,
	roomSeedTitle: initialTitle ?? 'Lobby',
	roomMode: initialTitle ? 'gallery' : 'lobby',
	roomSpawn: { type: 'fromWall', wall: 'south' },
	lobbyCategories: coupleCategories,
	onRandomExhibitRequested: requestRandomExhibit,
	onPhotoClick: openPhotoLightbox,
	onGoLobbyRequested() {
		enterlobby({ push: false })
	},
	onPointerLockChange(locked) {
		if (!hasEntered) {
			overlayEl.hidden = locked
		} else {
			overlayEl.hidden = true
		}
		document.body.classList.toggle('locked', locked)
	},
	onDoorTrigger(door) {
		if (door && typeof door.category === 'string' && door.category.length > 0) {
			loadAndEnterGallery(door.category, {
				pushHistory: true,
				spawn: { type: 'fromWall', wall: 'south' },
				loadingDoorId: typeof door.id === 'string' ? door.id : null,
			})
			return
		}

		if (door && typeof door.articleTitle === 'string' && door.articleTitle.trim().length > 0) {
			const title = door.articleTitle.trim()
			loadAndEnterGallery(title, {
				pushHistory: true,
				spawn: { type: 'fromWall', wall: 'south' },
				loadingDoorId: typeof door.id === 'string' ? door.id : null,
			})
			return
		}

		if (door && door.target === 'back') {
			goBackInApp()
			return
		}

		if (door && door.target === 'lobby') {
			enterlobby({ push: true })
			return
		}
	},
})

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

if (initialTitle) {
	loadAndEnterGallery(initialTitle, {
		pushHistory: false,
		updateUrlState: false,
		spawn: { type: 'fromWall', wall: 'south' },
	})
}
