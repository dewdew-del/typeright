import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { KeyStat } from '../../supabase/functions/_shared/scoring'
import type { LessonDef } from '../content/lessons/types'
import { emptyProgress, mergeKeyStats, recordAttempt, type JourneyProgress } from '../engine/progress'

/**
 * Journey progress for the current visitor, kept in sessionStorage for the open tab.
 *
 * Guests: this is the only copy, so it is gone when the site is closed (as planned).
 * Signed-in users: progressSync loads it from Supabase on login and saves every change back.
 */
interface ProgressState {
  progress: JourneyProgress
  /** The signed-in user this progress belongs to; null for a local guest. */
  ownerId: string | null
  record: (lesson: LessonDef, wpm: number, accuracy: number, keyStats: Record<string, KeyStat>) => void
  /** Adds key stats from unranked typing (casual, practice) so weak-key drills learn from it. */
  addKeyStats: (keyStats: Record<string, KeyStat>) => void
  /** Marks stages as tested out; never un-skips a stage (placement only moves forward). */
  setTestedOut: (stages: number[]) => void
  /** Replaces everything (used when signing in or out). */
  replace: (progress: JourneyProgress, ownerId: string | null) => void
  reset: () => void
}

// sessionStorage can be blocked (privacy settings); fall back to memory.
const memory = new Map<string, string>()
const safeSession = {
  getItem: (k: string) => {
    try {
      return sessionStorage.getItem(k)
    } catch {
      return memory.get(k) ?? null
    }
  },
  setItem: (k: string, v: string) => {
    try {
      sessionStorage.setItem(k, v)
    } catch {
      memory.set(k, v)
    }
  },
  removeItem: (k: string) => {
    try {
      sessionStorage.removeItem(k)
    } catch {
      memory.delete(k)
    }
  },
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      progress: emptyProgress(),
      ownerId: null,
      record: (lesson, wpm, accuracy, keyStats) =>
        set((s) => ({ progress: recordAttempt(s.progress, lesson, wpm, accuracy, keyStats) })),
      addKeyStats: (keyStats) => set((s) => ({ progress: { ...s.progress, keyStats: mergeKeyStats(s.progress.keyStats, keyStats) } })),
      setTestedOut: (stages) =>
        set((s) => ({
          progress: { ...s.progress, testedOutStages: [...new Set([...s.progress.testedOutStages, ...stages])].sort((a, b) => a - b) },
        })),
      replace: (progress, ownerId) => set({ progress, ownerId }),
      reset: () => set((s) => ({ progress: emptyProgress(), ownerId: s.ownerId })),
    }),
    { name: 'typeright.progress', version: 1, storage: createJSONStorage(() => safeSession) },
  ),
)
