import { LESSONS, allowedKeys } from '../content/lessons/catalog'
import { DIALOGUE_EN, PROVERBS_EN, SENTENCES_EN, STORIES_EN } from '../content/sentences/en'
import { SENTENCES_FIL, WORDS_FIL } from '../content/sentences/fil'
import { buildDrill } from '../engine/drill'
import { createRng } from '../engine/rng'

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

const fromLesson = (title: string, seed: number) => {
  const lesson = LESSONS.find((l) => l.title === title)!
  return buildDrill({ lesson: { ...lesson, length: 200 }, allowed: allowedKeys(lesson), seed })
}

/** Race text for the chosen type: about 150 to 300 characters, plain keyboard characters only. */
export function raceText(type: RaceTextType, seed = Math.floor(Math.random() * 2 ** 31)): string {
  const rng = createRng(seed)
  const pickN = (pool: readonly string[], n: number) => Array.from({ length: n }, () => rng.pick(pool)).join(' ')
  let text: string
  switch (type) {
    case 'Words':
      text = fromLesson('Top 300 words 1', seed)
      break
    case 'Sentences':
      text = pickN(SENTENCES_EN, 3)
      break
    case 'Quotes':
      text = pickN(PROVERBS_EN, 4)
      break
    case 'Paragraphs':
      text = rng.pick(STORIES_EN)
      break
    case 'Numbers':
      text = fromLesson('Numbers in words 1', seed)
      break
    case 'Punctuation':
      text = [rng.pick(DIALOGUE_EN), rng.pick(SENTENCES_EN)].join(' ')
      break
    case 'Code snippets':
      text = fromLesson('Code line 1', seed)
      break
    case 'Filipino words':
      text = pickN(WORDS_FIL, 35)
      break
    case 'Filipino sentences':
      text = pickN(SENTENCES_FIL, 3)
      break
    default:
      text = [rng.pick(SENTENCES_EN), rng.pick(PROVERBS_EN), rng.pick(SENTENCES_FIL)].join(' ')
  }
  // Keep it to printable ASCII (the server checks this too) and a sensible length.
  text = text.replace(/[^ -~]/g, '').replace(/ {2,}/g, ' ').trim()
  return text.length > 320 ? text.slice(0, text.lastIndexOf(' ', 320)) : text
}
