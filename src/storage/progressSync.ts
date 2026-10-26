import { create } from 'zustand'
import type { KeyStat } from '../../supabase/functions/_shared/scoring'
import { emptyProgress, hasProgress, mergeProgress, type JourneyProgress, type LessonRecord } from '../engine/progress'
import { supabase } from '../lib/supabase'
import { useAuth } from './authStore'
import { useProgress } from './progressStore'

/**
 * Keeps the tab's progress in step with the signed-in user's rows in Supabase.
 *
 * On sign-in: loads the account's progress. If the tab already has guest progress, asks (via
 * useMergePrompt) whether to merge it in. While signed in: saves changed lessons, key stats and
 * skipped stages shortly after they change. On sign-out: clears the tab's copy.
 */

interface MergePrompt {
  pending: { local: JourneyProgress; remote: JourneyProgress; userId: string } | null
}
export const useMergePrompt = create<MergePrompt>()(() => ({ pending: null }))

async function loadRemote(userId: string): Promise<JourneyProgress> {
  const p = emptyProgress()
  if (!supabase) return p
  const [lessons, keys, profile] = await Promise.all([
    supabase.from('lesson_progress').select('*').eq('user_id', userId),
    supabase.from('key_stats').select('*').eq('user_id', userId),
    supabase.from('profiles').select('tested_out_stages').eq('id', userId).maybeSingle(),
  ])
  for (const r of lessons.data ?? []) {
    p.lessons[r.lesson_id] = { stars: r.stars, bestWpm: r.best_wpm, bestAccuracy: r.best_accuracy, passed: r.passed, attempts: r.attempts }
  }
  for (const r of keys.data ?? []) p.keyStats[r.key] = { attempts: r.attempts, misses: r.misses, totalMs: Number(r.total_ms) }
  p.testedOutStages = (profile.data?.tested_out_stages as number[] | undefined) ?? []
  return p
}

async function save(userId: string, prev: JourneyProgress, next: JourneyProgress, all = false) {
  if (!supabase) return
  const lessonRows = Object.entries(next.lessons)
    .filter(([id, r]) => all || prev.lessons[id] !== r)
    .map(([id, r]: [string, LessonRecord]) => ({
      user_id: userId,
      lesson_id: id,
      stars: r.stars,
      best_wpm: r.bestWpm,
      best_accuracy: r.bestAccuracy,
      passed: r.passed,
      attempts: r.attempts,
    }))
  const keyRows = Object.entries(next.keyStats)
    .filter(([k, s]) => all || prev.keyStats[k] !== s)
    .map(([k, s]: [string, KeyStat]) => ({ user_id: userId, key: k, attempts: s.attempts, misses: s.misses, total_ms: Math.round(s.totalMs) }))
  const jobs: PromiseLike<unknown>[] = []
  if (lessonRows.length) jobs.push(supabase.from('lesson_progress').upsert(lessonRows))
  if (keyRows.length) jobs.push(supabase.from('key_stats').upsert(keyRows))
  if (all || prev.testedOutStages.join() !== next.testedOutStages.join()) {
    jobs.push(supabase.from('profiles').update({ tested_out_stages: next.testedOutStages }).eq('id', userId))
  }
  await Promise.all(jobs)
}

/** Deletes all of the signed-in user's progress rows (Settings > Clear my progress). */
export async function clearRemoteProgress(): Promise<void> {
  const userId = useAuth.getState().user?.id
  if (!supabase || !userId) return
  await Promise.all([
    supabase.from('lesson_progress').delete().eq('user_id', userId),
    supabase.from('key_stats').delete().eq('user_id', userId),
    supabase.from('profiles').update({ tested_out_stages: [] }).eq('id', userId),
  ])
}

/** Answers the merge prompt. */
export async function resolveMerge(merge: boolean) {
  const pending = useMergePrompt.getState().pending
  if (!pending) return
  useMergePrompt.setState({ pending: null })
  const result = merge ? mergeProgress(pending.local, pending.remote) : pending.remote
  useProgress.getState().replace(result, pending.userId)
  if (merge) await save(pending.userId, emptyProgress(), result, true)
}

let started = false

export function startProgressSync() {
  if (started || !supabase) return
  started = true

  let lastUserId: string | null | undefined
  useAuth.subscribe(async (s) => {
    if (!s.ready) return
    const userId = s.user?.id ?? null
    if (userId === lastUserId) return
    lastUserId = userId
    const store = useProgress.getState()

    if (!userId) {
      // Signed out: an account's progress must not stay in the tab.
      if (store.ownerId) store.replace(emptyProgress(), null)
      return
    }
    if (store.ownerId === userId) return // same user (page reload): the tab copy is current

    const remote = await loadRemote(userId)
    const local = useProgress.getState().progress
    if (s.isAnonymous && store.ownerId === null) {
      // A guest starting online play keeps everything from this tab; nothing to ask.
      const merged = mergeProgress(local, remote)
      useProgress.getState().replace(merged, userId)
      await save(userId, emptyProgress(), merged, true)
    } else if (store.ownerId === null && hasProgress(local)) {
      useMergePrompt.setState({ pending: { local, remote, userId } })
    } else {
      useProgress.getState().replace(remote, userId)
    }
  })

  let timer: number | undefined
  let base: JourneyProgress | null = null
  useProgress.subscribe((s, prev) => {
    const userId = useAuth.getState().user?.id
    if (!userId || s.ownerId !== userId || prev.ownerId !== userId || s.progress === prev.progress) return
    base ??= prev.progress
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      const from = base!
      base = null
      void save(userId, from, useProgress.getState().progress)
    }, 500)
  })
}
