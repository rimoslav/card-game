import { afterEach, describe, expect, it } from 'vitest'

import { interpolate, prefersReducedMotion } from '@cg/hooks/use-count-up'

// The node environment has no window at all. These tests install a minimal fake and
// remove it again, so nothing leaks into the DOM-free assumptions of other suites.
interface FakeWindow {
  matchMedia?: (query: string) => { matches: boolean }
}

const withWindow = (fake: FakeWindow | undefined, body: () => void): void => {
  const globals = globalThis as { window?: FakeWindow }
  const had = 'window' in globals
  const previous = globals.window

  if (fake === undefined) {
    delete globals.window
  } else {
    globals.window = fake
  }

  try {
    body()
  } finally {
    if (had) {
      globals.window = previous
    } else {
      delete globals.window
    }
  }
}

afterEach(() => {
  const globals = globalThis as { window?: FakeWindow }
  delete globals.window
})

describe('interpolate', () => {
  it('returns the start value at t=0', () => {
    expect(interpolate(10, 50, 0)).toBe(10)
  })

  it('returns the midpoint at t=0.5', () => {
    expect(interpolate(10, 50, 0.5)).toBe(30)
  })

  it('returns the target at t=1', () => {
    expect(interpolate(10, 50, 1)).toBe(50)
  })

  it('rounds to whole points', () => {
    expect(interpolate(0, 31, 0.5)).toBe(16)
  })

  it('clamps progress past the ends so a late frame cannot overshoot', () => {
    expect(interpolate(10, 50, 1.4)).toBe(50)
    expect(interpolate(10, 50, -0.2)).toBe(10)
  })

  it('counts downward as readily as upward', () => {
    expect(interpolate(50, 10, 0.5)).toBe(30)
  })
})

describe('prefersReducedMotion', () => {
  it('is false when there is no window, which is how the test environment runs', () => {
    withWindow(undefined, () => {
      expect(prefersReducedMotion()).toBe(false)
    })
  })

  it('is false when the browser has no matchMedia', () => {
    withWindow({}, () => {
      expect(prefersReducedMotion()).toBe(false)
    })
  })

  it('is true when the reduce query matches', () => {
    withWindow({ matchMedia: query => ({ matches: query.includes('reduce') }) }, () => {
      expect(prefersReducedMotion()).toBe(true)
    })
  })

  it('is false when the reduce query does not match', () => {
    withWindow({ matchMedia: () => ({ matches: false }) }, () => {
      expect(prefersReducedMotion()).toBe(false)
    })
  })
})
