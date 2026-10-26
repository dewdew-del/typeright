import { describe, expect, it } from 'vitest'
import { BACKSPACE, replay, type Keystroke } from './scoring'

/** Types `keys` one per `gap` ms, starting at t = 0. */
const keys = (seq: string[], gap = 100): Keystroke[] => seq.map((k, i) => ({ k, t: i * gap }))
const chars = (s: string) => s.split('')

describe('replay: speed and accuracy', () => {
  it('perfect typing: 11 chars over 1 s is 132 WPM at 100%', () => {
    const { summary } = replay('hello world', keys(chars('hello world')))
    expect(summary.durationMs).toBe(1000)
    expect(summary.correctChars).toBe(11)
    expect(summary.wpm).toBeCloseTo(132, 5)
    expect(summary.rawWpm).toBeCloseTo(132, 5)
    expect(summary.accuracy).toBe(100)
    expect(summary.complete).toBe(true)
  })

  it('a corrected mistake keeps net WPM but lowers accuracy', () => {
    const { state, summary } = replay('abc', keys(['a', 'x', BACKSPACE, 'b', 'c']))
    expect(state.typed.join('')).toBe('abc')
    expect(summary.correctChars).toBe(3)
    expect(summary.accuracy).toBeCloseTo(75, 5)
    expect(state.backspaces).toBe(1)
  })

  it('an uncorrected mistake in free mode counts against WPM and accuracy', () => {
    const { summary } = replay('abc', keys(['a', 'x', 'c']))
    expect(summary.correctChars).toBe(2)
    expect(summary.accuracy).toBeCloseTo(66.667, 2)
    expect(summary.complete).toBe(true)
  })

  it('nothing typed: 0 WPM, 100% accuracy, not complete', () => {
    const { summary } = replay('abc', [])
    expect(summary).toMatchObject({ wpm: 0, rawWpm: 0, accuracy: 100, complete: false, keystrokes: 0 })
  })

  it('a timed test uses the time limit as duration', () => {
    const { summary } = replay('aaaaaaaaaa', keys(chars('aaaaa')), 'free', 30_000)
    expect(summary.durationMs).toBe(30_000)
    expect(summary.wpm).toBeCloseTo(2, 5) // 5 chars = 1 word in 0.5 min
  })
})

describe('replay: typing rules', () => {
  it('stop-on-error: a wrong key does not advance the cursor', () => {
    const { state, summary } = replay('abc', keys(['a', 'x', 'b', 'c']), 'stop-on-error')
    expect(state.typed.join('')).toBe('abc')
    expect(state.incorrectKeystrokes).toBe(1)
    expect(summary.complete).toBe(true)
  })

  it('stop-on-error ignores Backspace', () => {
    const { state } = replay('abc', keys(['a', BACKSPACE, 'b']), 'stop-on-error')
    expect(state.typed.join('')).toBe('ab')
    expect(state.backspaces).toBe(0)
  })

  it('Backspace on empty text does nothing', () => {
    const { state } = replay('abc', keys([BACKSPACE, 'a']))
    expect(state.typed.join('')).toBe('a')
    expect(state.backspaces).toBe(0)
  })

  it('ignores non-printable keys and anything after completion', () => {
    const { state, summary } = replay('ab', keys(['Shift', 'a', 'Enter', 'b', 'c', 'd']))
    expect(state.typed.join('')).toBe('ab')
    expect(summary.keystrokes).toBe(2)
  })
})

describe('replay: per-key stats', () => {
  it('records attempts and misses on the expected character', () => {
    const { state } = replay('abc', keys(['a', 'x', BACKSPACE, 'b']))
    expect(state.keyStats.a).toEqual({ attempts: 1, misses: 0, totalMs: 0 })
    expect(state.keyStats.b.attempts).toBe(2)
    expect(state.keyStats.b.misses).toBe(1)
  })

  it('accumulates time since the previous keystroke', () => {
    const { state } = replay('ab', [
      { k: 'a', t: 0 },
      { k: 'b', t: 250 },
    ])
    expect(state.keyStats.b.totalMs).toBe(250)
  })
})
