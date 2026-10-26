import { BACKSPACE } from '../../supabase/functions/_shared/scoring'

/** The parts of a KeyboardEvent the engine looks at (kept minimal so it is easy to test). */
export interface KeyLike {
  key: string
  isTrusted: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

/**
 * Maps a keyboard event to an engine key: a single printable character, 'Backspace', or null to ignore.
 * Untrusted (script-generated) events and shortcuts are ignored. AltGr characters arrive with
 * ctrl+alt on Windows, so those are allowed through when they produce a single character.
 */
export function keyFromEvent(e: KeyLike): string | null {
  if (!e.isTrusted) return null
  const altGr = e.ctrlKey && e.altKey
  if ((e.ctrlKey || e.metaKey || e.altKey) && !altGr) return null
  if (e.key === BACKSPACE) return altGr ? null : BACKSPACE
  return e.key.length === 1 ? e.key : null
}
