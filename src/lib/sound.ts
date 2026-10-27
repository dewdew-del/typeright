/** Key sound styles. All are generated in the browser, so there are no audio files to download. */
export const SOUND_PACKS = [
  { value: 'soft', label: 'Soft click' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'thock', label: 'Thock' },
  { value: 'typewriter', label: 'Typewriter' },
  { value: 'bubble', label: 'Bubble pop' },
  { value: 'retro', label: 'Retro beep' },
] as const
export type SoundPack = (typeof SOUND_PACKS)[number]['value']

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

function audio(): AudioContext {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  if (!noise) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return ctx
}

interface Voice {
  c: AudioContext
  t: number
  /** Slight random pitch change so repeated keys do not sound identical. */
  v: number
}

/** A short burst of filtered noise: the "click" part of a key. */
function burst(x: Voice, type: BiquadFilterType, freq: number, q: number, gain: number, dur: number) {
  const src = x.c.createBufferSource()
  src.buffer = noise
  const filter = x.c.createBiquadFilter()
  filter.type = type
  filter.frequency.value = freq * x.v
  filter.Q.value = q
  const g = x.c.createGain()
  g.gain.setValueAtTime(gain, x.t)
  g.gain.exponentialRampToValueAtTime(0.0001, x.t + dur)
  src.connect(filter).connect(g).connect(x.c.destination)
  src.start(x.t)
  src.stop(x.t + dur + 0.02)
}

/** A short tone that can slide in pitch: the "body" of a key. */
function tone(x: Voice, type: OscillatorType, from: number, to: number, gain: number, dur: number) {
  const osc = x.c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(from * x.v, x.t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to * x.v), x.t + dur)
  const g = x.c.createGain()
  g.gain.setValueAtTime(gain, x.t)
  g.gain.exponentialRampToValueAtTime(0.0001, x.t + dur)
  osc.connect(g).connect(x.c.destination)
  osc.start(x.t)
  osc.stop(x.t + dur + 0.02)
}

/**
 * One key press. A correct key gets the pack's click; a wrong key gets a low thud; the space bar is deeper
 * and heavier, like a real keyboard.
 */
export function playKeySound(correct: boolean, pack: SoundPack = 'soft', key?: string) {
  try {
    const c = audio()
    const x: Voice = { c, t: c.currentTime, v: 0.94 + Math.random() * 0.12 }
    const space = key === ' '
    const deep = space ? 0.72 : 1

    if (!correct) {
      // Same low "wrong key" feel in every pack, tuned to the pack's character.
      if (pack === 'retro') tone(x, 'square', 140, 110, 0.05, 0.12)
      else if (pack === 'bubble') tone(x, 'sine', 220, 120, 0.07, 0.12)
      else {
        tone(x, 'square', 170, 120, 0.04, 0.09)
        burst(x, 'lowpass', 400, 0.7, 0.05, 0.06)
      }
      return
    }

    switch (pack) {
      case 'mechanical': // clicky blue-switch: sharp click, tiny ping, soft bottom-out
        burst(x, 'highpass', 2600 * deep, 0.8, 0.16, 0.03)
        tone(x, 'triangle', 2300 * deep, 1700 * deep, 0.03, 0.03)
        burst(x, 'lowpass', 900, 0.8, 0.09, 0.05)
        break
      case 'thock': // deep linear switch: dull, low and rounded
        tone(x, 'sine', 210 * deep, 95 * deep, 0.16, 0.09)
        burst(x, 'lowpass', 700 * deep, 0.7, 0.1, 0.05)
        break
      case 'typewriter': // metal clack with a short ring
        burst(x, 'bandpass', 3200 * deep, 1.4, 0.2, 0.035)
        tone(x, 'square', 1250 * deep, 1100 * deep, 0.018, 0.05)
        burst(x, 'lowpass', 500, 0.7, 0.12, 0.07)
        break
      case 'bubble': // rising pop
        tone(x, 'sine', 380 * deep, 880 * deep, 0.1, 0.07)
        break
      case 'retro': // arcade beep
        tone(x, 'square', 880 * deep, 880 * deep, 0.035, 0.05)
        break
      default: // soft click
        tone(x, 'triangle', 620 * deep, 600 * deep, 0.035, 0.04)
    }
  } catch {
    // Audio can be unavailable (autoplay rules, old browsers); typing works without it.
  }
}
