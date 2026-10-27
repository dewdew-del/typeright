import { describe, expect, it } from 'vitest'
import { DIFFICULTIES, RACE_TEXT_TYPES, parseRoomLabel, raceText, roomLabel } from './raceText'

describe('raceText', () => {
  it('every type and difficulty gives 20 to 420 printable characters (the server accepts up to 2000)', async () => {
    for (const type of RACE_TEXT_TYPES) {
      for (const difficulty of DIFFICULTIES) {
        for (const seed of [1, 2, 3, 4]) {
          const t = await raceText(type, difficulty, seed)
          expect(t.length, `${type} ${difficulty}`).toBeGreaterThanOrEqual(20)
          expect(t.length, `${type} ${difficulty}`).toBeLessThanOrEqual(420)
          expect(t, `${type} ${difficulty}`).toMatch(/^[ -~]+$/)
        }
      }
    }
  })

  it('the same seed gives the same text, and harder means longer', async () => {
    expect(await raceText('Sentences', 'Hard', 7)).toBe(await raceText('Sentences', 'Hard', 7))
    for (const type of ['Sentences', 'Quotes', 'Paragraphs', 'Filipino sentences'] as const) {
      let easy = 0
      let hard = 0
      for (let s = 1; s <= 20; s++) {
        easy += (await raceText(type, 'Easy', s)).length
        hard += (await raceText(type, 'Hard', s)).length
      }
      expect(hard, type).toBeGreaterThan(easy)
    }
  })

  it('keeps room labels readable and understands old ones', () => {
    expect(roomLabel('Quotes', 'Hard')).toBe('Quotes - Hard')
    expect(parseRoomLabel('Quotes - Hard')).toEqual({ type: 'Quotes', difficulty: 'Hard' })
    expect(parseRoomLabel('Sentences')).toEqual({ type: 'Sentences', difficulty: 'Medium' })
    expect(parseRoomLabel('Something else')).toEqual({ type: 'Sentences', difficulty: 'Medium' })
  })
})

describe('race text pools', () => {
  it('have 50 new, clean, distinct texts for each difficulty', async () => {
    const [s, q, p, pu, c, f] = await Promise.all([
      import('../content/race/sentences'),
      import('../content/race/quotes'),
      import('../content/race/paragraphs'),
      import('../content/race/punctuation'),
      import('../content/race/code'),
      import('../content/race/fil'),
    ])
    const pools = { sentences: s.RACE_SENTENCES, quotes: q.RACE_QUOTES, paragraphs: p.RACE_PARAGRAPHS, punctuation: pu.RACE_PUNCTUATION, code: c.RACE_CODE, filipino: f.RACE_FIL_SENTENCES }
    for (const [name, tiers] of Object.entries(pools)) {
      for (const tier of ['easy', 'medium', 'hard'] as const) {
        const items = tiers[tier]
        expect(items.length, `${name} ${tier}`).toBe(50)
        expect(new Set(items).size, `${name} ${tier} duplicates`).toBe(50)
        for (const t of items) expect(t, `${name} ${tier}: ${t.slice(0, 30)}`).toMatch(/^[ -~]+$/)
      }
    }
  })
})
