// =========================================================================
// ACTION MANIFEST — Authoritative inventory and configuration for all 20
// character animations and user-interactive actions.
// =========================================================================

export const ACTION_CATEGORIES = [
  { id: 'gestures', label: 'Gestures', emoji: '✨' },
  { id: 'dances', label: 'Dances', emoji: '💃' },
  { id: 'seats', label: 'Sofa / Chair', emoji: '🛋️' },
  { id: 'head', label: 'Head Actions', emoji: '👀' },
  { id: 'movement', label: 'Movement Help', emoji: '🚶' },
]

export const ACTIONS = [
  // ── 1. APPROVED GESTURES ───────────────────────────────────────────────
  {
    id: 'wave',
    name: 'Wave',
    category: 'gestures',
    emoji: '👋',
    clip: 'wave',
    key: '1',
    keyCode: 'Digit1',
    networkId: 1,
    loop: false,
    durationMs: 2500,
    playable: true,
    description: 'Warm greeting gesture for your partner',
  },
  {
    id: 'nod',
    name: 'Nod Yes',
    category: 'gestures',
    emoji: '👍',
    clip: 'nod',
    key: '3',
    keyCode: 'Digit3',
    networkId: 3,
    loop: false,
    durationMs: 1800,
    playable: true,
    description: 'Affirmative nod of agreement',
  },
  {
    id: 'shake',
    name: 'Shake Head',
    category: 'gestures',
    emoji: '🙅',
    clip: 'shake',
    key: null,
    keyCode: null,
    networkId: 4,
    loop: false,
    durationMs: 1800,
    playable: true,
    description: 'Gentle contemplative head shake',
  },

  // ── 2. DANCES ──────────────────────────────────────────────────────────
  {
    id: 'dance',
    name: 'Energetic Dance',
    category: 'dances',
    emoji: '💃',
    clip: 'dance',
    key: '2',
    keyCode: 'Digit2',
    networkId: 2,
    loop: true,
    durationMs: 4000,
    playable: true,
    description: 'Joyful expressive museum dance',
  },
  {
    id: 'casualDance',
    name: 'Casual Dance',
    category: 'dances',
    emoji: '🕺',
    clip: 'casualDance',
    key: null,
    keyCode: null,
    networkId: 5,
    loop: true,
    durationMs: 3800,
    playable: true,
    description: 'Gentle, romantic rhythmic sway',
  },

  // ── 3. SOFA & CHAIR (CONTEXTUAL SEATING) ────────────────────────────────
  {
    id: 'sit',
    name: 'Sit Down / Rest',
    category: 'seats',
    emoji: '🛋️',
    clip: 'sit',
    key: 'E',
    keyCode: 'KeyE',
    networkId: null,
    contextual: true,
    playable: true,
    description: 'Claim nearest sofa or chair and rest comfortably',
  },
  {
    id: 'standUp',
    name: 'Stand Up',
    category: 'seats',
    emoji: '🧍',
    clip: 'standUp',
    key: 'E',
    keyCode: 'KeyE',
    networkId: null,
    contextual: true,
    playable: true,
    description: 'Stand up and resume walking through the gallery',
  },
  {
    id: 'sitLow',
    name: 'Low Seat Stance',
    category: 'seats',
    emoji: '🪑',
    clip: 'sitLow',
    key: null,
    keyCode: null,
    networkId: null,
    contextual: true,
    playable: false,
    description: 'Automatic adaptation for low benches and curved sofas',
  },
  {
    id: 'sitHigh',
    name: 'High Seat Stance',
    category: 'seats',
    emoji: '🪑',
    clip: 'sitHigh',
    key: null,
    keyCode: null,
    networkId: null,
    contextual: true,
    playable: false,
    description: 'Automatic adaptation for high chairs and stools',
  },
  {
    id: 'sitDown',
    name: 'Seating Transition',
    category: 'seats',
    emoji: '⬇️',
    clip: 'sitDown',
    key: null,
    keyCode: null,
    networkId: null,
    contextual: true,
    playable: false,
    description: 'Smooth physical transition onto seat cushion',
  },

  // ── 4. HEAD ACTIONS ────────────────────────────────────────────────────
  {
    id: 'lookLeft',
    name: 'Look Left',
    category: 'head',
    emoji: '👀',
    clip: 'lookLeft',
    key: null,
    keyCode: null,
    networkId: 6,
    loop: false,
    durationMs: 1800,
    playable: true,
    description: 'Turn head gently to examine artwork on the left wall',
  },
  {
    id: 'lookRight',
    name: 'Look Right',
    category: 'head',
    emoji: '👁️',
    clip: 'lookRight',
    key: null,
    keyCode: null,
    networkId: 7,
    loop: false,
    durationMs: 1800,
    playable: true,
    description: 'Turn head gently to examine artwork on the right wall',
  },

  // ── 5. MOVEMENT HELP & AUTOMATIC LOCOMOTION ─────────────────────────────
  {
    id: 'idle',
    name: 'Idle Stance',
    category: 'movement',
    emoji: '🧍',
    clip: 'idle',
    controls: 'Automatic when stationary',
    description: 'Natural weight-shift breathing idle',
  },
  {
    id: 'walk',
    name: 'Walk (2.4 m/s)',
    category: 'movement',
    emoji: '🚶',
    clip: 'walk',
    controls: 'W A S D / Arrows / Joystick',
    description: 'Natural museum strolling speed',
  },
  {
    id: 'run',
    name: 'Sprint (4.8 m/s)',
    category: 'movement',
    emoji: '🏃',
    clip: 'run',
    controls: 'Hold Shift + Walk',
    description: 'Accelerated locomotion across large salons',
  },
  {
    id: 'jump',
    name: 'Jump',
    category: 'movement',
    emoji: '🦘',
    clip: 'jump',
    controls: 'Spacebar / Mobile JUMP',
    description: 'Physics-driven jump with landing damping',
  },
  {
    id: 'turn',
    name: 'Turn in Place',
    category: 'movement',
    emoji: '🔄',
    clip: 'turn',
    controls: 'Mouse yaw / Right joystick',
    description: 'Natural footwork alignment during camera turning',
  },
  {
    id: 'walkStart',
    name: 'Walk Start',
    category: 'movement',
    emoji: '▶️',
    clip: 'walkStart',
    controls: 'Automatic on input',
    description: 'Initial weight transfer and forward push',
  },
  {
    id: 'walkStop',
    name: 'Walk Stop',
    category: 'movement',
    emoji: '⏹️',
    clip: 'walkStop',
    controls: 'Automatic on release',
    description: 'Deceleration inertia and grounding stop',
  },
  {
    id: 'stepBack',
    name: 'Step Back',
    category: 'movement',
    emoji: '◀️',
    clip: 'stepBack',
    controls: 'S / Down arrow',
    description: 'Controlled backward stepping away from artwork',
  },
]

export function getActionById(id) {
  return ACTIONS.find(a => a.id === id) || null
}

export function getActionByNetworkId(netId) {
  return ACTIONS.find(a => a.networkId === netId) || null
}

export function getActionByKey(code) {
  return ACTIONS.find(a => a.keyCode === code) || null
}

export function getActionsByCategory(category) {
  return ACTIONS.filter(a => a.category === category)
}

