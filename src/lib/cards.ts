import type { Card, Suit } from '@cg/types'

const SALT = 'cg.v2.'

const SUITS: readonly Suit[] = ['S', 'D', 'C', 'H']

const VALUES: readonly string[] = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'J', 'Q', 'K'
]

// '0' is the API's code for ten. Note the original mapping skips 11 entirely.
const RANKS: Record<string, number> = {
  '0': 10,
  A: 1,
  J: 12,
  Q: 13,
  K: 14
}

export const ALL_CODES: readonly string[] =
  VALUES.flatMap(value => SUITS.map(suit => `${value}${suit}`))

export const rankOf = (code: string): number => Number(code[0]) || RANKS[code[0]]

// FNV-1a, salted, rendered as 6 base36 chars. Not cryptographic — this only has to
// stop a stored value from visibly reading as a card. See spec section 6.
const tokenFor = (code: string): string => {
  let hash = 0x811c9dc5

  for (const character of SALT + code) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(36).padStart(7, '0').slice(-6)
}

// Object.create(null), not {} — these are looked up with untrusted input. A plain object
// literal inherits from Object.prototype, so decodeCard('constructor') would return the
// Object constructor instead of undefined, and Task 4's storage validation (which rejects
// a token when decodeCard returns undefined) would accept it as a card code.
const CODE_TO_TOKEN: Record<string, string> = Object.create(null)
const TOKEN_TO_CODE: Record<string, string> = Object.create(null)

ALL_CODES.forEach(code => {
  const token = tokenFor(code)

  CODE_TO_TOKEN[code] = token
  TOKEN_TO_CODE[token] = code
})

export const encodeCard = (code: string): string | undefined => CODE_TO_TOKEN[code]

export const decodeCard = (token: string): string | undefined => TOKEN_TO_CODE[token]

export const cardFromCode = (code: string): Card => ({
  id: code,
  rank: rankOf(code),
  suit: code[1] as Suit,
  img: code === 'AD'
    ? `${import.meta.env.BASE_URL}ace-of-diamonds.png`
    : `https://deckofcardsapi.com/static/img/${code}.png`
})
