import { FINGER_COLOR_VAR, FINGER_NAMES, type Finger } from '../../layouts/types'

interface Props {
  /** Finger that should press the next key (highlighted). */
  active?: Finger
}

const W = 640
const BASE = 118 // y where fingers meet the palm

// [finger, x centre, height]; the right hand mirrors the left.
const FINGERS: [Finger, number, number][] = [
  ['LP', 62, 62],
  ['LR', 112, 84],
  ['LM', 162, 94],
  ['LI', 212, 82],
  ['RI', W - 212, 82],
  ['RM', W - 162, 94],
  ['RR', W - 112, 84],
  ['RP', W - 62, 62],
]

export function HandGuide({ active }: Props) {
  const fill = (f: Finger) => (active === f ? FINGER_COLOR_VAR[f] : 'var(--surface-2)')
  const stroke = (f: Finger) => (active === f ? FINGER_COLOR_VAR[f] : 'var(--border)')

  return (
    <svg
      viewBox={`0 0 ${W} 170`}
      role="img"
      aria-label={active ? `Use your ${FINGER_NAMES[active].toLowerCase()}` : 'Hand guide'}
      className="mx-auto block w-full max-w-4xl"
    >
      {FINGERS.map(([f, cx, h]) => (
        <rect
          key={f}
          x={cx - 18}
          y={BASE - h}
          width={36}
          height={h + 10}
          rx={18}
          fill={fill(f)}
          stroke={stroke(f)}
          strokeWidth={2}
        />
      ))}
      {/* palms */}
      <rect x={36} y={BASE} width={210} height={46} rx={22} fill="var(--surface-2)" stroke="var(--border)" strokeWidth={2} />
      <rect x={W - 246} y={BASE} width={210} height={46} rx={22} fill="var(--surface-2)" stroke="var(--border)" strokeWidth={2} />
      {/* thumbs */}
      {[
        [272, -28],
        [W - 272, 28],
      ].map(([cx, rot]) => (
        <rect
          key={cx}
          x={cx - 18}
          y={BASE - 20}
          width={36}
          height={64}
          rx={18}
          transform={`rotate(${rot} ${cx} ${BASE + 10})`}
          fill={fill('T')}
          stroke={stroke('T')}
          strokeWidth={2}
        />
      ))}
      {/* hide the seam where fingers join the palm */}
      <rect x={42} y={BASE + 2} width={198} height={14} fill="var(--surface-2)" />
      <rect x={W - 240} y={BASE + 2} width={198} height={14} fill="var(--surface-2)" />
    </svg>
  )
}
