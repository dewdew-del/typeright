import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'

const RELOAD_KEY = 'typeright-chunk-reload'

/** True when a page file from an older deploy is gone (the browser still runs the old app shell). */
export function isStaleChunkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message)
}

/** Reload once to pick up the new deploy; the flag stops a reload loop if the file is really missing. */
export function reloadOnceForNewVersion() {
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) return false
    sessionStorage.setItem(RELOAD_KEY, '1')
  } catch {
    return false
  }
  window.location.reload()
  return true
}

/** Shown instead of the default React Router error screen. */
export function RouteError() {
  const error = useRouteError()
  const stale = isStaleChunkError(error)

  useEffect(() => {
    if (stale) reloadOnceForNewVersion()
  }, [stale])

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">
        {stale ? 'A new version is available' : 'Something went wrong'}
      </h1>
      <p className="mt-2 text-muted">
        {stale ? 'Reload to get the latest TypeRight.' : 'Reload the page. If it keeps happening, go back to the menu.'}
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            sessionStorage.removeItem(RELOAD_KEY)
          } catch {
            /* ignore */
          }
          window.location.reload()
        }}
        className="mt-6 inline-block font-semibold text-accent"
      >
        Reload
      </button>
    </main>
  )
}
