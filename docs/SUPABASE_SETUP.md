# Supabase setup (one-time, in the dashboard)

Project: **typeright** (`kibryhwcekdyvvskkepv`, Singapore, free plan).
Dashboard: https://supabase.com/dashboard/project/kibryhwcekdyvvskkepv

The database (tables, security rules, sign-up trigger) is already set up from `supabase/migrations/`.
These switches can only be flipped in the dashboard:

## 1. URLs (needed for email links and Google)
Authentication → URL Configuration
- **Site URL:** `http://localhost:5173` for now. Change it to your Vercel URL when deployed (Stage 8).
- **Redirect URLs:** add `http://localhost:5173/**` (and later `https://<your-app>.vercel.app/**`).

## 2. Email sign-up
Authentication → Sign In / Providers → Email: on by default.
- "Confirm email" is on, so new users must click a link before logging in.
- The built-in email sender is only for testing: it sends just a few emails per hour. That is fine for a portfolio. For more, add a free SMTP provider (e.g. Resend) under Authentication → Emails → SMTP.

## 3. Google login (optional, email works without it)
1. Go to https://console.cloud.google.com → create a project (free) → APIs & Services → OAuth consent screen: External, app name "TypeRight", your email.
2. Credentials → Create credentials → OAuth client ID → **Web application**.
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URI: `https://kibryhwcekdyvvskkepv.supabase.co/auth/v1/callback`
3. Copy the Client ID and Client secret into Supabase: Authentication → Sign In / Providers → Google → enable → paste → Save.
   Never put the client secret in the app or in git.

## 4. Guest online play (races and leaderboard runs without an account)
Authentication → Sign In / Providers:
- turn on **Allow anonymous sign-ins**;
- turn on **Allow manual linking**, so a guest can link Google and keep the same account.

## 5. Human check for sign-ins (Cloudflare Turnstile, free, optional but recommended once live)
Stops bots from mass-creating guests. Supabase then checks it on log in, guest sign-in and password reset.
1. https://dash.cloudflare.com → Turnstile → Add widget: name `TypeRight`, hostnames `localhost` and your Vercel domain, mode **Managed**.
2. Copy the **site key** into `.env` (and the Vercel env vars) as `VITE_TURNSTILE_SITE_KEY`. It is public.
3. Copy the **secret key** into Supabase: Authentication → Attack Protection → Enable CAPTCHA protection → Turnstile → paste → Save.
   The secret key never goes in the app or in git.
Do steps 2 and 3 together: with only one of them, sign-ins fail.

## 6. Keep the project awake
Free projects pause after about a week without database activity. `.github/workflows/keepalive.yml`
reads one row every 3 days. In the GitHub repo: Settings → Secrets and variables → Actions → New repository secret:
- `SUPABASE_URL` = `https://kibryhwcekdyvvskkepv.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` = the publishable key from `.env`

Then Actions → Keep Supabase awake → Run workflow once and check it goes green.
If it ever pauses anyway, open the dashboard and press **Restore**.

## 7. Nightly cleanup (already on)
A pg_cron job (`typeright-cleanup`, 03:17 UTC) deletes keystroke logs older than 30 days, unused test texts,
old rate-limit rows, abandoned race lobbies, and guest users older than 14 days. Scores are kept.

## 8. Deploy to Vercel
1. Push the repo to GitHub (public).
2. https://vercel.com/new → import the repo. Vercel reads `vercel.json` (Vite, `npm run build`, `dist`).
3. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_TURNSTILE_SITE_KEY` if you did step 5.
4. Deploy. Every push to `main` redeploys.
5. Back in step 1: set **Site URL** to `https://<your-app>.vercel.app` and add `https://<your-app>.vercel.app/**` to Redirect URLs.
6. In Google Cloud (step 3), add `https://<your-app>.vercel.app` to Authorized JavaScript origins.
