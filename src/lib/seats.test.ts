import { describe, expect, it } from 'vitest'

import { SEAT_OFFSETS, winningIndexOf } from '@cg/lib/seats'
import type { Card } from '@cg/types'

const card = (id: string, rank: number): Card => ({ id, rank, suit: 'S', img: '' })

describe('SEAT_OFFSETS', () => {
  it('has an offset for every seat the game can seat', () => {
    expect(Object.keys(SEAT_OFFSETS)).toEqual(['0', '1', '2', '3'])
  })

  it('puts the two left-hand seats on one side and the two right-hand seats on the other', () => {
    expect(SEAT_OFFSETS[0].x.startsWith('-')).toBe(true)
    expect(SEAT_OFFSETS[1].x.startsWith('-')).toBe(true)
    expect(SEAT_OFFSETS[2].x.startsWith('-')).toBe(false)
    expect(SEAT_OFFSETS[3].x.startsWith('-')).toBe(false)
  })
})

describe('winningIndexOf', () => {
  it('finds the highest rank', () => {
    expect(winningIndexOf([card('a', 3), card('b', 9), card('c', 2), card('d', 5)])).toBe(1)
  })

  // Must match the reducer exactly: its >= comparison hands a rank tie to the later
  // player, so the glow has to land on the same card the pot was awarded for.
  it('breaks a tie in favour of the later card, as the reducer does', () => {
    expect(winningIndexOf([card('a', 9), card('b', 9), card('c', 2)])).toBe(1)
    expect(winningIndexOf([card('a', 9), card('b', 9), card('c', 9)])).toBe(2)
  })

  it('handles a single card', () => {
    expect(winningIndexOf([card('a', 4)])).toBe(0)
  })

  it('returns -1 for an empty pile rather than pointing at a card that is not there', () => {
    expect(winningIndexOf([])).toBe(-1)
  })
})
