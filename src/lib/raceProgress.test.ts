import { describe, expect, it } from 'vitest'
import { acceptProgress } from './raceProgress'

const online = new Set(['a', 'b'])

describe('acceptProgress', () => {
  it('accepts a normal update from a player who is in the room', () => {
    expect(acceptProgress({ id: 'a', pos: 0.4, wpm: 62 }, online, 'me')).toEqual({ id: 'a', pos: 0.4, wpm: 62 })
  })

  it('ignores updates for someone who is not in the room, or for yourself', () => {
    expect(acceptProgress({ id: 'stranger', pos: 1, wpm: 90 }, online, 'me')).toBeNull()
    expect(acceptProgress({ id: 'me', pos: 1, wpm: 90 }, new Set(['me']), 'me')).toBeNull()
  })

  it('ignores malformed payloads', () => {
    expect(acceptProgress(null, online, 'me')).toBeNull()
    expect(acceptProgress('x', online, 'me')).toBeNull()
    expect(acceptProgress({ id: 5, pos: 0.1, wpm: 10 }, online, 'me')).toBeNull()
    expect(acceptProgress({ id: 'a', pos: 'half', wpm: 10 }, online, 'me')).toBeNull()
    expect(acceptProgress({ id: 'a', pos: Infinity, wpm: 10 }, online, 'me')).toBeNull()
  })

  it('keeps the numbers in a sane range', () => {
    expect(acceptProgress({ id: 'a', pos: 7, wpm: 9999 }, online, 'me')).toEqual({ id: 'a', pos: 1, wpm: 400 })
    expect(acceptProgress({ id: 'a', pos: -3, wpm: -5 }, online, 'me')).toEqual({ id: 'a', pos: 0, wpm: 0 })
  })
})
