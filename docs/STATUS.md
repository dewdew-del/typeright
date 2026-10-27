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

## Changes on 27 Oct 2026
- Accuracy now counts the letters on screen, so deleting a wrong letter brings it back to 100% (free mode). Stop-on-error mode still counts every wrong key. Live in the code; deployed to the Edge Functions `issue-test` and `submit-result`. `submit-race` still has the old rule until it is redeployed. The website needs a Vercel deploy to show the fix.
- Casual typing uses stories from the database: 101 English and 101 Filipino (`stories` table, seed text in `supabase/seed/`). Each player gets stories they have not finished; progress is in `story_progress`; when all stories in a language are done, the list starts again. Falls back to the old sentences if the table is empty. Offline practice still uses the bundled sentences.
- Not signed-in practice does not use stories.

## Casual typing and leaderboard (27 Oct 2026, later)
- Casual lengths: 10 s, 30 s, 1 min, 2 min, Endless. The menu opens casual typing straight in English, 30 s; Change settings (on the results screen) opens /casual to pick language and length.
- Enter restarts a run and is the Try again shortcut. Results screen is smaller, buttons at the top, only problem keys (never Space).
- Leaderboard: one list per length, all players, no language/period/country filters. DB function get_casual_board and test_issues check updated (migration 20261027000002).
- Lesson page shows only "Lesson N"; header has a back arrow and the logo goes to the home screen; home page picks a random wallpaper per visit; Test skill pulses for new players; rooms use a dropdown and a Change name pop-up; accuracy shows one decimal.
- issue-test allows 60 test starts per 10 minutes (was 20) because of quick restarts.

## Postponed on purpose (UI and UX, do later)
- Home page animation. Preview: https://claude.ai/artifact/TgZBPRpDsBGEM9HNaH3Cjp
- Button click feedback (hover, press, spinner). Preview: https://claude.ai/artifact/WVM122GHrVpjuAF4BXXyK9
- Focus now is on functionality.

## Other docs
- `docs/PLAN.md`: the full plan and data model
- `docs/SUPABASE_SETUP.md`: dashboard setup and deploy steps
- `docs/DESKTOP.md`: desktop build
- `docs/JOURNEY.md` and `docs/LESSONS.md`: lesson design
