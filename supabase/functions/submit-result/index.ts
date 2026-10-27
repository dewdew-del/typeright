// Scores a ranked test from its keystroke log. The client sends only {issueId, log}: no WPM.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/http.ts'
import { finishedStoryIds, type Story } from '../_shared/storyPick.ts'
import { validateRanked } from '../_shared/validation.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const round1 = (x: number) => Math.round(x * 10) / 10

// Leaderboard accuracy rule. Temporarily 0 (every verified run counts); the intended rule is 95.
const MIN_ACCURACY = 0

/** Remembers the stories typed to the end. When every story in the language is done, the list starts again. */
async function markStoriesDone(userId: string, lang: string, storyIds: number[], typedChars: number) {
  if (storyIds.length === 0) return
  const { data: rows } = await admin.from('stories').select('id, body').in('id', storyIds)
  const byId = new Map((rows ?? []).map((r: Story) => [r.id, r]))
  const ordered = storyIds.map((id) => byId.get(id)).filter((r): r is Story => !!r)
  const finished = finishedStoryIds(ordered, typedChars)
  if (finished.length === 0) return
  await admin
    .from('story_progress')
    .upsert(finished.map((story_id) => ({ user_id: userId, story_id })), { onConflict: 'user_id,story_id', ignoreDuplicates: true })

  const [{ data: all }, { data: done }] = await Promise.all([
    admin.from('stories').select('id').eq('lang', lang),
    admin.from('story_progress').select('story_id').eq('user_id', userId),
  ])
  const doneIds = new Set((done ?? []).map((r: { story_id: number }) => r.story_id))
  const allIds = (all ?? []).map((r: { id: number }) => r.id)
  if (allIds.length > 0 && allIds.every((id: number) => doneIds.has(id))) {
    await admin.from('story_progress').delete().eq('user_id', userId).in('story_id', allIds)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(token)
  const user = auth?.user
  if (!user) return json({ error: 'Sign in to submit a ranked result.' }, 401)

  const body = await req.json().catch(() => null)
  const issueId = typeof body?.issueId === 'string' ? body.issueId : ''

  const attempt = (outcome: 'accepted' | 'rejected' | 'rate-limited', reason?: string) =>
    admin.from('submission_attempts').insert({ user_id: user.id, outcome, reason })

  // Rate limit: 6 per minute, 60 per hour.
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
  const [minute, hour] = await Promise.all([
    admin.from('submission_attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', ago(60_000)),
    admin.from('submission_attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', ago(3_600_000)),
  ])
  if ((minute.count ?? 0) >= 6 || (hour.count ?? 0) >= 60) {
    await attempt('rate-limited')
    return json({ ok: false, reason: 'rate-limited' }, 429)
  }

  // Each issued test can be submitted once, by its owner. Marking it used first blocks replays.
  const { data: issue } = await admin
    .from('test_issues')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', issueId)
    .eq('user_id', user.id)
    .is('consumed_at', null)
    .select('id, text, duration_s, lang, kind, daily_date, issued_at, story_ids')
    .maybeSingle()
  if (!issue) {
    await attempt('rejected', 'used')
    return json({ ok: false, reason: 'used' }, 409)
  }

  const verdict = validateRanked({
    text: issue.text,
    log: body?.log,
    durationMs: issue.duration_s * 1000,
    issuedAt: Date.parse(issue.issued_at),
    now: Date.now(),
  })
  if (!verdict.ok || !verdict.summary) {
    await attempt('rejected', verdict.reason)
    return json({ ok: false, reason: verdict.reason }, 422)
  }

  const s = verdict.summary
  const wpm = round1(s.wpm)
  const accuracy = round1(s.accuracy)
  const qualifies = accuracy >= MIN_ACCURACY

  // Ranked tests compare with all-time ranked results; the daily challenge only with that day.
  // deno-lint-ignore no-explicit-any
  const sameBoard = (q: any) => {
    let out = q.eq('kind', issue.kind).eq('duration_s', issue.duration_s).eq('lang', issue.lang)
    if (issue.daily_date) out = out.eq('daily_date', issue.daily_date)
    return out
  }

  const { data: prev } = await sameBoard(admin.from('results').select('wpm').eq('user_id', user.id))
    .gte('accuracy', MIN_ACCURACY)
    .order('wpm', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: saved, error } = await admin
    .from('results')
    .insert({
      user_id: user.id,
      issue_id: issue.id,
      kind: issue.kind,
      lang: issue.lang,
      duration_s: issue.duration_s,
      daily_date: issue.daily_date,
      wpm,
      raw_wpm: round1(s.rawWpm),
      accuracy,
      keystrokes: s.keystrokes,
      typed_ms: Math.round(s.durationMs),
      flags: verdict.flags,
    })
    .select('id')
    .single()
  if (error || !saved) return json({ ok: false, reason: 'server-error' }, 500)
  await Promise.all([
    admin.from('result_logs').insert({ result_id: saved.id, log: body.log }),
    attempt('accepted'),
    markStoriesDone(user.id, issue.lang, issue.story_ids ?? [], s.correctChars),
  ])

  const best = Math.max(prev?.wpm ?? 0, qualifies ? wpm : 0)
  let rank: number | null = null
  if (best > 0) {
    // Rank on the same board: players whose best qualifying run is faster than yours, plus one.
    const { data: faster } = await sameBoard(admin.from('results').select('user_id'))
      .gte('accuracy', MIN_ACCURACY)
      .gt('wpm', best)
      .neq('user_id', user.id)
      .limit(10000)
    rank = new Set((faster ?? []).map((r: { user_id: string }) => r.user_id)).size + 1
  }

  return json({
    ok: true,
    wpm,
    rawWpm: round1(s.rawWpm),
    accuracy,
    keystrokes: s.keystrokes,
    durationMs: s.durationMs,
    flags: verdict.flags,
    qualifies,
    personalBest: qualifies && wpm > (prev?.wpm ?? 0),
    rank,
  })
})
