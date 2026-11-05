import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const REGIONS = { skin: 'Skin', hair: 'Hair', top: 'Top', trousers: 'Trousers' }
const DEFAULT_COLORS = { skin: '#bb805c', hair: '#69452d', top: '#3c665a', trousers: '#303d62' }
const STORAGE_KEY = 'ourmuseum:characterLooks:v1'

export function createCharacterSetup(container, roster, { onSelect, onChange }) {
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {} } catch {}
  const looks = Object.fromEntries(roster.map(a => [a.id, {
    name: typeof saved[a.id]?.name === 'string' ? saved[a.id].name.slice(0, 24) : a.name,
    appearance: Object.fromEntries(Object.keys(REGIONS).map(k => [k, /^#[0-9a-f]{6}$/i.test(saved[a.id]?.appearance?.[k]) ? saved[a.id].appearance[k] : null])),
  }]))
  let selectedId = null
  container.innerHTML = `
    <div class="character-heading"><span class="character-eyebrow">YOUR MUSEUM VISIT</span>
      <h2>Make yourself at home.</h2><p>Choose a character and make it yours.</p></div>
    <div class="character-layout">
      <div class="character-stage" aria-label="Your character preview">
        <p class="character-placeholder">Choose a character to begin.</p>
        <div class="character-turn"><button type="button" data-turn="-1" aria-label="Rotate character left">↶</button>
          <span>Drag to turn · Scroll to zoom</span><button type="button" data-turn="1" aria-label="Rotate character right">↷</button></div>
      </div>
      <div class="character-details"><span class="character-label">CHARACTER</span><div id="avatar-grid" role="group" aria-label="Choose a character"></div>
        <div class="character-fields" hidden>
          <label class="character-name-label" for="visitor-name">Your name</label>
          <input id="visitor-name" type="text" maxlength="24" autocomplete="nickname" spellcheck="false">
          <div class="character-colors-heading"><span>Make it yours</span><span>COLOURS</span></div>
          <div class="character-colors"></div>
          <p class="character-save-note">Your look is saved on this device.</p>
        </div>
      </div>
    </div>`
  const stage = container.querySelector('.character-stage')
  const fields = container.querySelector('.character-fields')
  const nameInput = container.querySelector('#visitor-name')
  const grid = container.querySelector('#avatar-grid')
  const profile = () => selectedId ? { ...roster.find(a => a.id === selectedId), ...looks[selectedId] } : null
  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(looks)) } catch {
      container.querySelector('.character-save-note').textContent = 'Your look will be used for this visit.'
    }
    onChange(profile())
  }
  for (const a of roster) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'avatar-card'
    button.dataset.avatarId = a.id
    button.textContent = a.name
    button.setAttribute('aria-pressed', 'false')
    button.addEventListener('click', () => {
      selectedId = a.id
      fields.hidden = false
      nameInput.value = looks[a.id].name
      for (const card of grid.children) {
        const active = card.dataset.avatarId === a.id
        card.classList.toggle('selected', active)
        card.setAttribute('aria-pressed', String(active))
      }
      renderColors()
      onSelect(a.id)
    })
    grid.appendChild(button)
  }
  nameInput.addEventListener('input', () => {
    looks[selectedId].name = nameInput.value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24) || roster.find(a => a.id === selectedId).name
    save()
  })
  function renderColors() {
    const colors = container.querySelector('.character-colors')
    colors.replaceChildren()
    for (const [key, label] of Object.entries(REGIONS)) {
      const row = document.createElement('div')
      row.className = 'character-color-row'
      row.innerHTML = `<label for="look-${key}">${label}</label><input id="look-${key}" type="color" aria-label="${label} colour"><button type="button">Original</button>`
      const input = row.querySelector('input')
      const original = row.querySelector('button')
      original.setAttribute('aria-label', `Restore original ${label.toLowerCase()} colour`)
      input.value = looks[selectedId].appearance[key] || DEFAULT_COLORS[key]
      original.setAttribute('aria-pressed', String(!looks[selectedId].appearance[key]))
      input.addEventListener('change', () => {
        looks[selectedId].appearance[key] = input.value
        original.setAttribute('aria-pressed', 'false')
        save()
      })
      original.addEventListener('click', () => {
        looks[selectedId].appearance[key] = null
        renderColors()
        save()
      })
      colors.appendChild(row)
    }
  }

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D character preview')
  stage.prepend(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 30)
  camera.position.set(0, 1.2, 3.9)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.85, 0)
  controls.enablePan = false
  controls.minDistance = 2.6
  controls.maxDistance = 5
  controls.minPolarAngle = 0.6
  controls.maxPolarAngle = 1.7
  scene.add(new THREE.HemisphereLight(0xfff4e4, 0x465064, 2.2))
  const light = new THREE.DirectionalLight(0xffecd8, 3)
  light.position.set(2, 4, 5)
  scene.add(light)
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.73, 0.06, 64), new THREE.MeshStandardMaterial({ color: 0x282730, roughness: 0.7, metalness: 0.25 }))
  plinth.position.y = -0.035
  scene.add(plinth)
  const preview = { renderer, scene, camera, controls, avatar: null, running: true, last: performance.now() }
  function draw() {
    if (!preview.running) return
    const now = performance.now()
    const dt = Math.min((now - preview.last) / 1000, 0.05)
    preview.last = now
    if (preview.avatar?.alive) {
      preview.avatar.update(now, dt)
      preview.avatar.tag.style.display = 'none'
    }
    preview.controls.update()
    renderer.render(scene, camera)
  }
  let frameId = 0
  function previewFrame() {
    if (!preview.running) return
    draw()
    frameId = requestAnimationFrame(previewFrame)
  }
  const observer = new ResizeObserver(() => {
    renderer.setSize(stage.clientWidth, stage.clientHeight, false)
    camera.aspect = stage.clientWidth / Math.max(1, stage.clientHeight)
    camera.updateProjectionMatrix()
    draw()
  })
  observer.observe(stage)
  for (const button of container.querySelectorAll('[data-turn]')) button.addEventListener('click', () => {
    if (preview.avatar) preview.avatar.group.rotation.y += Number(button.dataset.turn) * Math.PI / 6
    draw()
  })
  frameId = requestAnimationFrame(previewFrame)
  return {
    getProfile: profile,
    setAvatar(avatar) {
      preview.avatar = avatar
      avatar.group.visible = true
      avatar.group.position.set(0, 0, 0)
      avatar.group.rotation.y = 0
      avatar.camera = camera
      scene.add(avatar.group)
      stage.querySelector('.character-placeholder').hidden = true
      draw()
    },
    enter(museumScene) {
      preview.running = false
      cancelAnimationFrame(frameId)
      observer.disconnect()
      controls.dispose()
      if (preview.avatar) museumScene.add(preview.avatar.group)
      plinth.geometry.dispose()
      plinth.material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
