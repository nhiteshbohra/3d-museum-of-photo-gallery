// =========================================================================
// EMOTES — Single source of truth for approved avatar emotes & keybindings.
// Only approved emotes: Wave, Dance, Nod (ANIM-01).
// Shared by keyboard input, touch UI, network relay clamps, and avatar mixers.
// =========================================================================
import { getActionByNetworkId } from './actionManifest.js'

export const EMOTES = [
  { id: 1, key: 'Digit1', label: 'Wave',  clip: 'wave', durationMs: 2500, loop: false },
  { id: 2, key: 'Digit2', label: 'Dance', clip: 'casual_dance', durationMs: 4000, loop: true },
  { id: 3, key: 'Digit3', label: 'Nod',   clip: 'nod_yes', durationMs: 1800, loop: false },
]

export function getEmoteByKey(code) {
  return EMOTES.find(e => e.key === code) || null
}

export function getEmoteById(id) {
  const num = Number(id)
  const existing = EMOTES.find(e => e.id === num)
  if (existing) return existing
  const action = getActionByNetworkId(num)
  if (action) {
    return {
      id: action.networkId,
      key: action.keyCode,
      label: action.name,
      clip: action.clip,
      loop: Boolean(action.loop),
      durationMs: action.durationMs || 2500,
      emoji: action.emoji,
    }
  }
  return null
}
