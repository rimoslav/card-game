import { beforeEach, describe, expect, it } from 'vitest'
import { ALL_CODES } from '@cg/lib/cards'
import { clearGame, loadGame, saveGame, setStore } from '@cg/lib/storage'

const KEY = 'cg.g'

// Node has no localStorage (verified on v24.19.0), and its experimental Web Storage is
// file-backed, so it would leak state between tests. A tiny in-memory stub avoids both.
const createMemoryStore = (): Storage => {
  const map = new Map<string, string>()

  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, value)
    }
  }
}

let store: Storage

const handOf = (offset: number): string[] => ALL_CODES.slice(offset, offset + 10)

beforeEach(() => {
  store = createMemoryStore()
  setStore(store)
})

describe('saveGame / loadGame', () => {
  it('round-trips a four player game', () => {
    const game = {
      playerCount: 4,
      hands: [handOf(0), handOf(10), handOf(20), handOf(30)]
    }

    saveGame(game)

    expect(loadGame()).toEqual(game)
  })

  it('does not store readable card codes', () => {
    saveGame({ playerCount: 2, hands: [handOf(0), handOf(10)] })

    const raw = store.getItem(KEY) as string

    expect(raw).not.toContain('AD')
    expect(raw).not.toContain('KH')
  })

  it('returns null when nothing is stored', () => {
    expect(loadGame()).toBeNull()
  })
})

describe('loadGame validation', () => {
  const cases: [string, string][] = [
    ['malformed JSON', 'not json at all'],
    ['a non-object payload', '42'],
    ['a wrong version', JSON.stringify({ v: 99, p: 2, h: [[], []] })],
    ['a player count below the minimum', JSON.stringify({ v: 1, p: 1, h: [[]] })],
    ['a player count above the maximum', JSON.stringify({ v: 1, p: 9, h: [[]] })],
    ['a hand count that disagrees with the player count', JSON.stringify({ v: 1, p: 4, h: [[], []] })]
  ]

  cases.forEach(([label, raw]) => {
    it(`returns null for ${label}`, () => {
      store.setItem(KEY, raw)
      expect(loadGame()).toBeNull()
    })
  })

  it('returns null for a short hand', () => {
    saveGame({ playerCount: 2, hands: [handOf(0), handOf(10)] })

    const payload = JSON.parse(store.getItem(KEY) as string)
    payload.h[1] = payload.h[1].slice(0, 9)
    store.setItem(KEY, JSON.stringify(payload))

    expect(loadGame()).toBeNull()
  })

  it('returns null for an unknown token', () => {
    saveGame({ playerCount: 2, hands: [handOf(0), handOf(10)] })

    const payload = JSON.parse(store.getItem(KEY) as string)
    payload.h[0][0] = 'zzzzzz'
    store.setItem(KEY, JSON.stringify(payload))

    expect(loadGame()).toBeNull()
  })
})

describe('clearGame', () => {
  it('removes a stored game', () => {
    saveGame({ playerCount: 2, hands: [handOf(0), handOf(10)] })
    clearGame()

    expect(loadGame()).toBeNull()
  })
})
