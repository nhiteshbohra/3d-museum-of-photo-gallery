// =========================================================================
// CUSTOMER DATA STORE (scripts/customerStore.js)
// Server-side authoritative storage and management for multi-customer galleries.
// Manages data/master.json, data/customers/<slug>/ hierarchy, scrypt passcode
// hashing, 75-slot photo assets, quotes, and audit logging.
// =========================================================================

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { revokeCustomerSessions } from './inviteStore.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataDir = path.join(rootDir, 'data')
const masterPath = path.join(dataDir, 'master.json')
const customersDir = path.join(dataDir, 'customers')
const auditLogPath = path.join(dataDir, 'audit_log.json')
const defaultConfigPath = path.join(dataDir, 'museum_config.json')
const defaultLettersPath = path.join(dataDir, 'letters.json')

export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'healthz',
  'ws',
  'photos',
  'dist',
  'public',
  'assets',
  'gallery',
  'static',
  'models',
  'sounds',
  'textures',
  // Windows / DOS reserved device names
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9'
])

export const SALON_SLOTS = [
  { slot: 1, name: '01_partition_front_highlight' },
  { slot: 2, name: '02_partition_back_highlight' },
  { slot: 3, name: '03_north_wall_masterpiece' },
  { slot: 4, name: '04_south_wall_gate_left' },
  { slot: 5, name: '05_south_wall_gate_right' },
  { slot: 6, name: '06_east_wall_artwork_1' },
  { slot: 7, name: '07_east_wall_artwork_2' },
  { slot: 8, name: '08_east_wall_artwork_3' },
  { slot: 9, name: '09_east_wall_artwork_4' },
  { slot: 10, name: '10_east_wall_artwork_5' },
  { slot: 11, name: '11_partition_front_companion' },
  { slot: 12, name: '12_partition_back_companion' },
]

export const CANONICAL_ROOMS = [
  {
    key: 'lobby',
    roomIndex: 0,
    folder: '00_grand_lobby',
    name: 'Grand Lobby',
    slots: [
      { slot: 1, name: '01_south_wall_masterpiece' },
      { slot: 2, name: '02_south_wall_companion_left' },
      { slot: 3, name: '03_south_wall_companion_right' },
    ],
  },
  { key: 'fireside', roomIndex: 1, folder: '01_fireside_winter_memories', name: 'Fireside Winter Memories', slots: SALON_SLOTS },
  { key: 'music', roomIndex: 2, folder: '02_music_classical_melodies', name: 'Music & Classical Melodies', slots: SALON_SLOTS },
  { key: 'library', roomIndex: 3, folder: '03_library_reading_nook', name: 'The Library & Reading Nook', slots: SALON_SLOTS },
  { key: 'paris', roomIndex: 4, folder: '04_masterpiece_paris_romance', name: 'Masterpiece Paris Romance', slots: SALON_SLOTS },
  { key: 'orangery', roomIndex: 5, folder: '05_the_glass_orangery', name: 'The Glass Orangery', slots: SALON_SLOTS },
  { key: 'alcove', roomIndex: 6, folder: '06_secret_promise_alcove', name: 'The Secret Promise Alcove', slots: SALON_SLOTS },
]

export function getMasterPath() {
  return masterPath
}

export function getCustomersDir() {
  return customersDir
}

export function getCustomerDir(slug) {
  validateSlug(slug)
  return path.join(customersDir, slug)
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Validate customer slug formatting and prevent reserved/traversal strings.
 */
export function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Customer slug is required and must be a string')
  }
  const clean = slug.trim().toLowerCase()
  if (clean.length < 3 || clean.length > 48) {
    throw new Error('Slug must be between 3 and 48 characters')
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean)) {
    throw new Error('Slug must contain only lowercase letters, numbers, and single hyphens (kebab-case)')
  }
  if (RESERVED_SLUGS.has(clean)) {
    throw new Error(`Slug '${clean}' is reserved by the museum system`)
  }
  if (clean === '__proto__' || clean === 'constructor' || clean === 'prototype') {
    throw new Error('Invalid slug name')
  }
  return clean
}

// ---------------------------------------------------------------------------
// Scrypt Passcode Hashing (timing-safe)
// ---------------------------------------------------------------------------

export function hashPasscode(passcode, saltHex = null) {
  if (!passcode || typeof passcode !== 'string') {
    throw new Error('Passcode must be a non-empty string')
  }
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16)
  const derivedKey = crypto.scryptSync(passcode.trim(), salt, 64, { N: 16384, r: 8, p: 1 })
  return {
    hash: derivedKey.toString('hex'),
    salt: salt.toString('hex'),
  }
}

export function verifyPasscode(candidatePasscode, storedHashHex, storedSaltHex) {
  if (!candidatePasscode || typeof candidatePasscode !== 'string') return false
  if (!storedHashHex || !storedSaltHex) return false
  try {
    const salt = Buffer.from(storedSaltHex, 'hex')
    const expected = Buffer.from(storedHashHex, 'hex')
    const actual = crypto.scryptSync(candidatePasscode.trim(), salt, expected.length, { N: 16384, r: 8, p: 1 })
    if (actual.length !== expected.length) return false
    return crypto.timingSafeEqual(actual, expected)
  } catch (err) {
    console.error('[customerStore] verifyPasscode error:', err)
    return false
  }
}

// ---------------------------------------------------------------------------
// Master Routing Table (data/master.json)
// ---------------------------------------------------------------------------

let cachedMaster = null
let masterMtime = 0

export function loadMaster(force = false) {
  try {
    ensureDir(dataDir)
    if (!fs.existsSync(masterPath)) {
      const initial = { customers: [] }
      saveMaster(initial)
      cachedMaster = initial
      return initial
    }
    const stat = fs.statSync(masterPath)
    if (!force && cachedMaster && stat.mtimeMs === masterMtime) {
      return cachedMaster
    }
    const raw = fs.readFileSync(masterPath, 'utf8')
    if (!raw.trim()) {
      cachedMaster = { customers: [] }
      return cachedMaster
    }
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.customers)) {
      parsed.customers = []
    }
    cachedMaster = parsed
    masterMtime = stat.mtimeMs
    return cachedMaster
  } catch (err) {
    console.warn('[customerStore] loadMaster warning:', err.message)
    return cachedMaster || { customers: [] }
  }
}

export function saveMaster(masterData) {
  ensureDir(dataDir)
  const data = masterData && Array.isArray(masterData.customers) ? masterData : { customers: [] }
  const tmpPath = `${masterPath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8')
  try {
    fs.renameSync(tmpPath, masterPath)
  } catch {
    fs.copyFileSync(tmpPath, masterPath)
    try { fs.unlinkSync(tmpPath) } catch {}
  }
  try {
    const s = fs.statSync(masterPath)
    masterMtime = s.mtimeMs
  } catch {}
  cachedMaster = data
}

export function findMasterCustomer(slug) {
  if (!slug) return null
  const clean = slug.trim().toLowerCase()
  const master = loadMaster()
  return master.customers.find((c) => c.slug === clean) || null
}

export function isCustomerActive(customer, now = new Date()) {
  if (!customer) return false
  if (customer.status !== 'active') return false
  const nowDate = (now instanceof Date ? now : new Date(now)).toISOString().slice(0, 10)
  if (customer.activeFrom && nowDate < customer.activeFrom) return false
  if (customer.activeUntil && nowDate > customer.activeUntil) return false
  return true
}

// ---------------------------------------------------------------------------
// Per-Customer State & Directory Scaffolding
// ---------------------------------------------------------------------------

export function getCustomer(slug, includeSecrets = false) {
  const clean = validateSlug(slug)
  const masterEntry = findMasterCustomer(clean)
  if (!masterEntry) return null

  const cDir = path.join(customersDir, clean)
  const cJsonPath = path.join(cDir, 'customer.json')
  let customerData = {}
  if (fs.existsSync(cJsonPath)) {
    try {
      customerData = JSON.parse(fs.readFileSync(cJsonPath, 'utf8'))
    } catch (err) {
      console.warn(`[customerStore] customer.json read error for ${clean}:`, err.message)
    }
  }

  const merged = {
    ...masterEntry,
    ...customerData,
    slug: clean,
  }

  const hasPasscode = Boolean(merged.passcodeHash || customerData.passcodeHash)
  if (!includeSecrets) {
    delete merged.passcodeHash
    delete merged.passcodeSalt
  }
  merged.hasPasscode = hasPasscode
  return merged
}

export function getCustomerConfig(slug) {
  const clean = validateSlug(slug)
  const cDir = path.join(customersDir, clean)
  const configPath = path.join(cDir, 'config.json')
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'))
    } catch {}
  }
  // Fall back to default museum config
  if (fs.existsSync(defaultConfigPath)) {
    try {
      return JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'))
    } catch {}
  }
  return {}
}

export function getCustomerQuotes(slug) {
  const clean = validateSlug(slug)
  const cDir = path.join(customersDir, clean)
  const quotesPath = path.join(cDir, 'quotes.json')
  if (fs.existsSync(quotesPath)) {
    try {
      return JSON.parse(fs.readFileSync(quotesPath, 'utf8'))
    } catch {}
  }
  // Fall back to default letters
  if (fs.existsSync(defaultLettersPath)) {
    try {
      return JSON.parse(fs.readFileSync(defaultLettersPath, 'utf8'))
    } catch {}
  }
  return {}
}

/**
 * Create a new customer with directory scaffolding, default files, and master entry.
 */
export function createCustomer({
  slug,
  displayName,
  passcode,
  plan = 'standard',
  status = 'active',
  activeFrom = null,
  activeUntil = null,
  customization = null,
  quotes = null,
}) {
  const cleanSlug = validateSlug(slug)
  const master = loadMaster(true)
  if (master.customers.some((c) => c.slug === cleanSlug)) {
    throw new Error(`Customer with slug '${cleanSlug}' already exists`)
  }

  const cDir = path.join(customersDir, cleanSlug)
  ensureDir(cDir)

  // 1. Scaffold photos directory for all 7 rooms
  const photosDir = path.join(cDir, 'photos')
  ensureDir(photosDir)
  for (const room of CANONICAL_ROOMS) {
    ensureDir(path.join(photosDir, room.folder))
  }

  // 2. Hash passcode
  const code = passcode && String(passcode).trim() ? String(passcode).trim() : 'welcome123'
  const { hash, salt } = hashPasscode(code)

  const nowIso = new Date().toISOString()
  const customerRecord = {
    id: `cust_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`,
    slug: cleanSlug,
    displayName: (displayName && String(displayName).trim()) || cleanSlug,
    passcodeHash: hash,
    passcodeSalt: salt,
    plan: plan || 'standard',
    status: status || 'active',
    activeFrom: activeFrom || null,
    activeUntil: activeUntil || null,
    sessionDurationHours: 24,
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  fs.writeFileSync(path.join(cDir, 'customer.json'), JSON.stringify(customerRecord, null, 2), 'utf8')

  // 3. Write config.json
  let configContent = customization
  if (!configContent && fs.existsSync(defaultConfigPath)) {
    try {
      configContent = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'))
      if (configContent.museum) {
        configContent.museum.name = customerRecord.displayName
      }
    } catch {}
  }
  if (!configContent) configContent = { museum: { name: customerRecord.displayName } }
  fs.writeFileSync(path.join(cDir, 'config.json'), JSON.stringify(configContent, null, 2), 'utf8')

  // 4. Write quotes.json
  let quotesContent = quotes
  if (!quotesContent && fs.existsSync(defaultLettersPath)) {
    try {
      quotesContent = JSON.parse(fs.readFileSync(defaultLettersPath, 'utf8'))
    } catch {}
  }
  if (!quotesContent) quotesContent = {}
  fs.writeFileSync(path.join(cDir, 'quotes.json'), JSON.stringify(quotesContent, null, 2), 'utf8')

  // 5. Update master.json
  const masterEntry = {
    slug: cleanSlug,
    folder: cleanSlug,
    displayName: customerRecord.displayName,
    plan: customerRecord.plan,
    status: customerRecord.status,
    activeFrom: customerRecord.activeFrom,
    activeUntil: customerRecord.activeUntil,
    version: 1,
  }
  master.customers.push(masterEntry)
  saveMaster(master)

  appendAuditLog({
    adminId: 'founder',
    customerSlug: cleanSlug,
    action: 'customer_created',
    before: null,
    after: masterEntry,
  })

  return getCustomer(cleanSlug)
}

/**
 * Update customer identity (displayName, plan, status).
 */
export function updateCustomerIdentity(slug, { displayName, plan, status }) {
  const clean = validateSlug(slug)
  const master = loadMaster(true)
  const masterIndex = master.customers.findIndex((c) => c.slug === clean)
  if (masterIndex === -1) {
    throw new Error(`Customer '${clean}' not found in master catalog`)
  }

  const cDir = path.join(customersDir, clean)
  const cJsonPath = path.join(cDir, 'customer.json')
  let customerData = {}
  if (fs.existsSync(cJsonPath)) {
    customerData = JSON.parse(fs.readFileSync(cJsonPath, 'utf8'))
  }

  const before = { ...master.customers[masterIndex] }

  if (displayName !== undefined && String(displayName).trim()) {
    master.customers[masterIndex].displayName = String(displayName).trim()
    customerData.displayName = master.customers[masterIndex].displayName
  }
  if (plan !== undefined) {
    master.customers[masterIndex].plan = String(plan)
    customerData.plan = master.customers[masterIndex].plan
  }
  if (status !== undefined) {
    const s = String(status).toLowerCase()
    if (!['active', 'draft', 'paused'].includes(s)) {
      throw new Error("Status must be one of 'active', 'draft', 'paused'")
    }
    master.customers[masterIndex].status = s
    customerData.status = s
    if (s === 'paused' || s === 'draft') {
      try {
        revokeCustomerSessions(clean)
      } catch (err) {
        console.warn(`[customerStore] Failed to revoke sessions on status transition for ${clean}:`, err.message)
      }
    }
  }

  customerData.version = (customerData.version || 1) + 1
  master.customers[masterIndex].version = customerData.version
  customerData.updatedAt = new Date().toISOString()

  fs.writeFileSync(cJsonPath, JSON.stringify(customerData, null, 2), 'utf8')
  saveMaster(master)

  appendAuditLog({
    adminId: 'founder',
    customerSlug: clean,
    action: 'identity_updated',
    before,
    after: master.customers[masterIndex],
  })

  return getCustomer(clean)
}

/**
 * Update customer passcode and access policies.
 */
export function updateCustomerAccess(slug, { passcode, sessionDurationHours }) {
  const clean = validateSlug(slug)
  const cDir = path.join(customersDir, clean)
  const cJsonPath = path.join(cDir, 'customer.json')
  if (!fs.existsSync(cJsonPath)) {
    throw new Error(`Customer '${clean}' data file not found`)
  }

  const customerData = JSON.parse(fs.readFileSync(cJsonPath, 'utf8'))
  const before = {
    sessionDurationHours: customerData.sessionDurationHours,
    hasPasscode: Boolean(customerData.passcodeHash),
  }

  if (passcode !== undefined) {
    const p = String(passcode).trim()
    if (!p) throw new Error('Passcode cannot be empty')
    const { hash, salt } = hashPasscode(p)
    customerData.passcodeHash = hash
    customerData.passcodeSalt = salt
  }

  if (sessionDurationHours !== undefined) {
    const d = Number(sessionDurationHours)
    if (d > 0 && d <= 720) customerData.sessionDurationHours = d
  }

  customerData.version = (customerData.version || 1) + 1
  customerData.updatedAt = new Date().toISOString()

  fs.writeFileSync(cJsonPath, JSON.stringify(customerData, null, 2), 'utf8')

  // Bump master version
  const master = loadMaster(true)
  const me = master.customers.find((c) => c.slug === clean)
  if (me) {
    me.version = customerData.version
    saveMaster(master)
  }

  appendAuditLog({
    adminId: 'founder',
    customerSlug: clean,
    action: 'access_updated',
    before,
    after: {
      sessionDurationHours: customerData.sessionDurationHours,
      hasPasscode: Boolean(customerData.passcodeHash),
    },
  })

  return { ok: true, version: customerData.version }
}

/**
 * Update active window [activeFrom, activeUntil].
 */
export function updateCustomerWindow(slug, { activeFrom, activeUntil }) {
  const clean = validateSlug(slug)
  const master = loadMaster(true)
  const masterEntry = master.customers.find((c) => c.slug === clean)
  if (!masterEntry) {
    throw new Error(`Customer '${clean}' not found`)
  }

  const cDir = path.join(customersDir, clean)
  const cJsonPath = path.join(cDir, 'customer.json')
  let customerData = {}
  if (fs.existsSync(cJsonPath)) {
    customerData = JSON.parse(fs.readFileSync(cJsonPath, 'utf8'))
  }

  const before = {
    activeFrom: masterEntry.activeFrom,
    activeUntil: masterEntry.activeUntil,
  }

  const validateIso = (d) => {
    if (!d) return null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      throw new Error(`Date must be in YYYY-MM-DD format (got '${d}')`)
    }
    return d
  }

  masterEntry.activeFrom = validateIso(activeFrom)
  masterEntry.activeUntil = validateIso(activeUntil)
  customerData.activeFrom = masterEntry.activeFrom
  customerData.activeUntil = masterEntry.activeUntil

  customerData.version = (customerData.version || 1) + 1
  masterEntry.version = customerData.version
  customerData.updatedAt = new Date().toISOString()

  fs.writeFileSync(cJsonPath, JSON.stringify(customerData, null, 2), 'utf8')
  saveMaster(master)

  appendAuditLog({
    adminId: 'founder',
    customerSlug: clean,
    action: 'window_updated',
    before,
    after: { activeFrom: masterEntry.activeFrom, activeUntil: masterEntry.activeUntil },
  })

  return {
    ok: true,
    activeFrom: masterEntry.activeFrom,
    activeUntil: masterEntry.activeUntil,
    version: customerData.version,
  }
}

/**
 * Replace customer quotes.
 */
export function updateCustomerQuotes(slug, quotes) {
  const clean = validateSlug(slug)
  const cDir = path.join(customersDir, clean)
  const quotesPath = path.join(cDir, 'quotes.json')
  const cJsonPath = path.join(cDir, 'customer.json')

  let before = {}
  if (fs.existsSync(quotesPath)) {
    try {
      before = JSON.parse(fs.readFileSync(quotesPath, 'utf8'))
    } catch {}
  }

  const content = quotes && typeof quotes === 'object' ? quotes : {}
  fs.writeFileSync(quotesPath, JSON.stringify(content, null, 2), 'utf8')

  if (fs.existsSync(cJsonPath)) {
    const cData = JSON.parse(fs.readFileSync(cJsonPath, 'utf8'))
    cData.version = (cData.version || 1) + 1
    cData.updatedAt = new Date().toISOString()
    fs.writeFileSync(cJsonPath, JSON.stringify(cData, null, 2), 'utf8')

    const master = loadMaster(true)
    const me = master.customers.find((c) => c.slug === clean)
    if (me) {
      me.version = cData.version
      saveMaster(master)
    }
  }

  appendAuditLog({
    adminId: 'founder',
    customerSlug: clean,
    action: 'quotes_updated',
    before: { keyCount: Object.keys(before).length },
    after: { keyCount: Object.keys(content).length },
  })

  return { ok: true }
}

/**
 * Delete customer and optionally remove or archive files.
 */
export function deleteCustomer(slug) {
  const clean = validateSlug(slug)
  const master = loadMaster(true)
  const idx = master.customers.findIndex((c) => c.slug === clean)
  if (idx === -1) {
    throw new Error(`Customer '${clean}' not found`)
  }
  const removed = master.customers.splice(idx, 1)[0]
  saveMaster(master)

  // Remove customer folder
  const cDir = path.join(customersDir, clean)
  if (fs.existsSync(cDir)) {
    try {
      fs.rmSync(cDir, { recursive: true, force: true })
    } catch (err) {
      console.warn(`[customerStore] Could not remove dir ${cDir}:`, err.message)
    }
  }

  appendAuditLog({
    adminId: 'founder',
    customerSlug: clean,
    action: 'customer_deleted',
    before: removed,
    after: null,
  })

  return { ok: true, removed }
}

// ---------------------------------------------------------------------------
// 75-Slot Photo Management
// ---------------------------------------------------------------------------

export function resolveRoomInfo(roomKeyOrFolder) {
  if (roomKeyOrFolder === undefined || roomKeyOrFolder === null) return null
  const str = String(roomKeyOrFolder).toLowerCase().trim()
  return (
    CANONICAL_ROOMS.find(
      (r) =>
        r.key === str ||
        r.folder === str ||
        String(r.roomIndex) === str ||
        `0${r.roomIndex}` === str ||
        r.name.toLowerCase() === str
    ) || null
  )
}

export function resolveSlotInfo(roomInfo, slotKeyOrIndex) {
  if (!roomInfo || slotKeyOrIndex === undefined || slotKeyOrIndex === null) return null
  const str = String(slotKeyOrIndex).toLowerCase().trim()
  const num = parseInt(str, 10)
  return (
    roomInfo.slots.find(
      (s) =>
        s.slot === num ||
        s.name.toLowerCase() === str ||
        `${s.name}.png`.toLowerCase() === str
    ) || null
  )
}

/**
 * Enumerate all 75 slots for a customer and report their presence and metadata.
 */
export function listCustomerPhotos(slug) {
  const clean = validateSlug(slug)
  const cDir = path.join(customersDir, clean)
  const photosDir = path.join(cDir, 'photos')

  const slotsReport = []
  let filledCount = 0

  for (const room of CANONICAL_ROOMS) {
    const roomPath = path.join(photosDir, room.folder)
    const roomExists = fs.existsSync(roomPath)

    for (const slot of room.slots) {
      const fileName = `${slot.name}.png`
      const filePath = path.join(roomPath, fileName)
      let exists = false
      let sizeBytes = 0
      let modifiedAt = null

      if (roomExists && fs.existsSync(filePath)) {
        try {
          const s = fs.statSync(filePath)
          if (s.isFile()) {
            exists = true
            sizeBytes = s.size
            modifiedAt = s.mtime.toISOString()
            filledCount++
          }
        } catch {}
      }

      slotsReport.push({
        roomIndex: room.roomIndex,
        roomKey: room.key,
        roomFolder: room.folder,
        roomName: room.name,
        slot: slot.slot,
        slotName: slot.name,
        fileName,
        path: `/photos/${room.folder}/${fileName}`,
        exists,
        sizeBytes,
        modifiedAt,
      })
    }
  }

  return {
    slug: clean,
    totalSlots: 75,
    filledSlots: filledCount,
    missingSlots: 75 - filledCount,
    slots: slotsReport,
  }
}

/**
 * Save an image buffer to a specific room/slot for a customer.
 */
export function saveCustomerPhoto(slug, roomKeyOrFolder, slotKeyOrIndex, buffer) {
  const clean = validateSlug(slug)
  const roomInfo = resolveRoomInfo(roomKeyOrFolder)
  if (!roomInfo) {
    throw new Error(`Unknown room identifier '${roomKeyOrFolder}'`)
  }
  const slotInfo = resolveSlotInfo(roomInfo, slotKeyOrIndex)
  if (!slotInfo) {
    throw new Error(`Invalid slot '${slotKeyOrIndex}' for room '${roomInfo.name}'`)
  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Image buffer cannot be empty')
  }

  const cDir = path.join(customersDir, clean)
  const roomDir = path.join(cDir, 'photos', roomInfo.folder)
  ensureDir(roomDir)

  const fileName = `${slotInfo.name}.png`
  const targetPath = path.join(roomDir, fileName)
  const tmpPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`

  fs.writeFileSync(tmpPath, buffer)
  try {
    fs.renameSync(tmpPath, targetPath)
  } catch {
    fs.copyFileSync(tmpPath, targetPath)
    try { fs.unlinkSync(tmpPath) } catch {}
  }

  // Bump version
  const cJsonPath = path.join(cDir, 'customer.json')
  if (fs.existsSync(cJsonPath)) {
    const cData = JSON.parse(fs.readFileSync(cJsonPath, 'utf8'))
    cData.version = (cData.version || 1) + 1
    cData.updatedAt = new Date().toISOString()
    fs.writeFileSync(cJsonPath, JSON.stringify(cData, null, 2), 'utf8')

    const master = loadMaster(true)
    const me = master.customers.find((c) => c.slug === clean)
    if (me) {
      me.version = cData.version
      saveMaster(master)
    }
  }

  appendAuditLog({
    adminId: 'founder',
    customerSlug: clean,
    action: 'photo_uploaded',
    before: null,
    after: { room: roomInfo.folder, slot: slotInfo.name, sizeBytes: buffer.length },
  })

  return {
    ok: true,
    room: roomInfo.folder,
    slot: slotInfo.slot,
    fileName,
    sizeBytes: buffer.length,
  }
}

/**
 * Delete a photo from a specific room/slot for a customer.
 */
export function deleteCustomerPhoto(slug, roomKeyOrFolder, slotKeyOrIndex) {
  const clean = validateSlug(slug)
  const roomInfo = resolveRoomInfo(roomKeyOrFolder)
  if (!roomInfo) {
    throw new Error(`Unknown room identifier '${roomKeyOrFolder}'`)
  }
  const slotInfo = resolveSlotInfo(roomInfo, slotKeyOrIndex)
  if (!slotInfo) {
    throw new Error(`Invalid slot '${slotKeyOrIndex}' for room '${roomInfo.name}'`)
  }

  const cDir = path.join(customersDir, clean)
  const targetPath = path.join(cDir, 'photos', roomInfo.folder, `${slotInfo.name}.png`)

  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath)
  }

  // Bump version
  const cJsonPath = path.join(cDir, 'customer.json')
  if (fs.existsSync(cJsonPath)) {
    const cData = JSON.parse(fs.readFileSync(cJsonPath, 'utf8'))
    cData.version = (cData.version || 1) + 1
    cData.updatedAt = new Date().toISOString()
    fs.writeFileSync(cJsonPath, JSON.stringify(cData, null, 2), 'utf8')

    const master = loadMaster(true)
    const me = master.customers.find((c) => c.slug === clean)
    if (me) {
      me.version = cData.version
      saveMaster(master)
    }
  }

  appendAuditLog({
    adminId: 'founder',
    customerSlug: clean,
    action: 'photo_deleted',
    before: { room: roomInfo.folder, slot: slotInfo.name },
    after: null,
  })

  return { ok: true, room: roomInfo.folder, slot: slotInfo.slot }
}

// ---------------------------------------------------------------------------
// Audit Logging (data/audit_log.json)
// ---------------------------------------------------------------------------

export function appendAuditLog({ adminId = 'founder', customerSlug = null, action, before = null, after = null }) {
  try {
    ensureDir(dataDir)
    let logs = []
    if (fs.existsSync(auditLogPath)) {
      try {
        const raw = fs.readFileSync(auditLogPath, 'utf8')
        if (raw.trim()) {
          logs = JSON.parse(raw)
          if (!Array.isArray(logs)) logs = []
        }
      } catch {}
    }

    const entry = {
      id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      at: new Date().toISOString(),
      adminId,
      customerSlug,
      action,
      before,
      after,
    }

    logs.push(entry)
    // Keep last 1000 entries
    if (logs.length > 1000) logs = logs.slice(-1000)

    const tmp = `${auditLogPath}.${Date.now()}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(logs, null, 2), 'utf8')
    try {
      fs.renameSync(tmp, auditLogPath)
    } catch {
      fs.copyFileSync(tmp, auditLogPath)
      try { fs.unlinkSync(tmp) } catch {}
    }
    return entry
  } catch (err) {
    console.error('[customerStore] Failed to append audit log:', err.message)
    return null
  }
}

export function getAuditLogs(limit = 100) {
  try {
    if (!fs.existsSync(auditLogPath)) return []
    const raw = fs.readFileSync(auditLogPath, 'utf8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.slice(-limit).reverse()
    }
  } catch {}
  return []
}
