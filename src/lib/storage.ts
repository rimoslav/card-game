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
  const payload: StoredPayload = {
    v: VERSION,
    p: game.playerCount,
    h: game.hands.map(hand => hand.map(code => encodeCard(code) ?? ''))
  }

  getStore().setItem(KEY, JSON.stringify(payload))
}

export const loadGame = (): StoredGame | null => {
  const raw = getStore().getItem(KEY)

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
  getStore().removeItem(KEY)
}
