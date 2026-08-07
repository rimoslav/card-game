const BASE_URL = 'https://deckofcardsapi.com/api/deck'

// The response shapes are declared as `unknown` fields rather than asserted types: this is
// a third-party API and the JSON is untrusted. Validating here means a malformed response
// fails with an attributable message, instead of surfacing several frames later as a
// TypeError or a smuggled `undefined` inside a string[].
const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Deck request failed: ${response.status}`)
  }

  return await response.json() as T
}

const hasCode = (value: unknown): value is { code: string } =>
  typeof value === 'object'
    && value !== null
    && typeof (value as { code?: unknown }).code === 'string'

export const createDeck = async (): Promise<string> => {
  const deck = await getJson<{ deck_id?: unknown }>(`${BASE_URL}/new/shuffle/?deck_count=1`)

  if (typeof deck.deck_id !== 'string' || deck.deck_id === '') {
    throw new Error('Deck response did not contain a deck id')
  }

  return deck.deck_id
}

export const drawCards = async (deckId: string, count: number): Promise<string[]> => {
  const drawn = await getJson<{ cards?: unknown }>(`${BASE_URL}/${deckId}/draw/?count=${count}`)

  if (!Array.isArray(drawn.cards)) {
    throw new Error('Deck response did not contain a cards array')
  }

  return drawn.cards.map(card => {
    if (!hasCode(card)) {
      throw new Error('Deck response contained a card without a code')
    }

    return card.code
  })
}
