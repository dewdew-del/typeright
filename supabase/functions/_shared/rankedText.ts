/**
 * Text for ranked tests, chosen by the server so a client can't pick an easy or pre-typed text.
 * Common lowercase English words, like most online speed tests. Dependency-free (Deno + browser).
 */
const WORDS = `the be to of and a in that have it for not on with he as you do at this but his by from they we say her she
or an will my one all would there their what so up out if about who get which go me when make can like time no just
him know take people into year your good some could them see other than then now look only come its over think also
back after use two how our work first well way even new want because any these give day most us great little own
old right big high small large next early young place week home water room mother money story fact month book eye
job word side kind head house friend father hour game line end city name team idea body face level door music market
sense plan care field rate heart light voice mind price report son road arm town paper space ground form event table
need phone data picture practice piece land doctor wall news test movie north love step tree hair window truth bank
rule glass dog cat fish bread rice fruit milk tea egg sugar salt food dinner lunch school student class lesson chair
desk pen bag bus train boat bike map beach sea river lake island sun moon rain wind cloud sky red blue green black
white brown happy quick slow easy hard soft warm cold hot fresh clean simple strong open close begin start stop keep
let help play run walk read write sing cook eat drink sleep call ask tell talk speak listen hear watch learn teach
try move live leave bring buy pay send build grow carry hold turn follow meet win lose fall feel stay sit stand fly
swim drive ride jump catch push pull cut draw wash wear fix plant pick hope wish share save wait smile laugh rest join`
  .split(/\s+/)
  .filter(Boolean)

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

/** Enough words that even ~200 WPM can't run out within the test. */
export function rankedText(seed: number, durationS: number): string {
  const next = rng(seed)
  const count = Math.ceil((durationS / 60) * 260)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    let w = WORDS[Math.floor(next() * WORDS.length)]
    if (w === out[out.length - 1]) w = WORDS[(WORDS.indexOf(w) + 1) % WORDS.length]
    out.push(w)
  }
  return out.join(' ')
}
