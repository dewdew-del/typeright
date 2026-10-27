import { describe, expect, it } from 'vitest'
import { floorAccuracy, formatAccuracy, formatTime, keyLabel, slowestKeys, topMissedKeys, wpmSeries } from './stats'

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

describe('slowestKeys and wpmSeries', () => {
  it('finds the slowest keys with enough attempts, ignoring space', () => {
    const slow = slowestKeys({
      a: { attempts: 4, misses: 0, totalMs: 800 },
      b: { attempts: 4, misses: 0, totalMs: 2000 },
      c: { attempts: 1, misses: 0, totalMs: 9000 },
      ' ': { attempts: 9, misses: 0, totalMs: 99999 },
    })
    expect(slow.map((k) => k.char)).toEqual(['b', 'a'])
  })

  it('builds a per-second speed series from the log', () => {
    // 10 correct chars in the first second, nothing after.
    const log = Array.from({ length: 10 }, (_, i) => ({ k: 'a', t: i * 100 }))
    const series = wpmSeries('aaaaaaaaaaaaaaaaaaaa', log, 'free', 2000)
    expect(series).toHaveLength(2)
    expect(series[0]).toBeCloseTo(120, 5) // 10 chars = 2 words in 1 s
    expect(series[1]).toBeCloseTo(60, 5) // same 2 words over 2 s
  })
})

describe('accuracy display', () => {
  it('never rounds up to 100', () => {
    expect(formatAccuracy(99.8)).toBe('99.8')
    expect(formatAccuracy(99.96)).toBe('99.9')
    expect(formatAccuracy(100)).toBe('100')
    expect(formatAccuracy(97)).toBe('97')
    expect(floorAccuracy(99.99)).toBe(99.9)
  })
})
