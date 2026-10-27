// Records a player's race from their keystroke log. Finishing order comes from the server clock.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/http.ts'
import { MIN_RACE_ACCURACY } from '../_shared/scoring.ts'
import { validateRace } from '../_shared/validation.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const round1 = (x: number) => Math.round(x * 10) / 10

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(token)
  const user = auth?.user
  if (!user) return json({ error: 'Sign in to race.' }, 401)

  const now = Date.now()
  const body = await req.json().catch(() => null)
  const roomId = typeof body?.roomId === 'string' ? body.roomId : ''

  const attempt = (outcome: 'accepted' | 'rejected' | 'rate-limited', reason?: string) =>
    admin.from('submission_attempts').insert({ user_id: user.id, outcome, reason })

  const { count: recent } = await admin
    .from('submission_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', new Date(now - 60_000).toISOString())
  if ((recent ?? 0) >= 10) {
    await attempt('rate-limited')
    return json({ ok: false, reason: 'rate-limited' }, 429)
  }

  const { data: room } = await admin.from('rooms').select('id, text, status, starts_at, cap_s').eq('id', roomId).maybeSingle()
  if (!room || room.status !== 'racing' || !room.starts_at) return json({ ok: false, reason: 'not-racing' }, 409)

  const { data: member } = await admin
    .from('room_players')
    .select('user_id')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member) return json({ ok: false, reason: 'not-member' }, 403)

  const startsAt = Date.parse(room.starts_at)
  const verdict = validateRace({ text: room.text, log: body?.log, startsAt, now, capMs: room.cap_s * 1000 })
  if (!verdict.ok || !verdict.summary) {
    await attempt('rejected', verdict.reason)
    return json({ ok: false, reason: verdict.reason }, 422)
  }

  // Typing the whole text is not enough: it must be done with real accuracy, or mashing keys would win.
  const finished = verdict.complete === true && verdict.summary.accuracy >= MIN_RACE_ACCURACY
  // Primary key (room, user) makes a second submission fail: one result per player per round.
  const { error } = await admin.from('race_results').insert({
    room_id: room.id,
    user_id: user.id,
    finished,
    progress: verdict.progress ?? 0,
    finish_ms: finished ? now - startsAt : null,
    wpm: round1(verdict.summary.wpm),
    accuracy: round1(verdict.summary.accuracy),
  })
  if (error) {
    await attempt('rejected', 'used')
    return json({ ok: false, reason: 'used' }, 409)
  }
  await attempt('accepted')

  // The race is over once everyone has a result, or the time cap has clearly passed.
  const [{ count: players }, { count: results }] = await Promise.all([
    admin.from('room_players').select('user_id', { count: 'exact', head: true }).eq('room_id', room.id),
    admin.from('race_results').select('user_id', { count: 'exact', head: true }).eq('room_id', room.id),
  ])
  if ((results ?? 0) >= (players ?? 0) || now > startsAt + room.cap_s * 1000 + 15_000) {
    await admin.from('rooms').update({ status: 'done' }).eq('id', room.id).eq('status', 'racing')
  }

  return json({ ok: true, finished, finishMs: finished ? now - startsAt : null, wpm: round1(verdict.summary.wpm), accuracy: round1(verdict.summary.accuracy) })
})
