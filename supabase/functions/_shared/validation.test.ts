import { describe, expect, it } from 'vitest'
import { rankedText } from './rankedText'
import type { Keystroke } from './scoring'
import { LIMITS, parseLog, validateRanked } from './validation'

const TEXT = rankedText(42, 30)

/** Types `text` with gaps produced by `gap(i)`; stops at `untilMs`. */
function typeText(text: string, gap: (i: number) => number, untilMs = 30_000): Keystroke[] {
  const log: Keystroke[] = []
  let t = 0
  for (let i = 0; i < text.length; i++) {
    if (i > 0) t += gap(i)
    if (t > untilMs) break
    log.push({ k: text[i], t: Math.round(t * 10) / 10 })
  }
  return log
}

/** Human-like rhythm: ~60 WPM with uneven gaps (deterministic). */
const human = (i: number) => 200 * (0.5 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1)

const base = { text: TEXT, durationMs: 30_000, issuedAt: 1_000_000, now: 1_000_000 + 32_000 }

describe('validateRanked', () => {
  it('accepts a human-like attempt and scores it from the log', () => {
    const v = validateRanked({ ...base, log: typeText(TEXT, human) })
    expect(v.ok).toBe(true)
    expect(v.summary!.wpm).toBeGreaterThan(40)
    expect(v.summary!.wpm).toBeLessThan(90)
    expect(v.summary!.durationMs).toBe(30_000)
  })

  it('rejects impossible speed', () => {
    const v = validateRanked({ ...base, log: typeText(TEXT, () => 15 + Math.random() * 10) })
    expect(v).toMatchObject({ ok: false, reason: 'impossible-speed' })
  })

  it('rejects perfectly even (robotic) timing at a believable speed', () => {
    const v = validateRanked({ ...base, log: typeText(TEXT, () => 120) })
    expect(v).toMatchObject({ ok: false, reason: 'robotic-timing' })
  })

  it('rejects keys after the time limit', () => {
    const log = typeText(TEXT, human, 40_000)
    expect(validateRanked({ ...base, now: base.issuedAt + 60_000, log })).toMatchObject({ ok: false, reason: 'after-time-limit' })
  })

  it('rejects a log covering more time than really passed', () => {
    const log = typeText(TEXT, human)
    expect(validateRanked({ ...base, now: base.issuedAt + 10_000, log })).toMatchObject({ ok: false, reason: 'clock-mismatch' })
  })

  it('rejects an expired test and a too-short attempt', () => {
    expect(validateRanked({ ...base, now: base.issuedAt + LIMITS.maxIssueAgeMs + 1, log: typeText(TEXT, human) }).reason).toBe('expired')
    expect(validateRanked({ ...base, log: typeText(TEXT.slice(0, 5), human) }).reason).toBe('too-short')
  })

  it('a client-claimed WPM field is ignored: only the log counts', () => {
    const log = typeText(TEXT, human).map((e) => ({ ...e, wpm: 999 }))
    const v = validateRanked({ ...base, log })
    expect(v.ok).toBe(true)
    expect(v.summary!.wpm).toBeLessThan(90)
  })
})

describe('parseLog', () => {
  it('rejects malformed logs', () => {
    expect(parseLog('nope')).toBeNull()
    expect(parseLog([])).toBeNull()
    expect(parseLog([{ k: 'a', t: 5 }])).toBeNull() // must start at 0
    expect(parseLog([{ k: 'a', t: 0 }, { k: 'b', t: -1 }])).toBeNull() // time goes back
    expect(parseLog([{ k: 'ab', t: 0 }])).toBeNull() // pasted chunk
    expect(parseLog([{ k: 'Enter', t: 0 }])).toBeNull()
    expect(parseLog([{ k: 'a', t: 0 }, { k: 'Backspace', t: 80 }])).toHaveLength(2)
  })
})

describe('rankedText', () => {
  it('is long enough and deterministic per seed', () => {
    expect(rankedText(1, 30).split(' ').length).toBeGreaterThanOrEqual(130)
    expect(rankedText(1, 60)).toBe(rankedText(1, 60))
    expect(rankedText(1, 60)).not.toBe(rankedText(2, 60))
  })
})
