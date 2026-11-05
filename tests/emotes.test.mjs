// =========================================================================
// Automated Test for Approved Emotes Table & Consistency (ANIM-01, Phase 8.1)
// =========================================================================
import assert from 'node:assert/strict'
import test from 'node:test'
import { EMOTES, getEmoteById, getEmoteByKey } from '../src/avatars/emotes.js'

test('Emote table defines consistent 1-3 approved shortcuts without excluded clap', () => {
  assert.equal(EMOTES.length, 3, 'There must be exactly 3 approved emotes (Wave, Dance, Nod)')

  const expected = [
    { id: 1, key: 'Digit1', label: 'Wave', clip: 'wave' },
    { id: 2, key: 'Digit2', label: 'Dance', clip: 'casual_dance' },
    { id: 3, key: 'Digit3', label: 'Nod', clip: 'nod_yes' },
  ]

  for (let i = 0; i < expected.length; i++) {
    const e = EMOTES[i]
    assert.equal(e.id, expected[i].id)
    assert.equal(e.key, expected[i].key)
    assert.equal(e.label, expected[i].label)
    assert.equal(e.clip, expected[i].clip)
    assert.ok(e.durationMs > 1000, 'Emote duration should be at least 1 second')
  }

  // Ensure 'clap' is definitely excluded
  assert.equal(EMOTES.some(e => e.label.toLowerCase() === 'clap' || e.clip === 'clap'), false, 'Clap must not be in emotes')

  // Lookup helpers
  assert.equal(getEmoteById(1)?.label, 'Wave')
  assert.equal(getEmoteByKey('Digit1')?.label, 'Wave')
  assert.equal(getEmoteById(3)?.label, 'Nod')
  assert.equal(getEmoteByKey('Digit3')?.label, 'Nod')
  assert.equal(getEmoteById(999), null)
  assert.equal(getEmoteByKey('KeyX'), null)
})
