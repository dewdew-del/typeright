import type { KeyStat } from '../../supabase/functions/_shared/scoring'
import { STAGE_TARGET_WPM } from '../content/lessons/catalog'
import type { LessonDef } from '../content/lessons/types'

export interface LessonRecord {
  stars: number
  bestWpm: number
  bestAccuracy: number
  passed: boolean
  attempts: number
}

export interface JourneyProgress {
  v: 1
  lessons: Record<string, LessonRecord>
  /** Stages passed in the level test. Their lessons show as "Skipped" but stay playable. */
  testedOutStages: number[]
  /** Per-key stats summed over every attempt (feeds weak-key drills). */
  keyStats: Record<string, KeyStat>
}

export type LessonStatus = 'done' | 'current' | 'skipped' | 'locked'

export const emptyProgress = (): JourneyProgress => ({ v: 1, lessons: {}, testedOutStages: [], keyStats: {} })

/** 0 = not passed; 1 = passed; 2 = 95%+ accuracy; 3 = 98%+ accuracy at the stage target speed. */
export function starsFor(lesson: LessonDef, wpm: number, accuracy: number): number {
  if (lesson.type === 'intro') return 3
  if (accuracy < lesson.pass.accuracy || wpm < lesson.pass.wpm) return 0
  if (accuracy >= 98 && wpm >= STAGE_TARGET_WPM[lesson.stage]) return 3
  if (accuracy >= 95) return 2
  return 1
}

/** The first lesson not yet passed and not in a tested-out stage (undefined when all are done). */
export function currentLesson(lessons: LessonDef[], p: JourneyProgress): LessonDef | undefined {
  return lessons.find((l) => !p.lessons[l.id]?.passed && !p.testedOutStages.includes(l.stage))
}

export function lessonStatus(lesson: LessonDef, p: JourneyProgress, current: LessonDef | undefined): LessonStatus {
  if (p.lessons[lesson.id]?.passed) return 'done'
  if (p.testedOutStages.includes(lesson.stage)) return 'skipped'
  if (current && lesson.id === current.id) return 'current'
  return 'locked'
}

/** Returns new progress with this attempt recorded (best scores kept, key stats added). */
export function recordAttempt(
  p: JourneyProgress,
  lesson: LessonDef,
  wpm: number,
  accuracy: number,
  keyStats: Record<string, KeyStat> = {},
): JourneyProgress {
  const prev = p.lessons[lesson.id]
  const stars = starsFor(lesson, wpm, accuracy)
  const record: LessonRecord = {
    stars: Math.max(prev?.stars ?? 0, stars),
    bestWpm: Math.max(prev?.bestWpm ?? 0, wpm),
    bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
    passed: (prev?.passed ?? false) || stars > 0,
    attempts: (prev?.attempts ?? 0) + 1,
  }
  return { ...p, lessons: { ...p.lessons, [lesson.id]: record }, keyStats: mergeKeyStats(p.keyStats, keyStats) }
}

/** Sums two sets of per-key stats. */
export function mergeKeyStats(a: Record<string, KeyStat>, b: Record<string, KeyStat>): Record<string, KeyStat> {
  const merged: Record<string, KeyStat> = { ...a }
  for (const [ch, s] of Object.entries(b)) {
    const m = merged[ch] ?? { attempts: 0, misses: 0, totalMs: 0 }
    merged[ch] = { attempts: m.attempts + s.attempts, misses: m.misses + s.misses, totalMs: m.totalMs + s.totalMs }
  }
  return merged
}

/** True when there is anything worth saving or merging. */
export function hasProgress(p: JourneyProgress): boolean {
  return Object.keys(p.lessons).length > 0 || Object.keys(p.keyStats).length > 0 || p.testedOutStages.length > 0
}

/**
 * Joins two copies of the SAME account's progress (the desktop copy kept offline and the server's).
 * Unlike mergeProgress nothing is summed, so applying it twice, or to a copy that already contains the
 * other, never double counts: best of each lesson, the larger key stat, all skipped stages.
 */
export function reconcileProgress(a: JourneyProgress, b: JourneyProgress): JourneyProgress {
  const lessons: Record<string, LessonRecord> = { ...b.lessons }
  for (const [id, x] of Object.entries(a.lessons)) {
    const y = lessons[id]
    lessons[id] = y
      ? {
          stars: Math.max(x.stars, y.stars),
          bestWpm: Math.max(x.bestWpm, y.bestWpm),
          bestAccuracy: Math.max(x.bestAccuracy, y.bestAccuracy),
          passed: x.passed || y.passed,
          attempts: Math.max(x.attempts, y.attempts),
        }
      : x
  }
  const keyStats: Record<string, KeyStat> = { ...b.keyStats }
  for (const [ch, s] of Object.entries(a.keyStats)) {
    const t = keyStats[ch]
    keyStats[ch] = !t || s.attempts >= t.attempts ? s : t
  }
  return {
    v: 1,
    lessons,
    keyStats,
    testedOutStages: [...new Set([...a.testedOutStages, ...b.testedOutStages])].sort((m, n) => m - n),
  }
}

/** Combines guest progress with an account's: best of each lesson, summed key stats, all skipped stages. */
export function mergeProgress(a: JourneyProgress, b: JourneyProgress): JourneyProgress {
  const lessons: Record<string, LessonRecord> = { ...b.lessons }
  for (const [id, x] of Object.entries(a.lessons)) {
    const y = lessons[id]
    lessons[id] = y
      ? {
          stars: Math.max(x.stars, y.stars),
          bestWpm: Math.max(x.bestWpm, y.bestWpm),
          bestAccuracy: Math.max(x.bestAccuracy, y.bestAccuracy),
          passed: x.passed || y.passed,
          attempts: x.attempts + y.attempts,
        }
      : x
  }
  return {
    v: 1,
    lessons,
    keyStats: mergeKeyStats(a.keyStats, b.keyStats),
    testedOutStages: [...new Set([...a.testedOutStages, ...b.testedOutStages])].sort((m, n) => m - n),
  }
}
