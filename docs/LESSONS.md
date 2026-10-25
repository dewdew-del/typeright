# Lesson plan (v2, 200 lessons, draft for approval)

Builds on [JOURNEY.md](JOURNEY.md). 200 lessons in 13 stages (0 to 12). All numbers are defaults we tune after real use.

## 1. How 200 stays useful, not padded
Lessons are **specs, not hand-written text**. Each lesson is a small data entry (keys, type, drill phases, targets), and the text is generated per attempt from word lists, so 200 lessons means 200 entries plus about 10 word and sentence files, not 200 essays. To keep variety, every key group follows a repeating **block**, and later stages train different skills (rhythm, bigrams, real-world text), not the same keys again.

Total time: roughly 2 to 4 minutes per lesson, about 10 hours of material. The optional level test lets experienced typists skip most of it.

## 2. Lesson types
| Type | What happens | Length |
|---|---|---|
| Intro | Read and try. Posture, hand position. No scoring | 1 min |
| New keys | Intro card ("Type the **J** key with your right index finger"), guided drill on new keys, then mixed with learned keys | 3 to 4 min |
| Review | Mix of the last lessons plus auto weak keys | 2 to 3 min |
| Words | Real words filtered to the keys learned so far | 2 to 3 min |
| Accuracy challenge | Stop-on-error, goal 98% | 2 min |
| Speed challenge / Practice | Timed (30 or 60 s), goal WPM | 1 to 2 min |
| Game | Short rhythm or falling-letters game | 2 min |
| Checkpoint | Gate for the next stage, scored against the stage target | 2 min |

**Key-pair block (3 lessons):** New keys, Review, Challenge. Used for every new key pair in Stages 1 to 3.

## 3. The 200 lessons by stage
| Stage | Lessons | Count | Contents |
|---|---|---|---|
| 0 Start | 1-2 | 2 | Welcome and posture; home position (F and J bumps) |
| 1 Home row | 3-22 | 20 | Key-pair blocks: F J, D K, S L, A ;, G H (15) · Space bar · 2 timed practices · home-row game · **Checkpoint 1** |
| 2 Top row | 23-44 | 22 | Blocks: E I, R U, W O, Q P, T Y (15) · 2 word lessons · 2 practices · game · whole top row · **Checkpoint 2** |
| 3 Bottom row | 45-64 | 20 | Blocks: C comma, V M, X period, Z slash, B N (15) · words · practice · game · all letters mixed · **Checkpoint 3** |
| 4 Letter mastery | 65-80 | 16 | Common pairs (th, he, in, er, an), trigrams (the, ing, and, ion), double letters, hard same-finger reaches (ed, de, un, br), pinky focus, weak-letter training x2, words by length (3-4, 5-6, 7+), pangrams, speed lesson · **Checkpoint 4** |
| 5 Shift and capitals | 81-94 | 14 | Left Shift, right Shift, sentence starts, names, Title Case, ALL CAPS, mixed case, accuracy challenges · **Checkpoint 5** |
| 6 Punctuation | 95-110 | 16 | . , · ? ! · apostrophe · quotes · : ; · hyphen and dash · mixed punctuation in sentences · **Checkpoint 6** |
| 7 Numbers | 111-128 | 18 | Digits 1-5, 6-0 (pairs), digit mixes, phone numbers, dates and times, prices (USD, since the Philippine peso sign is not on a US keyboard we type "PHP 250"), math, numbers inside words · **Checkpoint 7** |
| 8 Symbols | 129-144 | 16 | @ # $ % ^ & * ( ) - _ = + [ ] { } \ \| / < > ~ \`, emails, URLs, hashtags, simple code lines · **Checkpoint 8** |
| 9 Words and flow | 145-164 | 20 | Top 100, 300, 1000 words · hand alternation · rolls · rhythm · long words · tough words (accuracy) · word themes · **Checkpoint 9** |
| 10 Speed building | 165-178 | 14 | 10 and 15 second sprints · 2-minute endurance · rhythm pacing · plateau breakers (accuracy first, then speed) · **Checkpoint 10** |
| 11 Sentences | 179-192 | 14 | Short sentences · pangrams · quotes · paragraphs · dialogue · stories · English and Filipino texts · **Checkpoint 11** |
| 12 Real world | 193-200 | 8 | Emails · chat messages · notes · copy-typing a document · transcription · **Final exam** |

Stage 1 to 3 key order follows the standard home-row-outward convention, two keys per block. Exact lesson titles are generated from these specs into `content/lessons/stageN.ts`.

## 4. How a drill is built
Generated per attempt from the **allowed set** = keys learned so far + the new keys.
1. **New keys first:** about 50% of characters are the new keys at the start of a lesson, tapering to about 30% by the end.
2. **Patterns by phase:** pairs (`fj fj`), runs (`fff jjj`), alternations, pseudo-words from a Markov chain restricted to the allowed set, then **real words** once enough exist (home row alone gives "ask, dad, flash, salad").
3. **Weak keys:** high miss rate or slow time gets up to about 3x weight; keys not seen recently resurface (spaced review).
4. **Size:** 150 to 250 characters per exercise, 1 to 3 exercises per lesson.
5. **Languages:** English and Filipino share single-key drills. Words and sentences come from `content/words/{en,fil}.ts` and `content/sentences/{en,fil}.ts`. If a set has too few words in a language, the drill falls back to pseudo-words so it is never empty.

## 5. Typing rules inside lessons
- **Stages 1 to 3: stop-on-error** (cursor waits for the correct key; the miss still counts). Later stages use **free mode** (continue or Backspace, uncorrected errors count).
- A "no-look" setting hides the on-screen keyboard. Journey fades it out (shown, dimmed, hidden) from Stage 3.
- Pasting and dropping text is blocked everywhere.

## 6. Passing, stars and unlocking
- A lesson passes at **90% accuracy** (95% in accuracy challenges at 98% for the 3rd star) plus a minimum WPM of **half the stage checkpoint**.
- **Stars:** 1 = pass, 2 = 95% accuracy, 3 = 98% accuracy and the stage target WPM.
- Passing a lesson unlocks the next lesson. A **checkpoint** unlocks the next stage.
- Locked lessons can still be opened manually and don't count toward unlocking.
- The optional level test places a user at the first stage whose checkpoint they fail; earlier stages show "tested out" (see JOURNEY.md).

| Checkpoint | After stage | Target WPM | Accuracy |
|---|---|---|---|
| 1 | Home row | 12 | 92% |
| 2 | Top row | 16 | 94% |
| 3 | Bottom row | 18 | 95% |
| 4 | Letter mastery | 22 | 95% |
| 5 | Shift and capitals | 24 | 95% |
| 6 | Punctuation | 26 | 95% |
| 7 | Numbers | 20 | 95% (digits are slower) |
| 8 | Symbols | 18 | 94% (symbols are slowest) |
| 9 | Words and flow | 35 | 96% |
| 10 | Speed building | 40 | 96% |
| 11 | Sentences | 40 | 96% |
| 12 | Final exam | 45 | 96% |

## 7. Tips (one short tip per lesson from a tip bank)
Posture and wrists · Eyes on the screen · Return to home row after each reach · Light keystrokes · Steady rhythm over bursts · Use the opposite Shift · Don't look down, trust the bumps · Short breaks and stretching · Accuracy first, speed follows · Thumbs for space · Pinky strength for ; and ' · Alternate hands in words. About 40 tips, each reused where it fits.

## 8. Data format (content stays in data files)
```ts
type LessonType = 'intro'|'new-keys'|'review'|'words'|'accuracy'|'speed'|'game'|'checkpoint'
interface LessonDef {
  id: string               // 'l003'
  stage: number            // 0-12
  order: number            // 1-200
  type: LessonType
  title: string            // 'Keys F & J'
  newKeys: string[]        // ['f','j']
  reviewFrom?: string[]    // lesson ids to mix in
  exercises: { phase: 'pairs'|'runs'|'alt'|'pseudo'|'words'|'sentences'|'text'; chars: number }[]
  mode: 'stop-on-error' | 'free'
  tipId: string
  pass: { accuracy: number; wpm: number }
}
```
Helpers like `keyBlock('f','j', {...})` expand a key pair into its 3 lessons so Stages 1 to 3 are a few lines each. A pure `buildDrill(lesson, userStats, lang)` in the engine produces text and is unit tested (allowed set only, weak-key weighting, size bounds, never empty).

## 9. Design changes this implies (next preview update)
- Lessons screen groups cards by stage with a progress bar per stage, collapsed by default except the current stage (200 cards at once is too much).
- Checkpoint and final-exam cards look different (flag icon); stars show once completed.
- "Test my level" button at the top; skipped stages show "Tested out".

## Open questions
1. Stop-on-error in Stages 1 to 3: fixed, or user choice?
2. Filipino words from Stage 2, or only Filipino texts in Stage 11?
3. Stage 12 real-world content: OK to write original sample emails, chats and notes (no copyrighted text)?
