let ctx: AudioContext | null = null

/** A soft click for a correct key, a low blip for a mistake. Generated, so there are no audio files. */
export function playKeySound(correct: boolean) {
  try {
    ctx ??= new AudioContext()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = correct ? 'triangle' : 'square'
    osc.frequency.value = correct ? 620 : 170
    gain.gain.setValueAtTime(correct ? 0.035 : 0.05, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (correct ? 0.04 : 0.09))
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.1)
  } catch {
    // Audio can be unavailable (autoplay rules, old browsers); typing works without it.
  }
}
