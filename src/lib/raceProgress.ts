/**
 * Live progress bars come over a public Realtime channel, so anyone who knows the room id can send messages.
 * Only accept updates for players who are really in the room, and keep the numbers in range.
 * (The bars are display only; race results always come from the server.)
 */
export function acceptProgress(
  payload: unknown,
  online: ReadonlySet<string>,
  meId: string | undefined,
): { id: string; pos: number; wpm: number } | null {
  if (typeof payload !== 'object' || payload === null) return null
  const { id, pos, wpm } = payload as Record<string, unknown>
  if (typeof id !== 'string' || id === meId || !online.has(id)) return null
  if (typeof pos !== 'number' || typeof wpm !== 'number' || !Number.isFinite(pos) || !Number.isFinite(wpm)) return null
  return { id, pos: Math.min(1, Math.max(0, pos)), wpm: Math.min(400, Math.max(0, wpm)) }
}
