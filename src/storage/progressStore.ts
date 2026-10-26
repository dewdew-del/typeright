import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { KeyStat } from '../../supabase/functions/_shared/scoring'
import type { LessonDef } from '../content/lessons/types'
import { emptyProgress, recordAttempt, type JourneyProgress } from '../engine/progress'

/**
 * Journey progress for the current visitor.
 *
 * Guests: kept in sessionStorage, so it lasts while the tab is open and is gone when the site is
 * closed (as planned). Stage 5 adds a Supabase-backed version for accounts behind the same actions.
 */
interface ProgressState {
  progress: JourneyProgress
  record: (lesson: LessonDef, wpm: number, accuracy: number, keyStats: Record<string, KeyStat>) => void
  setTestedOut: (stages: number[]) => void
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
      record: (lesson, wpm, accuracy, keyStats) =>
        set((s) => ({ progress: recordAttempt(s.progress, lesson, wpm, accuracy, keyStats) })),
      setTestedOut: (stages) => set((s) => ({ progress: { ...s.progress, testedOutStages: stages } })),
      reset: () => set({ progress: emptyProgress() }),
    }),
    { name: 'typeright.progress', version: 1, storage: createJSONStorage(() => safeSession) },
  ),
)
