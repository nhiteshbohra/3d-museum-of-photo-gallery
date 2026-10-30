import './style.css'
import { startYourEngines } from './engine/engine.js'
import { coupleSalons, coupleCategories } from './data/coupleMuseum.js'
import { fetchGalleryRoomData, fetchGalleryRoomRelated, fetchWikipediaRandomTitle } from './wiki/wiki.js'
import { getArtworkSizes, saveArtworkSizes, resetArtworkSizes, DEFAULT_ARTWORK_SIZES } from './config/artworkSizes.js'

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
    <button id="btn-resizer-toggle" class="top-bar-btn" title="Adjust Artwork Sizes & Gaps Live (Press R)">
      <span>📐 Size</span>
      <span class="top-bar-key">R</span>
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
	if (e.key === 'Escape') {
		if (!lightboxEl.hidden) {
			closePhotoLightbox(true)
			return
		}
		const resizerDrawer = document.querySelector('#artwork-resizer-drawer')
		if (resizerDrawer && resizerDrawer.classList.contains('open')) {
			toggleResizerDrawer(false)
			return
		}
	}
	// Hotkeys for Music, Fullscreen, and Artwork Resizer while moving or unlocked
	if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
		return
	}
	if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
		toggleResizerDrawer()
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

// -------------------------------------------------------------------------
// LIVE ARTWORK RESIZER DRAWER HUD (Real-time 3D In-Place Rebuild)
// -------------------------------------------------------------------------
const resizerDrawerEl = document.createElement('div')
resizerDrawerEl.id = 'artwork-resizer-drawer'
resizerDrawerEl.innerHTML = `
	<div class="resizer-header">
		<div class="resizer-header-title">
			<span class="resizer-icon">📐</span>
			<div>
				<div class="resizer-title-text">Live Artwork Resizer</div>
				<div class="resizer-subtitle">Real-time Multi-Room Sizing</div>
			</div>
		</div>
		<button id="btn-resizer-close" class="resizer-close-btn" title="Close (R or Esc)">✕</button>
	</div>

	<div class="resizer-content">
		<!-- 1. EAST WALL -->
		<div class="resizer-card">
			<div class="resizer-card-header">
				<span class="resizer-card-title">1. East Wall (5 Sequential Art)</span>
				<span class="resizer-card-tag">All Salons</span>
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Width (m)</span>
					<span id="val-east-w" class="resizer-val-badge">1.70 m</span>
				</div>
				<input type="range" id="resizer-east-w" class="resizer-slider" min="0.8" max="3.0" step="0.05" value="1.70" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Height (m)</span>
					<span id="val-east-h" class="resizer-val-badge">1.55 m</span>
				</div>
				<input type="range" id="resizer-east-h" class="resizer-slider" min="0.6" max="2.4" step="0.05" value="1.55" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Spacing Gap (m)</span>
					<span id="val-east-gap" class="resizer-val-badge">0.30 m</span>
				</div>
				<input type="range" id="resizer-east-gap" class="resizer-slider" min="0.1" max="1.5" step="0.05" value="0.30" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Mounting Height Y (m)</span>
					<span id="val-east-y" class="resizer-val-badge">2.05 m</span>
				</div>
				<input type="range" id="resizer-east-y" class="resizer-slider" min="1.2" max="2.8" step="0.05" value="2.05" />
			</div>
		</div>

		<!-- 2. NORTH WALL MASTERPIECE -->
		<div class="resizer-card">
			<div class="resizer-card-header">
				<span class="resizer-card-title">2. North Wall Masterpiece</span>
				<span class="resizer-card-tag">Center Big</span>
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Width (m)</span>
					<span id="val-north-w" class="resizer-val-badge">4.50 m</span>
				</div>
				<input type="range" id="resizer-north-w" class="resizer-slider" min="1.2" max="5.0" step="0.05" value="4.50" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Height (m)</span>
					<span id="val-north-h" class="resizer-val-badge">3.00 m</span>
				</div>
				<input type="range" id="resizer-north-h" class="resizer-slider" min="0.8" max="3.5" step="0.05" value="3.00" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Mounting Height Y (m)</span>
					<span id="val-north-y" class="resizer-val-badge">2.40 m</span>
				</div>
				<input type="range" id="resizer-north-y" class="resizer-slider" min="1.2" max="3.2" step="0.05" value="2.40" />
			</div>
		</div>

		<!-- 3. SOUTH WALL GATE ARTWORKS -->
		<div class="resizer-card">
			<div class="resizer-card-header">
				<span class="resizer-card-title">3. South Wall (Gate Flanking)</span>
				<span class="resizer-card-tag">Left &amp; Right</span>
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Width (m)</span>
					<span id="val-south-w" class="resizer-val-badge">3.00 m</span>
				</div>
				<input type="range" id="resizer-south-w" class="resizer-slider" min="0.8" max="3.8" step="0.05" value="3.00" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Height (m)</span>
					<span id="val-south-h" class="resizer-val-badge">2.15 m</span>
				</div>
				<input type="range" id="resizer-south-h" class="resizer-slider" min="0.6" max="2.8" step="0.05" value="2.15" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Door Offset ±U (m)</span>
					<span id="val-south-u" class="resizer-val-badge">3.20 m</span>
				</div>
				<input type="range" id="resizer-south-u" class="resizer-slider" min="1.5" max="4.5" step="0.05" value="3.20" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Mounting Height Y (m)</span>
					<span id="val-south-y" class="resizer-val-badge">2.05 m</span>
				</div>
				<input type="range" id="resizer-south-y" class="resizer-slider" min="1.2" max="2.8" step="0.05" value="2.05" />
			</div>
		</div>

		<!-- 4. CENTER PARTITION -->
		<div class="resizer-card">
			<div class="resizer-card-header">
				<span class="resizer-card-title">4. Center Partition (Highlight)</span>
				<span class="resizer-card-tag">Front &amp; Back</span>
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Width (m)</span>
					<span id="val-center-w" class="resizer-val-badge">3.50 m</span>
				</div>
				<input type="range" id="resizer-center-w" class="resizer-slider" min="1.0" max="4.2" step="0.05" value="3.50" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Height (m)</span>
					<span id="val-center-h" class="resizer-val-badge">2.50 m</span>
				</div>
				<input type="range" id="resizer-center-h" class="resizer-slider" min="0.8" max="3.0" step="0.05" value="2.50" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Mounting Height Y (m)</span>
					<span id="val-center-y" class="resizer-val-badge">2.05 m</span>
				</div>
				<input type="range" id="resizer-center-y" class="resizer-slider" min="1.2" max="2.8" step="0.05" value="2.05" />
			</div>
		</div>

		<!-- 5. WEST WALL NARRATIVE BOARD -->
		<div class="resizer-card">
			<div class="resizer-card-header">
				<span class="resizer-card-title">5. West Wall (Narrative Board)</span>
				<span class="resizer-card-tag">Autofill Text</span>
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Width (m)</span>
					<span id="val-west-w" class="resizer-val-badge">6.60 m</span>
				</div>
				<input type="range" id="resizer-west-w" class="resizer-slider" min="3.0" max="8.5" step="0.1" value="6.60" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Height (m)</span>
					<span id="val-west-h" class="resizer-val-badge">3.00 m</span>
				</div>
				<input type="range" id="resizer-west-h" class="resizer-slider" min="1.5" max="3.8" step="0.05" value="3.00" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Mounting Height Y (m)</span>
					<span id="val-west-y" class="resizer-val-badge">2.30 m</span>
				</div>
				<input type="range" id="resizer-west-y" class="resizer-slider" min="1.2" max="2.8" step="0.05" value="2.30" />
			</div>
		</div>

		<!-- 6. GRAND LOBBY MASTERPIECE -->
		<div class="resizer-card">
			<div class="resizer-card-header">
				<span class="resizer-card-title">6. Grand Lobby Masterpiece</span>
				<span class="resizer-card-tag">South Wall</span>
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Width (m)</span>
					<span id="val-lobby-w" class="resizer-val-badge">6.00 m</span>
				</div>
				<input type="range" id="resizer-lobby-w" class="resizer-slider" min="2.0" max="7.0" step="0.1" value="6.00" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Height (m)</span>
					<span id="val-lobby-h" class="resizer-val-badge">2.85 m</span>
				</div>
				<input type="range" id="resizer-lobby-h" class="resizer-slider" min="1.2" max="3.8" step="0.05" value="2.85" />
			</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Mounting Height Y (m)</span>
					<span id="val-lobby-y" class="resizer-val-badge">3.25 m</span>
				</div>
				<input type="range" id="resizer-lobby-y" class="resizer-slider" min="1.2" max="4.0" step="0.05" value="3.25" />
			</div>
		</div>
			<div class="resizer-control-row">
				<div class="resizer-label-wrap">
					<span>Mounting Height Y (m)</span>
					<span id="val-lobby-y" class="resizer-val-badge">2.15 m</span>
				</div>
				<input type="range" id="resizer-lobby-y" class="resizer-slider" min="1.2" max="3.5" step="0.05" value="2.15" />
			</div>
		</div>
	</div>

	<div class="resizer-footer">
		<button id="btn-resizer-copy" class="btn-resizer-action btn-resizer-copy">
			<span>📋</span>
			<span>Copy Config Code</span>
		</button>
		<button id="btn-resizer-reset" class="btn-resizer-action btn-resizer-reset">
			<span>↺</span>
			<span>Reset to Factory Defaults</span>
		</button>
	</div>
`
document.body.appendChild(resizerDrawerEl)

const resizerToastEl = document.createElement('div')
resizerToastEl.className = 'resizer-toast'
resizerToastEl.innerHTML = `<span class="resizer-toast-icon">✨</span><span class="resizer-toast-msg"></span>`
document.body.appendChild(resizerToastEl)

let toastTimer = null
function showResizerToast(message) {
	if (toastTimer) clearTimeout(toastTimer)
	const msgEl = resizerToastEl.querySelector('.resizer-toast-msg')
	if (msgEl) msgEl.textContent = message
	resizerToastEl.classList.add('show')
	toastTimer = setTimeout(() => {
		resizerToastEl.classList.remove('show')
	}, 2800)
}

function updateResizerBadges(cfg) {
	const setVal = (id, val) => {
		const el = document.getElementById(id)
		if (el) el.textContent = `${Number(val).toFixed(2)} m`
	}
	setVal('val-east-w', cfg.eastWall.width)
	setVal('val-east-h', cfg.eastWall.height)
	setVal('val-east-gap', cfg.eastWall.gap)
	setVal('val-east-y', cfg.eastWall.y)

	setVal('val-north-w', cfg.northMasterpiece.width)
	setVal('val-north-h', cfg.northMasterpiece.height)
	setVal('val-north-y', cfg.northMasterpiece.y)

	setVal('val-south-w', cfg.southGateArtworks.width)
	setVal('val-south-h', cfg.southGateArtworks.height)
	setVal('val-south-u', cfg.southGateArtworks.doorOffsetU)
	setVal('val-south-y', cfg.southGateArtworks.y)

	setVal('val-center-w', cfg.centerPartition.width)
	setVal('val-center-h', cfg.centerPartition.height)
	setVal('val-center-y', cfg.centerPartition.y)

	setVal('val-west-w', cfg.westNarrativeBoard.width)
	setVal('val-west-h', cfg.westNarrativeBoard.height)
	setVal('val-west-y', cfg.westNarrativeBoard.y)

	setVal('val-lobby-w', cfg.lobbyMasterpiece.width)
	setVal('val-lobby-h', cfg.lobbyMasterpiece.height)
	setVal('val-lobby-y', cfg.lobbyMasterpiece.y)
}

function populateResizerInputs(cfg) {
	const setInput = (id, val) => {
		const el = document.getElementById(id)
		if (el) el.value = val
	}
	setInput('resizer-east-w', cfg.eastWall.width)
	setInput('resizer-east-h', cfg.eastWall.height)
	setInput('resizer-east-gap', cfg.eastWall.gap)
	setInput('resizer-east-y', cfg.eastWall.y)

	setInput('resizer-north-w', cfg.northMasterpiece.width)
	setInput('resizer-north-h', cfg.northMasterpiece.height)
	setInput('resizer-north-y', cfg.northMasterpiece.y)

	setInput('resizer-south-w', cfg.southGateArtworks.width)
	setInput('resizer-south-h', cfg.southGateArtworks.height)
	setInput('resizer-south-u', cfg.southGateArtworks.doorOffsetU)
	setInput('resizer-south-y', cfg.southGateArtworks.y)

	setInput('resizer-center-w', cfg.centerPartition.width)
	setInput('resizer-center-h', cfg.centerPartition.height)
	setInput('resizer-center-y', cfg.centerPartition.y)

	setInput('resizer-west-w', cfg.westNarrativeBoard.width)
	setInput('resizer-west-h', cfg.westNarrativeBoard.height)
	setInput('resizer-west-y', cfg.westNarrativeBoard.y)

	setInput('resizer-lobby-w', cfg.lobbyMasterpiece.width)
	setInput('resizer-lobby-h', cfg.lobbyMasterpiece.height)
	setInput('resizer-lobby-y', cfg.lobbyMasterpiece.y)
}

let resizerDebounceTimer = null
function handleSliderChange() {
	const currentSizes = {
		eastWall: {
			count: 5,
			width: parseFloat(document.getElementById('resizer-east-w').value),
			height: parseFloat(document.getElementById('resizer-east-h').value),
			gap: parseFloat(document.getElementById('resizer-east-gap').value),
			y: parseFloat(document.getElementById('resizer-east-y').value),
		},
		northMasterpiece: {
			width: parseFloat(document.getElementById('resizer-north-w').value),
			height: parseFloat(document.getElementById('resizer-north-h').value),
			y: parseFloat(document.getElementById('resizer-north-y').value),
		},
		southGateArtworks: {
			width: parseFloat(document.getElementById('resizer-south-w').value),
			height: parseFloat(document.getElementById('resizer-south-h').value),
			doorOffsetU: parseFloat(document.getElementById('resizer-south-u').value),
			y: parseFloat(document.getElementById('resizer-south-y').value),
		},
		centerPartition: {
			width: parseFloat(document.getElementById('resizer-center-w').value),
			height: parseFloat(document.getElementById('resizer-center-h').value),
			y: parseFloat(document.getElementById('resizer-center-y').value),
		},
		westNarrativeBoard: {
			width: parseFloat(document.getElementById('resizer-west-w').value),
			height: parseFloat(document.getElementById('resizer-west-h').value),
			y: parseFloat(document.getElementById('resizer-west-y').value),
		},
		lobbyMasterpiece: {
			width: parseFloat(document.getElementById('resizer-lobby-w').value),
			height: parseFloat(document.getElementById('resizer-lobby-h').value),
			y: parseFloat(document.getElementById('resizer-lobby-y').value),
		},
	}

	updateResizerBadges(currentSizes)
	saveArtworkSizes(currentSizes)

	if (resizerDebounceTimer) clearTimeout(resizerDebounceTimer)
	resizerDebounceTimer = setTimeout(() => {
		if (engineApi && typeof engineApi.reloadRoomInPlace === 'function') {
			engineApi.reloadRoomInPlace()
		}
	}, 60)
}

function toggleResizerDrawer(forceOpen) {
	const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !resizerDrawerEl.classList.contains('open')
	if (shouldOpen) {
		if (document.pointerLockElement) {
			document.exitPointerLock()
		}
		const activeSizes = getArtworkSizes()
		populateResizerInputs(activeSizes)
		updateResizerBadges(activeSizes)
		resizerDrawerEl.classList.add('open')
	} else {
		resizerDrawerEl.classList.remove('open')
	}
}

// Bind drawer controls
const initialSizes = getArtworkSizes()
populateResizerInputs(initialSizes)
updateResizerBadges(initialSizes)

resizerDrawerEl.querySelectorAll('.resizer-slider').forEach((slider) => {
	slider.addEventListener('input', handleSliderChange)
})

document.getElementById('btn-resizer-close')?.addEventListener('click', () => toggleResizerDrawer(false))
document.getElementById('btn-resizer-toggle')?.addEventListener('click', () => toggleResizerDrawer())

document.getElementById('btn-resizer-copy')?.addEventListener('click', () => {
	const current = getArtworkSizes()
	const jsSnippet = `export const DEFAULT_ARTWORK_SIZES = {
	// 1. East Wall - 5 Sequential Artworks
	eastWall: {
		count: 5,
		width: ${current.eastWall.width.toFixed(2)},
		height: ${current.eastWall.height.toFixed(2)},
		gap: ${current.eastWall.gap.toFixed(2)},
		y: ${current.eastWall.y.toFixed(2)},
	},

	// 2. North Wall - Masterpiece Artwork (Centered above bench)
	northMasterpiece: {
		width: ${current.northMasterpiece.width.toFixed(2)},
		height: ${current.northMasterpiece.height.toFixed(2)},
		y: ${current.northMasterpiece.y.toFixed(2)},
	},

	// 3. South Wall - Flanking Artworks (Left & Right of gate)
	southGateArtworks: {
		width: ${current.southGateArtworks.width.toFixed(2)},
		height: ${current.southGateArtworks.height.toFixed(2)},
		doorOffsetU: ${current.southGateArtworks.doorOffsetU.toFixed(2)},
		y: ${current.southGateArtworks.y.toFixed(2)},
	},

	// 4. Center Divider Partition - Highlight Artworks
	centerPartition: {
		width: ${current.centerPartition.width.toFixed(2)},
		height: ${current.centerPartition.height.toFixed(2)},
		y: ${current.centerPartition.y.toFixed(2)},
	},

	// 5. West Wall - Autofilled Narrative Memory Text Board
	westNarrativeBoard: {
		width: ${current.westNarrativeBoard.width.toFixed(2)},
		height: ${current.westNarrativeBoard.height.toFixed(2)},
		y: ${current.westNarrativeBoard.y.toFixed(2)},
	},

	// 6. Grand Lobby - South Wall Masterpiece
	lobbyMasterpiece: {
		width: ${current.lobbyMasterpiece.width.toFixed(2)},
		height: ${current.lobbyMasterpiece.height.toFixed(2)},
		y: ${current.lobbyMasterpiece.y.toFixed(2)},
	},
}`
	navigator.clipboard.writeText(jsSnippet).then(() => {
		showResizerToast('✓ Config code copied to clipboard!')
	}).catch(() => {
		showResizerToast('📋 Config prepared!')
	})
})

document.getElementById('btn-resizer-reset')?.addEventListener('click', () => {
	const resetSizes = resetArtworkSizes()
	populateResizerInputs(resetSizes)
	updateResizerBadges(resetSizes)
	showResizerToast('↺ Reset all sizes to factory defaults!')
	if (engineApi && typeof engineApi.reloadRoomInPlace === 'function') {
		engineApi.reloadRoomInPlace()
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
