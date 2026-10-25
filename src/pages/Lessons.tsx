// Placeholder grid. Real lesson data and unlock rules arrive in Stage 3.
const PREVIEW = [
  'Keys f & j',
  'Space bar',
  'Review: f & j',
  'Keys d & k',
  'Review: d & k',
  'Keys s & l',
  'Review: s & l',
  'Keys a & ;',
  'Home row',
  'Top row',
]

export function Lessons() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">Lessons</h1>
      <p className="mt-1 text-sm text-muted">Preview only. Lessons and unlocking arrive in Stage 3.</p>
      <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PREVIEW.map((title, i) => {
          const locked = i > 0
          return (
            <li
              key={title}
              className={[
                'rounded-xl border bg-surface p-3',
                locked ? 'border-border opacity-70' : 'border-accent ring-1 ring-accent',
              ].join(' ')}
            >
              <div className="flex items-center justify-between text-lg font-bold">
                {String(i + 1).padStart(2, '0')}
                {locked && <span className="text-xs font-normal text-muted">Locked</span>}
              </div>
              <div className="mt-6 text-sm text-muted">{title}</div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
