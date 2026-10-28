import { memo, type CSSProperties } from 'react'
import { QWERTY, targetForChar } from '../../layouts/qwerty'
import { FINGER_COLOR_VAR, FINGER_NAMES, type KeyDef } from '../../layouts/types'

interface Props {
  /** Character the user should type next. Highlights its key (and Shift if needed). */
  activeChar?: string
  /** KeyboardEvent.code of a key currently held down, for press feedback. */
  pressedCode?: string
  /** Tint each key by the finger that owns it. */
  colorFingers?: boolean
}

/** Memoised: the typing clock re-renders the page 5 times a second, but the keys only change with the next letter. */
export const Keyboard = memo(function Keyboard({ activeChar, pressedCode, colorFingers = true }: Props) {
  const target = activeChar ? targetForChar(activeChar) : undefined
  const activeCodes = new Set<string>()
  if (target) {
    activeCodes.add(target.key.code)
    if (target.shiftKey) activeCodes.add(target.shiftKey.code)
  }

  const label = target
    ? `On-screen keyboard. Next key: ${activeChar === ' ' ? 'space' : activeChar}, use ${FINGER_NAMES[target.key.finger]}${
        target.needsShift ? ` and hold Shift with ${FINGER_NAMES[target.shiftKey!.finger]}` : ''
      }`
    : 'On-screen keyboard'

  return (
    <div
      role="img"
      aria-label={label}
      className="mx-auto w-full max-w-4xl select-none rounded-2xl border border-border bg-surface p-2 shadow-sm sm:p-3"
    >
      <div className="flex flex-col gap-1 sm:gap-1.5">
        {QWERTY.rows.map((row, ri) => (
          <div key={ri} className="flex gap-1 sm:gap-1.5">
            {row.map((item, i) =>
              'spacer' in item ? (
                <div key={i} style={{ flex: `${item.spacer} 1 0` }} />
              ) : (
                <Cap
                  key={item.code}
                  def={item}
                  active={activeCodes.has(item.code)}
                  pressed={pressedCode === item.code}
                  colorFingers={colorFingers}
                />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  )
})

const Cap = memo(function Cap({
  def,
  active,
  pressed,
  colorFingers,
}: {
  def: KeyDef
  active: boolean
  pressed: boolean
  colorFingers: boolean
}) {
  const color = FINGER_COLOR_VAR[def.finger]
  const two = def.label.includes('\n')
  const [top, bottom] = two ? def.label.split('\n') : [def.label, '']

  const style: CSSProperties = {
    flex: `${def.width} 1 0`,
    aspectRatio: def.width,
    ...(active
      ? { background: color, color: '#fff', borderColor: color }
      : colorFingers
        ? {
            background: `color-mix(in srgb, ${color} 20%, var(--surface))`,
            borderColor: `color-mix(in srgb, ${color} 38%, var(--border))`,
          }
        : {}),
  }

  return (
    <div
      style={style}
      className={[
        'relative flex min-w-0 items-center justify-center rounded-md border text-[10px] font-semibold leading-none sm:rounded-lg sm:text-sm',
        'transition-transform duration-75',
        !colorFingers && !active ? 'border-border bg-surface-2' : '',
        active ? 'z-10 scale-105 shadow-lg ring-2 ring-white/40' : '',
        pressed ? 'translate-y-px brightness-90' : '',
      ].join(' ')}
      data-key={def.code}
      data-active={active || undefined}
    >
      {def.width !== 1 ? (
        <span className="text-[9px] font-medium opacity-70 sm:text-xs">{def.label}</span>
      ) : two ? (
        <span className="flex flex-col items-center gap-0.5">
          <span className="text-[8px] opacity-60 sm:text-[10px]">{top}</span>
          <span>{bottom}</span>
        </span>
      ) : (
        <span>{top}</span>
      )}
      {def.bump && (
        <span
          aria-hidden
          className="absolute bottom-1 h-[3px] w-3 rounded-full bg-current opacity-70 sm:bottom-1.5 sm:w-4"
        />
      )}
    </div>
  )
})
