import type { DrillStyle, LessonDef, LessonType } from './types'
import { SHIFT } from './types'

/** Checkpoint targets per stage (index = stage). */
export const STAGE_TARGET_WPM = [0, 12, 16, 18, 22, 24, 26, 20, 18, 35, 40, 40, 45]
export const STAGE_TARGET_ACCURACY = [0, 92, 94, 95, 95, 95, 95, 95, 94, 96, 96, 96, 96]

export const STAGE_NAMES = [
  'Start',
  'Home row',
  'Top row',
  'Bottom row',
  'Letter mastery',
  'Shift and capitals',
  'Punctuation',
  'Numbers',
  'Symbols',
  'Words and flow',
  'Speed building',
  'Sentences',
  'Real world',
]

interface Spec {
  type: LessonType
  title: string
  style: DrillStyle
  keys?: string
  newKeys?: string[]
  focus?: string[]
  variant?: string
  timeLimitMs?: number
  length?: number
  tip?: string
}

const up = (c: string) => c.toUpperCase()

/** Three lessons for a new pair of keys: introduce, review, accuracy. */
const block = (a: string, b: string): Spec[] => [
  { type: 'new-keys', title: `Keys ${up(a)} & ${up(b)}`, style: 'drill', keys: a + b, newKeys: [a, b], focus: [a, b], tip: 'home' },
  { type: 'review', title: `Review: ${up(a)} & ${up(b)}`, style: 'drill', variant: 'review', focus: [a, b], tip: 'eyes' },
  { type: 'accuracy', title: `Accuracy: ${up(a)} & ${up(b)}`, style: 'drill', variant: 'review', focus: [a, b], tip: 'accuracy' },
]
const many = (type: LessonType, style: DrillStyle, titles: [string, string?][], extra: Partial<Spec> = {}): Spec[] =>
  titles.map(([title, variant]) => ({ type, style, title, variant, ...extra }))
const check = (style: DrillStyle, variant?: string): Spec => ({ type: 'checkpoint', title: '', style, variant, tip: 'rhythm' })
const keysLesson = (title: string, keys: string[], style: DrillStyle, variant?: string, tip?: string): Spec => ({
  type: 'new-keys',
  title,
  style,
  keys: keys.join(''),
  newKeys: keys,
  focus: keys,
  variant,
  tip,
})

const HOME = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';']
const TOP = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']
const BOTTOM = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']

const STAGES: Spec[][] = [
  // 0 Start
  [
    { type: 'intro', title: 'Welcome and posture', style: 'intro', variant: 'posture', tip: 'posture' },
    { type: 'intro', title: 'Home position', style: 'intro', variant: 'home', tip: 'bumps' },
  ],
  // 1 Home row (20)
  [
    ...block('f', 'j'),
    { type: 'new-keys', title: 'Space bar', style: 'drill', keys: ' ', newKeys: [' '], focus: [' '], variant: 'space', tip: 'thumbs' },
    ...block('d', 'k'),
    { type: 'speed', title: 'Practice: home row 1', style: 'drill', focus: ['f', 'j', 'd', 'k'], timeLimitMs: 60_000 },
    ...block('s', 'l'),
    ...block('a', ';'),
    ...block('g', 'h'),
    { type: 'speed', title: 'Practice: home row 2', style: 'drill', focus: HOME, timeLimitMs: 60_000 },
    { type: 'game', title: 'Game: home row', style: 'drill', variant: 'game', focus: HOME },
    check('words'),
  ],
  // 2 Top row (22)
  [
    ...block('e', 'i'),
    ...block('r', 'u'),
    ...block('w', 'o'),
    { type: 'speed', title: 'Practice: top row 1', style: 'drill', focus: ['e', 'i', 'r', 'u', 'w', 'o'], timeLimitMs: 60_000 },
    ...block('q', 'p'),
    ...block('t', 'y'),
    { type: 'words', title: 'Words: top row 1', style: 'words', focus: TOP },
    { type: 'words', title: 'Words: top row 2', style: 'words', focus: TOP },
    { type: 'speed', title: 'Practice: top row 2', style: 'words', focus: TOP, timeLimitMs: 60_000 },
    { type: 'game', title: 'Game: top row', style: 'drill', variant: 'game', focus: TOP },
    { type: 'review', title: 'Whole top row', style: 'drill', variant: 'review', focus: TOP },
    check('words'),
  ],
  // 3 Bottom row (20)
  [
    ...block('c', ','),
    ...block('v', 'm'),
    ...block('x', '.'),
    ...block('z', '/'),
    ...block('b', 'n'),
    { type: 'words', title: 'Words: bottom row', style: 'words', focus: BOTTOM },
    { type: 'speed', title: 'Practice: all letters', style: 'words', timeLimitMs: 60_000 },
    { type: 'game', title: 'Game: all letters', style: 'drill', variant: 'game' },
    { type: 'review', title: 'All letters mixed', style: 'words' },
    check('words'),
  ],
  // 4 Letter mastery (16)
  [
    ...many('words', 'words', [['Common pairs 1', 'pairs'], ['Common pairs 2', 'pairs'], ['Trigrams 1', 'trigrams'], ['Trigrams 2', 'trigrams'], ['Double letters', 'double']]),
    ...many('accuracy', 'words', [['Hard reaches 1', 'hard'], ['Hard reaches 2', 'hard'], ['Pinky focus', 'pinky']], { tip: 'pinky' }),
    ...many('review', 'words', [['Weak letters 1', 'weak'], ['Weak letters 2', 'weak']]),
    ...many('words', 'words', [['Words: 3 to 4 letters', 'short'], ['Words: 5 to 6 letters', 'medium'], ['Words: 7+ letters', 'long'], ['Pangrams', 'pangrams']]),
    { type: 'speed', title: 'Speed: all letters', style: 'words', timeLimitMs: 60_000 },
    check('words'),
  ],
  // 5 Shift and capitals (14)
  [
    { ...keysLesson('Left Shift', [SHIFT], 'caps', 'right-hand', 'shift'), keys: 'Shift' },
    { type: 'new-keys', title: 'Right Shift', style: 'caps', keys: 'Shift', variant: 'left-hand', tip: 'shift' },
    ...many('words', 'caps', [['Sentence starts', 'sentence'], ['Names', 'names'], ['Title Case', 'title'], ['ALL CAPS', 'allcaps'], ['Mixed case', 'mixed']], { tip: 'shift' }),
    ...many('accuracy', 'caps', [['Capitals accuracy 1', 'mixed'], ['Capitals accuracy 2', 'names']]),
    { type: 'review', title: 'Capitals review', style: 'caps', variant: 'mixed' },
    { type: 'speed', title: 'Practice: capitals', style: 'caps', variant: 'sentence', timeLimitMs: 60_000 },
    { type: 'game', title: 'Game: capitals', style: 'caps', variant: 'title' },
    { type: 'words', title: 'Capital words 2', style: 'caps', variant: 'title' },
    check('caps', 'sentence'),
  ],
  // 6 Punctuation (16)
  [
    keysLesson('Period and comma', [], 'punct', 'basic'),
    keysLesson('Question and exclaim', ['?', '!'], 'punct', 'end'),
    keysLesson('Apostrophe', ["'"], 'punct', 'apostrophe', 'pinky'),
    keysLesson('Quotes', ['"'], 'punct', 'quotes', 'pinky'),
    keysLesson('Colon and semicolon', [':'], 'punct', 'colon', 'pinky'),
    keysLesson('Hyphen', ['-'], 'punct', 'hyphen'),
    keysLesson('Hyphens and slashes', [], 'punct', 'slash'),
    ...many('words', 'punct', [['Mixed punctuation 1', 'mixed'], ['Mixed punctuation 2', 'mixed']]),
    ...many('accuracy', 'punct', [['Punctuation accuracy 1', 'mixed'], ['Punctuation accuracy 2', 'mixed']]),
    ...many('review', 'punct', [['Punctuation review 1', 'mixed'], ['Punctuation review 2', 'mixed']]),
    { type: 'speed', title: 'Practice: punctuation', style: 'punct', variant: 'mixed', timeLimitMs: 60_000 },
    { type: 'game', title: 'Game: punctuation', style: 'punct', variant: 'end' },
    check('punct', 'mixed'),
  ],
  // 7 Numbers (18)
  [
    keysLesson('Digits 1 2 3', ['1', '2', '3'], 'numbers', 'digits', 'numbers'),
    keysLesson('Digits 4 5', ['4', '5'], 'numbers', 'digits', 'numbers'),
    keysLesson('Digits 6 7', ['6', '7'], 'numbers', 'digits', 'numbers'),
    keysLesson('Digits 8 9 0', ['8', '9', '0'], 'numbers', 'digits', 'numbers'),
    ...many('words', 'numbers', [
      ['Digit mixes 1', 'digits'],
      ['Digit mixes 2', 'digits'],
      ['Phone numbers', 'phone'],
      ['Dates', 'dates'],
      ['Times', 'times'],
      ['Prices', 'prices'],
      ['Math', 'math'],
      ['Numbers in words 1', 'mixed'],
      ['Numbers in words 2', 'mixed'],
    ]),
    ...many('accuracy', 'numbers', [['Digits accuracy 1', 'digits'], ['Digits accuracy 2', 'mixed']]),
    { type: 'speed', title: 'Practice: numbers', style: 'numbers', variant: 'mixed', timeLimitMs: 60_000 },
    { type: 'game', title: 'Game: numbers', style: 'numbers', variant: 'digits' },
    check('numbers', 'mixed'),
  ],
  // 8 Symbols (16)
  [
    keysLesson('@ and #', ['@', '#'], 'symbols', 'keys', 'symbols'),
    keysLesson('$ and %', ['$', '%'], 'symbols', 'keys', 'symbols'),
    keysLesson('^ and &', ['^', '&'], 'symbols', 'keys', 'symbols'),
    keysLesson('* ( )', ['*', '(', ')'], 'symbols', 'keys', 'symbols'),
    keysLesson('_ = +', ['_', '=', '+'], 'symbols', 'keys', 'symbols'),
    keysLesson('[ ] { }', ['[', ']', '{', '}'], 'symbols', 'keys', 'symbols'),
    keysLesson('\\ and |', ['\\', '|'], 'symbols', 'keys', 'symbols'),
    keysLesson('< and >', ['<', '>'], 'symbols', 'keys', 'symbols'),
    keysLesson('~ and `', ['~', '`'], 'symbols', 'keys', 'symbols'),
    ...many('words', 'symbols', [['Emails', 'emails'], ['URLs', 'urls'], ['Hashtags', 'hashtags'], ['Code line 1', 'code'], ['Code line 2', 'code']]),
    { type: 'speed', title: 'Practice: symbols', style: 'symbols', variant: 'mixed', timeLimitMs: 60_000 },
    check('symbols', 'mixed'),
  ],
  // 9 Words and flow (20)
  [
    ...many('words', 'words', [
      ['Top 100 words 1', 'top100'],
      ['Top 100 words 2', 'top100'],
      ['Top 100 words 3', 'top100'],
      ['Top 300 words 1', 'top300'],
      ['Top 300 words 2', 'top300'],
      ['Top 300 words 3', 'top300'],
      ['More common words 1', 'all'],
      ['More common words 2', 'all'],
      ['Hand alternation 1', 'alternation'],
      ['Hand alternation 2', 'alternation'],
      ['Rolls 1', 'rolls'],
      ['Rolls 2', 'rolls'],
    ], { tip: 'words' }),
    ...many('speed', 'words', [['Rhythm 1', 'top100'], ['Rhythm 2', 'top300']], { timeLimitMs: 60_000, tip: 'rhythm' }),
    { type: 'words', title: 'Long words', style: 'words', variant: 'long' },
    ...many('accuracy', 'words', [['Tough words 1', 'hard'], ['Tough words 2', 'hard']]),
    { type: 'words', title: 'Word themes', style: 'words', variant: 'themes' },
    { type: 'game', title: 'Game: flow', style: 'words', variant: 'top100' },
    check('words', 'all'),
  ],
  // 10 Speed building (14)
  [
    ...many('speed', 'words', [['Sprint 10s 1', 'top100'], ['Sprint 10s 2', 'top100'], ['Sprint 10s 3', 'top300']], { timeLimitMs: 10_000 }),
    ...many('speed', 'words', [['Sprint 15s 1', 'top100'], ['Sprint 15s 2', 'top300']], { timeLimitMs: 15_000 }),
    ...many('speed', 'sentences', [['Endurance 2 min 1'], ['Endurance 2 min 2']], { timeLimitMs: 120_000, tip: 'breaks' }),
    ...many('speed', 'words', [['Pacing 1', 'all'], ['Pacing 2', 'all']], { timeLimitMs: 60_000, tip: 'rhythm' }),
    ...many('accuracy', 'sentences', [['Plateau breaker 1'], ['Plateau breaker 2'], ['Plateau breaker 3']], { tip: 'accuracy' }),
    { type: 'game', title: 'Game: sprint', style: 'words', variant: 'top100', timeLimitMs: 30_000 },
    check('sentences'),
  ],
  // 11 Sentences (14)
  [
    ...many('words', 'sentences', [['Short sentences 1'], ['Short sentences 2'], ['Short sentences 3']]),
    { type: 'words', title: 'Pangram sentences', style: 'sentences', variant: 'pangrams' },
    ...many('words', 'sentences', [['Quotes 1', 'proverbs'], ['Quotes 2', 'proverbs']]),
    ...many('words', 'sentences', [['Paragraphs 1', 'paragraph'], ['Paragraphs 2', 'paragraph'], ['Paragraphs 3', 'paragraph']]),
    { type: 'words', title: 'Dialogue', style: 'sentences', variant: 'dialogue' },
    ...many('words', 'sentences', [['Stories 1', 'story'], ['Stories 2', 'story']]),
    { type: 'words', title: 'Filipino texts', style: 'sentences', variant: 'filipino' },
    check('sentences', 'paragraph'),
  ],
  // 12 Real world (8)
  [
    ...many('words', 'text', [['Email 1', 'email'], ['Email 2', 'email'], ['Chat messages', 'chat'], ['Notes', 'notes'], ['Copy-typing a document', 'document'], ['Transcription', 'transcription'], ['Mixed real-world', 'mixed']]),
    { ...check('text', 'document'), title: 'Final exam' },
  ],
]

const DEFAULT_TIPS = ['eyes', 'home', 'light', 'rhythm', 'accuracy', 'mistakes', 'wrists', 'words']

function lengthFor(stage: number, type: LessonType): number {
  if (type === 'checkpoint') return stage <= 3 ? 180 : 260
  if (type === 'speed') return 1200 // timed: plenty of text, the clock ends it
  return stage <= 3 ? 140 : stage <= 8 ? 180 : 220
}

function build(): LessonDef[] {
  const out: LessonDef[] = []
  STAGES.forEach((specs, stage) => {
    specs.forEach((spec) => {
      const order = out.length + 1
      const target = STAGE_TARGET_WPM[stage]
      const pass =
        spec.type === 'intro'
          ? { accuracy: 0, wpm: 0 }
          : spec.type === 'checkpoint'
            ? { accuracy: STAGE_TARGET_ACCURACY[stage], wpm: target }
            : { accuracy: spec.type === 'accuracy' ? 95 : 90, wpm: Math.floor(target / 2) }
      out.push({
        id: `l${String(order).padStart(3, '0')}`,
        order,
        stage,
        type: spec.type,
        title: spec.type === 'checkpoint' && !spec.title ? `Checkpoint ${stage}` : spec.title,
        keys: spec.keys ?? '',
        newKeys: spec.newKeys ?? [],
        focus: spec.focus ?? [],
        style: spec.style,
        variant: spec.variant,
        mode: stage <= 3 ? 'stop-on-error' : 'free',
        length: spec.length ?? lengthFor(stage, spec.type),
        timeLimitMs: spec.timeLimitMs,
        pass,
        tipId: spec.tip ?? DEFAULT_TIPS[order % DEFAULT_TIPS.length],
      })
    })
  })
  return out
}

export const LESSONS: LessonDef[] = build()

const byId = new Map(LESSONS.map((l) => [l.id, l]))
export const lessonById = (id: string) => byId.get(id)

/** Every character unlocked up to and including this lesson (always includes space). */
export function allowedKeys(lesson: LessonDef): Set<string> {
  const set = new Set<string>([' '])
  for (const l of LESSONS) {
    if (l.order > lesson.order) break
    for (const k of l.newKeys) set.add(k)
  }
  return set
}
