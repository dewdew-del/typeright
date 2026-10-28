# TypeRight: security notes (reviewed 28 October 2026)

What protects the site, what was found in the review, and what is still open. Plain language on purpose.

## How the main protections work
- **The server never trusts the browser.** Ranked and casual runs: `issue-test` picks the text, the browser sends only the key log, `submit-result` replays the log and decides the speed (`supabase/functions/_shared/validation.ts`). One use per issued test, per-user rate limits, the log must fit the real time that passed.
- **Row-level security on every table.** Browsers can read what is public (profiles, results, badges) and edit only their own progress and 4 profile columns. Results, badges and race results are written only by the Edge Functions. Server-only tables have no policies at all.
- **No secrets in the browser or the repo.** The website only holds the public `sb_publishable_...` key. The service-role key exists only inside the Edge Functions.
- **Headers** (`vercel.json`): Content-Security-Policy, HSTS (Vercel), nosniff, frame deny, referrer and permissions policy.
- **Desktop app:** Tauri CSP and only the default permissions.

## Review flags: bots stay off the boards
`submit-result` saves every verified run but marks some with a flag:
- `very-fast`: over 180 WPM
- `even-timing`: the gaps between keys look scripted (too even, no human hesitations; judged from 100 gaps up)
- `perfect-and-fast`: 100% accuracy over 120 WPM (information only, does not hide the run)

Runs with `very-fast` or `even-timing` do not appear on the leaderboards or profile bests until you clear the flag.
Look at them (Supabase → SQL editor):

```sql
select r.id, p.username, r.wpm, r.accuracy, r.duration_s, r.flags, r.created_at
from public.results r join public.profiles p on p.id = r.user_id
where r.flags && array['very-fast', 'even-timing']
order by r.created_at desc;
```

A real person who was wrongly flagged (clear the flag for one run):

```sql
update public.results
set flags = array_remove(array_remove(flags, 'very-fast'), 'even-timing')
where id = '<the id from the list>';
```

Honest limit: a script that copies a real person's typing rhythm closely can still pass. Turning on Turnstile (below) is the best next defence, because it makes mass-creating guest accounts hard.

## Review findings (28 Oct 2026)
| # | Level | Finding | Status |
|---|---|---|---|
| 1 | Medium | Script with human-like timing could reach the leaderboard | Fixed in code: flags + boards hide them. Needs the Edge Function deploy and the migration |
| 2 | Medium | Unlimited free guest accounts get around per-user limits | Open: turn on Turnstile (dashboard step) |
| 3 | Medium | No Content-Security-Policy | Fixed in `vercel.json`. Needs a website deploy |
| 4 | Medium | Avatar URL could point to any website | Fixed in migration `20261028000001` (only our own storage file is allowed) |
| 5 | Low-med | No self-service account deletion | Function `delete-account` and `deleteAccount()` are ready; a button in the profile pop-up is still to do |
| 6 | Low | Avatar uploads: any file name, so storage could be filled | Fixed in the migration (one fixed file name per user) |
| 7 | Low | `tested_out_stages` had no size limit | Fixed in the migration |
| 8 | Low | Public race channel: fake progress and refresh messages | Reduced in code (`src/lib/raceProgress.ts`). Private channels would need a live test, so not done |
| 9 | Low | `join_room` codes can be guessed (5 letters, no attempt limit) | Accepted for now: ~33 million codes and lobbies are deleted after a day. A fix needs a client change and careful rollout |
| 10 | Low | TRUNCATE/REFERENCES/TRIGGER rights on public tables | Fixed in the migration |
| 11 | Low | Group functions still callable (feature removed) | Fixed in the migration |
| 12 | Low | Names like `admin` could be taken | Fixed in the migration (new names only) |
| 13 | Low | Two migrations shared one version; workflow had no `permissions` | Fixed |
| 14 | Info | Privacy text was missing technical data and the developer view | Fixed (`src/pages/Privacy.tsx`) |

## Steps only the owner can do (dashboards)
1. **Turnstile** (finding 2): free Cloudflare account → Turnstile → add widget for `typeright.vercel.app`, `localhost`, `tauri.localhost` → put the site key in Vercel as `VITE_TURNSTILE_SITE_KEY` and the secret in Supabase → Authentication → Attack Protection. See `docs/SUPABASE_SETUP.md` step 5.
2. **Password length:** Supabase → Authentication → Sign In / Providers → Email → Minimum password length 8 or more.
3. **Redirect URLs:** Supabase → Authentication → URL Configuration: list only `https://typeright.vercel.app/**` and your local address. No `*.vercel.app` wildcard.
4. **Email sending:** the built-in Supabase email only reaches your own team members. If new users must confirm email or reset a password, set up a custom SMTP sender (Authentication → SMTP Settings), or those emails never arrive.
5. **2-step login** on GitHub, Vercel, Supabase, Google and Cloudflare.
6. **Rotate the Google client secret** (it was shown in a screenshot) in Google Cloud → APIs & Services → Credentials, then paste the new one in Supabase → Authentication → Providers → Google.
7. GitHub repo → Settings → Code security: turn on secret scanning, push protection and Dependabot alerts.
8. Leaked-password protection needs a paid Supabase plan. Skip it on the free plan.

## Rolling out the code changes
1. Database: apply `supabase/migrations/20261028000001_security_hardening.sql` (tested on a scratch Postgres with all 14 migrations; not yet applied to the live project).
2. Edge Functions: redeploy `submit-result` and `submit-race` (shared validation changed) and deploy `delete-account`.
3. Website: redeploy to Vercel. Afterwards check: home page loads, log in as guest, one casual run, leaderboard opens, the browser console has no "Content Security Policy" errors, and the site still opens offline.
4. If the CSP breaks something, remove the `Content-Security-Policy` entry in `vercel.json` and redeploy, then tell the developer what broke.
