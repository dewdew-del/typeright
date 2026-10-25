# TypeRight – Plan (v1, awaiting approval)

Competitive typing trainer: lessons → practice → ranked tests → live races. Web (Vercel) first, Tauri desktop last, one codebase. Total cost ₱0.

## Update v2 (design phase, supersedes anything below that differs)
Details: [JOURNEY.md](JOURNEY.md) and [LESSONS.md](LESSONS.md). The clickable design preview is the source of truth for screens.

**Screen flow**
- Landing (night or morning sky by time of day, sun/moon button) → "How do you want to type today?" with three picture buttons: **Journey**, **Play with friends**, **Casual typing**. Login is a small button; everything works without an account.
- **Journey:** one continuous list of 200 lessons in 13 stages (checkpoint cards mark stage ends), auto-scrolls to the lesson in progress, lessons ahead can be skipped to, optional **Test skill** level test (intro, staged test, result with skipped stages).
- **Play with friends:** Create a room (private or public, pick what to type from 10 text types incl. Filipino) or Join a room (code or public list) → waiting room (2 to 8 players) → live race → results.
- **Casual typing:** setup (English or Filipino, 2 min or endless, sentences only) → typing → results (speed chart, keys to practice).
- Inside the app: light and minimal, with a light/dark button on every screen. No sidebar.
- Not yet designed: leaderboard, public profile, settings, race countdown, public rooms list as its own screen.

**Rules changed from v1**
- **Guests can compete** (races and the daily challenge) through Supabase **anonymous sign-ins**, validated like accounts. Guest session lives in the tab, so progress is gone when the site is closed. "Create account to keep this" links the guest to an email or Google identity and keeps the same user id (no merge). Abuse controls: Cloudflare Turnstile, Supabase per-IP limits, per-user submission limits, cleanup of old anonymous users. Guests appear on race results and daily and weekly boards labeled as guests; all-time board and badges are for accounts.
- Daily challenge and class groups are kept in the plan but have no screen yet.
- Guest progress is no longer saved in localStorage across sessions (session only).
- Lessons: 200 lessons generated from specs; stop-on-error in Stages 1 to 3; 90% pass, stars, checkpoints per stage.

**Revised build stages** (each ends: runs, how to test, commit, your go-ahead)
1. Scaffold, theme, light/dark button, landing and path-choice screens (Stage 1 code exists: keyboard and finger colors; restyle to the new design)
2. Typing engine (WPM, accuracy, keystroke log, per-key stats) + unit tests
3. Lesson system: 200 lesson specs, drill generator, stars and unlocking, Journey screen with auto-scroll, session-only storage layer
4. Level test, casual typing, results screens, weak-keys practice, settings
5. Supabase setup, auth (email, Google, anonymous guest), profiles, guest to account linking
6. Validated result submission (anti-cheat Edge Function), leaderboards, public profiles
7. Live races (private and public rooms, Realtime), daily challenge, groups, badges and streaks
8. PWA, accessibility, responsive polish, keep-alive, Vercel deploy
9. Tauri desktop build

## 0. Decisions from your answers
- **Supabase project**: I create it via the Supabase MCP at Stage 5 (will show you the cost check first; free plan allows 2 active projects, so tell me if you already have 2).
- **GitHub**: you create a public repo; Vercel auto-deploys from it; GitHub Actions runs the keep-alive cron.
- **Tauri prereqs**: unknown, so I check your machine at Stage 9 (Rust + MSVC Build Tools, ~6 GB).
- **Content**: English + Filipino. Every text, lesson set, and result carries a `lang` ('en' | 'fil'). Leaderboards are per language. Lessons/finger drills are language-neutral (same keys); only words/sentences differ.

## 1. Assumptions (tell me if wrong)
1. Package manager **npm**; **Vitest** for tests; **Tailwind v4**; **React Router**; **Zustand** for settings/state; charts are small hand-written SVG (no chart library, keeps the bundle and your laptop light).
2. "Daily"/"weekly" boundaries use **Asia/Manila (UTC+8)**, one constant to change.
3. **Races, ranked tests and the daily challenge need an account.** Guests get lessons, practice, and unranked timed tests (they can't be validated server-side without identity or rate limiting).
4. Lessons use the **ANSI US QWERTY** physical layout (what PH keyboards use).
5. Honest limit of anti-cheat: a bot that fakes real-looking, human-jittered keystrokes can't be fully stopped without a backend you control. We stop casual cheating (edited requests, impossible speed, robotic timing, replays, spam). I'll document this in the "Problem I solved" note.

## 2. Folder structure
```
typeright/
├─ .github/workflows/keepalive.yml     # cron ping every 3 days
├─ supabase/
│  ├─ migrations/                      # 0001_profiles.sql … numbered, plain SQL
│  ├─ functions/
│  │  ├─ _shared/scoring.ts            # PURE, dependency-free: replay log → wpm/accuracy, checks
│  │  ├─ _shared/scoring.test.ts       # Vitest
│  │  ├─ issue-test/index.ts           # hands out server-chosen text + token
│  │  ├─ submit-result/index.ts        # validates, stores, updates PBs/streak/badges
│  │  └─ race-start/index.ts           # sets server start time
│  └─ config.toml
├─ src-tauri/                          # Stage 9 only
├─ public/ (icons, sounds, manifest)
├─ src/
│  ├─ main.tsx, App.tsx, routes.tsx
│  ├─ layouts/                         # qwerty.ts (key → finger, row, hand, bump) ; add others later
│  ├─ content/
│  │  ├─ lessons/{en,fil}/*.ts         # lesson data only
│  │  ├─ words/{en,fil}.ts, sentences/{en,fil}.ts
│  │  ├─ tips.ts, techniques.ts, badges.ts
│  ├─ engine/                          # pure TS, no React
│  │  ├─ typingEngine.ts (state machine), metrics.ts (re-exports _shared/scoring), keylog.ts
│  │  ├─ weakKeys.ts, drillGenerator.ts, unlock.ts
│  ├─ storage/
│  │  ├─ Storage.ts (interface), LocalStorageAdapter.ts, SupabaseAdapter.ts
│  │  ├─ StorageProvider.tsx           # picks adapter from auth state
│  │  └─ mergeGuest.ts
│  ├─ lib/ supabase.ts, api.ts (edge function calls), realtime.ts, env.ts
│  ├─ stores/ settings.ts, session.ts
│  ├─ components/
│  │  ├─ keyboard/ Keyboard, Key, FingerLegend, HandGuide
│  │  ├─ typing/ TypingArea, StatsBar, ResultsCard
│  │  ├─ charts/ LineChart, Heatmap
│  │  ├─ race/ Lobby, RaceTrack, Countdown, RaceResults
│  │  ├─ leaderboard/ LeaderboardTable, Filters
│  │  ├─ auth/ AuthForm, MergePrompt
│  │  └─ ui/ Button, Card, Modal, Toast, Badge …
│  ├─ pages/ Home, Lessons, Lesson, Practice, Test, Progress, Weak, Guide,
│  │          Leaderboard, Profile, Race, RaceRoom, Daily, Groups, Settings, Auth
│  └─ pwa/ (service worker config)
├─ tests/ (engine tests; scoring tests live next to scoring)
├─ .env.example   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY only
└─ README.md, docs/
```
`_shared/scoring.ts` is the single source of the WPM/accuracy formulas: the Edge Function (Deno) and the client engine (Vite alias) both import it, so the numbers can't drift apart.

## 3. Data models (TypeScript)
```ts
type Lang = 'en' | 'fil'
type Finger = 'LP'|'LR'|'LM'|'LI'|'LT'|'RT'|'RI'|'RM'|'RR'|'RP'
interface KeyDef { code: string; label: string; shiftLabel?: string; row: 0|1|2|3|4; finger: Finger; bump?: boolean }
interface Keystroke { k: string; t: number; ok?: never }   // key typed, ms since first key. Log stores key+timestamp only
interface Lesson { id: string; group: 'home'|'top'|'bottom'|'numbers'|'shift-punct'|'sentences';
  title: string; keys: string[]; tip: Tip; drills: string[]; minWpm: number; minAccuracy: number; lang?: Lang }
interface TestResult { wpm: number; rawWpm: number; accuracy: number; durationMs: number; keyStats: Record<string,{attempts:number;misses:number}> }
interface GuestProgress { v: 1; lessons: Record<string,{bestWpm:number;bestAcc:number;done:boolean}>;
  keyStats: Record<Lang, Record<string,{a:number;m:number}>>; history: PracticeEntry[]; settings: Settings }
```

## 4. Supabase schema (migrations)
| Table | Purpose / key columns |
|---|---|
| `profiles` | `id` (→ auth.users), `username` citext **unique**, `avatar_url`, `country` char(2) default 'PH', `streak_current`, `streak_best`, `last_active_date`, `created_at`. Auto-created by trigger on signup. |
| `lesson_progress` | pk(`user_id`,`lesson_id`), `best_wpm`, `best_accuracy`, `completed_at` |
| `key_stats` | pk(`user_id`,`lang`,`key`), `attempts`, `misses` |
| `practice_sessions` | unranked history for the progress chart: `user_id`, `kind`, `lang`, `wpm`, `accuracy`, `duration_ms`, `created_at` (self-reported, never used for rankings) |
| `test_issues` | **server-issued tests**: `id` uuid, `user_id`, `kind` ('test'/'daily'/'race'), `lang`, `duration_s`, `text`, `room_id?`, `daily_date?`, `issued_at`, `consumed_at`. Client can't pick its own text. |
| `results` | **ranked, validated only**: `id`, `user_id`, `issue_id` unique, `kind`, `lang`, `duration_s`, `wpm`, `raw_wpm`, `accuracy`, `keystrokes`, `finish_ms`, `room_id?`, `daily_date?`, `flags` text[], `created_at` |
| `result_logs` | `result_id`, `log` jsonb (audit; pruned after 30 days) |
| `personal_bests` | pk(`user_id`,`lang`,`duration_s`), `wpm`, `accuracy`, `result_id`, `achieved_at` |
| `submission_attempts` | `user_id`, `created_at`, `outcome`, `reason` (rate limiting + audit trail) |
| `rooms` | `id`, `code` unique, `host_id`, `lang`, `text`, `status` (lobby/countdown/racing/done), `max_players` (2–8), `starts_at`, `created_at` |
| `room_players` | pk(`room_id`,`user_id`), `joined_at` |
| `groups` / `group_members` | `groups(id,name,join_code unique,owner_id)`, pk(`group_id`,`user_id`), `role` |
| `user_badges` | pk(`user_id`,`badge_id`), `awarded_at` (badge definitions live in `content/badges.ts`) |

### RLS (enabled on every table)
- `profiles`: SELECT public (username/country/avatar/best stats are public by design); INSERT/UPDATE only `auth.uid() = id`.
- `lesson_progress`, `key_stats`, `practice_sessions`: SELECT/INSERT/UPDATE/DELETE only own rows (`user_id = auth.uid()`).
- `test_issues`, `result_logs`, `submission_attempts`: **no client policies at all**; only the Edge Functions (service role) touch them.
- `results`, `personal_bests`, `user_badges`: SELECT public; **no INSERT/UPDATE/DELETE policy for clients**. Only the validated Edge Function can write.
- `rooms`: SELECT only to host or members; writes via RPC/Edge Function (`create_room`, `join_room` security-definer functions that enforce 2–8 players and lobby state). `room_players`: SELECT for members of the same room.
- `groups`: SELECT members only; creating = INSERT with `owner_id = auth.uid()`; joining by code via `join_group(code)` RPC. `group_members`: SELECT for fellow members; DELETE own row (leave).
- Nothing exposes email; `username` has check constraint `^[A-Za-z0-9_]{3,20}$`.

### Indexes (leaderboards)
- `results (kind, lang, duration_s, created_at desc, wpm desc)` for daily/weekly windows
- `personal_bests (lang, duration_s, wpm desc)` for all-time
- `results (daily_date, lang, wpm desc)` for the daily board
- `results (room_id)`, `results (user_id, created_at desc)`
- `profiles (country)`, `group_members (user_id)`, `rooms (code)`, `submission_attempts (user_id, created_at desc)`
- Leaderboards are a `get_leaderboard(duration, lang, period, country, group_id, limit)` RPC: best row per user (`distinct on (user_id)`), filtered to accuracy ≥ 95. All-time reads `personal_bests`; weekly/daily read `results`. The 95% rule is enforced in the query, so a sloppy run never displaces a clean one.

## 5. Anti-cheat flow (the portfolio centerpiece)
1. Client calls `issue-test` → server picks the text (random seed, or the date's text for daily, or the room's text for a race), stores a `test_issues` row, returns `{issueId, text}`.
2. Client types; engine records `[{k, t}]`; paste/drop/context-menu blocked on the input; only `keydown` with `isTrusted` are logged.
3. Client calls `submit-result {issueId, log}`. It sends **no WPM**.
4. Server: loads the issue (must be the caller's, unconsumed, not expired) → rate limit (e.g. max 6 submits/min, 60/hour per user) → `scoring.replay(text, log)` recomputes correct chars, accuracy, WPM → checks:
   - wall clock: log duration must fit between `issued_at` and now (± slack); a "60s" test can't finish in 10s
   - log shape: monotonic timestamps, length ≤ bound, only printable keys
   - hard limits: sustained WPM above a cap (~250) → reject; any inter-key gap under ~15 ms → reject
   - rhythm: coefficient of variation of inter-key intervals too low (robotic/metronome) → reject
   - soft signals (e.g. 200+ WPM, perfect accuracy at very high speed) → accept but add a `flags` entry for review
5. On success: insert `results`, mark issue consumed, upsert `personal_bests`, update streak, award badges; return the **server-computed** numbers. Rejections are logged in `submission_attempts`.
6. **Races** use the same path: each player's finish is a validated `results` row with `room_id`; positions come from validated `finish_ms`, never from the live progress bars (those are cosmetic broadcast).
7. Tests: Vitest covers `scoring.ts` (exact WPM/accuracy on fixtures, fast-but-human passes, 400 WPM rejected, metronome rejected, tampered timestamps rejected, replayed issue rejected).

## 6. Live races (Supabase Realtime)
- Create room → `create_room` RPC returns a 5-char code. Players join by code (2–8). Lobby uses **Presence** on channel `race:{code}`.
- Host presses Start → `race-start` sets `starts_at = now()+4s` (server clock) and status → racing; clients show countdown against a clock offset measured at join.
- Progress bars: **Broadcast** `{pos, ts}` throttled ~5/s (no DB writes while racing, keeps free-tier limits safe).
- On finish each client submits its log (see §5). Results screen fills as validated rows arrive; anyone not finished after the time cap is marked DNF.
- Free tier Realtime limits (200 concurrent connections) are plenty for a portfolio; I'll note it in the README.

## 7. Guest → account merge
`GuestProgress` is versioned JSON in localStorage. On first login (account with no progress), a modal offers to merge: lessons = union with max bests; key stats summed; history appended (capped); settings kept. Ranked/race data is never merged (guests have none). Merge runs through `SupabaseAdapter`; the local copy is cleared only after success.

## 8. Other infra notes
- **PWA**: `vite-plugin-pwa`, precache app shell + lesson/word data; practice, lessons, and guest mode work offline; offline practice results queue and sync later; ranked/race are online-only.
- **Keep-alive**: `.github/workflows/keepalive.yml` runs every 3 days and does a REST `select` on a tiny table with the anon key (a real DB read; a plain ping to the site doesn't count). README explains the 1-week pause rule and manual unpause.
- **Tauri (Stage 9)**: wrap `dist`; NSIS Windows installer; Google OAuth disabled inside Tauri (email login only), detected via `window.__TAURI__`.
- **Secrets**: only `VITE_SUPABASE_URL` and the anon key in `.env`; service-role key exists only as an Edge Function secret; `.env` in `.gitignore`.

## 9. Build stages (each ends: runs → how to test → commit → your go-ahead)
1. Scaffold (Vite/React/TS/Tailwind), theme, layout/router, QWERTY layout data, on-screen keyboard with finger colors, F/J bumps
2. Typing engine (pure + tested), live WPM/accuracy, error highlighting, backspace rules, keystroke log, per-key mistakes
3. Lesson data (en/fil word sets) + flow + unlock rules, localStorage via the `Storage` interface
4. Progress page (chart, heatmap), weak-keys drill, 30s/60s tests, settings, tips/techniques guide
5. Supabase project + migrations (profiles, RLS), auth (email + Google), username/avatar/country, `SupabaseAdapter`, guest merge
6. `issue-test` + `submit-result` + scoring tests, leaderboards (filters), personal bests, public profiles
7. Races, daily challenge, groups, badges/streaks
8. PWA, accessibility, responsive polish, keep-alive, Vercel deploy
9. Tauri build + installer; README, screenshots, architecture diagram, "Problem I solved", demo script

## 10. Portfolio deliverables (at the end)
Live Vercel link, Windows installer, README (screenshots, features, stack, diagram, run steps), "Problem I solved" note (anti-cheat + realtime races), and a 30-second demo script: (1) keyboard + finger colors lesson, (2) live WPM test with results, (3) leaderboard with filters, (4) **2-player race** on two browser windows side by side, (5) public profile with badges.
