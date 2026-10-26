import { describe, expect, it } from 'vitest'
import { formatTime, keyLabel, topMissedKeys } from './stats'

describe('stats helpers', () => {
  it('ranks keys by misses, then miss rate, and skips clean keys', () => {
    const top = topMissedKeys({
      a: { attempts: 10, misses: 2, totalMs: 0 },
      b: { attempts: 4, misses: 2, totalMs: 0 },
      c: { attempts: 5, misses: 0, totalMs: 0 },
      d: { attempts: 3, misses: 3, totalMs: 0 },
    })
    expect(top.map((k) => k.char)).toEqual(['d', 'b', 'a'])
  })

  it('formats labels and times', () => {
    expect(keyLabel(' ')).toBe('Space')
    expect(keyLabel('f')).toBe('F')
    expect(formatTime(65_400)).toBe('1:05')
    expect(formatTime(-5)).toBe('0:00')
  })
})
