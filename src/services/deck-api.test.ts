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
    const fetchMock = mockFetch({ cards: Array.from({ length: 40 }, () => ({ code: 'AS' })) })

    await drawCards('abc123', 40)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://deckofcardsapi.com/api/deck/abc123/draw/?count=40'
    )
  })
})

// A 200 response with the wrong shape must fail here, attributably, rather than sending a
// bad value onward — storage throws on an unknown card code, but several frames removed
// from the cause.
describe('malformed responses', () => {
  it('rejects a deck response with no deck id', async () => {
    mockFetch({})

    await expect(createDeck()).rejects.toThrow('Deck response did not contain a deck id')
  })

  it('rejects a deck response whose deck id is not a string', async () => {
    mockFetch({ deck_id: 42 })

    await expect(createDeck()).rejects.toThrow('Deck response did not contain a deck id')
  })

  it('rejects a draw response with no cards array', async () => {
    mockFetch({})

    await expect(drawCards('abc123', 2)).rejects.toThrow('Deck response did not contain a cards array')
  })

  it('rejects a draw that returned fewer cards than requested', async () => {
    mockFetch({ cards: [{ code: 'AD' }, { code: '7S' }] })

    await expect(drawCards('abc123', 40)).rejects.toThrow('returned 2 cards, expected 40')
  })

  it('rejects a draw response containing a card without a code', async () => {
    mockFetch({ cards: [{ code: 'AD' }, {}] })

    await expect(drawCards('abc123', 2)).rejects.toThrow('Deck response contained a card without a code')
  })

  it('propagates a network failure, so the caller can report it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(createDeck()).rejects.toThrow('Failed to fetch')
  })
})
