import { describe, expect, it } from 'vitest'
import { replay } from '../../supabase/functions/_shared/scoring'
import { keyFromEvent, type KeyLike } from './keys'
import { createSession, elapsedMs, endSession, extendTarget, isEnded, pressKey, sessionStats } from './session'

const type = (s: ReturnType<typeof createSession>, keys: string[], start = 1000, gap = 100) =>
  keys.forEach((k, i) => pressKey(s, k, start + i * gap))

describe('typing session', () => {
  it('starts the clock on the first character, not on Backspace', () => {
    const s = createSession('ab')
    expect(pressKey(s, 'Backspace', 500)).toBe(false)
    expect(s.startedAt).toBeNull()
    pressKey(s, 'a', 800)
    expect(s.startedAt).toBe(800)
    expect(s.log).toEqual([{ k: 'a', t: 0 }])
  })

  it('ends when the last character is typed, even if it is wrong (free mode)', () => {
    const s = createSession('ab')
    type(s, ['a', 'x'])
    expect(isEnded(s)).toBe(true)
  })

  it('ends when the text is complete and ignores later keys', () => {
    const s = createSession('ab')
    type(s, ['a', 'b', 'c'])
    expect(isEnded(s)).toBe(true)
    expect(s.log.map((k) => k.k)).toEqual(['a', 'b'])
  })

  it('logs every key that counted, including Backspace', () => {
    const s = createSession('abc')
    type(s, ['a', 'x', 'Backspace', 'b'])
    expect(s.log.map((k) => k.k)).toEqual(['a', 'x', 'Backspace', 'b'])
    expect(s.log.map((k) => k.t)).toEqual([0, 100, 200, 300])
  })

  it('does not log ignored keys (Backspace on empty text, Shift)', () => {
    const s = createSession('abc')
    type(s, ['a', 'Backspace', 'Backspace', 'Shift', 'a'])
    expect(s.log.map((k) => k.k)).toEqual(['a', 'Backspace', 'a'])
  })

  it('live stats match a full server-style replay of the log', () => {
    const s = createSession('the cat sat')
    type(s, ['t', 'h', 'r', 'Backspace', 'e', ' ', 'c', 'a', 't', ' ', 's', 'a', 't'])
    const live = sessionStats(s, 99_999)
    const server = replay('the cat sat', s.log).summary
    expect(live.wpm).toBeCloseTo(server.wpm, 6)
    expect(live.accuracy).toBeCloseTo(server.accuracy, 6)
    expect(live.correctChars).toBe(server.correctChars)
  })

  it('a timed session ends at the time limit and is scored over the full limit', () => {
    const s = createSession('aaaaaaaaaaaaaaaaaaaa', 'free', 1000)
    type(s, ['a', 'a', 'a'], 0, 100)
    expect(pressKey(s, 'a', 1500)).toBe(false)
    expect(isEnded(s)).toBe(true)
    expect(elapsedMs(s, 5000)).toBe(1000)
    expect(sessionStats(s, 5000).durationMs).toBe(1000)
  })
})

describe('keyFromEvent', () => {
  const ev = (key: string, extra: Partial<KeyLike> = {}): KeyLike => ({
    key,
    isTrusted: true,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...extra,
  })

  it('passes printable characters and Backspace', () => {
    expect(keyFromEvent(ev('a'))).toBe('a')
    expect(keyFromEvent(ev(' '))).toBe(' ')
    expect(keyFromEvent(ev('Backspace'))).toBe('Backspace')
  })

  it('ignores other keys, shortcuts and script-generated events', () => {
    expect(keyFromEvent(ev('Shift'))).toBeNull()
    expect(keyFromEvent(ev('Enter'))).toBeNull()
    expect(keyFromEvent(ev('v', { ctrlKey: true }))).toBeNull()
    expect(keyFromEvent(ev('a', { isTrusted: false }))).toBeNull()
  })

  it('allows AltGr characters (ctrl+alt on Windows)', () => {
    expect(keyFromEvent(ev('@', { ctrlKey: true, altKey: true }))).toBe('@')
  })
})

describe('endless and early finish', () => {
  it('extends the text without losing what was typed', () => {
    const s = createSession('ab')
    pressKey(s, 'a', 0)
    extendTarget(s, 'c d')
    expect(s.replay.target).toBe('abc d')
    pressKey(s, 'b', 100)
    expect(isEnded(s)).toBe(false)
  })

  it('finish ends the session at that moment', () => {
    const s = createSession('abcdef')
    expect(endSession(s, 50)).toBe(false) // not started yet
    type(s, ['a', 'b'], 0, 100)
    expect(endSession(s, 500)).toBe(true)
    expect(elapsedMs(s, 9999)).toBe(500)
    expect(pressKey(s, 'c', 600)).toBe(false)
  })
})
