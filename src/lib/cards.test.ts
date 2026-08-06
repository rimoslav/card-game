import { describe, expect, it } from 'vitest'
import { ALL_CODES, cardFromCode, decodeCard, encodeCard, rankOf } from '@cg/lib/cards'

describe('ALL_CODES', () => {
  it('contains all 52 distinct cards', () => {
    expect(ALL_CODES).toHaveLength(52)
    expect(new Set(ALL_CODES).size).toBe(52)
  })
})

describe('token map', () => {
  it('assigns a unique token to every card', () => {
    const tokens = ALL_CODES.map(code => encodeCard(code))
    expect(new Set(tokens).size).toBe(52)
  })

  it('round-trips every card losslessly', () => {
    ALL_CODES.forEach(code => {
      const token = encodeCard(code)
      expect(token).toBeDefined()
      expect(decodeCard(token as string)).toBe(code)
    })
  })

  it('produces tokens that do not leak the card code', () => {
    ALL_CODES.forEach(code => {
      const token = encodeCard(code) as string
      expect(token.toUpperCase()).not.toContain(code)
    })
  })

  it('returns undefined for unknown input', () => {
    expect(encodeCard('ZZ')).toBeUndefined()
    expect(decodeCard('nope!!')).toBeUndefined()
  })

  // The lookup tables are consulted with untrusted values straight out of localStorage,
  // so inherited Object.prototype keys must not resolve to anything.
  it('returns undefined for Object.prototype property names', () => {
    const inherited = ['constructor', 'toString', 'hasOwnProperty', 'valueOf', '__proto__']

    inherited.forEach(name => {
      expect(encodeCard(name)).toBeUndefined()
      expect(decodeCard(name)).toBeUndefined()
    })
  })
})

describe('rankOf', () => {
  it('maps numeric cards to their face value', () => {
    expect(rankOf('2H')).toBe(2)
    expect(rankOf('9S')).toBe(9)
  })

  it('maps the API ten code to 10', () => {
    expect(rankOf('0D')).toBe(10)
  })

  it('maps court cards and the ace, leaving no rank 11', () => {
    expect(rankOf('AC')).toBe(1)
    expect(rankOf('JH')).toBe(12)
    expect(rankOf('QH')).toBe(13)
    expect(rankOf('KH')).toBe(14)
    expect(ALL_CODES.map(rankOf)).not.toContain(11)
  })
})

describe('cardFromCode', () => {
  it('builds a card with its remote image', () => {
    expect(cardFromCode('7S')).toEqual({
      id: '7S',
      rank: 7,
      suit: 'S',
      img: 'https://deckofcardsapi.com/static/img/7S.png'
    })
  })

  it('uses the local image for the ace of diamonds', () => {
    expect(cardFromCode('AD').img).toBe('/ace-of-diamonds.png')
  })
})
