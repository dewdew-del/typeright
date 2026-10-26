import type { Keystroke } from '../../supabase/functions/_shared/scoring'
import { REASON_TEXT } from '../../supabase/functions/_shared/validation'
import { supabase } from './supabase'

export interface IssuedTest {
  issueId: string
  text: string
  durationS: number
}

export interface RankedResult {
  ok: true
  wpm: number
  rawWpm: number
  accuracy: number
  keystrokes: number
  flags: string[]
  qualifies: boolean
  personalBest: boolean
  rank: number | null
}

/** Calls an Edge Function and turns any failure into a readable message. */
async function call<T>(name: string, body: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  if (!supabase) return { error: 'Online features are not set up yet.' }
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (!error) return { data: data as T }
  // Non-2xx: the function's JSON body says why.
  const res = (error as { context?: Response }).context
  try {
    const payload = res ? await res.json() : null
    if (payload?.reason) return { error: REASON_TEXT[payload.reason] ?? 'The result could not be counted.' }
    if (payload?.error) return { error: payload.error }
  } catch {
    /* fall through */
  }
  return { error: 'Could not reach the server. Check your connection and try again.' }
}

export const issueTest = (duration: 30 | 60) => call<IssuedTest>('issue-test', { duration })

/** Sends only the issue id and the raw keystroke log: the server computes the score. */
export const submitResult = (issueId: string, log: Keystroke[]) => call<RankedResult>('submit-result', { issueId, log })

export interface BoardRow {
  rank: number
  user_id: string
  username: string
  country: string
  avatar_url: string | null
  is_guest: boolean
  wpm: number
  accuracy: number
  achieved_at: string
}

export type Period = 'all' | 'weekly' | 'daily'

export async function getLeaderboard(duration: 30 | 60, period: Period, country: string | null) {
  if (!supabase) return { rows: [] as BoardRow[], error: 'Leaderboards are not set up yet.' }
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_duration: duration,
    p_period: period,
    p_country: country,
    p_lang: 'en',
    p_limit: 50,
  })
  return { rows: (data ?? []) as BoardRow[], error: error ? 'Could not load the leaderboard.' : null }
}

export interface ProfileStats {
  user_id: string
  username: string
  country: string
  avatar_url: string | null
  is_guest: boolean
  joined_at: string
  best_30: number | null
  best_60: number | null
  tests_taken: number
  avg_accuracy: number | null
}

export interface RecentResult {
  id: string
  duration_s: number
  wpm: number
  accuracy: number
  created_at: string
}

export async function getPublicProfile(username: string) {
  if (!supabase) return { stats: null, recent: [] as RecentResult[] }
  const { data } = await supabase.rpc('get_profile_stats', { p_username: username })
  const stats = ((data ?? []) as ProfileStats[])[0] ?? null
  if (!stats) return { stats: null, recent: [] as RecentResult[] }
  const { data: recent } = await supabase
    .from('results')
    .select('id, duration_s, wpm, accuracy, created_at')
    .eq('user_id', stats.user_id)
    .order('created_at', { ascending: false })
    .limit(10)
  return { stats, recent: (recent ?? []) as RecentResult[] }
}
