import { DIALOGUE_EN, PROVERBS_EN, SENTENCES_EN, STORIES_EN } from '../content/sentences/en'
import { SENTENCES_FIL } from '../content/sentences/fil'
import { createRng, type Rng } from '../engine/rng'

export const RACE_TEXT_TYPES = [
  'Words',
  'Sentences',
  'Quotes',
  'Paragraphs',
  'Numbers',
  'Punctuation',
  'Code snippets',
  'Filipino words',
  'Filipino sentences',
  'Mixed',
] as const
export type RaceTextType = (typeof RACE_TEXT_TYPES)[number]

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

const SEPARATOR = ' - '

/** What a room stores and shows, for example "Sentences - Hard". */
export const roomLabel = (type: RaceTextType, difficulty: Difficulty) => `${type}${SEPARATOR}${difficulty}`

/** Reads a stored label back. Older rooms have only the type and count as Medium. */
export function parseRoomLabel(label: string): { type: RaceTextType; difficulty: Difficulty } {
  const [t, d] = label.split(SEPARATOR)
  const type = (RACE_TEXT_TYPES as readonly string[]).includes(t) ? (t as RaceTextType) : 'Sentences'
  const difficulty = (DIFFICULTIES as readonly string[]).includes(d) ? (d as Difficulty) : 'Medium'
  return { type, difficulty }
}

type Tier = 'easy' | 'medium' | 'hard'
const TIER: Record<Difficulty, Tier> = { Easy: 'easy', Medium: 'medium', Hard: 'hard' }
/** Longest text per difficulty (server accepts up to 2000). */
const MAX_LENGTH: Record<Tier, number> = { easy: 180, medium: 280, hard: 420 }

/** Digits, dates, prices and phone-style numbers: short and plain when easy, long and mixed when hard. */
function numbersText(rng: Rng, tier: Tier): string {
  const digits = (n: number) => Array.from({ length: n }, () => rng.int(0, 9)).join('')
  const num = (min: number, max: number) => String(rng.int(min, max))
  const parts: string[] = []
  if (tier === 'easy') {
    for (let i = 0; i < 16; i++) parts.push(digits(rng.int(2, 4)))
  } else if (tier === 'medium') {
    for (let i = 0; i < 7; i++) {
      parts.push(
        rng.pick([
          () => `${num(1, 12)}/${num(1, 28)}/20${num(20, 29)}`,
          () => `${num(1, 12)}:${digits(2).replace(/^[6-9]/, '5')} pm`,
          () => `$${num(2, 99)}.${digits(2)}`,
          () => `0917-${digits(3)}-${digits(4)}`,
          () => `${digits(5)}`,
          () => `${num(10, 99)}%`,
        ])(),
      )
    }
  } else {
    for (let i = 0; i < 9; i++) {
      parts.push(
        rng.pick([
          () => `${num(1, 9)},${digits(3)},${digits(3)}.${digits(2)}`,
          () => `#${digits(4)}-${rng.pick(['A', 'B', 'C', 'X'])}`,
          () => `(20${num(20, 29)}-${num(10, 12)}-${num(10, 28)})`,
          () => `${num(10, 99)}.${digits(2)}% + ${num(2, 9)}/${num(2, 9)}`,
          () => `+63 9${digits(2)} ${digits(3)} ${digits(4)}`,
          () => `${digits(2)}x${digits(2)}=${digits(4)}`,
        ])(),
      )
    }
  }
  return parts.join(' ')
}

/**
 * Race text for the chosen type and difficulty, plain keyboard characters only. The big text pools load on
 * demand, so the rest of the app stays small.
 */
export async function raceText(type: RaceTextType, difficulty: Difficulty = 'Medium', seed = Math.floor(Math.random() * 2 ** 31)): Promise<string> {
  const tier = TIER[difficulty]
  const [{ RACE_SENTENCES }, { RACE_QUOTES }, { RACE_PARAGRAPHS }, { RACE_PUNCTUATION }, { RACE_CODE }, { RACE_FIL_SENTENCES, RACE_FIL_WORDS }, { RACE_WORDS }] =
    await Promise.all([
      import('../content/race/sentences'),
      import('../content/race/quotes'),
      import('../content/race/paragraphs'),
      import('../content/race/punctuation'),
      import('../content/race/code'),
      import('../content/race/fil'),
      import('../content/race/words'),
    ])

  const rng = createRng(seed)
  const pickN = (pool: readonly string[], n: number) => Array.from({ length: n }, () => rng.pick(pool)).join(' ')
  // Medium keeps the older texts too; Easy and Hard have their own sets.
  const pool = (extra: readonly string[], fresh: Record<Tier, string[]>): readonly string[] => (tier === 'medium' ? [...extra, ...fresh.medium] : fresh[tier])

  const sentences = pool(SENTENCES_EN, RACE_SENTENCES)
  const quotes = pool(PROVERBS_EN, RACE_QUOTES)
  const filSentences = pool(SENTENCES_FIL, RACE_FIL_SENTENCES)

  let text: string
  switch (type) {
    case 'Words':
      text = pickN(RACE_WORDS[tier], tier === 'easy' ? 24 : tier === 'medium' ? 26 : 20)
      break
    case 'Sentences':
      text = pickN(sentences, 2)
      break
    case 'Quotes':
      text = pickN(quotes, 3)
      break
    case 'Paragraphs':
      text = rng.pick(pool(STORIES_EN, RACE_PARAGRAPHS))
      break
    case 'Numbers':
      text = numbersText(rng, tier)
      break
    case 'Punctuation':
      text = pickN(pool(DIALOGUE_EN, RACE_PUNCTUATION), tier === 'easy' ? 3 : 2)
      break
    case 'Code snippets':
      text = pickN(RACE_CODE[tier], tier === 'easy' ? 6 : 2)
      break
    case 'Filipino words':
      text = pickN(RACE_FIL_WORDS[tier], tier === 'easy' ? 24 : tier === 'medium' ? 22 : 14)
      break
    case 'Filipino sentences':
      text = pickN(filSentences, 2)
      break
    default:
      text = [rng.pick(sentences), rng.pick(quotes), rng.pick(filSentences)].join(' ')
  }
  // Keep it to printable ASCII (the server checks this too) and a sensible length.
  text = text.replace(/[^ -~]/g, '').replace(/ {2,}/g, ' ').trim()
  const max = MAX_LENGTH[tier]
  return text.length > max ? text.slice(0, text.lastIndexOf(' ', max)) : text
}
