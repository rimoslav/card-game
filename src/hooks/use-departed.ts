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

    const timer = setTimeout(() => setHeld([]), holdMs)

    return () => clearTimeout(timer)
    // keyOf is a fresh arrow at every call site; depending on it would rerun this on
    // every render and drop the held items immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, holdMs])

  return held
}
