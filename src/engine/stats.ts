import {
  applyKeystroke,
  createReplayState,
  summarize,
  type Keystroke,
  type KeyStat,
  type TypingMode,
} from '../../supabase/functions/_shared/scoring'

export interface MissedKey {
  char: string
  misses: number
  attempts: number
}

/** Characters with the most misses (ties broken by miss rate). Keys with no misses are left out. */
export function topMissedKeys(stats: Record<string, KeyStat>, n = 5): MissedKey[] {
  return Object.entries(stats)
    .filter(([, s]) => s.misses > 0)
    .map(([char, s]) => ({ char, misses: s.misses, attempts: s.attempts }))
    .sort((a, b) => b.misses - a.misses || b.misses / b.attempts - a.misses / a.attempts)
    .slice(0, n)
}

/** Human label for a character key. */
export function keyLabel(char: string): string {
  return char === ' ' ? 'Space' : char.toUpperCase()
}

/** Accuracy cut down to one decimal, so 99.8 stays 99.8 and only a truly perfect run reads 100. */
export function floorAccuracy(a: number): number {
  return Math.floor(a * 10 + 1e-9) / 10
}

/** Accuracy for display: "100" when perfect, otherwise one decimal ("99.8"). */
export function formatAccuracy(a: number): string {
  const v = floorAccuracy(a)
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** m:ss for a duration in ms. */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export interface SlowKey {
  char: string
  avgMs: number
}

/** Characters with the highest average time since the previous key (at least `minAttempts` tries). */
export function slowestKeys(stats: Record<string, KeyStat>, n = 3, minAttempts = 3): SlowKey[] {
  return Object.entries(stats)
    .filter(([ch, s]) => s.attempts >= minAttempts && ch !== ' ')
    .map(([char, s]) => ({ char, avgMs: s.totalMs / s.attempts }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, n)
}

/**
 * Net WPM at every `stepMs` through the attempt, for the speed-over-time chart.
 * Rebuilt from the keystroke log with the same scoring as the final result.
 */
export function wpmSeries(target: string, log: Keystroke[], mode: TypingMode, durationMs: number, stepMs = 1000): number[] {
  const out: number[] = []
  const state = createReplayState(target, mode)
  let i = 0
  for (let t = stepMs; t <= durationMs + stepMs - 1; t += stepMs) {
    const until = Math.min(t, durationMs)
    while (i < log.length && log[i].t <= until) applyKeystroke(state, log[i++])
    out.push(summarize(state, until).wpm)
  }
  return out
}
