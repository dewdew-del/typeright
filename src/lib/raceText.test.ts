import { describe, expect, it } from 'vitest'
import { RACE_TEXT_TYPES, raceText } from './raceText'

describe('raceText', () => {
  it('every type gives 20 to 320 printable characters (what the server accepts)', () => {
    for (const type of RACE_TEXT_TYPES) {
      for (const seed of [1, 2, 3, 4]) {
        const t = raceText(type, seed)
        expect(t.length, type).toBeGreaterThanOrEqual(20)
        expect(t.length, type).toBeLessThanOrEqual(320)
        expect(t, type).toMatch(/^[ -~]+$/)
      }
    }
  })
})
