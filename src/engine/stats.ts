import type { KeyStat } from '../../supabase/functions/_shared/scoring'

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

/** m:ss for a duration in ms. */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
