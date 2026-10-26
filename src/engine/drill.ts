import type { KeyStat } from '../../supabase/functions/_shared/scoring'
import { SENTENCES_EN, PROVERBS_EN, DIALOGUE_EN, STORIES_EN } from '../content/sentences/en'
import { SENTENCES_FIL, WORDS_FIL } from '../content/sentences/fil'
import { REAL_WORLD } from '../content/texts/realWorld'
import { NAMES, PANGRAMS, THEMES, WORDS_EN } from '../content/words/en'
import { SHIFT, type LessonDef } from '../content/lessons/types'
import { targetForChar } from '../layouts/qwerty'
import { createRng, type Rng } from './rng'

export type Lang = 'en' | 'fil'

export interface DrillInput {
  lesson: LessonDef
  /** Characters unlocked so far (see allowedKeys). */
  allowed: Set<string>
  /** Extra weight per character for weak keys (1 = normal, up to 3). */
  weak?: Record<string, number>
  lang?: Lang
  seed: number
}

/** Weak-key weights from per-key stats: keys with a high miss rate show up more often (up to 3x). */
export function weakWeights(stats: Record<string, KeyStat>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [ch, s] of Object.entries(stats)) {
    if (s.attempts < 3) continue
    const rate = s.misses / s.attempts
    if (rate > 0) out[ch] = 1 + Math.min(2, rate * 10)
  }
  return out
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])
const SAME_FINGER = ['ed', 'de', 'un', 'nu', 'br', 'ce', 'ec', 'my', 'ny', 'ju', 'lo', 'ol', 'sw', 'ws', 'gr', 'rt', 'ki', 'ik', 'az', 'za', 'mu', 'hu']
const ROLLS = ['as', 'sd', 'df', 'er', 're', 'we', 'ew', 'io', 'oi', 'ui', 'jk', 'kl', 'lk', 'op', 'po', 'in', 'ni', 'on', 'no', 'ul', 'li']
const CONTRACTIONS = ["don't", "it's", "we're", "can't", "let's", "you're", "isn't", "that's", "they're", "won't", "she's", "he's"]
const HYPHENATED = ['well-known', 'part-time', 'long-term', 're-do', 'x-ray', 'e-mail', 'self-made', 'up-to-date', 'one-way', 'check-in']
const SLASHED = ['and/or', 'yes/no', 'either/or', 'his/her', 'on/off', 'in/out']
const CODE_LINES = [
  'let total = price * 2;',
  'if (x > 10) { y = x; }',
  'print("hello world")',
  'items[0] = "rice";',
  'const user = { name: "ana", age: 21 };',
  'for (let i = 0; i < 5; i++) {}',
  'return a + b - c;',
  'x == y || y != z',
  'path = "c:\\docs\\notes.txt"',
  '`${first}_${last}` ~ done',
  'score += 10 ^ 2 & mask;',
]
const DOMAINS = ['mail.com', 'school.edu', 'site.ph', 'work.org']

/** Builds the text for one attempt at a lesson. Only uses unlocked characters; never empty. */
export function buildDrill(input: DrillInput): string {
  const { lesson, allowed } = input
  const rng = createRng(input.seed)
  const ctx = makeContext(input, rng)
  const length = lesson.length

  let text: string
  switch (lesson.style) {
    case 'intro':
      return ''
    case 'drill':
      text = fill(length, (i) => drillToken(ctx, i / length))
      break
    case 'words':
      text = fill(length, () => wordToken(ctx))
      break
    case 'caps':
      text = capsText(ctx, length)
      break
    case 'punct':
      text = fill(length, () => punctToken(ctx))
      break
    case 'numbers':
      text = fill(length, () => numberToken(ctx))
      break
    case 'symbols':
      text = fill(length, () => symbolToken(ctx))
      break
    case 'sentences':
      text = joinUntil(length, () => sentenceItem(ctx))
      break
    case 'text':
      text = joinUntil(length, () => realWorldItem(ctx))
      break
  }
  return sanitize(text, allowed) || fallback(ctx)
}

interface Ctx {
  lesson: LessonDef
  allowed: Set<string>
  rng: Rng
  lang: Lang
  letters: string[]
  focus: string[]
  caps: boolean
  weight: (ch: string) => number
  words: string[]
}

function makeContext(input: DrillInput, rng: Rng): Ctx {
  const { lesson, allowed } = input
  const letters = [...allowed].filter((c) => /^[a-z;]$/.test(c))
  const focusLetters = lesson.focus.filter((c) => c !== ' ' && allowed.has(c))
  const lang = input.lang ?? 'en'
  const pool = lang === 'fil' && lesson.stage >= 4 ? WORDS_FIL : WORDS_EN
  const words = pool.filter((w) => fits(w, allowed))
  const weak = input.weak ?? {}
  return {
    lesson,
    allowed,
    rng,
    lang,
    letters,
    focus: focusLetters.length > 0 ? focusLetters : letters,
    caps: allowed.has(SHIFT),
    weight: (ch) => weak[ch] ?? 1,
    words,
  }
}

const fits = (w: string, allowed: Set<string>) => [...w].every((c) => allowed.has(c) || (c >= 'A' && c <= 'Z' && allowed.has(SHIFT) && allowed.has(c.toLowerCase())))

/** Adds tokens separated by spaces until about `length` characters. */
function fill(length: number, next: (pos: number) => string): string {
  const out: string[] = []
  let n = 0
  let guard = 0
  while (n < length && guard++ < 2000) {
    const t = next(n)
    if (!t) continue
    out.push(t)
    n += t.length + 1
  }
  return out.join(' ')
}

/** Adds whole sentences or texts until about `length` characters (never cuts one in half). */
function joinUntil(length: number, next: () => string): string {
  const out: string[] = []
  let n = 0
  let guard = 0
  while (n < length && guard++ < 200) {
    const t = next()
    if (out[out.length - 1] === t && guard < 190) continue
    out.push(t)
    n += t.length + 1
  }
  return out.join(' ')
}

function pseudoWord(ctx: Ctx, min = 2, max = 5): string {
  const { rng, letters, focus } = ctx
  const len = rng.int(min, max)
  const vowels = letters.filter((c) => VOWELS.has(c))
  let w = ''
  for (let i = 0; i < len; i++) {
    let c: string
    if (rng.chance(0.45)) c = rng.pick(focus)
    else if (vowels.length > 0 && i % 2 === 1 && rng.chance(0.6)) c = rng.pick(vowels)
    else c = rng.weighted(letters, ctx.weight)
    w += c
  }
  return w
}

function realWord(ctx: Ctx, preferFocus = true): string | null {
  const { rng, words, focus } = ctx
  if (words.length < 6) return null
  if (preferFocus) {
    const withFocus = words.filter((w) => focus.some((f) => w.includes(f)))
    if (withFocus.length >= 3 && rng.chance(0.7)) return weightedWord(ctx, withFocus)
  }
  return weightedWord(ctx, words)
}

function weightedWord(ctx: Ctx, list: string[]): string {
  return ctx.rng.weighted(list, (w) => {
    let s = 0
    for (const c of w) s += ctx.weight(c) - 1
    return 1 + s
  })
}

function drillToken(ctx: Ctx, progress: number): string {
  const { rng, lesson, focus } = ctx
  if (lesson.variant === 'space') return pseudoWord(ctx, 1, 3)
  if (lesson.variant === 'game') return rng.chance(0.5) && ctx.words.length >= 6 ? realWord(ctx) ?? pseudoWord(ctx, 2, 3) : pseudoWord(ctx, 2, 3)
  // New keys: start with the new keys on their own, then mix them into words.
  if (lesson.type === 'new-keys' && progress < 0.3) {
    const len = rng.int(2, 4)
    let t = ''
    for (let i = 0; i < len; i++) t += rng.pick(focus)
    return t
  }
  if (rng.chance(0.5)) return realWord(ctx) ?? pseudoWord(ctx)
  return pseudoWord(ctx)
}

const handOf = (c: string) => targetForChar(c)?.key.finger.charAt(0)

function variantPool(ctx: Ctx): string[] {
  const { words, lesson } = ctx
  const has = (subs: string[]) => words.filter((w) => subs.some((s) => w.includes(s)))
  switch (lesson.variant) {
    case 'pairs': return has(['th', 'he', 'in', 'er', 'an'])
    case 'trigrams': return has(['the', 'ing', 'and', 'ion', 'ent'])
    case 'double': return words.filter((w) => /(.)\1/.test(w))
    case 'hard': return has(SAME_FINGER)
    case 'pinky': return words.filter((w) => /[qazp]/.test(w))
    case 'short': return words.filter((w) => w.length >= 3 && w.length <= 4)
    case 'medium': return words.filter((w) => w.length >= 5 && w.length <= 6)
    case 'long': return words.filter((w) => w.length >= 7)
    case 'top100': return words.slice(0, 100)
    case 'top300': return words.slice(0, 300)
    case 'rolls': return has(ROLLS)
    case 'alternation':
      return words.filter((w) => {
        if (w.length < 3) return false
        let switches = 0
        for (let i = 1; i < w.length; i++) if (handOf(w[i]) !== handOf(w[i - 1])) switches++
        return switches / (w.length - 1) >= 0.6
      })
    case 'themes': return THEMES.flat().filter((w) => fits(w, ctx.allowed))
    default: return words
  }
}

function wordToken(ctx: Ctx): string {
  const { lesson, rng } = ctx
  if (lesson.variant === 'pangrams') return rng.pick(PANGRAMS)
  if (!lesson.variant || lesson.variant === 'all') return realWord(ctx, lesson.focus.length > 0) ?? pseudoWord(ctx)
  const pool = variantPool(ctx)
  return pool.length >= 5 ? weightedWord(ctx, pool) : realWord(ctx) ?? pseudoWord(ctx)
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)

function capsText(ctx: Ctx, length: number): string {
  const { rng, lesson, words } = ctx
  const any = () => realWord(ctx, false) ?? pseudoWord(ctx)
  const variant = lesson.variant === 'mixed' ? undefined : lesson.variant
  const pickVariant = () => variant ?? rng.pick(['right-hand', 'left-hand', 'names', 'title', 'allcaps'])

  if (variant === 'sentence') {
    return joinUntil(length, () => {
      const n = rng.int(4, 8)
      const ws = Array.from({ length: n }, any)
      return cap(ws.join(' ')) + (ctx.allowed.has('.') ? '.' : '')
    })
  }
  return fill(length, () => {
    const v = pickVariant()
    switch (v) {
      case 'right-hand':
      case 'left-hand': {
        const want = v === 'right-hand' ? 'R' : 'L'
        const pool = words.filter((w) => handOf(w[0]) === want)
        const w = pool.length > 0 ? rng.pick(pool) : any()
        return rng.chance(0.6) ? cap(w) : w
      }
      case 'names':
        return rng.chance(0.5) ? rng.pick(NAMES) : any()
      case 'title':
        return cap(any())
      case 'allcaps':
        return rng.chance(0.3) ? any().toUpperCase() : any()
      default:
        return any()
    }
  })
}

function punctToken(ctx: Ctx): string {
  const { rng, lesson, allowed } = ctx
  const w = () => realWord(ctx, false) ?? pseudoWord(ctx)
  const transforms: Record<string, () => string> = {
    basic: () => w() + (rng.chance(0.5) ? ',' : '.'),
    end: () => w() + (rng.chance(0.5) ? '?' : '!'),
    apostrophe: () => (rng.chance(0.6) ? rng.pick(CONTRACTIONS) : `${w()}'s`),
    quotes: () => `"${w()}"`,
    colon: () => (rng.chance(0.5) ? `${w()}:` : `${w()};`),
    hyphen: () => rng.pick(HYPHENATED),
    slash: () => rng.pick(SLASHED),
  }
  if (rng.chance(0.4)) return w() // plain words in between
  const usable = Object.entries(transforms).filter(([name]) => {
    const needs: Record<string, string[]> = {
      basic: [',', '.'],
      end: ['?', '!'],
      apostrophe: ["'"],
      quotes: ['"'],
      colon: [':', ';'],
      hyphen: ['-'],
      slash: ['/', '-'],
    }
    return needs[name].every((c) => allowed.has(c))
  })
  const chosen = lesson.variant && lesson.variant !== 'mixed' ? transforms[lesson.variant] : rng.pick(usable)[1]
  return chosen()
}

function numberToken(ctx: Ctx): string {
  const { rng, lesson, allowed } = ctx
  const digits = [...allowed].filter((c) => /[0-9]/.test(c))
  const focusDigits = lesson.focus.filter((c) => /[0-9]/.test(c))
  const d = () => (focusDigits.length > 0 && rng.chance(0.5) ? rng.pick(focusDigits) : rng.pick(digits))
  const num = (n: number) => Array.from({ length: n }, d).join('')
  const pad = (n: number) => String(n).padStart(2, '0')
  const word = () => realWord(ctx, false) ?? pseudoWord(ctx)
  switch (lesson.variant) {
    case 'phone':
      return `09${num(2)}-${num(3)}-${num(4)}`
    case 'dates':
      return `${pad(rng.int(1, 28))}/${pad(rng.int(1, 12))}/20${pad(rng.int(0, 30))}`
    case 'times':
      return `${rng.int(1, 12)}:${pad(rng.int(0, 59))} ${rng.chance(0.5) ? 'am' : 'pm'}`
    case 'prices':
      return `PHP ${rng.int(5, 999)}.${rng.chance(0.5) ? '00' : '50'}`
    case 'math': {
      const a = rng.int(10, 99)
      const b = rng.int(1, a)
      return `${a} - ${b} is ${a - b}`
    }
    case 'mixed':
      return rng.chance(0.5) ? `${rng.int(2, 99)} ${word()}` : word()
    default:
      return rng.chance(0.25) ? word() : num(rng.int(2, 4))
  }
}

function symbolToken(ctx: Ctx): string {
  const { rng, lesson, allowed } = ctx
  const w = () => realWord(ctx, false) ?? pseudoWord(ctx)
  const n = () => String(rng.int(1, 99))
  const patterns: [string[], () => string][] = [
    [['@'], () => `@${w()}`],
    [['#'], () => `#${w()}`],
    [['$'], () => `$${n()}`],
    [['%'], () => `${n()}%`],
    [['^'], () => `x^${rng.int(2, 9)}`],
    [['&'], () => `${w()}&${w()}`],
    [['*'], () => `${n()}*${n()}`],
    [['(', ')'], () => `(${w()})`],
    [['_'], () => `${w()}_${w()}`],
    [['='], () => `${w()}=${n()}`],
    [['+'], () => `${n()}+${n()}`],
    [['[', ']'], () => `[${n()}]`],
    [['{', '}'], () => `{${w()}}`],
    [['\\'], () => `${w()}\\${w()}`],
    [['|'], () => `${w()}|${w()}`],
    [['<', '>'], () => `<${w()}>`],
    [['~'], () => `~/${w()}`],
    [['`'], () => `\`${w()}\``],
  ]
  switch (lesson.variant) {
    case 'emails':
      return `${w()}.${w()}@${rng.pick(DOMAINS)}`
    case 'urls':
      return `https://www.${w()}.com/${w()}`
    case 'hashtags':
      return rng.chance(0.5) ? `#${w()}` : `#${cap(w())}${cap(w())}`
    case 'code': {
      const lines = CODE_LINES.filter((l) => fits(l, allowed))
      return lines.length > 0 ? rng.pick(lines) : w()
    }
  }
  const usable = patterns.filter(([needs]) => needs.every((c) => allowed.has(c)))
  const focused = usable.filter(([needs]) => needs.some((c) => lesson.focus.includes(c)))
  if (rng.chance(0.25)) return w()
  const pool = focused.length > 0 && rng.chance(0.7) ? focused : usable
  return pool.length > 0 ? rng.pick(pool)[1]() : w()
}

function sentenceItem(ctx: Ctx): string {
  const { rng, lesson, lang } = ctx
  switch (lesson.variant) {
    case 'pangrams':
      return cap(rng.pick(PANGRAMS)) + '.'
    case 'proverbs':
      return rng.pick(PROVERBS_EN)
    case 'dialogue':
      return rng.pick(DIALOGUE_EN)
    case 'story':
      return rng.pick(STORIES_EN)
    case 'filipino':
      return rng.pick(SENTENCES_FIL)
    case 'paragraph':
      return [rng.pick(SENTENCES_EN), rng.pick(SENTENCES_EN), rng.pick(PROVERBS_EN)].join(' ')
    default:
      return rng.pick(lang === 'fil' ? SENTENCES_FIL : SENTENCES_EN)
  }
}

function realWorldItem(ctx: Ctx): string {
  const { rng, lesson } = ctx
  const pool = lesson.variant && lesson.variant !== 'mixed' ? REAL_WORLD[lesson.variant] : Object.values(REAL_WORLD).flat()
  return rng.pick(pool)
}

/** Drops characters that are not unlocked or not on the keyboard, and tidies spaces. */
function sanitize(text: string, allowed: Set<string>): string {
  const caps = allowed.has(SHIFT)
  let out = ''
  for (const c of text) {
    const lower = c.toLowerCase()
    const ok =
      c === ' ' ||
      (allowed.has(c) && targetForChar(c) !== undefined) ||
      (caps && c !== lower && allowed.has(lower) && targetForChar(c) !== undefined)
    if (ok) out += c
  }
  return out.replace(/ {2,}/g, ' ').trim()
}

function fallback(ctx: Ctx): string {
  const keys = ctx.focus.length > 0 ? ctx.focus : ['f', 'j']
  return Array.from({ length: 8 }, (_, i) => keys[i % keys.length].repeat(2)).join(' ')
}
