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
  streak_current: number
  streak_best: number
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

// ------------------------------------------------------------------ daily challenge, streaks, badges

export const issueDaily = () => call<IssuedTest>('issue-test', { kind: 'daily' })

export async function getDailyBoard() {
  if (!supabase) return { rows: [] as BoardRow[], error: 'Leaderboards are not set up yet.' }
  const { data, error } = await supabase.rpc('get_daily_board', {})
  return { rows: (data ?? []) as BoardRow[], error: error ? 'Could not load today\u2019s board.' : null }
}

/** Records today's practice for the signed-in player's streak. Safe to call often. */
export async function touchStreak(): Promise<void> {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  if (data.session) await supabase.rpc('touch_streak')
}

export async function getBadges(userId: string): Promise<{ badge_id: string; awarded_at: string }[]> {
  if (!supabase) return []
  const { data } = await supabase.from('user_badges').select('badge_id, awarded_at').eq('user_id', userId)
  return data ?? []
}

// ------------------------------------------------------------------ groups

export interface Group {
  id: string
  name: string
  join_code: string
  owner_id: string
}

const rpcError = (e: { message?: string } | null) => (e ? (e.message ?? 'Something went wrong.').replace(/^.*?:\s*/, '') : null)

export async function myGroups(): Promise<Group[]> {
  if (!supabase) return []
  const { data } = await supabase.from('groups').select('id, name, join_code, owner_id').order('created_at')
  return (data ?? []) as Group[]
}

export async function createGroup(name: string) {
  if (!supabase) return { id: null, error: 'Not set up yet.' }
  const { data, error } = await supabase.rpc('create_group', { p_name: name })
  return { id: (data as { id: string }[] | null)?.[0]?.id ?? null, error: rpcError(error) }
}

export async function joinGroup(code: string) {
  if (!supabase) return { id: null, error: 'Not set up yet.' }
  const { data, error } = await supabase.rpc('join_group', { p_code: code })
  return { id: (data as string | null) ?? null, error: rpcError(error) }
}

export async function getGroup(id: string) {
  if (!supabase) return { group: null, members: [] as { user_id: string; username: string; avatar_url: string | null }[] }
  const [{ data: group }, { data: members }] = await Promise.all([
    supabase.from('groups').select('id, name, join_code, owner_id').eq('id', id).maybeSingle(),
    supabase.from('group_members').select('user_id, profiles(username, avatar_url)').eq('group_id', id),
  ])
  type Row = { user_id: string; profiles: { username: string; avatar_url: string | null } | null }
  return {
    group: group as Group | null,
    members: ((members ?? []) as unknown as Row[]).map((m) => ({ user_id: m.user_id, username: m.profiles?.username ?? '?', avatar_url: m.profiles?.avatar_url ?? null })),
  }
}

export async function leaveGroup(groupId: string, userId: string) {
  await supabase?.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
}

export async function getGroupBoard(groupId: string, duration: 30 | 60) {
  if (!supabase) return { rows: [] as BoardRow[], error: null }
  const { data, error } = await supabase.rpc('get_leaderboard', { p_duration: duration, p_period: 'all', p_group: groupId, p_limit: 100 })
  return { rows: (data ?? []) as BoardRow[], error: error ? 'Could not load the group board.' : null }
}

// ------------------------------------------------------------------ races

export interface Room {
  id: string
  code: string
  host_id: string
  visibility: 'private' | 'public'
  text_type: string
  text: string
  status: 'lobby' | 'racing' | 'done'
  starts_at: string | null
  cap_s: number
}

export interface RoomPlayer {
  user_id: string
  username: string
  avatar_url: string | null
  is_guest: boolean
}

export interface RaceRow {
  user_id: string
  finished: boolean
  progress: number
  finish_ms: number | null
  wpm: number
  accuracy: number
}

export async function createRoom(visibility: 'private' | 'public', textType: string, text: string) {
  if (!supabase) return { id: null, error: 'Not set up yet.' }
  const { data, error } = await supabase.rpc('create_room', { p_visibility: visibility, p_text_type: textType, p_text: text })
  return { id: (data as { id: string }[] | null)?.[0]?.id ?? null, error: rpcError(error) }
}

export async function joinRoom(code: string) {
  if (!supabase) return { id: null, error: 'Not set up yet.' }
  const { data, error } = await supabase.rpc('join_room', { p_code: code })
  return { id: (data as string | null) ?? null, error: rpcError(error) }
}

export const leaveRoom = (id: string) => supabase?.rpc('leave_room', { p_room: id })

export async function startRace(id: string) {
  if (!supabase) return 'Not set up yet.'
  const { error } = await supabase.rpc('start_race', { p_room: id })
  return rpcError(error)
}

export async function resetRoom(id: string, text: string) {
  if (!supabase) return 'Not set up yet.'
  const { error } = await supabase.rpc('reset_room', { p_room: id, p_text: text })
  return rpcError(error)
}

export async function listPublicRooms(): Promise<{ id: string; code: string; host: string; text_type: string; players: number }[]> {
  if (!supabase) return []
  const { data } = await supabase.rpc('list_public_rooms')
  return data ?? []
}

/** Room, players and results in one go, plus the server clock offset (server minus local ms). */
export async function loadRoom(id: string) {
  if (!supabase) return null
  const sent = Date.now()
  const [{ data: room }, { data: players }, { data: results }, { data: now }] = await Promise.all([
    supabase.from('rooms').select('id, code, host_id, visibility, text_type, text, status, starts_at, cap_s').eq('id', id).maybeSingle(),
    supabase.from('room_players').select('user_id, joined_at, profiles(username, avatar_url, is_guest)').eq('room_id', id).order('joined_at'),
    supabase.from('race_results').select('user_id, finished, progress, finish_ms, wpm, accuracy').eq('room_id', id),
    supabase.rpc('server_now'),
  ])
  const received = Date.now()
  type P = { user_id: string; profiles: { username: string; avatar_url: string | null; is_guest: boolean } | null }
  return {
    room: room as Room | null,
    players: ((players ?? []) as unknown as P[]).map((p) => ({
      user_id: p.user_id,
      username: p.profiles?.username ?? '?',
      avatar_url: p.profiles?.avatar_url ?? null,
      is_guest: p.profiles?.is_guest ?? false,
    })) as RoomPlayer[],
    results: (results ?? []) as RaceRow[],
    clockOffset: now ? Date.parse(now as string) - (sent + received) / 2 : 0,
  }
}

export const submitRace = (roomId: string, log: Keystroke[]) =>
  call<{ ok: true; finished: boolean; finishMs: number | null; wpm: number; accuracy: number }>('submit-race', { roomId, log })
