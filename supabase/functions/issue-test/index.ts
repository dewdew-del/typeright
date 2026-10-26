// Starts a ranked test or today's daily challenge: the server picks the text and remembers when.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/http.ts'
import { CASUAL_CHARS, casualText } from '../_shared/casualText.ts'
import { dailySeed, manilaDate, rankedText } from '../_shared/rankedText.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(token)
  const user = auth?.user
  if (!user) return json({ error: 'Sign in to take a ranked test.' }, 401)

  const body = await req.json().catch(() => ({}))
  const kind = body?.kind === 'daily' ? 'daily' : body?.kind === 'casual' ? 'casual' : 'test'
  const lang = body?.lang === 'fil' ? 'fil' : 'en'
  const endless = body?.mode === 'endless'
  // Casual: 2 min (120) or Endless (0). Daily: always 60 s, same text for everyone that day.
  const durationS = kind === 'casual' ? (endless ? 0 : 120) : kind === 'daily' ? 60 : body?.duration === 60 ? 60 : 30
  const dailyDate = kind === 'daily' ? manilaDate() : null

  // Starting tests is cheap, but not unlimited.
  const since = new Date(Date.now() - 10 * 60_000).toISOString()
  const { count } = await admin
    .from('test_issues')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('issued_at', since)
  if ((count ?? 0) >= 20) return json({ error: 'Too many tests started. Take a short break.' }, 429)

  const seed = dailyDate ? dailySeed(dailyDate) : crypto.getRandomValues(new Uint32Array(1))[0]
  const text =
    kind === 'casual' ? casualText(seed, lang, CASUAL_CHARS[endless ? 'endless' : '2min']) : rankedText(seed, durationS)
  const { data, error } = await admin
    .from('test_issues')
    .insert({ user_id: user.id, duration_s: durationS, text, kind, lang, daily_date: dailyDate })
    .select('id')
    .single()
  if (error || !data) return json({ error: 'Could not start the test.' }, 500)

  return json({ issueId: data.id, text, durationS, kind, lang, dailyDate })
})
