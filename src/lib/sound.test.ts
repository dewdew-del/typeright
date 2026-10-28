import { describe, expect, it } from 'vitest'
import { playCue, playKeySound } from './sound'

describe('sounds without audio support', () => {
  // The test runs in Node, where AudioContext does not exist: sounds must fail silently, never break a race.
  it('playCue does not throw for any cue', () => {
    for (const kind of ['tick', 'go', 'win', 'lose'] as const) expect(() => playCue(kind)).not.toThrow()
  })

  it('playKeySound does not throw', () => {
    expect(() => playKeySound(true)).not.toThrow()
  })
})
