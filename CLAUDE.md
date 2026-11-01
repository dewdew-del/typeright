# TypeRight

A typing trainer that teaches correct finger placement, with a lesson flow and techniques to type faster.

Portfolio project (see `..\project-ideas.md`). Build phase: **Phase 2 (Quick Wins, frontend only)**. Folder: `D:\dev\typeright`. Shared rules are in `..\CLAUDE.md`.

## Status
- **Not started.** This plan is a draft. Confirm the open decisions before building.

## What it does (v1)
- On-screen keyboard that highlights which finger to use for each key (color per finger)
- Lesson flow: home row → top row → bottom row → numbers → symbols → real words → sentences
- Each lesson unlocks when you reach a target accuracy (e.g. 95%)
- Live stats: WPM, accuracy, errors per key
- "Weak keys" practice made from your most-missed keys
- Tips page: posture, not looking at the keyboard, rhythm over speed
- Progress saved in the browser (localStorage), no account

## Out of scope (v2)
- Desktop app wrapper, Tagalog/Bisaya word lists, multiplayer races

## Stack
- React + Vite + TypeScript, plain CSS or Tailwind
- localStorage for progress
- Hosting: Vercel (free)
- Cost: ₱0

## Pages
1. Home: continue lesson, overall stats
2. Lessons: list with lock/unlock status
3. Practice: text, on-screen keyboard, live WPM/accuracy
4. Results: per-key errors, retry, next lesson
5. Weak keys drill
6. Tips

## Build order
1. Plan: lock decisions, confirm lesson list
2. Scaffold, theme, routing
3. Typing engine (input handling, WPM/accuracy math) with unit tests
4. On-screen keyboard + finger map
5. Lessons + unlock logic
6. Results + weak keys
7. Tips page, polish, README, demo, deploy

## Open decisions
- Desktop version: skip, or wrap later with Tauri?
- Tailwind or plain CSS?

## Done checklist
- [ ] Live link
- [ ] README with screenshots
- [ ] 30-second demo video
- [ ] "Problem I solved" note for the portfolio
- [ ] Pushed to GitHub
