import { describe, expect, it } from 'vitest'

import { announcementFor } from '@cg/lib/announce'
import type { Card, Player } from '@cg/types'

const card = (id: string, rank: number): Card => ({ id, rank, suit: 'S', img: '' })

const player = (id: number, score = 0, wonCards: Card[] = []): Player => ({
  id,
  name: id === 0 ? 'User' : `Player ${id}`,
  score,
  remainingCards: [],
  wonCards
})

const base = {
  roundNumber: 3,
  community: [] as Card[],
  players: [player(0), player(1), player(2), player(3)],
  gameLeads: [] as Player[],
  lastRoundWinnerId: null as number | null,
  numberOfPlayers: 4
}

describe('announcementFor', () => {
  it('says nothing at the very start of a game', () => {
    expect(announcementFor(base)).toBe('')
  })

  it('names the user\'s own play in the second person', () => {
    expect(announcementFor({ ...base, community: [{ id: '7S', rank: 7, suit: 'S', img: '' }] }))
      .toBe('You played Seven of Spades')
  })

  it('names an opponent by seat', () => {
    const community = [card('a', 3), { id: 'KH', rank: 14, suit: 'H' as const, img: '' }]

    expect(announcementFor({ ...base, community })).toBe('Player 1 played King of Hearts')
  })

  it('reports the round outcome with the winning card and the pot', () => {
    const pot = [card('a', 3), { id: 'KH', rank: 14, suit: 'H' as const, img: '' }, card('c', 2), card('d', 5)]

    expect(announcementFor({
      ...base,
      roundNumber: 4,
      lastRoundWinnerId: 1,
      players: [player(0), player(1, 24, pot), player(2), player(3)]
    })).toBe('Player 1 wins the round with King of Hearts, 24 points')
  })

  it('reports the user\'s own round win in the second person', () => {
    const pot = [{ id: 'KH', rank: 14, suit: 'H' as const, img: '' }, card('b', 2)]

    expect(announcementFor({
      ...base,
      roundNumber: 4,
      lastRoundWinnerId: 0,
      numberOfPlayers: 2,
      players: [player(0, 16, pot), player(1)]
    })).toBe('You win the round with King of Hearts, 16 points')
  })

  // The winner may have won earlier rounds too; only the newest pot is this round's.
  it('reads only the most recent pot from the winner\'s stack', () => {
    const older = [card('old1', 5), card('old2', 6)]
    const pot = [{ id: 'QS', rank: 13, suit: 'S' as const, img: '' }, card('b', 2)]

    expect(announcementFor({
      ...base,
      roundNumber: 4,
      lastRoundWinnerId: 1,
      numberOfPlayers: 2,
      players: [player(0), player(1, 26, [...older, ...pot])]
    })).toBe('Player 1 wins the round with Queen of Spades, 15 points')
  })

  it('announces the user winning the game', () => {
    expect(announcementFor({
      ...base,
      roundNumber: 11,
      gameLeads: [player(0, 84)]
    })).toBe('Game over. You win with 84 points.')
  })

  it('announces an opponent winning the game', () => {
    expect(announcementFor({
      ...base,
      roundNumber: 11,
      gameLeads: [player(2, 91)]
    })).toBe('Game over. Player 2 wins with 91 points.')
  })

  it('announces a tie', () => {
    expect(announcementFor({
      ...base,
      roundNumber: 11,
      gameLeads: [player(0, 70), player(3, 70)]
    })).toBe('Game over. User and Player 3 tie with 70 points.')
  })

  it('prefers the game-over line even though the community is empty', () => {
    expect(announcementFor({
      ...base,
      roundNumber: 11,
      lastRoundWinnerId: 1,
      gameLeads: [player(1, 60)],
      players: [player(0), player(1, 60, [card('a', 9), card('b', 2), card('c', 2), card('d', 2)])]
    })).toBe('Game over. Player 1 wins with 60 points.')
  })
})
