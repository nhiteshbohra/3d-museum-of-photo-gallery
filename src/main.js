import './style.css'
import { DefaultLoadingManager } from 'three'
import { startYourEngines } from './engine/engine.js'
import { coupleSalons, coupleCategories, ROOM_KEY_TO_TITLE } from './data/coupleMuseum.js'
import { getArtworkSizes } from './config/artworkSizes.js'
import charactersJson from './data/characters.json'
import { initMultiplayer } from './avatars/multiplayer.js'
import { createCharacterSetup } from './avatars/characterSetup.js'
import { ACTION_CATEGORIES, ACTIONS, getActionById, getActionsByCategory } from './avatars/actionManifest.js'

// Build the avatar roster from characters.json
const charRoster = (charactersJson?.roster || []).slice(0, 2)
const AVATARS = charRoster

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
    <button id="btn-chat-toggle" class="top-bar-btn" title="Messages (Press Enter or T)">
      <span>💬 Message</span>
      <span class="top-bar-key">Enter</span>
    </button>
    <div id="camera-hud-group" class="top-bar-group" hidden>
      <button id="btn-camera-toggle" class="top-bar-btn" title="Toggle 360° Free Orbit / Follow (Press C)">
        <span id="camera-mode-icon">👁️</span>
        <span id="camera-mode-label">Orbit 360°</span>
        <span class="top-bar-key">C</span>
      </button>
      <button id="btn-camera-front" class="top-bar-btn" title="Front View - Look directly at avatar face (Press V)">
        <span>👤 Front</span>
        <span class="top-bar-key">V</span>
      </button>
      <button id="btn-camera-reset" class="top-bar-btn" title="Reset Camera to Behind View (Press R)">
        <span>↺ Reset</span>
        <span class="top-bar-key">R</span>
      </button>
      <button id="btn-animations-toggle" class="top-bar-btn" title="Approved Gestures & Animations (Press G)">
        <span>✨ Gestures</span>
        <span class="top-bar-key">G</span>
      </button>
    </div>
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

      <div id="invite-box" class="invite-box">
        <div id="invite-input-row" class="invite-input-row">
          <input id="invite-code-input" class="invite-code-input" type="text" placeholder="Passcode (e.g. maya-love)" autocomplete="off" />
          <button id="btn-redeem-invite" class="btn-redeem-invite" type="button">Verify Pass</button>
        </div>
        <div id="invite-status" class="invite-status" role="status"></div>
      </div>

      <div id="entrance-loading" aria-busy="true" hidden>
        <progress id="entrance-progress" max="100" value="0" aria-label="Loading museum"></progress>
        <p id="entrance-status" role="status">Preparing your museum…</p>
      </div>

      <div id="avatar-select" hidden>
        <div id="avatar-grid"></div>
      </div>
      <button id="btn-enter-museum" class="btn-enter" hidden aria-describedby="entrance-status">
        <span class="btn-enter-sparkle">✦</span>
        <span>ENTER SANCTUARY</span>
        <span class="btn-enter-sparkle">✦</span>
      </button>

      <div id="mobile-notice" class="mobile-notice" style="display:none;">
        <p class="mobile-notice-text">🖥️ Best experienced on a computer with a keyboard and mouse.</p>
        <button id="btn-mobile-continue" type="button" class="btn-mobile-continue">Continue anyway</button>
      </div>

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

    <!-- Right-Side Animations & Interactions Drawer -->
    <div id="hud-animations-drawer" class="hud-animations-drawer" aria-label="Animations Menu" aria-hidden="true">
      <div class="anim-drawer-header">
        <span class="anim-drawer-title">✦ Gestures &amp; Actions ✦</span>
        <button id="btn-close-anim-drawer" class="anim-drawer-close" type="button" aria-label="Close menu">✕</button>
      </div>

      <!-- Active Status Bar -->
      <div id="anim-status-bar" class="anim-status-bar" style="display:none;">
        <div class="anim-status-text">
          <span class="anim-status-dot"></span>
          <span id="anim-status-label">Playing: Energetic Dance</span>
        </div>
        <button id="btn-stop-anim" class="btn-stop-anim" type="button">■ Stop</button>
      </div>

      <!-- Search Box -->
      <div class="anim-search-box">
        <span class="anim-search-icon">🔍</span>
        <input id="action-search" class="anim-search-input" type="search" placeholder="Search 20 actions (wave, dance, sit...)" aria-label="Search actions" />
      </div>

      <!-- Category Navigation Tabs -->
      <div id="anim-tabs" class="anim-tabs" role="tablist"></div>

      <!-- Contextual Seat Banner (in Sofa / Chair tab or when near seat) -->
      <div id="seat-context-banner" class="seat-context-banner" style="display:none;">
        <div class="seat-context-info">
          <span id="seat-context-title" class="seat-context-title">Nearby Furniture</span>
          <span id="seat-context-desc" class="seat-context-desc">Walk close to a sofa or chair to rest</span>
        </div>
        <button id="btn-seat-context-action" class="btn-seat-action" type="button">Sit Down (E)</button>
      </div>

      <!-- Cards Grid Container -->
      <div class="anim-cards-container">
        <div id="anim-drawer-grid" class="anim-drawer-grid"></div>
      </div>

      <div class="anim-drawer-footer">
        Press <strong>G</strong> or <strong>Esc</strong> to close · Keys <strong>1-3</strong> for quick emotes
      </div>
    </div>

    <!-- Right-Side Chat / Messages Drawer -->
    <div id="hud-chat-drawer" class="hud-chat-drawer" aria-label="Messages" aria-hidden="true">
      <div class="chat-drawer-header">
        <div class="chat-header-title-row">
          <span class="chat-drawer-title">✦ Sanctuary Messages ✦</span>
          <span id="chat-partner-badge" class="chat-status-badge">● Active</span>
        </div>
        <button id="btn-close-chat-drawer" class="anim-drawer-close" type="button" aria-label="Close messages">✕</button>
      </div>

      <!-- Messages History Container -->
      <div id="chat-messages-container" class="chat-messages-container">
        <div id="chat-messages-list" class="chat-messages-list">
          <div class="chat-empty-hint">Whisper a romantic thought or note to Maya &amp; Ethan below…</div>
        </div>
      </div>

      <!-- Chat Input Area -->
      <form id="chat-drawer-form" class="chat-drawer-form" autocomplete="off">
        <input id="chat-drawer-input" class="chat-drawer-input" type="text" placeholder="Send a message to your partner…" maxlength="140" />
        <button id="btn-send-chat" class="btn-send-chat" type="submit" aria-label="Send message">➤</button>
      </form>
    </div>

    <!-- Floating Toast Notification Banner -->
    <div id="chat-toast-banner" class="chat-toast-banner" style="display:none;" aria-live="polite">
      <span class="chat-toast-icon">💬</span>
      <div class="chat-toast-content">
        <span id="chat-toast-sender" class="chat-toast-sender"></span>
        <span id="chat-toast-text" class="chat-toast-text"></span>
      </div>
    </div>

    <!-- Floating On-Screen Contextual Seating Prompt (Milestone M8) -->
    <div id="hud-seat-prompt" class="hud-seat-prompt" style="display:none;" aria-live="polite" role="button" tabindex="0">
      <span class="hud-seat-icon">🛋️</span>
      <span id="hud-seat-text" class="hud-seat-text">Sit on Sofa</span>
      <span id="hud-seat-badge" class="hud-seat-badge">Press E</span>
    </div>
  </div>

  <div id="mobile-controls" aria-hidden="true">
    <div id="virtual-joystick-zone" class="virtual-joystick-zone">
      <div id="joystick-base" class="joystick-base">
        <div id="joystick-thumb" class="joystick-thumb"></div>
      </div>
    </div>
    <div id="touch-look-zone" class="touch-look-zone"></div>
    <div id="mobile-action-buttons" class="mobile-action-buttons">
      <button id="btn-touch-jump" class="mobile-btn" type="button" aria-label="Jump">JUMP</button>
      <button id="btn-touch-sit" class="mobile-btn" type="button" aria-label="Sit or Stand">SIT</button>
      <button id="btn-touch-orbit" class="mobile-btn" type="button" aria-label="Orbit 360">👁️ 360°</button>
      <button id="btn-touch-front" class="mobile-btn" type="button" aria-label="Front View">👤 FACE</button>
      <button id="btn-touch-chat" class="mobile-btn" type="button" aria-label="Chat">💬</button>
      <button id="btn-touch-emotes" class="mobile-btn" type="button" aria-label="Emotes">✨</button>
    </div>
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

// Core Application & Navigation State (hoisted to prevent TDZ)
const params = new URLSearchParams(window.location.search)
const initialTitle = params.get('exhibit')
let engineApi = null
let multiplayer = null
let museumStarted = false
let hasEntered = false
let inviteRequired = true // Default to true (fail-closed) until server /api/config confirms otherwise
let inviteConfigChecked = false
let lastEnteredLobbyCategory = null
let lastEnteredLobbyDoorId = null
let currentGalleryTitle = initialTitle || null
const lobby_title = 'Lobby'
let activeNavId = 0
let activeDoorLabelOverride = null
let historyIndex = 0
let popstateBound = false

// Mobile touch-device notice (UX-01)
const isTouchDevice = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches
const mobileNoticeEl = document.querySelector('#mobile-notice')
const mobileContinueBtn = document.querySelector('#btn-mobile-continue')
if (isTouchDevice && mobileNoticeEl) {
	try {
		if (!sessionStorage.getItem('dismiss_mobile_notice')) {
			mobileNoticeEl.style.display = 'block'
		}
	} catch {
		mobileNoticeEl.style.display = 'block'
	}
	mobileContinueBtn?.addEventListener('click', () => {
		mobileNoticeEl.style.display = 'none'
		try { sessionStorage.setItem('dismiss_mobile_notice', '1') } catch {}
	})
}

// ---- PRIVATE INVITATION EXCHANGE (AUTH-01, Q2, Q6) ----
// The server issues an HttpOnly museum_session cookie on successful redemption;
// that cookie is sent automatically on both HTTP requests and the WS upgrade,
// so gating entrance on a successful redemption protects private content and
// authenticates the multiplayer join.
// =========================================================================
// AUTHENTICATION UI STATE MACHINE (AUTH-NEW-01, AUTH-NEW-02, AUTH-NEW-03, AUTH-NEW-04)
// Single authoritative click dispatcher, zero credential leakage in DOM,
// explicit mutual exclusion between verifying, verified, and entered.
// =========================================================================
const inviteCodeInput = document.querySelector('#invite-code-input')
const redeemBtn = document.querySelector('#btn-redeem-invite')
const inviteStatusEl = document.querySelector('#invite-status')
const inviteInputRow = document.querySelector('#invite-input-row')
let inviteRedeemed = false
let lastInviteRecipient = null

const AUTH_STATE = {
	UNVERIFIED: 'UNVERIFIED',
	VERIFYING: 'VERIFYING',
	VERIFIED: 'VERIFIED',
	STARTING: 'STARTING',
	IN_SANCTUARY: 'IN_SANCTUARY',
}
let currentAuthState = AUTH_STATE.UNVERIFIED

function setInviteStatus(msg, ok) {
	if (!inviteStatusEl) return
	inviteStatusEl.textContent = msg
	inviteStatusEl.classList.toggle('ok', !!ok)
	inviteStatusEl.classList.toggle('error', !ok)
}

function updateAuthState(newState, payload = {}) {
	currentAuthState = newState
	if (!redeemBtn) return

	switch (newState) {
		case AUTH_STATE.UNVERIFIED:
			if (inviteInputRow) {
				inviteInputRow.hidden = false
				inviteInputRow.style.display = ''
			}
			redeemBtn.disabled = false
			redeemBtn.textContent = 'Verify Pass'
			if (inviteCodeInput) {
				inviteCodeInput.removeAttribute('readonly')
			}
			break

		case AUTH_STATE.VERIFYING:
			if (inviteInputRow) {
				inviteInputRow.hidden = false
				inviteInputRow.style.display = ''
			}
			redeemBtn.disabled = true
			redeemBtn.textContent = 'Verifying…'
			break

		case AUTH_STATE.VERIFIED:
			if (inviteInputRow) {
				inviteInputRow.hidden = false
				inviteInputRow.style.display = ''
			}
			redeemBtn.disabled = false
			redeemBtn.textContent = 'Enter Sanctuary →'
			if (inviteCodeInput) {
				inviteCodeInput.setAttribute('readonly', 'readonly')
				inviteCodeInput.value = ''
				inviteCodeInput.placeholder = '✦ Verified Session Active ✦'
			}
			break

		case AUTH_STATE.STARTING:
			if (inviteInputRow) {
				inviteInputRow.hidden = true
				inviteInputRow.style.display = 'none'
			}
			redeemBtn.disabled = true
			redeemBtn.textContent = 'Entering…'
			break

		case AUTH_STATE.IN_SANCTUARY:
			if (inviteInputRow) {
				inviteInputRow.hidden = true
				inviteInputRow.style.display = 'none'
			}
			redeemBtn.disabled = true
			break
	}
}

async function handleRedeemButtonClick() {
	if (currentAuthState === AUTH_STATE.UNVERIFIED) {
		await redeemInviteCode()
	} else if (currentAuthState === AUTH_STATE.VERIFIED) {
		await enterSanctuaryFromPass()
	}
}

async function enterSanctuaryFromPass() {
	if (museumStarted) return
	updateAuthState(AUTH_STATE.STARTING)
	const entranceLoadingEl = document.querySelector('#entrance-loading')
	if (entranceLoadingEl) {
		entranceLoadingEl.removeAttribute('hidden')
		entranceLoadingEl.style.display = 'block'
	}
	try {
		await loadPrivateLetters()
		await startMuseumExperience()
	} catch (err) {
		console.error('[Experience Boot Error]', err)
		museumStarted = false
		updateAuthState(AUTH_STATE.VERIFIED)
		setInviteStatus('Could not enter sanctuary. Please try again.', false)
	}
}

async function redeemInviteCode() {
	if (currentAuthState === AUTH_STATE.VERIFYING || currentAuthState === AUTH_STATE.STARTING) return
	const code = (inviteCodeInput?.value || '').trim()
	if (!code) {
		setInviteStatus('Please enter your private pass / invitation code.', false)
		return
	}
	updateAuthState(AUTH_STATE.VERIFYING)
	let data = null
	try {
		const res = await fetch('/api/invite/redeem', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code }),
		})
		data = await res.json().catch(() => ({ ok: false }))
		if (!res.ok || !data.ok) {
			inviteRedeemed = false
			updateAuthState(AUTH_STATE.UNVERIFIED)
			setInviteStatus((data && data.error) || 'Invitation could not be verified.', false)
			return
		}
	} catch (netErr) {
		inviteRedeemed = false
		updateAuthState(AUTH_STATE.UNVERIFIED)
		setInviteStatus('Could not reach the server. Please check if the server is running on port 8080.', false)
		return
	}

	inviteRedeemed = true
	lastInviteRecipient = data.recipient || null
	try {
		window.sessionStorage.setItem('ourmuseum:lastCode', code)
		if (data.sessionToken) window.sessionStorage.setItem('ourmuseum:sessionToken', data.sessionToken)
	} catch (_) {}
	window.__museumAuthenticated = true
	window.__museumSessionToken = true
	setInviteStatus(`✦ Pass Verified: Welcome, ${data.recipient || 'Beloved Visitor'} ✦`, true)
	updateAuthState(AUTH_STATE.VERIFIED)

	// Pre-select avatar matching recipient
	if (data.recipient && Array.isArray(AVATARS)) {
		const recLower = String(data.recipient).toLowerCase()
		const match = AVATARS.find(a => a.name && a.name.toLowerCase() === recLower) ||
		              (recLower.includes('ethan') && !recLower.includes('maya') ? AVATARS.find(a => a.id === 'ethan') : null) ||
		              AVATARS.find(a => a.id === 'maya') || AVATARS[0]
		if (match) {
			selectedAvatarId = match.id
			if (characterSetup && typeof selectAvatar === 'function') {
				selectAvatar(match.id)
			}
		}
	}

	await enterSanctuaryFromPass()
}

async function loadPrivateLetters() {
	try {
		const res = await fetch('/api/letters')
		if (res.ok) {
			const data = await res.json()
			if (data && data.letters) {
				for (const [title, letterEntry] of Object.entries(data.letters)) {
					if (coupleSalons[title]) {
						let text = ''
						if (typeof letterEntry === 'string') {
							text = letterEntry
						} else if (letterEntry && typeof letterEntry === 'object') {
							text = letterEntry.fullText || (letterEntry.letter ? `From ${letterEntry.author || 'Ethan'} to ${letterEntry.recipient || 'Maya'}: "${letterEntry.letter}"` : (letterEntry.text || letterEntry.body || ''))
						}
						coupleSalons[title].longExtract = text
					}
				}
				console.log('[Letters] Private salon letters loaded successfully.')
			}
		}
	} catch (err) {
		console.warn('[Letters] Failed to load private letters:', err)
	}
}

// Single authoritative click listener — no duplicate addEventListener vs onclick collisions (AUTH-NEW-01)
redeemBtn?.addEventListener('click', handleRedeemButtonClick)
inviteCodeInput?.addEventListener('keydown', (e) => {
	if (e.key === 'Enter') {
		e.preventDefault()
		handleRedeemButtonClick()
	}
})

async function checkAuthSession() {
	try {
		const res = await fetch('/api/letters')
		if (res.ok) {
			const data = await res.json()
			inviteRedeemed = true
			window.__museumAuthenticated = true
			window.__museumSessionToken = true
			const recipient = data?.recipient || 'Maya & Ethan'
			lastInviteRecipient = recipient
			setInviteStatus(`✦ Pass Verified: Welcome, ${recipient} ✦`, true)

			const recLower = String(recipient).toLowerCase()
			const match = AVATARS.find(a => a.name && a.name.toLowerCase() === recLower) ||
			              (recLower.includes('ethan') && !recLower.includes('maya') ? AVATARS.find(a => a.id === 'ethan') : null) ||
			              AVATARS.find(a => a.id === 'maya') || AVATARS[0]
			if (match) selectedAvatarId = match.id

			// Do not leak or hardcode passcodes in DOM input (AUTH-NEW-02)
			updateAuthState(AUTH_STATE.STARTING)

			const entranceLoadingEl = document.querySelector('#entrance-loading')
			if (entranceLoadingEl) {
				entranceLoadingEl.removeAttribute('hidden')
				entranceLoadingEl.style.display = 'block'
				if (entranceStatus) entranceStatus.textContent = `Preparing museum sanctuary for ${recipient}…`
			}

			try {
				await loadPrivateLetters()
				await startMuseumExperience()
			} catch (bootErr) {
				console.error('[Session Boot Error]', bootErr)
				museumStarted = false
				updateAuthState(AUTH_STATE.VERIFIED)
				setInviteStatus('Could not load sanctuary session. Click Enter Sanctuary to retry.', false)
			}
		} else {
			updateAuthState(AUTH_STATE.UNVERIFIED)
			setInviteStatus('Please enter your private invitation pass to enter the sanctuary.', false)
		}
	} catch {
		updateAuthState(AUTH_STATE.UNVERIFIED)
		setInviteStatus('Please enter your private invitation pass to enter the sanctuary.', false)
	}
}

// Check URL parameters or existing session
const initialInviteParam = (new URLSearchParams(window.location.search)).get('invite') || (new URLSearchParams(window.location.search)).get('code')
if (initialInviteParam && inviteCodeInput) {
	inviteCodeInput.value = initialInviteParam
	redeemInviteCode()
} else {
	checkAuthSession()
}

// ---- VISITOR / AVATAR SELECTION ----
let selectedAvatarId = null
let avatarLoading = false
let avatarSelection = 0
const avatarSelectEl = document.querySelector('#avatar-select')
const visitorBadgeEl = document.querySelector('#visitor-badge')
let characterSetup = null
let selectedProfile = null

function updateVisitor(profile) {
	if (!profile) return
	selectedProfile = profile
	window.__visitor = profile
	visitorBadgeEl.hidden = false
	visitorBadgeEl.textContent = `✦ ${profile.name}`
	const avatar = multiplayer.getState().localAvatar
	if (avatar?.characterId === profile.id) {
		avatar.name = profile.name
		avatar.tag.textContent = profile.name
		avatar.applyAppearance(profile.appearance)
	}
}

async function selectAvatar(id) {
	selectedAvatarId = id
	characterSetup?.select?.(id, false)
	const av = characterSetup?.getProfile?.() || AVATARS.find(a => a.id === id)
	if (!av) return
	selectedProfile = av
	const selection = ++avatarSelection
	avatarLoading = true
	enterButton.hidden = true
	enterButton.disabled = true
	entranceProgress.value = 0
	entranceStatus.textContent = `Preparing ${av.name}…`
	try {
		const local = await multiplayer.prepareAvatar(av)
		if (selection !== avatarSelection) return
		updateVisitor(characterSetup?.getProfile?.() || av)
		characterSetup?.setAvatar?.(local)
		avatarLoading = false
		entranceProgress.value = 100
		entranceStatus.textContent = 'Your character is ready. Welcome.'
		enterButton.hidden = false
		enterButton.disabled = false
	} catch (error) {
		if (selection !== avatarSelection) return
		avatarLoading = false
		entranceStatus.textContent = 'The character could not load. Select a character to try again.'
		console.error('[Museum] Character loading failed:', error)
		return
	}
}

let occupancyPollTimer = null

async function syncOccupancy() {
	if (hasEntered) {
		if (occupancyPollTimer) {
			clearInterval(occupancyPollTimer)
			occupancyPollTimer = null
		}
		return
	}
	try {
		const res = await fetch('/api/occupancy')
		if (!res.ok) return
		const occ = await res.json()
		if (!occ || !occ.ok) return
		const claimed = occ.claimedCharacters || []
		characterSetup?.setClaimedCharacters?.(claimed)

		if (occ.full) {
			enterButton.disabled = true
			enterButton.textContent = 'Museum Full (2/2 Visitors)'
			entranceStatus.textContent = 'Both visitors are currently inside the sanctuary. Please wait for a visitor to leave.'
		} else {
			if (enterButton.textContent.includes('Museum Full')) {
				enterButton.textContent = 'Enter Sanctuary →'
			}
			if (!avatarLoading && entranceReady) {
				enterButton.disabled = false
				entranceStatus.textContent = 'Your character is ready. Welcome.'
			}
		}
	} catch (_) {}
}

function showAvatarSelection() {
	if (!avatarSelectEl) return
	const defaultId = selectedAvatarId || (AVATARS.length > 0 ? AVATARS[0].id : null)
	if (!characterSetup) {
		characterSetup = createCharacterSetup(avatarSelectEl, AVATARS, {
			onSelect: selectAvatar,
			onChange: updateVisitor,
			initialId: defaultId,
		})
	} else if (defaultId) {
		characterSetup.select?.(defaultId, false)
	}
	const ticketCard = document.querySelector('#ticket-card')
	if (ticketCard) ticketCard.classList.add('character-setup-card')
	const inviteBox = document.querySelector('#invite-box')
	if (inviteBox) inviteBox.style.display = 'none'
	document.body.classList.add('choosing-character')
	avatarSelectEl.hidden = false
	if (defaultId) {
		selectAvatar(defaultId)
	}
	syncOccupancy()
	if (!occupancyPollTimer) {
		occupancyPollTimer = setInterval(syncOccupancy, 2500)
	}
}
let assetsLoading = false
let resolveAssetsLoaded = null
DefaultLoadingManager.onStart = () => { assetsLoading = true }
DefaultLoadingManager.onProgress = (_url, loaded, total) => {
	if (entranceReady && !avatarLoading) return
	const percent = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0
	entranceProgress.value = Math.max(entranceProgress.value, percent)
	entranceStatus.textContent = `Loading ${avatarLoading ? 'character' : 'museum'} (${entranceProgress.value}%)…`
}
DefaultLoadingManager.onLoad = () => {
	assetsLoading = false
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
	// Cap prebuild queue to 2 adjacent rooms to prevent cache eviction thrashing
	const targets = salonsToQueue.slice(0, 2)
	for (const title of targets) {
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
	if (!isTouchDevice && canvas && typeof canvas.requestPointerLock === 'function') {
		try { canvas.requestPointerLock() } catch (_) {}
	}
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
function checkInviteRequired() {
	if (inviteConfigChecked) return
	inviteConfigChecked = true
	fetch('/api/config').then(r => r.json()).then(cfg => {
		inviteRequired = Boolean(cfg && cfg.passcodeRequired)
		if (inviteRequired && !inviteRedeemed && inviteStatusEl) {
			setInviteStatus('This private museum requires a verified invitation pass to enter.', false)
		}
		if (cfg && cfg.customization) {
			window.__museumConfig = cfg.customization
			const c = cfg.customization
			if (c.museum) {
				const tagEl = document.querySelector('.ticket-tag')
				const numEl = document.querySelector('.ticket-number')
				const titleEl = document.querySelector('.ticket-title')
				const subEl = document.querySelector('.ticket-subtitle')
				const quoteEl = document.querySelector('.ticket-quote')
				const footerEl = document.querySelector('#ticket-card p')
				if (tagEl && c.museum.ticketTag) tagEl.textContent = c.museum.ticketTag
				if (numEl && c.museum.ticketNumber) numEl.textContent = c.museum.ticketNumber
				if (titleEl && c.museum.name) titleEl.textContent = c.museum.name
				if (subEl && c.museum.subtitle) subEl.textContent = c.museum.subtitle
				if (quoteEl && c.museum.entranceQuote) quoteEl.textContent = c.museum.entranceQuote
				if (footerEl && c.museum.footerCredit) footerEl.textContent = c.museum.footerCredit
				if (c.museum.name && c.couple) {
					document.title = `${c.museum.name} | Virtual 3D Art Sanctuary for ${c.couple.partner1?.name || 'Maya'} & ${c.couple.partner2?.name || 'Ethan'}`
				}
			}
		}
	}).catch(() => {})
}
checkInviteRequired()

let mobileControlsInitialized = false
function initMobileControls(engineApi, multiplayer) {
	if (!isTouchDevice || mobileControlsInitialized) return
	mobileControlsInitialized = true
	document.body.classList.add('is-touch-device')

	const joystickZone = document.querySelector('#virtual-joystick-zone')
	const joystickThumb = document.querySelector('#joystick-thumb')
	const touchLookZone = document.querySelector('#touch-look-zone')
	const btnJump = document.querySelector('#btn-touch-jump')
	const btnSit = document.querySelector('#btn-touch-sit')
	const btnChat = document.querySelector('#btn-touch-chat')
	const btnEmotes = document.querySelector('#btn-touch-emotes')

	// 1. Virtual Joystick (Left touch zone)
	let joyTouchId = null
	let joyCenterX = 0
	let joyCenterY = 0
	const maxRadius = 45

	joystickZone?.addEventListener('touchstart', (e) => {
		e.preventDefault()
		if (joyTouchId !== null) return
		const touch = e.changedTouches[0]
		joyTouchId = touch.identifier
		const rect = joystickZone.getBoundingClientRect()
		joyCenterX = rect.left + rect.width / 2
		joyCenterY = rect.top + rect.height / 2
		engineApi?.setMobileActive?.(true)
	}, { passive: false })

	const updateJoystick = (touch) => {
		const dx = touch.clientX - joyCenterX
		const dy = touch.clientY - joyCenterY
		const dist = Math.hypot(dx, dy)
		const angle = Math.atan2(dy, dx)
		const clampedDist = Math.min(dist, maxRadius)

		const thumbX = Math.cos(angle) * clampedDist
		const thumbY = Math.sin(angle) * clampedDist
		if (joystickThumb) {
			joystickThumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`
		}

		// Normalized move vector: X is strafe, Z is forward/back (-dy)
		const normX = thumbX / maxRadius
		const normZ = -thumbY / maxRadius
		engineApi?.setTouchMoveVector?.(normX, normZ)
	}

	joystickZone?.addEventListener('touchmove', (e) => {
		e.preventDefault()
		for (let i = 0; i < e.changedTouches.length; i++) {
			const touch = e.changedTouches[i]
			if (touch.identifier === joyTouchId) {
				updateJoystick(touch)
				break
			}
		}
	}, { passive: false })

	const resetJoystick = (e) => {
		for (let i = 0; i < e.changedTouches.length; i++) {
			if (e.changedTouches[i].identifier === joyTouchId) {
				joyTouchId = null
				if (joystickThumb) {
					joystickThumb.style.transform = 'translate(0px, 0px)'
				}
				engineApi?.setTouchMoveVector?.(0, 0)
				break
			}
		}
	}

	joystickZone?.addEventListener('touchend', resetJoystick, { passive: false })
	joystickZone?.addEventListener('touchcancel', resetJoystick, { passive: false })

	// 2. Touch Camera Look Area (Right screen swipe)
	let lookTouchId = null
	let lookLastX = 0
	let lookLastY = 0

	touchLookZone?.addEventListener('touchstart', (e) => {
		e.preventDefault()
		if (lookTouchId !== null) return
		const touch = e.changedTouches[0]
		lookTouchId = touch.identifier
		lookLastX = touch.clientX
		lookLastY = touch.clientY
		engineApi?.setMobileActive?.(true)
	}, { passive: false })

	touchLookZone?.addEventListener('touchmove', (e) => {
		e.preventDefault()
		for (let i = 0; i < e.changedTouches.length; i++) {
			const touch = e.changedTouches[i]
			if (touch.identifier === lookTouchId) {
				const dx = touch.clientX - lookLastX
				const dy = touch.clientY - lookLastY
				lookLastX = touch.clientX
				lookLastY = touch.clientY
				engineApi?.addTouchLookDelta?.(dx, dy)
				break
			}
		}
	}, { passive: false })

	const resetLook = (e) => {
		for (let i = 0; i < e.changedTouches.length; i++) {
			if (e.changedTouches[i].identifier === lookTouchId) {
				lookTouchId = null
				break
			}
		}
	}

	touchLookZone?.addEventListener('touchend', resetLook, { passive: false })
	touchLookZone?.addEventListener('touchcancel', resetLook, { passive: false })

	// 3. Mobile Contextual Action Buttons
	btnJump?.addEventListener('touchstart', (e) => {
		e.preventDefault()
		engineApi?.triggerJump?.()
	}, { passive: false })

	btnSit?.addEventListener('touchstart', (e) => {
		e.preventDefault()
		multiplayer?.trySit?.()
		setTimeout(() => {
			if (btnSit) {
				btnSit.textContent = engineApi?.getSeatedSeat?.() ? 'STAND' : 'SIT'
			}
		}, 150)
	}, { passive: false })

	const btnTouchOrbit = document.querySelector('#btn-touch-orbit')
	const btnTouchFront = document.querySelector('#btn-touch-front')

	btnTouchOrbit?.addEventListener('touchstart', (e) => {
		e.preventDefault()
		const cur = engineApi?.getCameraMode?.() || 'follow'
		const next = cur === 'orbit' ? 'follow' : 'orbit'
		engineApi?.setCameraMode?.(next)
		if (btnTouchOrbit) btnTouchOrbit.textContent = next === 'orbit' ? '🎥 REAR' : '👁️ 360°'
	}, { passive: false })

	btnTouchFront?.addEventListener('touchstart', (e) => {
		e.preventDefault()
		engineApi?.setFrontView?.()
		if (btnTouchOrbit) btnTouchOrbit.textContent = '🎥 REAR'
	}, { passive: false })

	btnChat?.addEventListener('touchstart', (e) => {
		e.preventDefault()
		toggleChatDrawer()
	}, { passive: false })
	btnChat?.addEventListener('click', (e) => {
		e.preventDefault()
		toggleChatDrawer()
	})

	btnEmotes?.addEventListener('touchstart', (e) => {
		e.preventDefault()
		toggleAnimationsDrawer()
	}, { passive: false })
}

function enterMuseum() {
	if (!entranceReady || !selectedAvatarId || avatarLoading || enterButton.disabled) return
	if (inviteRequired && !inviteRedeemed) {
		setInviteStatus('Please verify your private invitation pass before entering.', false)
		return
	}
	if (occupancyPollTimer) {
		clearInterval(occupancyPollTimer)
		occupancyPollTimer = null
	}
	try {
		characterSetup?.enter?.(engineApi.scene)
	} catch (err) {
		console.warn('[enterMuseum] characterSetup.enter warning:', err)
	}
	document.body.classList.remove('choosing-character')
	hasEntered = true
	updateAuthState(AUTH_STATE.IN_SANCTUARY)
	try { window.sessionStorage.setItem('ourmuseum:entered', '1') } catch {}
	document.body.classList.add('in-sanctuary')
	overlayEl.hidden = true
	document.querySelector('#camera-hud-group')?.removeAttribute('hidden')
	requestPlay()
	if (!isAudioPlaying) {
		toggleAmbientAudio()
	}
	queuePrebuildSalons(coupleCategories)
	// Start multiplayer (join + sync) once inside the sanctuary.
	if (multiplayer && typeof multiplayer.start === 'function') {
		multiplayer.start()
	}
	if (isTouchDevice) {
		initMobileControls(engineApi, multiplayer)
	}
}

// Immediate server notification upon tab close or page navigation to release occupancy slot
window.addEventListener('beforeunload', () => {
	try { multiplayer?.stop?.() } catch (_) {}
})
window.addEventListener('pagehide', () => {
	try { multiplayer?.stop?.() } catch (_) {}
})

// ---- HUD CAMERA CONTROLS & ANIMATIONS DRAWER (UI-ANIM-01, CAM-01..02) ----
const btnCamMode = document.querySelector('#btn-camera-toggle')
const btnCamFront = document.querySelector('#btn-camera-front')
const btnCamReset = document.querySelector('#btn-camera-reset')
const btnAnimToggle = document.querySelector('#btn-animations-toggle')
const animDrawer = document.querySelector('#hud-animations-drawer')
const btnCloseAnimDrawer = document.querySelector('#btn-close-anim-drawer')

function updateCameraModeUI(mode) {
	if (!btnCamMode) return
	const icon = document.querySelector('#camera-mode-icon')
	const label = document.querySelector('#camera-mode-label')
	if (mode === 'orbit') {
		if (icon) icon.textContent = '🎥'
		if (label) label.textContent = 'Follow'
		btnCamMode.classList.add('active')
	} else {
		if (icon) icon.textContent = '👁️'
		if (label) label.textContent = 'Orbit 360°'
		btnCamMode.classList.remove('active')
	}
}

btnCamMode?.addEventListener('click', (e) => {
	e.stopPropagation()
	const cur = engineApi?.getCameraMode?.() || 'follow'
	const next = cur === 'orbit' ? 'follow' : 'orbit'
	engineApi?.setCameraMode?.(next)
	updateCameraModeUI(next)
})

btnCamFront?.addEventListener('click', (e) => {
	e.stopPropagation()
	engineApi?.setFrontView?.()
	updateCameraModeUI('orbit')
})

btnCamReset?.addEventListener('click', (e) => {
	e.stopPropagation()
	engineApi?.resetCamera?.()
	updateCameraModeUI('follow')
})

// Right-Side Drawer Controller
let currentAnimCategory = 'gestures'
let animSearchQuery = ''
let drawerPollTimer = null

function updateDrawerStatus() {
	if (!animDrawer || !animDrawer.classList.contains('drawer-open')) return

	const statusBar = document.querySelector('#anim-status-bar')
	const statusLabel = document.querySelector('#anim-status-label')
	const seatBanner = document.querySelector('#seat-context-banner')
	const seatTitle = document.querySelector('#seat-context-title')
	const seatDesc = document.querySelector('#seat-context-desc')
	const btnSeatAction = document.querySelector('#btn-seat-context-action')

	// 1. Active animation status
	const activeEmote = multiplayer?.getActiveEmote?.()
	if (statusBar && statusLabel) {
		if (activeEmote) {
			statusBar.style.display = 'flex'
			statusLabel.textContent = `Playing: ${activeEmote.label || 'Action'}`
		} else {
			statusBar.style.display = 'none'
		}
	}

	// 2. Contextual seating banner
	if (seatBanner && seatTitle && seatDesc && btnSeatAction) {
		const isSeated = multiplayer?.isSeated?.()
		const nearestSeat = multiplayer?.getNearestSeat?.(3.5)

		if (isSeated) {
			seatBanner.style.display = 'flex'
			seatTitle.textContent = '🟢 Currently Seated'
			seatDesc.textContent = 'Resting comfortably on museum furniture'
			btnSeatAction.textContent = 'Stand Up (E)'
			btnSeatAction.disabled = false
		} else if (nearestSeat) {
			seatBanner.style.display = 'flex'
			const cam = engineApi?.camera
			const dist = cam ? Math.hypot(cam.position.x - nearestSeat.x, cam.position.z - nearestSeat.z).toFixed(1) : '1.0'
			seatTitle.textContent = '🛋️ Available Furniture Nearby'
			seatDesc.textContent = `${nearestSeat.id} (${dist}m away)`
			btnSeatAction.textContent = 'Sit Down (E)'
			btnSeatAction.disabled = false
		} else if (currentAnimCategory === 'seats') {
			seatBanner.style.display = 'flex'
			seatTitle.textContent = '⚪ No Furniture Nearby'
			seatDesc.textContent = 'Walk within 3.5m of a sofa, chair or bench to sit'
			btnSeatAction.textContent = 'Too Far (>3.5m)'
			btnSeatAction.disabled = true
		} else {
			seatBanner.style.display = 'none'
		}
	}

	// 3. Update playing indicator on cards
	document.querySelectorAll('.anim-card-btn').forEach(card => {
		const netId = parseInt(card.getAttribute('data-network-id'), 10)
		const isPlaying = activeEmote && activeEmote.idx === netId
		card.classList.toggle('playing', Boolean(isPlaying))
	})
}

function renderAnimDrawerGrid() {
	const grid = document.querySelector('#anim-drawer-grid')
	if (!grid) return

	const activeEmote = multiplayer?.getActiveEmote?.()
	let items = []

	if (animSearchQuery) {
		items = ACTIONS.filter(a =>
			a.name.toLowerCase().includes(animSearchQuery) ||
			(a.description || '').toLowerCase().includes(animSearchQuery) ||
			(a.controls || '').toLowerCase().includes(animSearchQuery)
		)
	} else {
		items = getActionsByCategory(currentAnimCategory)
	}

	if (items.length === 0) {
		grid.innerHTML = '<div class="anim-empty-state">No matching animations found</div>'
		return
	}

	grid.innerHTML = items.map(action => {
		const isPlaying = activeEmote && activeEmote.idx === action.networkId
		let badgeText = action.key || ''
		if (action.loop) {
			badgeText = badgeText ? `${badgeText} · Loop` : 'Loop'
		}
		const isMovement = action.category === 'movement'
		const isSeatVariant = ['sitLow', 'sitHigh', 'sitDown'].includes(action.id)
		const disabled = (isMovement || isSeatVariant) ? 'disabled' : ''

		return `
			<button class="anim-card-btn ${isPlaying ? 'playing' : ''}"
				data-action-id="${action.id}"
				data-network-id="${action.networkId || ''}"
				data-category="${action.category}"
				type="button"
				${disabled}
				title="${action.description || action.name}">
				<div class="anim-card-top">
					<span class="anim-card-emoji">${action.emoji || '✨'}</span>
					${badgeText ? `<span class="anim-card-badge">${badgeText}</span>` : ''}
				</div>
				<div class="anim-card-name">${action.name}</div>
				${action.controls ? `<div class="anim-card-controls">${action.controls}</div>` : ''}
				<div class="anim-card-desc">${action.description || ''}</div>
			</button>
		`
	}).join('')

	// Wire card clicks
	grid.querySelectorAll('.anim-card-btn').forEach(card => {
		card.addEventListener('click', (e) => {
			e.stopPropagation()
			const actionId = card.getAttribute('data-action-id')
			const netId = parseInt(card.getAttribute('data-network-id'), 10)
			const cat = card.getAttribute('data-category')

			if (cat === 'seats') {
				if (actionId === 'sit') multiplayer?.trySit?.()
				else if (actionId === 'standUp') multiplayer?.standUp?.()
				updateDrawerStatus()
				return
			}

			if (netId && multiplayer?.doEmote) {
				multiplayer.doEmote(netId)
				card.classList.add('active-pulse')
				setTimeout(() => card.classList.remove('active-pulse'), 400)
				updateDrawerStatus()
			}
		})
	})
}

function initAnimationsDrawer() {
	const tabsContainer = document.querySelector('#anim-tabs')
	const searchInput = document.querySelector('#action-search')
	const btnStop = document.querySelector('#btn-stop-anim')
	const btnSeat = document.querySelector('#btn-seat-context-action')

	// Render tabs
	if (tabsContainer) {
		tabsContainer.innerHTML = ACTION_CATEGORIES.map(cat => `
			<button class="anim-tab-btn ${cat.id === currentAnimCategory ? 'active' : ''}"
				data-cat="${cat.id}"
				type="button"
				role="tab">
				<span>${cat.emoji}</span>
				<span>${cat.label}</span>
			</button>
		`).join('')

		tabsContainer.querySelectorAll('.anim-tab-btn').forEach(tab => {
			tab.addEventListener('click', (e) => {
				e.stopPropagation()
				currentAnimCategory = tab.getAttribute('data-cat')
				tabsContainer.querySelectorAll('.anim-tab-btn').forEach(t => t.classList.remove('active'))
				tab.classList.add('active')
				renderAnimDrawerGrid()
				updateDrawerStatus()
			})
		})
	}

	// Search input
	searchInput?.addEventListener('input', (e) => {
		animSearchQuery = e.target.value.trim().toLowerCase()
		renderAnimDrawerGrid()
	})

	// Stop animation button
	btnStop?.addEventListener('click', (e) => {
		e.stopPropagation()
		multiplayer?.stopEmote?.()
		updateDrawerStatus()
	})

	// Contextual seat button
	btnSeat?.addEventListener('click', (e) => {
		e.stopPropagation()
		if (multiplayer?.isSeated?.()) {
			multiplayer.standUp?.()
		} else {
			multiplayer?.trySit?.()
		}
		setTimeout(updateDrawerStatus, 200)
	})

	// Isolate drawer events from world canvas interactions
	animDrawer?.addEventListener('pointerdown', (e) => e.stopPropagation())
	animDrawer?.addEventListener('mousedown', (e) => e.stopPropagation())
	animDrawer?.addEventListener('click', (e) => e.stopPropagation())

	renderAnimDrawerGrid()
}

function toggleAnimationsDrawer(forceOpen) {
	if (!animDrawer) return
	const isOpen = animDrawer.classList.contains('drawer-open')
	const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen

	if (shouldOpen) {
		toggleChatDrawer(false)
		animDrawer.classList.add('drawer-open')
		animDrawer.setAttribute('aria-hidden', 'false')
		document.body.classList.add('drawer-open')
		btnAnimToggle?.classList.add('active')
		if (document.pointerLockElement) {
			document.exitPointerLock()
		}
		updateDrawerStatus()
		renderAnimDrawerGrid()
		if (!drawerPollTimer) {
			drawerPollTimer = setInterval(updateDrawerStatus, 400)
		}
	} else {
		animDrawer.classList.remove('drawer-open')
		animDrawer.setAttribute('aria-hidden', 'true')
		document.body.classList.remove('drawer-open')
		btnAnimToggle?.classList.remove('active')
		if (drawerPollTimer) {
			clearInterval(drawerPollTimer)
			drawerPollTimer = null
		}
		// Click/G are user gestures; restore WASD control after closing the panel.
		if (hasEntered && !isTouchDevice && lightboxEl?.hidden && !document.pointerLockElement && !chatDrawer?.classList.contains('drawer-open')) {
			requestPlay()
		}
	}
}

btnAnimToggle?.addEventListener('click', (e) => {
	e.stopPropagation()
	toggleAnimationsDrawer()
})

btnCloseAnimDrawer?.addEventListener('click', (e) => {
	e.stopPropagation()
	toggleAnimationsDrawer(false)
})

initAnimationsDrawer()

// ---- PROXIMITY SEATING HUD (Milestone M8) ----
const hudSeatPrompt = document.querySelector('#hud-seat-prompt')
const hudSeatText = document.querySelector('#hud-seat-text')
const hudSeatBadge = document.querySelector('#hud-seat-badge')

function updateProximitySeatHud() {
	if (!hudSeatPrompt) return
	const inSanctuary = document.body.classList.contains('in-sanctuary')
	if (!inSanctuary) {
		hudSeatPrompt.style.display = 'none'
		return
	}

	const isSeated = multiplayer?.isSeated?.()
	if (isSeated) {
		hudSeatPrompt.style.display = 'flex'
		if (hudSeatText) hudSeatText.textContent = 'Stand Up'
		if (hudSeatBadge) hudSeatBadge.textContent = 'E / Space'
		return
	}

	const nearestSeat = multiplayer?.getNearestSeat?.(3.2)
	if (nearestSeat) {
		hudSeatPrompt.style.display = 'flex'
		const isChair = String(nearestSeat.id || '').toLowerCase().includes('chair')
		if (hudSeatText) hudSeatText.textContent = isChair ? 'Sit on Chair' : 'Sit on Sofa'
		if (hudSeatBadge) hudSeatBadge.textContent = 'Press E'
		return
	}

	hudSeatPrompt.style.display = 'none'
}

hudSeatPrompt?.addEventListener('click', (e) => {
	e.stopPropagation()
	if (multiplayer?.isSeated?.()) {
		multiplayer.standUp?.()
	} else {
		multiplayer?.trySit?.()
	}
	setTimeout(updateProximitySeatHud, 100)
})

hudSeatPrompt?.addEventListener('touchend', (e) => {
	e.stopPropagation()
	e.preventDefault()
	if (multiplayer?.isSeated?.()) {
		multiplayer.standUp?.()
	} else {
		multiplayer?.trySit?.()
	}
	setTimeout(updateProximitySeatHud, 100)
})

setInterval(updateProximitySeatHud, 120)

// Also listen for KeyE or Space globally in sanctuary
window.addEventListener('keydown', (e) => {
	if (e.code === 'KeyE') {
		const target = e.target
		if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
		if (document.body.classList.contains('in-sanctuary')) {
			if (multiplayer?.isSeated?.()) {
				multiplayer.standUp?.()
			} else {
				multiplayer?.trySit?.()
			}
			setTimeout(updateProximitySeatHud, 100)
		}
	} else if (e.code === 'Space' && multiplayer?.isSeated?.()) {
		const target = e.target
		if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
		e.preventDefault()
		multiplayer.standUp?.()
		setTimeout(updateProximitySeatHud, 100)
	}
})

// ---- SANCTUARY MESSAGES & CHAT SYSTEM (MP-05, CHAT-NEW) ----
const chatDrawer = document.querySelector('#hud-chat-drawer')
const btnCloseChatDrawer = document.querySelector('#btn-close-chat-drawer')
const btnChatToggle = document.querySelector('#btn-chat-toggle')
const chatDrawerForm = document.querySelector('#chat-drawer-form')
const chatDrawerInput = document.querySelector('#chat-drawer-input')
const chatMessagesList = document.querySelector('#chat-messages-list')
const chatToastBanner = document.querySelector('#chat-toast-banner')
let chatToastTimer = null

function formatISTTime(date = new Date()) {
	const istOffset = 5.5 * 60 * 60 * 1000
	const istDate = new Date(date.getTime() + istOffset)
	const hours = istDate.getUTCHours()
	const minutes = istDate.getUTCMinutes()
	const ampm = hours >= 12 ? 'PM' : 'AM'
	const h = hours % 12 || 12
	const m = String(minutes).padStart(2, '0')
	return `${h}:${m} ${ampm} IST`
}

function showChatToast(sender, text) {
	if (!chatToastBanner) return
	const senderEl = document.querySelector('#chat-toast-sender')
	const textEl = document.querySelector('#chat-toast-text')
	if (senderEl) senderEl.textContent = `${sender}: `
	if (textEl) textEl.textContent = text
	chatToastBanner.style.display = 'flex'
	chatToastBanner.classList.add('toast-show')

	if (chatToastTimer) clearTimeout(chatToastTimer)
	chatToastTimer = setTimeout(() => {
		chatToastBanner.classList.remove('toast-show')
		setTimeout(() => {
			if (!chatToastBanner.classList.contains('toast-show')) {
				chatToastBanner.style.display = 'none'
			}
		}, 300)
	}, 6000)
}

function appendChatMessage({ sender, text, isLocal = false, time = new Date() }) {
	if (!chatMessagesList) return
	const emptyHint = chatMessagesList.querySelector('.chat-empty-hint')
	if (emptyHint) emptyHint.remove()

	const msgEl = document.createElement('div')
	msgEl.className = `chat-bubble-item ${isLocal ? 'chat-msg-local' : 'chat-msg-remote'}`

	const timeStr = formatISTTime(time instanceof Date ? time : new Date(time))

	msgEl.innerHTML = `
		<div class="chat-bubble-meta">
			<span class="chat-sender-name ${isLocal ? 'is-self' : 'is-partner'}">${sender}</span>
			<span class="chat-timestamp">${timeStr}</span>
		</div>
		<div class="chat-bubble-text"></div>
	`
	msgEl.querySelector('.chat-bubble-text').textContent = text

	chatMessagesList.appendChild(msgEl)
	const container = document.querySelector('#chat-messages-container')
	if (container) container.scrollTop = container.scrollHeight

	// Also display floating toast notification
	showChatToast(sender, text)
}

function toggleChatDrawer(forceOpen) {
	if (!chatDrawer) return
	const isOpen = chatDrawer.classList.contains('drawer-open')
	const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen

	if (shouldOpen) {
		// Close gestures drawer if open to prevent overlap
		toggleAnimationsDrawer(false)

		chatDrawer.classList.add('drawer-open')
		chatDrawer.setAttribute('aria-hidden', 'false')
		document.body.classList.add('chat-open')
		btnChatToggle?.classList.add('active')

		if (document.pointerLockElement) {
			document.exitPointerLock()
		}

		setTimeout(() => chatDrawerInput?.focus(), 150)
	} else {
		chatDrawer.classList.remove('drawer-open')
		chatDrawer.setAttribute('aria-hidden', 'true')
		document.body.classList.remove('chat-open')
		btnChatToggle?.classList.remove('active')

		if (hasEntered && !isTouchDevice && lightboxEl?.hidden && !document.pointerLockElement && !animDrawer?.classList.contains('drawer-open')) {
			requestPlay()
		}
	}
}

btnChatToggle?.addEventListener('click', (e) => {
	e.stopPropagation()
	toggleChatDrawer()
})

btnCloseChatDrawer?.addEventListener('click', (e) => {
	e.stopPropagation()
	toggleChatDrawer(false)
})

chatDrawer?.addEventListener('pointerdown', (e) => e.stopPropagation())
chatDrawer?.addEventListener('mousedown', (e) => e.stopPropagation())
chatDrawer?.addEventListener('click', (e) => e.stopPropagation())

chatDrawerForm?.addEventListener('submit', (e) => {
	e.preventDefault()
	const text = chatDrawerInput?.value?.trim()
	if (!text) return

	chatDrawerInput.value = ''
	const localName = selectedProfile?.name || lastInviteRecipient || 'You'

	// 1. Send over multiplayer network
	if (multiplayer?.sendChat) {
		multiplayer.sendChat(text)
	}

	// 2. Add to chat drawer message log locally
	appendChatMessage({
		sender: localName,
		text,
		isLocal: true,
		time: new Date()
	})
})

// Unified Hotkeys Handler (Camera, Audio, Fullscreen, Gestures, Lightbox)
window.addEventListener('keydown', (e) => {
	if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || ['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return

	// Escape closes animations drawer, chat drawer, or photo lightbox
	if (e.key === 'Escape') {
		if (chatDrawer?.classList.contains('drawer-open')) {
			e.preventDefault()
			toggleChatDrawer(false)
			return
		}
		if (animDrawer?.classList.contains('drawer-open')) {
			e.preventDefault()
			toggleAnimationsDrawer(false)
			return
		}
		if (lightboxEl && !lightboxEl.hidden) {
			closePhotoLightbox(true)
			return
		}
	}

	// Hotkeys for Music, Fullscreen, and Chat (accessible anytime in sanctuary)
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
	if (hasEntered && (e.code === 'KeyT' || e.key === 't' || e.key === 'T' || e.code === 'Enter')) {
		e.preventDefault()
		toggleChatDrawer()
		return
	}

	// Museum in-world hotkeys (Camera, Gestures)
	if (!hasEntered) return

	if (e.code === 'KeyC') {
		e.preventDefault()
		const cur = engineApi?.getCameraMode?.() || 'follow'
		const next = cur === 'orbit' ? 'follow' : 'orbit'
		engineApi?.setCameraMode?.(next)
		updateCameraModeUI(next)
	} else if (e.code === 'KeyV') {
		e.preventDefault()
		engineApi?.setFrontView?.()
		updateCameraModeUI('orbit')
	} else if (e.code === 'KeyR') {
		e.preventDefault()
		engineApi?.resetCamera?.()
		updateCameraModeUI('follow')
	} else if (e.code === 'KeyG') {
		e.preventDefault()
		toggleAnimationsDrawer()
	} else if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
		const emoteId = parseInt(e.code.replace('Digit', ''), 10)
		const canvas = document.querySelector('#scene')
		const locked = document.pointerLockElement === canvas
		// If pointer is unlocked, trigger emote here (when locked, multiplayer.js triggers onKeyDown)
		if (!locked && multiplayer?.doEmote) {
			multiplayer.doEmote(emoteId)
		}
		const b = document.querySelector(`.anim-card-btn[data-network-id="${emoteId}"]`)
		b?.classList.add('active-pulse')
		setTimeout(() => b?.classList.remove('active-pulse'), 400)
		updateDrawerStatus()
	}
})

document.querySelector('#btn-enter-museum')?.addEventListener('click', enterMuseum)

// Resume pointer lock on canvas click if already entered and unlocked
canvas.addEventListener('click', () => {
	if (chatDrawer?.classList.contains('drawer-open')) {
		toggleChatDrawer(false)
		return
	}
	if (animDrawer?.classList.contains('drawer-open')) {
		toggleAnimationsDrawer(false)
		return
	}
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

	const salon = findCoupleSalon(title)
	if (!salon) {
		console.warn(`[Navigation] Salon "${title}" not found.`)
		return
	}

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

async function startMuseumExperience() {
	if (museumStarted) return
	museumStarted = true

	try {
		const entranceLoadingEl = document.querySelector('#entrance-loading')
		if (entranceLoadingEl) {
			entranceLoadingEl.removeAttribute('hidden')
			entranceLoadingEl.style.display = 'block'
		}

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

	// ---- MULTIPLAYER (avatar sync) ----
	multiplayer = initMultiplayer({
		engineApi,
		selectedAvatar: () => selectedProfile,
		getRoomKey: () => {
			try { return engineApi.getRoomKey() } catch { return 'lobby' }
		},
		onChatMessage(msg) {
			appendChatMessage({
				sender: msg.sender || 'Partner',
				text: msg.text,
				isLocal: false,
				time: msg.time || new Date()
			})
		},
		goToRoom(roomKey) {
			if (!roomKey) return
			if (roomKey === 'lobby') {
				enterlobby({ push: true })
				return
			}
			const title = ROOM_KEY_TO_TITLE[roomKey]
			if (!title) {
				console.error(`[Navigation] Unknown roomKey "${roomKey}" requested. Staying put.`)
				return
			}
			loadAndEnterGallery(title, {
				pushHistory: true,
				spawn: { type: 'fromWall', wall: 'south' },
			})
		},
	})
	window.__multiplayer = multiplayer

	if (!initialTitle) {
		pushGalleryTrail(lobby_title)
	}

	setUrlAndState(initialTitle ? initialTitle : null, { push: false })

	if (!popstateBound) {
		popstateBound = true
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
	}

	await prepareEntrance()
	} catch (err) {
		museumStarted = false
		if (engineApi && typeof engineApi.stop === 'function') {
			try { engineApi.stop() } catch (_) {}
			engineApi = null
		}
		if (multiplayer && typeof multiplayer.stop === 'function') {
			try { multiplayer.stop() } catch (_) {}
			multiplayer = null
		}
		throw err
	}
}

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
		if (assetsLoading) {
			await Promise.race([
				new Promise((resolve) => { resolveAssetsLoaded = resolve }),
				new Promise((resolve) => setTimeout(resolve, 4000))
			])
		}
		entranceStatus.textContent = 'Preparing the room for your visit…'
		try {
			if (typeof engineApi.renderer.compile === 'function') {
				engineApi.renderer.compile(engineApi.scene, engineApi.camera)
			}
		} catch (_) {}
		engineApi.renderer.render(engineApi.scene, engineApi.camera)
		entranceReady = true
		entranceProgress.value = 100
		document.querySelector('#entrance-loading')?.setAttribute('aria-busy', 'false')
		entranceStatus.textContent = 'Your room is ready.'
		enterButton.hidden = true
		enterButton.disabled = true
		showAvatarSelection()
		queuePrebuildSalons(coupleCategories)
	} catch (error) {
		console.error('[Museum] Entrance loading failed:', error)
		museumStarted = false
		entranceProgress.hidden = true
		document.querySelector('#entrance-loading')?.setAttribute('aria-busy', 'false')
		entranceStatus.textContent = 'The room could not finish loading. Please reload the page to try again.'
	}
}
