/**
 * Typing scoring: the single source of truth for WPM and accuracy.
 *
 * Used by the browser (live stats) and, from Stage 6, by the Supabase Edge Function that
 * re-scores ranked results from the raw keystroke log. Keep this file dependency-free and
 * free of DOM/Node APIs so it runs unchanged in both the browser and Deno.
 */

export type TypingMode = 'free' | 'stop-on-error'

/** One key press: `k` is a single printable character or BACKSPACE; `t` is ms since the session started. */
export interface Keystroke {
  k: string
  t: number
}

export const BACKSPACE = 'Backspace'

export interface KeyStat {
  /** Times this character was the expected next character and a key was pressed. */
  attempts: number
  /** Times a different key was pressed when this character was expected. */
  misses: number
  /** Sum of the time since the previous keystroke, for average-latency ("slow keys"). */
  totalMs: number
}

export interface ReplayState {
  target: string
  mode: TypingMode
  /** Characters currently typed (what the user sees). */
  typed: string[]
  correctKeystrokes: number
  incorrectKeystrokes: number
  backspaces: number
  firstT: number | null
  lastT: number | null
  /** Per expected character. */
  keyStats: Record<string, KeyStat>
}

export interface Summary {
  durationMs: number
  /** Characters in the typed text that match the target at the same position. */
  correctChars: number
  /** Net speed: correct characters / 5 per minute. */
  wpm: number
  /** Gross speed: all printable keystrokes / 5 per minute. */
  rawWpm: number
  /** Right characters / characters on screen, 0-100 (free mode; see accuracyOf). 100 when nothing was typed. */
  accuracy: number
  keystrokes: number
  complete: boolean
}

export function createReplayState(target: string, mode: TypingMode = 'free'): ReplayState {
  return {
    target,
    mode,
    typed: [],
    correctKeystrokes: 0,
    incorrectKeystrokes: 0,
    backspaces: 0,
    firstT: null,
    lastT: null,
    keyStats: {},
  }
}

export function isComplete(s: ReplayState): boolean {
  return s.typed.length >= s.target.length
}

export function isPrintable(k: string): boolean {
  return k.length === 1
}

/**
 * Applies one keystroke, mutating `s` (fast for long logs on the server).
 * Returns true if the keystroke counted, false if it was ignored.
 * Rules:
 * - Printable key: counted correct if it equals the expected character, otherwise an error.
 *   In free mode it is always added to the typed text; in stop-on-error mode only correct keys advance.
 * - Backspace: removes the last typed character in free mode; ignored in stop-on-error mode.
 * - Anything else, and anything after the text is complete, is ignored.
 */
export function applyKeystroke(s: ReplayState, ks: Keystroke): boolean {
  if (isComplete(s)) return false
  const printable = isPrintable(ks.k)
  if (!printable && ks.k !== BACKSPACE) return false

  if (ks.k === BACKSPACE) {
    if (s.mode === 'stop-on-error' || s.typed.length === 0) return false
    s.typed.pop()
    s.backspaces += 1
    touch(s, ks.t)
    return true
  }

  const expected = s.target[s.typed.length]
  const stat = (s.keyStats[expected] ??= { attempts: 0, misses: 0, totalMs: 0 })
  stat.attempts += 1
  stat.totalMs += s.lastT === null ? 0 : Math.max(0, ks.t - s.lastT)

  const correct = ks.k === expected
  if (correct) {
    s.correctKeystrokes += 1
  } else {
    s.incorrectKeystrokes += 1
    stat.misses += 1
  }
  if (correct || s.mode === 'free') s.typed.push(ks.k)
  touch(s, ks.t)
  return true
}

function touch(s: ReplayState, t: number) {
  if (s.firstT === null) s.firstT = t
  s.lastT = t
}

export function countCorrectChars(s: ReplayState): number {
  let n = 0
  for (let i = 0; i < s.typed.length; i++) if (s.typed[i] === s.target[i]) n += 1
  return n
}

/**
 * Free mode: share of the text on screen that is right, so deleting a mistake brings accuracy
 * back up (100% when everything shown is correct). Stop-on-error mode cannot delete, so it
 * counts every key pressed.
 */
function accuracyOf(s: ReplayState, correctChars: number, keystrokes: number): number {
  if (s.mode === 'free') return s.typed.length > 0 ? (correctChars / s.typed.length) * 100 : 100
  return keystrokes > 0 ? (s.correctKeystrokes / keystrokes) * 100 : 100
}

/**
 * Speed and accuracy. `durationMs` defaults to first-to-last keystroke; timed tests pass the
 * time limit instead so stopping early can't inflate WPM.
 */
export function summarize(s: ReplayState, durationMs?: number): Summary {
  const duration = durationMs ?? (s.firstT === null || s.lastT === null ? 0 : s.lastT - s.firstT)
  const minutes = duration / 60_000
  const correctChars = countCorrectChars(s)
  const keystrokes = s.correctKeystrokes + s.incorrectKeystrokes
  return {
    durationMs: duration,
    correctChars,
    wpm: minutes > 0 ? correctChars / 5 / minutes : 0,
    rawWpm: minutes > 0 ? keystrokes / 5 / minutes : 0,
    accuracy: accuracyOf(s, correctChars, keystrokes),
    keystrokes,
    complete: isComplete(s),
  }
}

/** Rebuilds the whole session from its log. The server uses this; it never trusts client numbers. */
export function replay(target: string, log: Keystroke[], mode: TypingMode = 'free', durationMs?: number) {
  const state = createReplayState(target, mode)
  for (const ks of log) applyKeystroke(state, ks)
  return { state, summary: summarize(state, durationMs) }
}

/** A race run only counts as finished with at least this accuracy, so mashing keys to reach the end gets nowhere. */
export const MIN_RACE_ACCURACY = 90

/** Races are ranked on this overall score: net WPM times accuracy (one decimal). Speed alone cannot win. */
export function raceScore(wpm: number, accuracy: number): number {
  return Math.round((wpm * accuracy) / 10) / 10
}
