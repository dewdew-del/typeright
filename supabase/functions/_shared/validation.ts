/**
 * Anti-cheat checks for ranked results. Pure and dependency-free so it runs in Deno (Edge Function)
 * and in Vitest. The server never trusts a WPM sent by the client: it replays the keystroke log
 * against the text it issued and decides from that.
 */
import { BACKSPACE, replay, type Keystroke, type Summary } from './scoring.ts'

export const LIMITS = {
  /** Fewer printable keystrokes than this is not a real attempt. */
  minKeystrokes: 10,
  maxKeystrokes: 4000,
  /** Net and gross speed caps. World-class typists sustain ~200 WPM in short tests. */
  maxWpm: 250,
  maxRawWpm: 300,
  /** Median gap between keys below this is beyond human (~400 WPM). */
  minMedianGapMs: 30,
  /** Rollover makes some near-simultaneous keys normal, but not most of them. */
  fastGapMs: 10,
  maxFastGapShare: 0.25,
  /** Human rhythm varies; a near-constant gap means a script. Checked once there are enough gaps. */
  minGapVariation: 0.15,
  minGapsForRhythm: 40,
  /** Keys logged after the time limit (small grace for timer jitter). */
  lateGraceMs: 250,
  /** The log can't cover more time than really passed since the test was issued. */
  clockSlackMs: 1500,
  maxIssueAgeMs: 10 * 60_000,
  /** Accept but mark for review. */
  flagWpm: 180,
}

export interface ValidationInput {
  text: string
  log: unknown
  durationMs: number
  /** Server times in ms. */
  issuedAt: number
  now: number
}

export interface Verdict {
  ok: boolean
  /** Short machine-readable reason when rejected. */
  reason?: string
  flags: string[]
  summary?: Summary
}

const reject = (reason: string): Verdict => ({ ok: false, reason, flags: [] })

/** Checks the shape of untrusted JSON: [{k, t}], keys are one character or Backspace, times never go back. */
export function parseLog(raw: unknown): Keystroke[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > LIMITS.maxKeystrokes) return null
  const out: Keystroke[] = []
  let prev = 0
  for (const e of raw) {
    if (typeof e !== 'object' || e === null) return null
    const { k, t } = e as Record<string, unknown>
    if (typeof k !== 'string' || (k.length !== 1 && k !== BACKSPACE)) return null
    if (typeof t !== 'number' || !Number.isFinite(t) || t < prev) return null
    out.push({ k, t })
    prev = t
  }
  return out[0].t === 0 ? out : null
}

function gaps(log: Keystroke[]): number[] {
  const g: number[] = []
  let last: number | null = null
  for (const e of log) {
    if (e.k === BACKSPACE) continue
    if (last !== null) g.push(e.t - last)
    last = e.t
  }
  return g
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Coefficient of variation (standard deviation / mean). */
function variation(xs: number[]): number {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  if (mean === 0) return 0
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length)
  return sd / mean
}

export function validateRanked(input: ValidationInput): Verdict {
  const log = parseLog(input.log)
  if (!log) return reject('bad-log')

  const age = input.now - input.issuedAt
  if (age > LIMITS.maxIssueAgeMs) return reject('expired')
  const lastT = log[log.length - 1].t
  if (lastT > input.durationMs + LIMITS.lateGraceMs) return reject('after-time-limit')
  if (lastT > age + LIMITS.clockSlackMs) return reject('clock-mismatch')

  const { summary } = replay(input.text, log, 'free', input.durationMs)
  if (summary.keystrokes < LIMITS.minKeystrokes) return reject('too-short')
  if (summary.wpm > LIMITS.maxWpm || summary.rawWpm > LIMITS.maxRawWpm) return reject('impossible-speed')

  const g = gaps(log)
  if (g.length > 0) {
    if (median(g) < LIMITS.minMedianGapMs) return reject('impossible-speed')
    const fastShare = g.filter((x) => x < LIMITS.fastGapMs).length / g.length
    if (fastShare > LIMITS.maxFastGapShare) return reject('impossible-speed')
    if (g.length >= LIMITS.minGapsForRhythm && variation(g) < LIMITS.minGapVariation) return reject('robotic-timing')
  }

  const flags: string[] = []
  if (summary.wpm > LIMITS.flagWpm) flags.push('very-fast')
  if (summary.accuracy === 100 && summary.wpm > 120) flags.push('perfect-and-fast')
  return { ok: true, flags, summary }
}

/** What the player sees for each rejection reason. */
export const REASON_TEXT: Record<string, string> = {
  'bad-log': 'The typing data was incomplete. Please try again.',
  expired: 'This test expired. Start a new one.',
  'after-time-limit': 'Keys were recorded after the time ran out.',
  'clock-mismatch': 'The timing did not match the real time that passed.',
  'too-short': 'Type a bit more for the result to count.',
  'impossible-speed': 'That speed is not humanly possible, so it was not counted.',
  'robotic-timing': 'The key timing was too even to be a person typing.',
  'rate-limited': 'Too many tests in a short time. Take a short break.',
  used: 'This test was already submitted or is not yours.',
}
