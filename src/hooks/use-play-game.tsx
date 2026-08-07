import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef
} from 'react'
import type { ReactNode } from 'react'

import { TIME_BETWEEN_PLAYS_MS, USERS_POSITION } from '@cg/constants'
import { cardFromCode } from '@cg/lib/cards'
import { replaceAt } from '@cg/lib/utils'
import type { Card, GameAction, GameState, Player } from '@cg/types'

export const buildPlayers = (hands: string[][]): Player[] =>
  hands.map((hand, index) => ({
    id: index,
    name: index === USERS_POSITION
      ? 'User'
      : `Player ${index}`,
    score: 0,
    remainingCards: hand.map(cardFromCode),
    wonCards: []
  }))

const initialState: GameState = {
  canUserPlay: true,
  activePlayerId: 0,
  roundNumber: 1,
  players: [],
  community: [],
  gameLeads: []
}

export const playGameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'CARD_DISCARDED': {
      const activePlayer = state.players[state.activePlayerId]

      return {
        ...state,
        // there is a delay between a discard and the next play; block clicks during it
        canUserPlay: false,
        activePlayerId: (state.activePlayerId + 1) % action.payload.numberOfPlayers,
        players: replaceAt(state.activePlayerId, {
          ...activePlayer,
          remainingCards: activePlayer.remainingCards.filter(
            card => card.id !== action.payload.cardObj.id
          )
        }, state.players),
        community: [...state.community, action.payload.cardObj]
      }
    }
    case 'HANDLE_ROUND_COMPLETED': {
      const numberOfPlayers = action.payload

      let communitySum = state.community[0].rank
      let roundWinnerId = 0
      let gameLeads: Player[] = [state.players[USERS_POSITION]]

      // Walk the community pile once: total the pot, find this round's winner, and
      // rebuild the lead set from scores as they stood before the pot was awarded.
      for (let index = 1; index < numberOfPlayers; index++) {
        communitySum += state.community[index].rank

        // >= means a rank tie goes to the later player
        if (state.community[index].rank >= state.community[roundWinnerId].rank) {
          roundWinnerId = index
        }

        if (state.roundNumber > 1) {
          if (state.players[index].score > gameLeads[0].score) {
            gameLeads = [state.players[index]]
          } else if (state.players[index].score === gameLeads[0].score) {
            gameLeads = [...gameLeads, state.players[index]]
          }
        }
      }

      const roundWinnerUpdated: Player = {
        ...state.players[roundWinnerId],
        wonCards: [...state.players[roundWinnerId].wonCards, ...state.community],
        score: state.players[roundWinnerId].score + communitySum
      }

      // Now fold the winner's new score in. The pot is always > 0, so a player who was
      // already leading necessarily takes the first branch and cannot be duplicated.
      if (roundWinnerUpdated.score > gameLeads[0].score) {
        gameLeads = [roundWinnerUpdated]
      } else if (roundWinnerUpdated.score === gameLeads[0].score) {
        gameLeads = [...gameLeads, roundWinnerUpdated]
      }

      return {
        ...state,
        canUserPlay: !state.activePlayerId,
        roundNumber: state.roundNumber + 1,
        players: replaceAt(roundWinnerId, roundWinnerUpdated, state.players),
        community: [],
        gameLeads
      }
    }
    default: {
      const unhandled: never = action

      throw new Error(`Invalid action in playGameReducer: ${JSON.stringify(unhandled)}`)
    }
  }
}

export interface PlayGameValue extends GameState {
  numberOfPlayers: number
  hasMoreThanTwoPlayers: boolean
  playersSortedByPoints: Player[]
  getIsPlayerLeading: (player: Player) => boolean
  discardACard: (cardObj: Card) => void
}

export const usePlayGame = ({
  playerCount,
  hands
}: {
  playerCount: number
  hands: string[][]
}): PlayGameValue => {
  const [state, dispatch] = useReducer(playGameReducer, hands, initialHands => ({
    ...initialState,
    players: buildPlayers(initialHands)
  }))

  const didMountRef = useRef(false)

  const discardACard = (cardObj: Card): void => {
    dispatch({
      type: 'CARD_DISCARDED',
      payload: { cardObj, numberOfPlayers: playerCount }
    })
  }

  useEffect(() => {
    if (state.activePlayerId !== USERS_POSITION) {
      const active = state.players[state.activePlayerId]
      const cardIndex = Math.floor(Math.random() * active.remainingCards.length)
      const chosen = active.remainingCards[cardIndex]

      const timer = setTimeout(() => {
        discardACard(chosen)
      }, TIME_BETWEEN_PLAYS_MS)

      return () => clearTimeout(timer)
    }

    if (!didMountRef.current) {
      // first render — the game is just starting, nothing to settle yet
      didMountRef.current = true

      return
    }

    // back round to the user: settle the round before they may play again
    const timer = setTimeout(() => {
      dispatch({ type: 'HANDLE_ROUND_COMPLETED', payload: playerCount })
    }, TIME_BETWEEN_PLAYS_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activePlayerId])

  return {
    ...state,
    numberOfPlayers: playerCount,
    hasMoreThanTwoPlayers: playerCount > 2,
    playersSortedByPoints: [...state.players].sort((first, second) => second.score - first.score),
    getIsPlayerLeading: player => state.gameLeads.some(lead => lead.id === player.id),
    discardACard
  }
}

const GameContext = createContext<PlayGameValue | null>(null)

export const PlayGameContextProvider = ({
  value,
  children
}: {
  value: PlayGameValue
  children: ReactNode
}) => (
  <GameContext.Provider value={value}>
    {children}
  </GameContext.Provider>
)

export const usePlayGameContext = (): PlayGameValue => {
  const value = useContext(GameContext)

  if (value === null) {
    throw new Error('usePlayGameContext must be used inside PlayGameContextProvider')
  }

  return value
}
