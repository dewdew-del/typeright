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

## 4. Guest online play (needed in Stage 7, races and daily challenge)
Authentication → Sign In / Providers:
- turn on **Allow anonymous sign-ins**;
- turn on **Allow manual linking**, so a guest can link Google and keep the same account.
Stage 7 adds a free Cloudflare Turnstile CAPTCHA so bots cannot mass-create guests.

## 5. Keep the project awake
Free projects pause after about a week without activity. Stage 8 adds a free GitHub Actions ping;
until then, open the app or the dashboard once a week, or press "Restore" if it pauses.
