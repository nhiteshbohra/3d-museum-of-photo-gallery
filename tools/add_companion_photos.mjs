import fs from 'node:fs'
import path from 'node:path'

const lobbyDir = 'public/photos/00_grand_lobby'
fs.copyFileSync(path.join(lobbyDir, '01_south_wall_masterpiece.png'), path.join(lobbyDir, '02_south_wall_companion_left.png'))
fs.copyFileSync(path.join(lobbyDir, '01_south_wall_masterpiece.png'), path.join(lobbyDir, '03_south_wall_companion_right.png'))

const salons = [
  '01_fireside_winter_memories',
  '02_music_classical_melodies',
  '03_library_reading_nook',
  '04_masterpiece_paris_romance',
  '05_the_glass_orangery',
  '06_secret_promise_alcove'
]

for (const s of salons) {
  const dir = path.join('public/photos', s)
  fs.copyFileSync(path.join(dir, '01_partition_front_highlight.png'), path.join(dir, '11_partition_front_companion.png'))
  fs.copyFileSync(path.join(dir, '02_partition_back_highlight.png'), path.join(dir, '12_partition_back_companion.png'))
}

console.log('Successfully created all 14 companion photo slots!')

