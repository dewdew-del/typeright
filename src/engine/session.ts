import {
  applyKeystroke,
  createReplayState,
  isComplete,
  isPrintable,
  summarize,
  type Keystroke,
  type ReplayState,
  type Summary,
  type TypingMode,
} from '../../supabase/functions/_shared/scoring'

/**
 * One typing attempt: the target text, the keystroke log and the replay state built from it.
 * The live view and the final result both come from the same scoring code the server will use.
 */
export interface TypingSession {
  replay: ReplayState
  log: Keystroke[]
  /** Clock time (ms) of the first printable key; the session clock starts here. */
  startedAt: number | null
  endedAt: number | null
  timeLimitMs?: number
}

export function createSession(target: string, mode: TypingMode = 'free', timeLimitMs?: number): TypingSession {
  return { replay: createReplayState(target, mode), log: [], startedAt: null, endedAt: null, timeLimitMs }
}

export function isEnded(s: TypingSession): boolean {
  return s.endedAt !== null
}

/** Ends a timed session once its time is up. Returns true if it just ended. */
export function checkTime(s: TypingSession, now: number): boolean {
  if (s.endedAt !== null || s.startedAt === null || s.timeLimitMs === undefined) return false
  if (now - s.startedAt < s.timeLimitMs) return false
  s.endedAt = s.startedAt + s.timeLimitMs
  return true
}

/**
 * Feeds one key (a printable character or 'Backspace') at clock time `now`.
 * Returns true if the key changed anything. Mutates the session.
 */
export function pressKey(s: TypingSession, key: string, now: number): boolean {
  if (s.endedAt !== null || checkTime(s, now)) return false
  if (s.startedAt === null) {
    if (!isPrintable(key)) return false // the clock starts on the first character, not on Backspace
    s.startedAt = now
  }
  const ks: Keystroke = { k: key, t: Math.round((now - s.startedAt) * 10) / 10 }
  if (!applyKeystroke(s.replay, ks)) return false
  s.log.push(ks)
  if (isComplete(s.replay)) s.endedAt = now
  return true
}

/** Elapsed session time at `now`, stopping at the end or the time limit. */
export function elapsedMs(s: TypingSession, now: number): number {
  if (s.startedAt === null) return 0
  const end = s.endedAt ?? now
  const ms = end - s.startedAt
  return s.timeLimitMs === undefined ? ms : Math.min(ms, s.timeLimitMs)
}

/** Live or final stats. Timed sessions are scored over the full time limit once ended. */
export function sessionStats(s: TypingSession, now: number): Summary {
  return summarize(s.replay, elapsedMs(s, now))
}
