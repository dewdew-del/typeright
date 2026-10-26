# TypeRight: where things stand (26 October 2026)

Read this first when starting a new session.

## Live
- Website: https://typeright.vercel.app (Vercel account team `dewdew2`, project `typeright`)
- Supabase project: `kibryhwcekdyvvskkepv` (Singapore, free plan)
- Google login: published ("In production"), client "TypeRight web" in Google Cloud project TypeRight
- Desktop installer: `src-tauri/target/release/bundle/nsis/TypeRight_0.1.0_x64-setup.exe` (built before the last few changes)

## All 9 stages are built and committed
1. Scaffold, keyboard with finger colors · 1b sky landing and auth pages
2. Typing engine (shared scoring in `supabase/functions/_shared/scoring.ts`), tests
3. 200 lessons, drill generator, stars, unlocking, Journey
4. Level test, casual typing, results, weak-keys practice
5. Supabase auth (email, Google, guest), profiles, progress sync
6. Server-validated results (Edge Functions `issue-test`, `submit-result`), leaderboards, public profiles
7. Live races (Realtime), badges, streaks (daily challenge and groups later removed from the UI; tables remain)
8. PWA, nightly cleanup (pg_cron), keep-alive workflow, optional Turnstile, accessibility, phone layout, Vercel config
9. Tauri 2 desktop app (email login only on desktop)

Later changes, on request:
- Leaderboard is casual-only: 2 min and Endless
- Settings and Profile are pop-ups
- Lessons ahead are locked
- No sign-up tab (Google creates accounts)
- No caret line while typing
- Privacy page at `/privacy`

## How to redeploy the website
No GitHub repo yet, so deploys run from this PC with the Vercel CLI (already logged in):

```
npx vercel deploy --prod --yes --build-env VITE_SUPABASE_URL=https://kibryhwcekdyvvskkepv.supabase.co --build-env VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key from .env>
```

Visitors get the new version on their next visit (the service worker updates in the background).

## Dashboard settings already done
- Supabase: Google provider on, anonymous sign-ins on, manual linking on
- Google: OAuth client, Branding (home page and privacy link), app published

- Confirmed 26 Oct 2026: Supabase Site URL and Redirect URLs, Google authorized JavaScript origin, and Google login tested on the live site

## Next steps, in suggested order
1. Done: URL settings confirmed and Google login tested on the live site.
2. Create a public GitHub repo, push the code, and connect Vercel to it for automatic deploys.
   Add the repo secrets `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` so `.github/workflows/keepalive.yml` runs.
3. Rebuild the desktop installer (`npm run desktop:build`) to include the latest changes.
4. Portfolio extras:
   - README with screenshots, features, stack, diagram and run steps
   - A "Problem I solved" note (anti-cheat and realtime races)
   - A 30-second demo script
5. Optional:
   - Turnstile keys (see `docs/SUPABASE_SETUP.md` step 5; also add `tauri.localhost`)
   - Stop Filipino sentences repeating within a few lines
   - Code-split the 690 KB app bundle
   - Rotate the Google client secret (it appeared in a screenshot)

## Other docs
- `docs/PLAN.md`: the full plan and data model
- `docs/SUPABASE_SETUP.md`: dashboard setup and deploy steps
- `docs/DESKTOP.md`: desktop build
- `docs/JOURNEY.md` and `docs/LESSONS.md`: lesson design
