import { beforeEach, describe, expect, it } from 'vitest'

import { clearGame, setStore } from '@cg/lib/storage'
import { isEnabled, play, setEnabled } from '@cg/lib/sound'

const mem = (): Storage => {
  const m = new Map<string, string>()

  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k) },
    setItem: (k: string, v: string) => { m.set(k, v) }
  }
}

// A fake just complete enough for the real synthesis path to run end to end. Every node
// records its disconnect so the test can assert the graph is torn down.
const makeFakeAudio = () => {
  const constructed: string[] = []
  const disconnected: string[] = []

  const node = (kind: string) => ({
    connect: () => undefined,
    disconnect: () => { disconnected.push(kind) }
  })

  const param = () => ({
    value: 0,
    setValueAtTime: () => undefined,
    linearRampToValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined
  })

  class FakeAudioContext {
    currentTime = 0
    sampleRate = 44100
    state = 'running'
    destination = node('destination')

    constructor() {
      constructed.push('context')
    }

    resume() { return Promise.resolve() }

    createGain() {
      return { ...node('gain'), gain: param() }
    }

    createBuffer(_channels: number, frames: number) {
      const data = new Float32Array(frames)

      return { getChannelData: () => data }
    }

    // stop() fires onended, as a real node does when it finishes. Without that the
    // teardown assertion below would be testing the fake rather than the code.
    createBufferSource() {
      const source = {
        ...node('source'),
        buffer: null as AudioBuffer | null,
        onended: null as (() => void) | null,
        start: () => undefined,
        stop: (): void => undefined
      }

      source.stop = () => { source.onended?.() }

      return source
    }

    createBiquadFilter() {
      return { ...node('filter'), type: 'lowpass', frequency: param() }
    }

    createOscillator() {
      const oscillator = {
        ...node('oscillator'),
        type: 'sine',
        frequency: param(),
        onended: null as (() => void) | null,
        start: () => undefined,
        stop: (): void => undefined
      }

      oscillator.stop = () => { oscillator.onended?.() }

      return oscillator
    }
  }

  return { FakeAudioContext, constructed, disconnected }
}

interface AudioGlobals {
  window?: { AudioContext?: unknown }
}

const setWindow = (value: { AudioContext?: unknown } | undefined): void => {
  const globals = globalThis as AudioGlobals

  if (value === undefined) {
    delete globals.window
  } else {
    globals.window = value
  }
}

beforeEach(() => {
  setStore(mem())
  setWindow(undefined)
})

describe('the sound preference', () => {
  it('defaults to muted', () => {
    expect(isEnabled()).toBe(false)
  })

  it('round-trips through storage', () => {
    setEnabled(true)
    expect(isEnabled()).toBe(true)

    setEnabled(false)
    expect(isEnabled()).toBe(false)
  })

  it('is not disturbed by clearing the game, because it lives under its own key', () => {
    setEnabled(true)
    clearGame()

    expect(isEnabled()).toBe(true)
  })

  it('does not throw when the store throws on read or write', () => {
    const throwing: Storage = {
      get length() { return 0 },
      clear: () => undefined,
      getItem: () => { throw new Error('SecurityError') },
      key: () => null,
      removeItem: () => undefined,
      setItem: () => { throw new Error('QuotaExceededError') }
    }

    setStore(throwing)

    expect(() => setEnabled(true)).not.toThrow()
    expect(isEnabled()).toBe(false)
  })
})

describe('play', () => {
  it('is a no-op and does not throw when there is no AudioContext at all', () => {
    setEnabled(true)

    expect(() => play('deal')).not.toThrow()
    expect(() => play('play')).not.toThrow()
    expect(() => play('win')).not.toThrow()
  })

  it('does not throw when constructing the context throws', () => {
    setEnabled(true)
    setWindow({
      AudioContext: class { constructor() { throw new Error('blocked before a user gesture') } }
    })

    expect(() => play('play')).not.toThrow()
  })

  it('constructs no context while muted, however many cues are requested', () => {
    const { FakeAudioContext, constructed } = makeFakeAudio()

    setWindow({ AudioContext: FakeAudioContext })

    play('deal')
    play('play')
    play('win')

    expect(constructed).toEqual([])
  })

  it('constructs the context on the first cue after sound is enabled, and only once', () => {
    const { FakeAudioContext, constructed } = makeFakeAudio()

    setWindow({ AudioContext: FakeAudioContext })
    setEnabled(true)

    expect(constructed).toEqual([])

    play('play')
    expect(constructed).toEqual(['context'])

    play('win')
    play('deal')
    expect(constructed).toEqual(['context'])
  })

  it('tears its nodes down again after each cue', () => {
    const { FakeAudioContext, disconnected } = makeFakeAudio()

    setWindow({ AudioContext: FakeAudioContext })
    setEnabled(true)

    play('play')

    expect(disconnected).toEqual(['source', 'filter', 'gain'])
  })
})
