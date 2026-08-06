const BASE_URL = 'https://deckofcardsapi.com/api/deck'

interface NewDeckResponse {
  deck_id: string
}

interface DrawResponse {
  cards: { code: string }[]
}

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Deck request failed: ${response.status}`)
  }

  return await response.json() as T
}

export const createDeck = async (): Promise<string> => {
  const deck = await getJson<NewDeckResponse>(`${BASE_URL}/new/shuffle/?deck_count=1`)

  return deck.deck_id
}

export const drawCards = async (deckId: string, count: number): Promise<string[]> => {
  const drawn = await getJson<DrawResponse>(`${BASE_URL}/${deckId}/draw/?count=${count}`)

  return drawn.cards.map(card => card.code)
}
