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
  const merged: Record<string, KeyStat> = { ...p.keyStats }
  for (const [ch, s] of Object.entries(keyStats)) {
    const m = merged[ch] ?? { attempts: 0, misses: 0, totalMs: 0 }
    merged[ch] = { attempts: m.attempts + s.attempts, misses: m.misses + s.misses, totalMs: m.totalMs + s.totalMs }
  }
  return { ...p, lessons: { ...p.lessons, [lesson.id]: record }, keyStats: merged }
}
