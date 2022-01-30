import {
  createContext,
  useContext,
  useEffect, 
  useReducer,
  useRef
} from 'react'
import {
  find,
  includes,
  length,
  modulo,
  reject,
  update
} from 'ramda'

import {
  NUMBER_OF_ROUNDS,
  TIME_BETWEEN_PLAYS_MS
} from 'utils/variables'
import {
  getRandomInt,
  transformResponse
} from 'utils/helpers'

import { drawCards } from 'services'



const initialState = {
  isDealingCards: false,
  numberOfPlayers: 0,
  players: [],
  community: [],
  communitySum: 0,
  activePlayerId: 0,
  canUserPlay: true,
  roundNumber: 1,
  playersInTheLead: [],
  currentHandLeadId: 0
}

const gameReducer = (state, action) => {
  switch (action.type) {
    case 'DEAL_CARDS_REQUEST':
      return {
        ...state,
        isDealingCards: true
      }
    case 'DEAL_CARDS_SUCCESS': {
      const players = transformResponse(action.payload.cards)

      return {
        ...state,
        players,
        isDealingCards: false
      }
    }
    case 'DEAL_CARDS_ERROR':
      return {
        ...state,
        isDealingCards: false
      }
    case 'CARD_DISCARDED': {
      const activePlayer = state.players[state.activePlayerId]
      const currentHandLeadId = length(state.community) && (action.payload.rank >= state.community[state.currentHandLeadId].rank)
        ? state.activePlayerId
        : state.currentHandLeadId

      return {
        ...state,
        players: update(state.activePlayerId, {
          ...activePlayer,
          remainingCards: reject(card => card.id === action.payload.id, activePlayer.remainingCards)
        }, state.players),
        community: [
          ...state.community,
          action.payload
        ],
        communitySum: state.communitySum + action.payload.rank,
        activePlayerId: modulo(state.activePlayerId + 1, state.numberOfPlayers),
        canUserPlay: false,
        currentHandLeadId
      }
    }
    case 'FIND_HAND_WINNER': {
      const handWinner = {
        ...state.players[state.currentHandLeadId],
        wonCards: [
          ...state.players[state.currentHandLeadId].wonCards,
          ...state.community
        ],
        score: state.players[state.currentHandLeadId].score + state.communitySum
      }

      let playersInTheLead = state.playersInTheLead

      if (!length(state.playersInTheLead) || (handWinner.score > state.playersInTheLead[0].score)) {
        playersInTheLead = [handWinner]
      } else if (handWinner.score === state.playersInTheLead[0]?.score) {
        playersInTheLead = [
          ...state.playersInTheLead,
          handWinner
        ]
      }

      return {
        ...state,
        roundNumber: state.roundNumber + 1,
        players: update(state.currentHandLeadId, handWinner, state.players),
        community: [],
        communitySum: 0,
        canUserPlay: !state.activePlayerId,
        currentHandLeadId: 0,
        playersInTheLead
      }
    }
    default:
      throw new Error('Invalid case in gameReducer')
  }
}

export const useGame = ({
  deckId,
  numberOfPlayers,
  navigateHome
}) => {
  const [state, dispatch] = useReducer(gameReducer, {
    ...initialState,
    numberOfPlayers: includes(Number(numberOfPlayers), [2, 3, 4])
    ? Number(numberOfPlayers)
    : 4,
  })

  const didMountRef = useRef(false)

  useEffect(() => {
    if (state.activePlayerId) {
      const activePlayer = find(player => player.id === state.activePlayerId, state.players)
      const cardIndex = getRandomInt(length(activePlayer.remainingCards))

      setTimeout(() => {
        discardACard(activePlayer.remainingCards[cardIndex])
      }, TIME_BETWEEN_PLAYS_MS)
    } else if (didMountRef.current) {
      setTimeout(() => {
        findHandWinner()
      }, TIME_BETWEEN_PLAYS_MS)
    } else {
      didMountRef.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activePlayerId])

  useEffect(() => {
    dealCards()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dealCards = async () => {
    dispatch({ type: 'DEAL_CARDS_REQUEST' })
    try {
      const cardsDealt = await drawCards({
        deckId,
        numberOfCards: state.numberOfPlayers * NUMBER_OF_ROUNDS
      })

      if (!cardsDealt.data.success) {
        navigateHome()
      } else {
        dispatch({ type: 'DEAL_CARDS_SUCCESS', payload: cardsDealt.data })
      }
    } catch (e) {
      dispatch({ type: 'DEAL_CARDS_ERROR' })
      navigateHome()
    }
  }

  const discardACard = card => {
    dispatch({ type: 'CARD_DISCARDED', payload: card })
  }

  const findHandWinner = () => {
    dispatch({ type: 'FIND_HAND_WINNER' })
  }

  return {
    ...state,
    hasMoreThanTwoPlayers: state.numberOfPlayers > 2,
    discardACard
  }
}

const GameContext = createContext()

export const GameContextProvider = GameContext.Provider

export const useGameContext = () => useContext(GameContext)
