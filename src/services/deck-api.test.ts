import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDeck, drawCards } from '@cg/services/deck-api'

const mockFetch = (body: unknown, ok = true, status = 200) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body)
  })

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createDeck', () => {
  it('returns the deck id', async () => {
    mockFetch({ deck_id: 'abc123' })

    await expect(createDeck()).resolves.toBe('abc123')
  })

  it('requests a single shuffled deck', async () => {
    const fetchMock = mockFetch({ deck_id: 'abc123' })

    await createDeck()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1'
    )
  })

  it('rejects on a failed response', async () => {
    mockFetch({}, false, 500)

    await expect(createDeck()).rejects.toThrow('Deck request failed: 500')
  })
})

describe('drawCards', () => {
  it('returns just the card codes', async () => {
    mockFetch({ cards: [{ code: 'AD' }, { code: '7S' }] })

    await expect(drawCards('abc123', 2)).resolves.toEqual(['AD', '7S'])
  })

  it('requests the requested count from the given deck', async () => {
    const fetchMock = mockFetch({ cards: [] })

    await drawCards('abc123', 40)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://deckofcardsapi.com/api/deck/abc123/draw/?count=40'
    )
  })
})
