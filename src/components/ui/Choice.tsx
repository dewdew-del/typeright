interface Props<T extends string> {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

/** A labelled row of pill buttons where exactly one is selected. */
export function Choice<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-bold">{label}</div>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2.5">
        {options.map((o) => {
          const on = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={[
                'rounded-full border px-5 py-2.5 text-[15px] font-semibold',
                on ? 'border-accent bg-accent text-accent-contrast' : 'border-border bg-surface text-text hover:bg-surface-2',
              ].join(' ')}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
