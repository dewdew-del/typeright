import { create } from 'zustand'
import type { KeyStat } from '../../supabase/functions/_shared/scoring'
import { emptyProgress, hasProgress, mergeProgress, reconcileProgress, type JourneyProgress, type LessonRecord } from '../engine/progress'
import { IS_DESKTOP } from '../lib/platform'
import { supabase } from '../lib/supabase'
import { useAuth } from './authStore'
import { useProgress } from './progressStore'

/**
 * Keeps the tab's progress in step with the signed-in user's rows in Supabase.
 *
 * On sign-in: loads the account's progress. If the tab already has guest progress, asks (via
 * useMergePrompt) whether to merge it in. While signed in: saves changed lessons, key stats and
 * skipped stages shortly after they change. On sign-out: clears the tab's copy.
 *
 * Offline (desktop app): the local copy is the one that counts. A failed load never replaces it, a failed
 * save leaves `dirty` set, and the changes are sent again when the connection and the login are back.
 */

interface MergePrompt {
  pending: { local: JourneyProgress; remote: JourneyProgress; userId: string } | null
}
export const useMergePrompt = create<MergePrompt>()(() => ({ pending: null }))

/** The account's progress, or null when it could not be read (offline, server trouble): never treat that as "empty". */
async function loadRemote(userId: string): Promise<JourneyProgress | null> {
  const p = emptyProgress()
  if (!supabase) return null
  let lessons, keys, profile
  try {
    ;[lessons, keys, profile] = await Promise.all([
      supabase.from('lesson_progress').select('*').eq('user_id', userId),
      supabase.from('key_stats').select('*').eq('user_id', userId),
      supabase.from('profiles').select('tested_out_stages').eq('id', userId).maybeSingle(),
    ])
  } catch {
    return null
  }
  if (lessons.error || keys.error || profile.error) return null
  for (const r of lessons.data ?? []) {
    p.lessons[r.lesson_id] = { stars: r.stars, bestWpm: r.best_wpm, bestAccuracy: r.best_accuracy, passed: r.passed, attempts: r.attempts }
  }
  for (const r of keys.data ?? []) p.keyStats[r.key] = { attempts: r.attempts, misses: r.misses, totalMs: Number(r.total_ms) }
  p.testedOutStages = (profile.data?.tested_out_stages as number[] | undefined) ?? []
  return p
}

/** True when every row was stored. */
async function save(userId: string, prev: JourneyProgress, next: JourneyProgress, all = false): Promise<boolean> {
  if (!supabase) return false
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
  const jobs: PromiseLike<{ error: unknown }>[] = []
  if (lessonRows.length) jobs.push(supabase.from('lesson_progress').upsert(lessonRows))
  if (keyRows.length) jobs.push(supabase.from('key_stats').upsert(keyRows))
  if (all || prev.testedOutStages.join() !== next.testedOutStages.join()) {
    jobs.push(supabase.from('profiles').update({ tested_out_stages: next.testedOutStages }).eq('id', userId))
  }
  try {
    const done = await Promise.all(jobs)
    return done.every((r) => !r.error)
  } catch {
    return false
  }
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
  if (merge && !(await save(pending.userId, emptyProgress(), result, true))) useProgress.setState({ dirty: true })
}

let started = false
let reconciling = false

/** Brings this device and the signed-in account in step. Safe to call any time; does nothing when there is nothing to do. */
async function reconcile() {
  const auth = useAuth.getState()
  const userId = auth.user?.id
  if (!auth.ready || !userId || reconciling || useMergePrompt.getState().pending) return
  const store = useProgress.getState()
  if (store.ownerId === userId && !store.dirty) return // same user, nothing unsent: the local copy is current
  reconciling = true
  try {
    const remote = await loadRemote(userId)
    if (!remote) return // offline or server trouble: keep the local copy, try again later
    const local = useProgress.getState().progress

    if (store.ownerId === userId) {
      // Back online with changes made while offline: join them with the account's copy, then send it.
      const merged = reconcileProgress(local, remote)
      useProgress.getState().replace(merged, userId)
      if (!(await save(userId, remote, merged, true))) useProgress.setState({ dirty: true })
    } else if (auth.isAnonymous && store.ownerId === null) {
      // A guest starting online play keeps everything from this tab; nothing to ask.
      const merged = mergeProgress(local, remote)
      useProgress.getState().replace(merged, userId)
      if (!(await save(userId, emptyProgress(), merged, true))) useProgress.setState({ dirty: true })
    } else if (store.ownerId === null && hasProgress(local)) {
      useMergePrompt.setState({ pending: { local, remote, userId } })
    } else {
      useProgress.getState().replace(remote, userId)
    }
  } finally {
    reconciling = false
  }
}

export function startProgressSync() {
  if (started || !supabase) return
  started = true

  let lastUserId: string | null | undefined
  useAuth.subscribe((s) => {
    if (!s.ready) return
    const userId = s.user?.id ?? null
    if (userId === lastUserId) return
    lastUserId = userId
    if (!userId) {
      // The website: an account's progress must not stay in the tab after signing out. The desktop app
      // keeps its copy, because "no session" also happens when it starts offline (signing out clears it).
      const store = useProgress.getState()
      if (!IS_DESKTOP && store.ownerId) store.replace(emptyProgress(), null)
      return
    }
    void reconcile()
  })

  // Unsent changes go out again when the connection returns, and every half minute while they wait.
  window.addEventListener('online', () => void reconcile())
  window.setInterval(() => {
    if (useProgress.getState().dirty && navigator.onLine) void reconcile()
  }, 30_000)

  let timer: number | undefined
  let base: JourneyProgress | null = null
  useProgress.subscribe((s, prev) => {
    const userId = useAuth.getState().user?.id
    if (!userId || s.ownerId !== userId || prev.ownerId !== userId || s.progress === prev.progress) return
    base ??= prev.progress
    window.clearTimeout(timer)
    timer = window.setTimeout(async () => {
      const from = base!
      base = null
      const sent = useProgress.getState().progress
      const ok = await save(userId, from, sent)
      if (ok && useProgress.getState().progress === sent) useProgress.setState({ dirty: false })
    }, 500)
  })
}
