import { describe, expect, it } from 'vitest'
import { NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { replaceAt } from '@cg/lib/utils'
import type { Card, GameState, Player } from '@cg/types'
import { buildPlayers, playGameReducer } from '@cg/hooks/use-play-game'

const card = (id: string, rank: number): Card =>
  ({ id, rank, suit: 'S', img: '' })

const emptyPlayer = (id: number): Player => ({
  id,
  name: id === 0 ? 'User' : `Player ${id}`,
  score: 0,
  remainingCards: [],
  wonCards: []
})

const stateWith = (numberOfPlayers: number, overrides: Partial<GameState> = {}): GameState => ({
  canUserPlay: true,
  activePlayerId: 0,
  roundNumber: 1,
  players: Array.from({ length: numberOfPlayers }, (_, id) => emptyPlayer(id)),
  community: [],
  gameLeads: [],
  ...overrides
})

describe('buildPlayers', () => {
  it('creates one player per hand, naming the user first', () => {
    const hands = [['AD', '2D'], ['3D', '4D']]
    const players = buildPlayers(hands)

    expect(players).toHaveLength(2)
    expect(players[0].name).toBe('User')
    expect(players[1].name).toBe('Player 1')
    expect(players[0].remainingCards.map(c => c.id)).toEqual(['AD', '2D'])
    expect(players[0].score).toBe(0)
    expect(players[0].wonCards).toEqual([])
  })
})

describe('CARD_DISCARDED', () => {
  it('moves the card to the community and advances the active player', () => {
    const discarded = card('7S', 7)
    const initial = stateWith(4)
    const withHand = {
      ...initial,
      players: replaceAt(0, { ...initial.players[0], remainingCards: [discarded] }, initial.players)
    }

    const next = playGameReducer(withHand, {
      type: 'CARD_DISCARDED',
      payload: { cardObj: discarded, numberOfPlayers: 4 }
    })

    expect(next.community).toEqual([discarded])
    expect(next.players[0].remainingCards).toEqual([])
    expect(next.activePlayerId).toBe(1)
    expect(next.canUserPlay).toBe(false)
  })

  it('wraps the active player back to zero', () => {
    const discarded = card('7S', 7)
    const initial = stateWith(4, { activePlayerId: 3 })
    const withHand = {
      ...initial,
      players: replaceAt(3, { ...initial.players[3], remainingCards: [discarded] }, initial.players)
    }

    const next = playGameReducer(withHand, {
      type: 'CARD_DISCARDED',
      payload: { cardObj: discarded, numberOfPlayers: 4 }
    })

    expect(next.activePlayerId).toBe(0)
  })
})

describe('HANDLE_ROUND_COMPLETED', () => {
  it('awards the whole community to the highest rank', () => {
    const community = [card('a', 3), card('b', 9), card('c', 2), card('d', 5)]
    const next = playGameReducer(stateWith(4, { community }), {
      type: 'HANDLE_ROUND_COMPLETED',
      payload: 4
    })

    expect(next.players[1].score).toBe(19)
    expect(next.players[1].wonCards).toEqual(community)
    expect(next.community).toEqual([])
    expect(next.roundNumber).toBe(2)
    expect(next.gameLeads.map(p => p.id)).toEqual([1])
  })

  it('breaks a rank tie in favour of the later player', () => {
    const community = [card('a', 9), card('b', 9), card('c', 2), card('d', 5)]
    const next = playGameReducer(stateWith(4, { community }), {
      type: 'HANDLE_ROUND_COMPLETED',
      payload: 4
    })

    expect(next.players[1].score).toBe(25)
    expect(next.players[0].score).toBe(0)
  })

  // Reachable if the settling effect ever fires before a round has been played — which
  // StrictMode's double mount-invoke provoked when this was gated on a mount flag.
  it('states the invariant when the community is empty', () => {
    expect(() => playGameReducer(stateWith(4), { type: 'HANDLE_ROUND_COMPLETED', payload: 4 }))
      .toThrow('HANDLE_ROUND_COMPLETED dispatched with an empty community')
  })
})

// Ported from the harness that investigated spec section 8.3. It refuted the suspected
// bug over 9,000 games; keeping it here pins gameLeads permanently.
describe('gameLeads property', () => {
  const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14]

  const makeRng = (initialSeed: number) => {
    let seed = initialSeed

    return (max: number) => {
      seed = (seed * 1664525 + 1013904223) % 4294967296

      return Math.floor((seed / 4294967296) * max)
    }
  }

  const playFullGame = (numberOfPlayers: number, seed: number): void => {
    const nextInt = makeRng(seed)
    let state = stateWith(numberOfPlayers)

    for (let round = 1; round <= NUMBER_OF_CARDS_PER_PLAYER; round++) {
      for (let playerId = 0; playerId < numberOfPlayers; playerId++) {
        const played = card(`r${round}p${playerId}`, RANKS[nextInt(RANKS.length)])

        state = {
          ...state,
          players: replaceAt(
            playerId,
            { ...state.players[playerId], remainingCards: [played] },
            state.players
          )
        }
        state = playGameReducer(state, {
          type: 'CARD_DISCARDED',
          payload: { cardObj: played, numberOfPlayers }
        })
      }

      state = playGameReducer(state, {
        type: 'HANDLE_ROUND_COMPLETED',
        payload: numberOfPlayers
      })

      const best = Math.max(...state.players.map(player => player.score))
      const expected = state.players.filter(player => player.score === best).map(player => player.id)
      const reported = state.gameLeads.map(player => player.id)

      expect([...reported].sort()).toEqual([...expected].sort())
      expect(new Set(reported).size).toBe(reported.length)

      state.gameLeads.forEach(lead => {
        expect(lead.score).toBe(state.players[lead.id].score)
      })
    }
  }

  ;[2, 3, 4].forEach(numberOfPlayers => {
    it(`always reports the true max-score set with ${numberOfPlayers} players`, () => {
      for (let seed = 1; seed <= 300; seed++) {
        playFullGame(numberOfPlayers, seed)
      }
    })
  })
})
