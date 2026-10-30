import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { KeyStat } from '../../supabase/functions/_shared/scoring'
import type { LessonDef } from '../content/lessons/types'
import { emptyProgress, mergeKeyStats, recordAttempt, type JourneyProgress } from '../engine/progress'
import { IS_DESKTOP } from '../lib/platform'

/**
 * Journey progress for the current visitor.
 *
 * Website: kept in sessionStorage for the open tab. Guests lose it when the site is closed (as planned).
 * Desktop app: kept in localStorage on the PC, so lessons done offline survive closing the app.
 * Signed-in users: progressSync loads it from Supabase on login and saves every change back.
 */
interface ProgressState {
  progress: JourneyProgress
  /** The signed-in user this progress belongs to; null for a local guest. */
  ownerId: string | null
  /** True when the signed-in owner has changes the server has not received yet (for example, made offline). */
  dirty: boolean
  record: (lesson: LessonDef, wpm: number, accuracy: number, keyStats: Record<string, KeyStat>) => void
  /** Adds key stats from unranked typing (casual, practice) so weak-key drills learn from it. */
  addKeyStats: (keyStats: Record<string, KeyStat>) => void
  /** Marks stages as tested out; never un-skips a stage (placement only moves forward). */
  setTestedOut: (stages: number[]) => void
  /** Replaces everything (used when signing in or out). */
  replace: (progress: JourneyProgress, ownerId: string | null) => void
  reset: () => void
}

// Storage can be blocked (privacy settings); fall back to memory.
const memory = new Map<string, string>()
const safeStorage = (area: () => Storage) => ({
  getItem: (k: string) => {
    try {
      return area().getItem(k)
    } catch {
      return memory.get(k) ?? null
    }
  },
  setItem: (k: string, v: string) => {
    try {
      area().setItem(k, v)
    } catch {
      memory.set(k, v)
    }
  },
  removeItem: (k: string) => {
    try {
      area().removeItem(k)
    } catch {
      memory.delete(k)
    }
  },
})
const progressStorage = safeStorage(() => (IS_DESKTOP ? localStorage : sessionStorage))

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      progress: emptyProgress(),
      ownerId: null,
      dirty: false,
      record: (lesson, wpm, accuracy, keyStats) =>
        set((s) => ({ progress: recordAttempt(s.progress, lesson, wpm, accuracy, keyStats), dirty: s.dirty || s.ownerId !== null })),
      addKeyStats: (keyStats) =>
        set((s) => ({ progress: { ...s.progress, keyStats: mergeKeyStats(s.progress.keyStats, keyStats) }, dirty: s.dirty || s.ownerId !== null })),
      setTestedOut: (stages) =>
        set((s) => ({
          progress: { ...s.progress, testedOutStages: [...new Set([...s.progress.testedOutStages, ...stages])].sort((a, b) => a - b) },
          dirty: s.dirty || s.ownerId !== null,
        })),
      replace: (progress, ownerId) => set({ progress, ownerId, dirty: false }),
      reset: () => set((s) => ({ progress: emptyProgress(), ownerId: s.ownerId, dirty: false })), // the caller clears the server copy too
    }),
    { name: 'typeright.progress', version: 1, storage: createJSONStorage(() => progressStorage) },
  ),
)
