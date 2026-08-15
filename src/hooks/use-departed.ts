import { useEffect, useRef, useState } from 'react'

export const departedFrom = <T>(
  previous: readonly T[],
  current: readonly T[],
  keyOf: (item: T) => string
): T[] => {
  const currentKeys = new Set(current.map(keyOf))

  return previous.filter(item => !currentKeys.has(keyOf(item)))
}

/*
 * Returns the items that were present on the previous render and are absent now, holding
 * them for holdMs so they can animate out. A played card and a settled pot both vanish in
 * the same dispatch that awards them, so without this there is nothing left to animate.
 */
export const useDeparted = <T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  holdMs: number
): T[] => {
  const previousRef = useRef<readonly T[]>(items)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [held, setHeld] = useState<T[]>([])

  useEffect(() => {
    const gone = departedFrom(previousRef.current, items, keyOf)

    previousRef.current = items

    // No cleanup on this branch, and none needed: the branch does nothing. StrictMode's
    // second invoke on mount sees previousRef already equal to items and takes it again.
    if (gone.length === 0) {
      return
    }

    setHeld(gone)

    /*
     * The timer lives in a ref rather than being cleared by this effect's cleanup. Nothing
     * gates how soon `items` may change again — the user can play their next card the
     * instant a round settles — and an effect-scoped cleanup would cancel the pending
     * clear, while the re-run took the `gone.length === 0` branch above and scheduled no
     * replacement. The held items would then never be released. Holding the handle here
     * means holdMs always elapses from the departure that set it.
     */
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setHeld([]), holdMs)
    // keyOf is a fresh arrow at every call site; depending on it would rerun this on
    // every render and drop the held items immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, holdMs])

  // Unmount only. Kept separate so a change of `items` cannot cancel a pending clear.
  useEffect(() => () => clearTimeout(timerRef.current), [])

  return held
}
