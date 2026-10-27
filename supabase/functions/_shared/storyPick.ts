/**
 * Picks stories for a casual run: stories the player has not finished first (in random order), then
 * finished ones only if the unfinished ones are not enough. Dependency-free (Deno + browser).
 */

export interface Story {
  id: number
  body: string
}

/** mulberry32: small seeded PRNG. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: T[], next: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The stories for one run, joined with single spaces, until there are at least `minChars` characters. */
export function pickStories(stories: Story[], doneIds: Set<number>, seed: number, minChars: number) {
  const next = rng(seed)
  const order = [
    ...shuffled(stories.filter((s) => !doneIds.has(s.id)), next),
    ...shuffled(stories.filter((s) => doneIds.has(s.id)), next),
  ]
  const ids: number[] = []
  const parts: string[] = []
  let n = 0
  for (const s of order) {
    if (n >= minChars) break
    ids.push(s.id)
    parts.push(s.body)
    n += s.body.length + 1
  }
  return { ids, text: parts.join(' ') }
}

/** Ids of the stories that were typed all the way to their last character. */
export function finishedStoryIds(stories: Story[], typedLength: number): number[] {
  const out: number[] = []
  let end = 0
  for (const s of stories) {
    end += s.body.length
    if (end > typedLength) break
    out.push(s.id)
    end += 1 // the space between stories
  }
  return out
}
