/** Shown instead of a feature that only works online (races with friends, the leaderboard). */
export function NeedsInternet({ what }: { what: string }) {
  return (
    <div role="status" className="mx-auto flex max-w-[520px] flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-6 py-10 text-center">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted">
        <path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" />
      </svg>
      <h2 className="text-xl font-bold">{what} needs internet</h2>
      <p className="text-muted">You are offline. Lessons, the level test and casual typing still work. This page opens again when you are back online.</p>
    </div>
  )
}
