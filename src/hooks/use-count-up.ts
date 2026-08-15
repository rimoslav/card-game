import { useEffect, useRef, useState } from 'react'

export const interpolate = (from: number, to: number, progress: number): number => {
  const clamped = Math.min(Math.max(progress, 0), 1)

  return Math.round(from + (to - from) * clamped)
}

/*
 * Checked in JS as well as CSS: theme.css collapses the motion tokens under a reduce
 * preference, but a requestAnimationFrame loop is not a CSS transition and would keep
 * running regardless. Guarded on both window and matchMedia because the test environment
 * has neither.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const useCountUp = (value: number, durationMs: number): number => {
  const [display, setDisplay] = useState(value)
  // What the number currently reads on screen. Animating from here rather than from the
  // previous target means an interrupted count resumes from where the eye left it.
  const displayedRef = useRef(value)

  useEffect(() => {
    const from = displayedRef.current

    // Idempotent by construction: with nothing to travel this is a no-op, which is what
    // makes StrictMode's double invoke on mount harmless.
    if (from === value) {
      return
    }

    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      displayedRef.current = value
      // A single jump to the target, not derived state: there is no animation to run, so
      // this branch is the whole "animation". The rule guards against cascading renders
      // from state derived in an effect; this sets one value once and returns.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(value)

      return
    }

    let start = 0
    let frame = 0

    const step = (now: number): void => {
      if (start === 0) {
        start = now
      }

      const next = interpolate(from, value, (now - start) / durationMs)

      displayedRef.current = next
      setDisplay(next)

      if (next !== value) {
        frame = requestAnimationFrame(step)
      }
    }

    frame = requestAnimationFrame(step)

    return () => cancelAnimationFrame(frame)
  }, [value, durationMs])

  return display
}
