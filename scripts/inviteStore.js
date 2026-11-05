// =========================================================================
// INVITATION & SESSION STORE (scripts/inviteStore.js)
// Server-side authoritative private invitation generation, revocation,
// and session token issuance for Maya & Ethan's sanctuary (AUTH-01..03, Q2, Q6).
// =========================================================================

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataDir = path.join(rootDir, 'data')
const storePath = path.join(dataDir, 'invites.json')

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

function loadStore() {
  try {
    ensureDataDir()
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, 'utf8')
      const parsed = JSON.parse(raw)
      return {
        invites: parsed.invites || {},
        sessions: parsed.sessions || {},
      }
    }
  } catch (err) {
    console.warn('[InviteStore] Could not load invites.json, initializing fresh store:', err.message)
  }
  return { invites: {}, sessions: {} }
}

function saveStore(store) {
  try {
    ensureDataDir()
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8')
  } catch (err) {
    console.error('[InviteStore] Failed to save invites.json:', err)
  }
}

let memoryStore = loadStore()

// Seed initial default invites from museum_config.json (or fallback) if store is empty
if (Object.keys(memoryStore.invites).length === 0) {
  let partner1Name = 'Maya'
  let partner1Code = 'maya-love'
  let partner2Name = 'Ethan'
  let partner2Code = 'ethan-love'

  try {
    const configPath = path.join(dataDir, 'museum_config.json')
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (cfg.couple?.partner1) {
        partner1Name = cfg.couple.partner1.name || partner1Name
        partner1Code = cfg.couple.partner1.inviteCode || cfg.couple.partner1.defaultInviteCode || cfg.access?.partner1Passcode || partner1Code
      }
      if (cfg.couple?.partner2) {
        partner2Name = cfg.couple.partner2.name || partner2Name
        partner2Code = cfg.couple.partner2.inviteCode || cfg.couple.partner2.defaultInviteCode || cfg.access?.partner2Passcode || partner2Code
      }
    }
  } catch {}

  const now = Date.now()
  const oneYear = now + 365 * 24 * 60 * 60 * 1000
  memoryStore.invites[partner1Code] = {
    code: partner1Code,
    recipient: partner1Name,
    createdAt: now,
    expiresAt: oneYear,
    revoked: false,
    redeemed: false,
    sessionToken: null,
  }
  memoryStore.invites[partner2Code] = {
    code: partner2Code,
    recipient: partner2Name,
    createdAt: now,
    expiresAt: oneYear,
    revoked: false,
    redeemed: false,
    sessionToken: null,
  }
  saveStore(memoryStore)
}

/**
 * Generate a random unguessable token
 */
export function generateToken(prefix = 'inv', bytes = 8) {
  return `${prefix}_${crypto.randomBytes(bytes).toString('hex')}`
}

/**
 * Create a new private invitation
 */
export function createInvite({ recipient = 'Guest', ttlHours = 24, customCode = null } = {}) {
  const store = loadStore()
  const now = Date.now()
  const code = (customCode || generateToken(recipient.toLowerCase().replace(/[^a-z0-9]/g, '') || 'inv', 6)).trim()
  const ttlMs = (Number(ttlHours) || 24) * 60 * 60 * 1000

  const record = {
    code,
    recipient: recipient.trim(),
    createdAt: now,
    expiresAt: now + ttlMs,
    revoked: false,
    redeemed: false,
    sessionToken: null,
  }

  store.invites[code] = record
  saveStore(store)
  memoryStore = store
  return record
}

/**
 * List all invitations with their current status
 */
export function listInvites() {
  const store = loadStore()
  const now = Date.now()
  return Object.values(store.invites).map((inv) => {
    let status = 'active'
    if (inv.revoked) status = 'revoked'
    else if (now > inv.expiresAt) status = 'expired'
    else if (inv.redeemed) status = 'redeemed'
    return {
      ...inv,
      status,
    }
  })
}

/**
 * Revoke an existing invitation code
 */
export function revokeInvite(code) {
  const store = loadStore()
  const inv = store.invites[code]
  if (!inv) return false

  inv.revoked = true
  if (inv.sessionToken && store.sessions[inv.sessionToken]) {
    delete store.sessions[inv.sessionToken]
  }
  inv.sessionToken = null

  saveStore(store)
  memoryStore = store
  return true
}

/**
 * Redeem an invitation code and issue a cryptographically signed session token.
 * Returns { success, sessionToken, recipient, error }
 */
export function redeemInvite(inputCode) {
  const store = loadStore()
  const now = Date.now()
  const code = String(inputCode || '').trim()

  const inv = store.invites[code]
  if (!inv) {
    return { success: false, error: 'Invalid invitation code.' }
  }

  if (inv.revoked) {
    return { success: false, error: 'This invitation has been revoked.' }
  }

  if (now > inv.expiresAt) {
    return { success: false, error: 'This invitation has expired.' }
  }

  // Issue or renew session token for this participant
  let sessionToken = inv.sessionToken
  if (!sessionToken || !store.sessions[sessionToken]) {
    sessionToken = generateToken('sess', 16)
    inv.sessionToken = sessionToken
  }

  inv.redeemed = true
  store.sessions[sessionToken] = {
    token: sessionToken,
    code: inv.code,
    recipient: inv.recipient,
    createdAt: now,
    lastSeen: now,
  }

  saveStore(store)
  memoryStore = store

  return {
    success: true,
    sessionToken,
    recipient: inv.recipient,
  }
}

/**
 * Validate an existing session token (from HttpOnly cookie or Authorization header).
 * Returns session record or null.
 */
export function validateSession(token) {
  if (!token || typeof token !== 'string') return null
  const store = memoryStore
  const session = store.sessions[token]
  if (!session) return null

  // Check if underlying invite was revoked or expired
  const inv = store.invites[session.code]
  if (inv && (inv.revoked || Date.now() > inv.expiresAt)) {
    delete store.sessions[token]
    saveStore(store)
    return null
  }

  session.lastSeen = Date.now()
  return session
}

