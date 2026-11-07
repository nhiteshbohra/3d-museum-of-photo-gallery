// =========================================================================
// Photo Slot Checker (scripts/check_photos.mjs)
// Validates presence of slot artwork images under public/photos/
// =========================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const photosDir = path.join(rootDir, 'public/photos')

const SALON_SLOTS = [
  '01_partition_front_highlight',
  '02_partition_back_highlight',
  '03_north_wall_masterpiece',
  '04_south_wall_gate_left',
  '05_south_wall_gate_right',
  '06_east_wall_artwork_1',
  '07_east_wall_artwork_2',
  '08_east_wall_artwork_3',
  '09_east_wall_artwork_4',
  '10_east_wall_artwork_5',
  '11_partition_front_companion',
  '12_partition_back_companion',
]

const ROOM_FOLDERS = [
  {
    key: 'lobby',
    folder: '00_grand_lobby',
    slots: [
      '01_south_wall_masterpiece',
      '02_south_wall_companion_left',
      '03_south_wall_companion_right',
    ],
  },
  { key: 'fireside', folder: '01_fireside_winter_memories', slots: SALON_SLOTS },
  { key: 'music', folder: '02_music_classical_melodies', slots: SALON_SLOTS },
  { key: 'library', folder: '03_library_reading_nook', slots: SALON_SLOTS },
  { key: 'paris', folder: '04_masterpiece_paris_romance', slots: SALON_SLOTS },
  { key: 'orangery', folder: '05_the_glass_orangery', slots: SALON_SLOTS },
  { key: 'alcove', folder: '06_secret_promise_alcove', slots: SALON_SLOTS },
]

const results = []
let total = 0
let foundCount = 0
let missingCount = 0

for (const room of ROOM_FOLDERS) {
  const dirPath = path.join(photosDir, room.folder)
  const dirExists = fs.existsSync(dirPath)

  for (const slot of room.slots) {
    total++
    const filename = `${slot}.png`
    const filePath = path.join(dirPath, filename)
    const exists = dirExists && fs.existsSync(filePath)

    if (exists) {
      foundCount++
      results.push({ room: room.key, folder: room.folder, slot, status: 'FOUND' })
    } else {
      missingCount++
      results.push({ room: room.key, folder: room.folder, slot, status: 'MISSING' })
    }
  }
}

console.log(`\nPHOTO AUDIT: ${foundCount}/${total} photos present (${missingCount} missing)\n`)
const missing = results.filter(r => r.status === 'MISSING')
if (missing.length > 0) {
  console.table(missing.map(m => ({ Room: m.room, Folder: m.folder, File: `${m.slot}.png` })))
  const isStrict = process.argv.includes('--strict')
  if (isStrict) {
    console.error(`\n❌ Strict check failed: ${missing.length} photos missing!`)
    process.exit(1)
  } else {
    console.warn(`\n⚠️ ${missing.length} photos missing. Run with --strict to enforce in CI.`)
  }
} else {
  console.log('✓ All 61 photo assets present!')
}

