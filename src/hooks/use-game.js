import {
  createContext,
  useContext,
  useEffect, 
  useReducer,
  useRef
} from 'react'
import {
  find,
  length,
  modulo,
  reject,
  sort,
  update
} from 'ramda'

import {
  NUMBER_OF_ROUNDS,
  TIME_BETWEEN_PLAYS_MS
} from 'utils/variables'
import {
  findCardsSum,
  getRandomInt,
  transformResponse
} from 'utils/helpers'

import { drawCards } from 'services'



const initialState = {
  isDealingCards: false,
  players: [],
  community: [],
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
      const currentHandLeadId = length(state.community) && (action.payload.card.rank >= state.community[state.currentHandLeadId].rank)
        ? state.activePlayerId
        : state.currentHandLeadId

      return {
        ...state,
        players: update(state.activePlayerId, {
          ...activePlayer,
          remainingCards: reject(card => card.id === action.payload.card.id, activePlayer.remainingCards)
        }, state.players),
        community: [
          ...state.community,
          action.payload.card
        ],
        activePlayerId: modulo(state.activePlayerId + 1, action.payload.numberOfPlayers),
        canUserPlay: false,
        currentHandLeadId
      }
    }
    case 'FIND_HAND_WINNER': {
      const communitySum = findCardsSum(state.community)
      const handWinner = {
        ...state.players[state.currentHandLeadId],
        wonCards: [
          ...state.players[state.currentHandLeadId].wonCards,
          ...state.community
        ],
        score: state.players[state.currentHandLeadId].score + communitySum
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
  const [state, dispatch] = useReducer(gameReducer, initialState)

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
        numberOfCards: numberOfPlayers * NUMBER_OF_ROUNDS
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
    dispatch({
      type: 'CARD_DISCARDED',
      payload: {
        card,
        numberOfPlayers
      }
    })
  }

  const findHandWinner = () => {
    dispatch({ type: 'FIND_HAND_WINNER' })
  }

  return {
    ...state,
    numberOfPlayers,
    hasMoreThanTwoPlayers: numberOfPlayers > 2,
    playersSortedByPoints: sort((player1, player2) => player2.score - player1.score, state.players),
    discardACard
  }
}

const GameContext = createContext()

export const GameContextProvider = GameContext.Provider

export const useGameContext = () => useContext(GameContext)
