import { MAX_PLAYERS, MIN_PLAYERS, NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { decodeCard, encodeCard } from '@cg/lib/cards'

const KEY = 'cg.g'
const VERSION = 1

export interface StoredGame {
  playerCount: number
  hands: string[][]
}

interface StoredPayload {
  v: number
  p: number
  h: string[][]
}

let injectedStore: Storage | null = null

// Test seam: Node has no localStorage, so tests inject an in-memory Storage.
export const setStore = (store: Storage | null): void => {
  injectedStore = store
}

const getStore = (): Storage => injectedStore ?? window.localStorage

// Reading localStorage can throw outright, not just return null — Safari private mode and
// blocked-storage settings raise SecurityError on access, and quota limits raise on write.
// Exported so the sound preference shares one test seam and one throwing-store policy;
// use loadGame, not readItem, for the game key.
export const readItem = (key: string): string | null => {
  try {
    return getStore().getItem(key)
  } catch {
    return null
  }
}

export const writeItem = (key: string, value: string): void => {
  try {
    getStore().setItem(key, value)
  } catch {
    // A preference that cannot be persisted is not worth breaking a click over.
  }
}

const isStoredPayload = (value: unknown): value is StoredPayload => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const payload = value as Record<string, unknown>

  return payload.v === VERSION
    && typeof payload.p === 'number'
    && Array.isArray(payload.h)
}

export const saveGame = (game: StoredGame): void => {
  // Throw rather than writing a placeholder for an unencodable code. Writing '' would
  // produce a payload that loadGame later rejects, bouncing the player back to the home
  // screen with no explanation; throwing lets the caller's catch surface a real message.
  const h = game.hands.map(hand => hand.map(code => {
    const token = encodeCard(code)

    if (token === undefined) {
      throw new Error(`Cannot save game: unknown card code ${JSON.stringify(code)}`)
    }

    return token
  }))

  // Deliberately not caught: if the store is unavailable, the caller must know the game
  // was not saved rather than navigate to a game screen that cannot load.
  getStore().setItem(KEY, JSON.stringify({ v: VERSION, p: game.playerCount, h } satisfies StoredPayload))
}

export const loadGame = (): StoredGame | null => {
  const raw = readItem(KEY)

  if (raw === null) {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isStoredPayload(parsed)) {
    return null
  }

  if (parsed.p < MIN_PLAYERS || parsed.p > MAX_PLAYERS || parsed.h.length !== parsed.p) {
    return null
  }

  const hands: string[][] = []

  for (const hand of parsed.h) {
    if (!Array.isArray(hand) || hand.length !== NUMBER_OF_CARDS_PER_PLAYER) {
      return null
    }

    const codes: string[] = []

    for (const token of hand) {
      const code = typeof token === 'string'
        ? decodeCard(token)
        : undefined

      if (code === undefined) {
        return null
      }

      codes.push(code)
    }

    hands.push(codes)
  }

  return { playerCount: parsed.p, hands }
}

export const clearGame = (): void => {
  try {
    getStore().removeItem(KEY)
  } catch {
    // an unavailable store has nothing to clear
  }
}
