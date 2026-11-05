// One-time copy: V3 avatar studio -> public/models/ready/characters/
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

const src = 'archive/museum_avatar_studio_complete_v3/assets'
const dst = 'public/models/ready/characters'

const copy = (from, to) => {
  const parent = join(to, '..')
  if (existsSync(to)) {
    const s = statSync(to)
    const sf = statSync(from)
    if (s.isDirectory() !== sf.isDirectory()) rmSync(to, { recursive: true, force: true })
  }
  mkdirSync(parent, { recursive: true })
  cpSync(from, to, { recursive: true, force: true })
  console.log('copied', from, '->', to)
}

if (!existsSync(src)) { console.error('missing source', src); process.exit(1) }

// Base characters
copy(join(src, 'man.glb'), join(dst, 'man.glb'))
copy(join(src, 'woman.glb'), join(dst, 'woman.glb'))

// Realism textures -> textures/<sex>/
for (const s of ['man', 'woman']) {
  const files = readdirSync(src).filter(f => f.startsWith(s + '-'))
  for (const f of files) copy(join(src, f), join(dst, 'textures', s, f))
}

// Animations
for (const s of ['man', 'woman']) {
  const animSrc = join(src, 'animations', s)
  if (!existsSync(animSrc)) { console.warn('no animations for', s); continue }
  mkdirSync(join(dst, 'animations', s), { recursive: true })
  for (const f of readdirSync(animSrc)) {
    if (f.endsWith('.glb')) copy(join(animSrc, f), join(dst, 'animations', s, f))
  }
}

console.log('DONE')
