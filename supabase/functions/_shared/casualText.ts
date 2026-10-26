/**
 * Text for casual typing on the leaderboard, chosen by the server: shuffled sentences in English or
 * Filipino. Mirrors src/content/sentences (keep the two in step). Dependency-free (Deno + browser).
 */

const EN = [
  'Small habits shape how fast you type, so keep your wrists relaxed and your eyes on the screen.',
  'The quick brown fox jumps over the lazy dog while the river runs past the old mill.',
  'Rest your fingers on the home row and let each one reach for its own keys.',
  'A steady rhythm beats a fast burst, because every mistake costs you time to fix.',
  'She packed a light bag, caught the early bus, and watched the city wake up.',
  'Good typists look at the text, not at their hands, and trust the bumps on F and J.',
  'We planted mango trees behind the school and watered them every afternoon.',
  'Practice for ten minutes a day and you will notice the difference within a week.',
  'The market was loud and bright, full of fresh fish, ripe fruit, and warm bread.',
  'Accuracy comes first; speed follows once your fingers know where to go.',
  'My brother fixed the old radio, and now it plays music every morning.',
  'The rain stopped just in time for the game to start at four.',
  'Write the main idea first, then add the details one by one.',
  'Our team met at the library to plan the science fair project.',
]

const FIL = [
  'Magandang umaga sa inyong lahat, sana ay masaya ang araw ninyo.',
  'Maaga akong gumising para mag-aral bago pumasok sa paaralan.',
  'Kumain kami ng kanin at isda sa bahay ng aking lola kahapon.',
  'Masarap maglakad sa tabing-dagat habang lumulubog ang araw.',
  'Huwag kalimutang uminom ng tubig at magpahinga pagkatapos mag-type.',
  'Ang bawat daliri ay may sariling mga titik na dapat abutin.',
  'Sabay-sabay kaming nagluto ng adobo para sa handaan sa barangay.',
  'Mabilis tumakbo ang oras kapag masaya ang iyong ginagawa.',
  'Tumingin ka sa screen at hindi sa iyong mga kamay habang nagta-type.',
  'Unti-unti nating matututunan ang tamang paraan ng pagta-type.',
]

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

/** Shuffled sentences, never the same one twice in a row, until at least `minChars` characters. */
export function casualText(seed: number, lang: 'en' | 'fil', minChars: number): string {
  const pool = lang === 'fil' ? FIL : EN
  const next = rng(seed)
  const out: string[] = []
  let n = 0
  while (n < minChars) {
    let s = pool[Math.floor(next() * pool.length)]
    if (s === out[out.length - 1]) s = pool[(pool.indexOf(s) + 1) % pool.length]
    out.push(s)
    n += s.length + 1
  }
  return out.join(' ')
}

/** 2 min: enough for ~200 WPM. Endless: enough for 30 minutes at ~60 WPM. */
export const CASUAL_CHARS = { '2min': 2200, endless: 9000 }
