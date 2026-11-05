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

export function getStorePath() {
  return storePath
}

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

export function loadStore() {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      ensureDataDir()
      if (fs.existsSync(storePath)) {
        const raw = fs.readFileSync(storePath, 'utf8')
        if (raw.trim()) {
          const parsed = JSON.parse(raw)
          return {
            invites: parsed.invites || {},
            sessions: parsed.sessions || {},
          }
        }
      }
      return { invites: {}, sessions: {} }
    } catch (err) {
      if (attempt < 4 && (err.code === 'EBUSY' || err.code === 'EPERM' || err instanceof SyntaxError)) {
        // Short busy wait on Windows file locking
        const start = Date.now()
        while (Date.now() - start < 15) {}
        continue
      }
      console.warn('[InviteStore] Could not load invites.json, initializing fresh store:', err.message)
    }
  }
  return { invites: {}, sessions: {} }
}

function saveStore(store) {
  try {
    ensureDataDir()
    const tmpPath = `${storePath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8')
    try {
      fs.renameSync(tmpPath, storePath)
    } catch {
      // Fallback for Windows file locks
      fs.copyFileSync(tmpPath, storePath)
      try { fs.unlinkSync(tmpPath) } catch {}
    }
  } catch (err) {
    console.error('[InviteStore] Failed to save invites.json:', err)
  }
}

// Seed initial default invites from environment or secure defaults if store is completely empty
const initialStore = loadStore()
if (Object.keys(initialStore.invites).length === 0) {
  const partner1Name = 'Maya'
  const partner1Code = (process.env.DEFAULT_INVITE_PARTNER1 || 'maya-love').trim()
  const partner2Name = 'Ethan'
  const partner2Code = (process.env.DEFAULT_INVITE_PARTNER2 || 'ethan-love').trim()

  const now = Date.now()
  const oneYear = now + 365 * 24 * 60 * 60 * 1000
  initialStore.invites[partner1Code] = {
    code: partner1Code,
    recipient: partner1Name,
    createdAt: now,
    expiresAt: oneYear,
    revoked: false,
    redeemed: false,
    sessionToken: null,
  }
  initialStore.invites[partner2Code] = {
    code: partner2Code,
    recipient: partner2Name,
    createdAt: now,
    expiresAt: oneYear,
    revoked: false,
    redeemed: false,
    sessionToken: null,
  }
  saveStore(initialStore)
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
 * Revoke an existing invitation code and immediately destroy associated sessions
 */
export function revokeInvite(code) {
  const store = loadStore()
  const inv = store.invites[code]
  if (!inv) return false

  inv.revoked = true

  // Delete all sessions derived from this invite
  for (const [token, session] of Object.entries(store.sessions)) {
    if (session.code === code || session.token === inv.sessionToken) {
      delete store.sessions[token]
    }
  }
  inv.sessionToken = null

  saveStore(store)
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

  return {
    success: true,
    sessionToken,
    recipient: inv.recipient,
  }
}

/**
 * Validate an existing session token against fresh on-disk store.
 * Returns session record or null.
 */
export function validateSession(token) {
  if (!token || typeof token !== 'string') return null
  const store = loadStore()
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
  saveStore(store)
  return session
}
