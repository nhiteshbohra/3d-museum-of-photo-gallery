// =========================================================================
// EMOTES — Single source of truth for approved avatar emotes & keybindings.
// Only approved emotes: Wave, Dance, Nod (ANIM-01).
// Shared by keyboard input, touch UI, network relay clamps, and avatar mixers.
// =========================================================================

export const EMOTES = [
  { id: 1, key: 'Digit1', label: 'Wave',  clip: 'wave', durationMs: 1500 },
  { id: 2, key: 'Digit2', label: 'Dance', clip: 'casual_dance', durationMs: 3500 },
  { id: 3, key: 'Digit3', label: 'Nod',   clip: 'nod_yes', durationMs: 1500 },
]

export function getEmoteByKey(code) {
  return EMOTES.find(e => e.key === code) || null
}

export function getEmoteById(id) {
  return EMOTES.find(e => e.id === Number(id)) || null
}
