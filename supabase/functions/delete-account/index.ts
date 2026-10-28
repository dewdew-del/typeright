// Deletes the caller's own account. Everything linked to it (profile, progress, results, badges, rooms)
// goes with it, because every table references auth.users with "on delete cascade".
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/http.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(token)
  const user = auth?.user
  if (!user) return json({ error: 'Sign in first.' }, 401)

  // The player must type their own username, so a slip of the finger can never delete an account.
  const body = await req.json().catch(() => null)
  const { data: profile } = await admin.from('profiles').select('username').eq('id', user.id).maybeSingle()
  if (!profile || body?.confirm !== profile.username) return json({ error: 'Type your username to confirm.' }, 400)

  // The profile photo lives in Storage, which the database cascade does not reach.
  await admin.storage.from('avatars').remove([`${user.id}/avatar.webp`])

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return json({ error: 'Could not delete the account. Please try again.' }, 500)
  return json({ ok: true })
})
