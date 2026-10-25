import { useEffect, useState } from 'react'
import { FingerLegend } from '../components/keyboard/FingerLegend'
import { HandGuide } from '../components/keyboard/HandGuide'
import { Keyboard } from '../components/keyboard/Keyboard'
import { targetForChar } from '../layouts/qwerty'
import { FINGER_NAMES } from '../layouts/types'
import { useSettings } from '../stores/settings'

// Stage 1 demo only: a tiny "press the highlighted key" loop. The real typing engine is Stage 2.
const SAMPLE = 'fj dk sl a; Hello, World! 123'

export function KeyboardDemo() {
  const { showKeyboard, showHands, set } = useSettings()
  const [index, setIndex] = useState(0)
  const [pressed, setPressed] = useState<string>()
  const [wrong, setWrong] = useState(false)

  const next = SAMPLE[index % SAMPLE.length]
  const target = targetForChar(next)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      setPressed(e.code)
      if (e.key.length !== 1) return
      e.preventDefault()
      if (e.key === next) {
        setWrong(false)
        setIndex((i) => i + 1)
      } else {
        setWrong(true)
      }
    }
    const up = () => setPressed(undefined)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [next])

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">Keyboard guide</h1>
      <p className="mt-1 text-sm text-muted">
        Press the highlighted key. The bump on F and J marks your home position.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 text-center">
        <div className="font-mono text-2xl tracking-wide" aria-live="polite">
          {SAMPLE.split('').map((c, i) => (
            <span
              key={i}
              className={
                i < index % SAMPLE.length
                  ? 'text-good'
                  : i === index % SAMPLE.length
                    ? wrong
                      ? 'rounded bg-bad/20 text-bad'
                      : 'rounded bg-accent/20 text-accent'
                    : 'text-muted'
              }
            >
              {c === ' ' ? ' ' : c}
            </span>
          ))}
        </div>
        {target && (
          <p className="mt-3 text-sm text-muted">
            Type <kbd className="rounded bg-accent px-2 py-0.5 font-mono text-accent-contrast">{next === ' ' ? 'space' : next}</kbd>{' '}
            with your {FINGER_NAMES[target.key.finger].toLowerCase()}
            {target.needsShift && ` and hold Shift with your ${FINGER_NAMES[target.shiftKey!.finger].toLowerCase()}`}.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {showKeyboard && <Keyboard activeChar={next} pressedCode={pressed} />}
        {showHands && <HandGuide active={target?.key.finger} />}
        <FingerLegend active={target?.key.finger} />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showKeyboard} onChange={(e) => set({ showKeyboard: e.target.checked })} />
          Show keyboard
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showHands} onChange={(e) => set({ showHands: e.target.checked })} />
          Show hands
        </label>
      </div>
    </div>
  )
}
