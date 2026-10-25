# Journey plan (v1, draft for approval)

Journey = the guided course for beginners, starting from scratch. A level test is **optional** and lets people skip ahead.

## 1. What the research says (and how much to trust it)

Evidence for typing pedagogy is thin. Most sources are typing-site and open-source pedagogy notes, not controlled experiments, so treat the numbers below as sensible defaults we will tune, not facts.

- **Accuracy before speed.** Nearly every source recommends it: rushing trains error-correction habits instead of automatic finger movement, and speed drills pay off once error rates are low. ([Typing Pedagogy notes](https://github.com/egno/keystrike/wiki/Typing-Pedagogy), [TypeLit guide](https://www.typelit.io/blog/touch-typing-guide)). One peer-reviewed study of students found structured touch-typing instruction improved speed while accuracy stayed above 95% ([PubMed 26447834](https://pubmed.ncbi.nlm.nih.gov/26447834/)).
- **Introduce keys outward from the home row, a few at a time.** Reaches farther from home take longer, and standard curricula use row-based order. No controlled study compares orders, so row-based is the convention, not a proven optimum ([Typing Pedagogy notes](https://github.com/egno/keystrike/wiki/Typing-Pedagogy)).
- **Gate new keys on speed and accuracy, and bias practice toward weak keys.** Adaptive trainers such as Keybr add one letter at a time after you clear thresholds and weight generated text toward the keys you miss most (described by third-party write-ups, not Keybr's own docs: [TypeQuicker comparison](https://www.typequicker.com/compare/keybr), [keybr-tui](https://docs.rs/crate/keybr-tui/0.2.0)). Resurfacing keys you haven't practiced recently is the spaced-review idea.
- **Technique is not the only road to speed.** A 136-million-keystroke study found the fastest typists often use rollover (pressing the next key before releasing the last) and that many untrained typists reach decent speeds. Different-hand and different-finger letter pairs predicted speed better than repeated letters ([Aalto/Cambridge, CHI 2018](https://userinterfaces.aalto.fi/136Mkeystrokes/)). Takeaway for us: teach correct finger placement, but also drill alternating-hand and rolling patterns, and never rely on finger form for gating (we can't see fingers; we only measure output).

## 2. Design principles for Journey
1. Accuracy gate first (default 95%), speed gate second.
2. 2 keys per lesson at most, always mixed with already-learned keys.
3. Every stage ends with a **checkpoint test**; passing unlocks the next stage.
4. Weak keys are tracked per user and fed back into drills and reviews.
5. Short lessons (3 to 5 minutes) so people finish them.
6. Gradually remove the crutch: keyboard shown, then dimmed, then hidden ("no-look").
7. Everything stays playable if locked: skipped or locked lessons can still be opened manually. Locking only guides, it never blocks.

## 3. Course outline (superseded: see [LESSONS.md](LESSONS.md) for the 200-lesson, 13-stage plan; the table below is the original short outline)
| Stage | Content | Checkpoint (default, tunable) |
|---|---|---|
| 0. Start | Posture, hand position, F/J bumps, how lessons work (2 short intros) | none |
| 1. Home row | f j, space, d k, s l, a ;, g h; reviews | 12 WPM, 92% |
| 2. Top row | e i, r u, w o, q p, t y | 16 WPM, 94% |
| 3. Bottom row | c comma, v m, x period, z slash, b n | 18 WPM, 95% |
| 4. Shift and punctuation | Capitals (shift with the opposite hand), . , ; ' ? ! : " - | 20 WPM, 95% |
| 5. Numbers and symbols | Number row, common symbols @ # $ % & ( ) | 22 WPM, 95% |
| 6. Words and flow | Common words, hand-alternation and rolling drills, rhythm, speed bursts | 30 WPM, 96% |
| 7. Sentences | Full sentences and paragraphs (English and Filipino sets) | 35 WPM, 96% |

**Lesson anatomy:** intro (key chip, which finger, hand diagram) → guided drill on the new keys → mixed drill with learned keys → auto-generated weak-key review → short timed practice → result with stars. Every 3rd or 4th lesson is a review, timer practice or mini game.

**Adaptive layer:** per-key attempts, misses and latency are tracked. Drill text is generated with weak keys weighted up to about 3x, and keys not seen recently resurface. This also feeds the standalone "My weak keys" casual mode.

## 4. Optional level test (skip ahead)
- Entry points: a "Test my level" button on the Journey screen, and a one-time "Already know how to type?" prompt on first visit. It is never required.
- **Test-out ladder, about 2 minutes:** the test tries stages in order, each as a short typed check (15 to 30 seconds, drawn from that stage's keys: home row, then rows, then capitals and punctuation, then numbers, then sentences). A stage is passed if it meets its checkpoint WPM and accuracy. It stops at the first stage the user fails.
- **Result:** the user is placed at the first failed stage. Stages they passed are marked "tested out" (not "completed") and stay openable. They also get an estimated WPM and a per-row accuracy report, and weak keys found in the test seed the adaptive layer.
- The test measures output only, so it can't confirm correct finger use. The result screen says so and links to the technique tips.
- Re-takeable any time, and placement only ever moves you forward.
- Placement is not ranked, so it is stored like any practice result (self-reported is fine). It does not touch leaderboards.

## 5. Change: guests can compete
You said guests should be able to compete too. Plan:
- Use **Supabase anonymous sign-ins** for guests. A guest gets a real user id and JWT, so Row Level Security, server-issued test text and server-side validation of keystroke logs all work unchanged for races and the daily challenge.
- The guest session lives in the tab (session storage), so it is lost when they close the site, matching "progress gone if they close the site."
- Guests get a random nickname such as "Guest-4821" that they can edit. Offer "Create account to keep this" which **links the anonymous user to an email or Google identity** in place; it keeps the same user id, so no merge is needed for ranked data. The earlier localStorage-merge flow is replaced for ranked data (lesson progress is also stored under that same id once a guest session exists).
- Abuse controls (anonymous sign-ins are easy to mass-create): Cloudflare Turnstile CAPTCHA (free) on guest session creation, Supabase's per-IP sign-in rate limit, the existing per-user submission rate limit, and a scheduled job that deletes old anonymous users.
- Leaderboards: guests appear on **race results and the daily and weekly boards labeled as guests**; the all-time board and badges are for accounts only (a guest's session can't hold them anyway). This is my recommendation. Tell me if you want guests on every board.

## 6. Plan updates this causes
- Stage 3 gains the Journey data (stages, checkpoints) and the level-test engine.
- Stage 5 (auth) adds anonymous sign-in plus "convert guest to account," replacing the localStorage merge for ranked data.
- Stage 6/7 treat guests as first-class in races and the daily challenge, with Turnstile.
- Design: landing (night/morning sky) → "How do you want to type today?" (three picture buttons: Journey, Play with friends, Casual typing) → each mode's own setup screen. Light/dark button everywhere.
