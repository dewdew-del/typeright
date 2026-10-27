import { useEffect, useRef, type ReactNode } from 'react'

/**
 * A modal layer: centered dialog or right-side panel. Closes on Escape or a click on the backdrop,
 * and returns focus to where it was.
 */
export function Overlay({
  title,
  side = false,
  wide = false,
  onClose,
  children,
}: {
  title: string
  side?: boolean
  /** A wider centered dialog, for tables. */
  wide?: boolean
  onClose: () => void
  children: ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  // A click on the dark area closes only when it both starts and ends there, so a press inside the dialog never counts.
  const pressedOnBackdrop = useRef(false)

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    box.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      before?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className={['fixed inset-0 z-50 flex bg-black/40', side ? 'justify-end' : 'items-center justify-center p-4'].join(' ')}
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose()
        pressedOnBackdrop.current = false
      }}
    >
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          'flex flex-col gap-5 overflow-y-auto border-border bg-surface text-text shadow-2xl outline-none',
          side ? 'h-full w-full max-w-[400px] border-l p-6' : ['max-h-[90vh] w-full rounded-3xl border p-7', wide ? 'max-w-[780px]' : 'max-w-[460px]'].join(' '),
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-surface-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
