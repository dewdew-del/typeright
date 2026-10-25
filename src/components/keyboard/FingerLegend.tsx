import { FINGER_COLOR_VAR, FINGER_NAMES, type Finger } from '../../layouts/types'

const ORDER: Finger[] = ['LP', 'LR', 'LM', 'LI', 'T', 'RI', 'RM', 'RR', 'RP']

export function FingerLegend({ active }: { active?: Finger }) {
  return (
    <ul className="mx-auto flex max-w-4xl flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted">
      {ORDER.map((f) => (
        <li
          key={f}
          className={['flex items-center gap-1.5', active === f ? 'font-semibold text-text' : ''].join(' ')}
        >
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: FINGER_COLOR_VAR[f] }}
          />
          {FINGER_NAMES[f]}
        </li>
      ))}
    </ul>
  )
}
