import { useEffect, useRef } from 'react'
import { resolveMerge, useMergePrompt } from '../../storage/progressSync'

/** Shown once after logging in when this tab already has guest progress. */
export function MergePrompt() {
  const pending = useMergePrompt((s) => s.pending)
  const firstButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (pending) firstButton.current?.focus()
  }, [pending])

  if (!pending) return null
  const lessons = Object.values(pending.local.lessons).filter((l) => l.passed).length

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="merge-title" className="w-full max-w-[420px] rounded-3xl border border-border bg-surface p-7 shadow-xl">
        <h2 id="merge-title" className="text-xl font-bold tracking-tight">Keep your guest progress?</h2>
        <p className="mt-2 text-[15px] text-muted">
          You finished {lessons} {lessons === 1 ? 'lesson' : 'lessons'} as a guest in this tab. Add them to your account? Your best results are kept.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button ref={firstButton} type="button" onClick={() => void resolveMerge(true)} className="rounded-xl bg-accent px-6 py-3 font-bold text-accent-contrast hover:opacity-90">
            Add to my account
          </button>
          <button type="button" onClick={() => void resolveMerge(false)} className="rounded-xl border border-border bg-surface px-6 py-3 font-bold hover:bg-surface-2">
            No, discard
          </button>
        </div>
      </div>
    </div>
  )
}
