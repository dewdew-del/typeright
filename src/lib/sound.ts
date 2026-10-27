/** Key sound styles. All are generated in the browser, so there are no audio files to download. */
export const SOUND_PACKS = [
  { value: 'mechanical', label: 'Mechanical (clicky)' },
  { value: 'tactile', label: 'Tactile bump' },
  { value: 'thock', label: 'Deep thock' },
  { value: 'creamy', label: 'Creamy' },
  { value: 'typewriter', label: 'Typewriter' },
  { value: 'bubble', label: 'Bubble pop' },
  { value: 'retro', label: 'Retro beep' },
  { value: 'soft', label: 'Soft click' },
] as const
export type SoundPack = (typeof SOUND_PACKS)[number]['value']

let ctx: AudioContext | null = null
let master: AudioNode | null = null
let noise: AudioBuffer | null = null

function audio(): { c: AudioContext; out: AudioNode } {
  if (!ctx) {
    ctx = new AudioContext()
    // A compressor lets the keys be loud and full without harsh clipping when typing fast.
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -20
    comp.knee.value = 18
    comp.ratio.value = 5
    comp.attack.value = 0.002
    comp.release.value = 0.12
    comp.connect(ctx.destination)
    master = comp
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return { c: ctx, out: master! }
}

interface Voice {
  c: AudioContext
  out: AudioNode
  t: number
  /** Slight random pitch change so repeated keys do not sound identical. */
  v: number
}

/** Filtered noise: the sharp click and the "clack" of a key hitting the plate. */
function burst(x: Voice, at: number, type: BiquadFilterType, freq: number, q: number, gain: number, dur: number) {
  const src = x.c.createBufferSource()
  src.buffer = noise
  const filter = x.c.createBiquadFilter()
  filter.type = type
  filter.frequency.value = freq * x.v
  filter.Q.value = q
  const g = x.c.createGain()
  const t = x.t + at
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filter).connect(g).connect(x.out)
  src.start(t, Math.random() * 0.1)
  src.stop(t + dur + 0.02)
}

/** A tone that drops in pitch: the deep body or "thock" of the case. */
function tone(x: Voice, at: number, type: OscillatorType, from: number, to: number, gain: number, dur: number) {
  const osc = x.c.createOscillator()
  osc.type = type
  const t = x.t + at
  osc.frequency.setValueAtTime(from * x.v, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to * x.v), t + dur)
  const g = x.c.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(x.out)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

/**
 * One key press. A correct key gets the pack's sound, made of a click, a clack and a deep body, and then a
 * quieter sound a moment later when the key comes back up. A wrong key gets a low thud. The space bar is
 * deeper and heavier, like a real keyboard.
 */
export function playKeySound(correct: boolean, pack: SoundPack = 'mechanical', key?: string) {
  try {
    const { c, out } = audio()
    const x: Voice = { c, out, t: c.currentTime, v: 0.95 + Math.random() * 0.1 }
    const d = key === ' ' ? 0.7 : 1 // space bar: lower and heavier

    if (!correct) {
      if (pack === 'retro') tone(x, 0, 'square', 150, 90, 0.2, 0.16)
      else if (pack === 'bubble') tone(x, 0, 'sine', 240, 110, 0.5, 0.14)
      else {
        tone(x, 0, 'sawtooth', 130, 70, 0.22, 0.12)
        burst(x, 0, 'lowpass', 380, 0.7, 0.4, 0.09)
      }
      return
    }

    switch (pack) {
      case 'mechanical': // clicky blue switch: sharp click, clack, case body, tiny spring ping, key-up click
        burst(x, 0, 'highpass', 3600 * d, 0.7, 0.55, 0.02)
        burst(x, 0.004, 'bandpass', 1900 * d, 1.1, 0.55, 0.045)
        tone(x, 0.004, 'sine', 200 * d, 105 * d, 0.55, 0.09)
        burst(x, 0.004, 'lowpass', 650, 0.7, 0.35, 0.07)
        tone(x, 0.01, 'triangle', 4300, 3700, 0.035, 0.06)
        burst(x, 0.085, 'highpass', 3000 * d, 0.7, 0.22, 0.016)
        tone(x, 0.085, 'sine', 150 * d, 100 * d, 0.14, 0.04)
        break
      case 'tactile': // brown switch: a soft bump, a rounder click, a firm landing
        burst(x, 0, 'bandpass', 1300 * d, 1, 0.45, 0.04)
        tone(x, 0.003, 'sine', 230 * d, 115 * d, 0.55, 0.09)
        burst(x, 0.003, 'lowpass', 520, 0.7, 0.3, 0.06)
        burst(x, 0.08, 'bandpass', 1500 * d, 1, 0.15, 0.02)
        break
      case 'thock': // deep linear switch on a heavy case: low, round, very little click
        tone(x, 0, 'sine', 150 * d, 58 * d, 0.95, 0.14)
        tone(x, 0, 'triangle', 300 * d, 120 * d, 0.2, 0.08)
        burst(x, 0, 'lowpass', 420 * d, 0.6, 0.55, 0.09)
        burst(x, 0.002, 'bandpass', 1500, 0.9, 0.12, 0.02)
        tone(x, 0.09, 'sine', 95 * d, 60 * d, 0.2, 0.06)
        break
      case 'creamy': // smooth and muted, full of bass
        tone(x, 0, 'sine', 175 * d, 78 * d, 0.7, 0.16)
        tone(x, 0, 'triangle', 350 * d, 160 * d, 0.22, 0.1)
        burst(x, 0, 'lowpass', 900 * d, 0.7, 0.35, 0.08)
        burst(x, 0.085, 'lowpass', 700, 0.7, 0.1, 0.03)
        break
      case 'typewriter': // metal clack, a ring, and a thud
        burst(x, 0, 'bandpass', 3800 * d, 2, 0.7, 0.035)
        burst(x, 0.002, 'bandpass', 1400 * d, 1.2, 0.4, 0.05)
        tone(x, 0, 'sine', 2500, 2400, 0.06, 0.16)
        tone(x, 0.004, 'sine', 125 * d, 75 * d, 0.5, 0.09)
        break
      case 'bubble': // rising pop
        tone(x, 0, 'sine', 360 * d, 900 * d, 0.5, 0.08)
        tone(x, 0.01, 'sine', 700 * d, 1300 * d, 0.1, 0.05)
        break
      case 'retro': // arcade beep
        tone(x, 0, 'square', 880 * d, 880 * d, 0.14, 0.055)
        tone(x, 0.055, 'square', 1320 * d, 1320 * d, 0.08, 0.04)
        break
      default: // soft click
        tone(x, 0, 'triangle', 620 * d, 600 * d, 0.2, 0.045)
        burst(x, 0, 'lowpass', 1200, 0.7, 0.12, 0.03)
    }
  } catch {
    // Audio can be unavailable (autoplay rules, old browsers); typing works without it.
  }
}
