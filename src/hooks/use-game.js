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
      const activePlayer = state.players[state.activePlayerId] // player that discarded the last card
      // if there're no cards in community, latest one has the biggest rank, otherwise we compare it to the biggest rank in community
      // if it's same or bigger, player who threw it takes the lead, otherwise lead stays the same
      const currentHandLeadId = length(state.community) && (action.payload.card.rank >= state.community[state.currentHandLeadId].rank)
        ? state.activePlayerId
        : state.currentHandLeadId

      return {
        ...state,
        players: update(state.activePlayerId, {
          ...activePlayer,
          remainingCards: reject(card => card.id === action.payload.card.id, activePlayer.remainingCards) // reject the card that player chose
        }, state.players),
        community: [
          ...state.community,
          action.payload.card // and add it to community cards
        ],
        activePlayerId: modulo(state.activePlayerId + 1, action.payload.numberOfPlayers), // increase by 1, or reset to 0
        canUserPlay: false, // between throwing a card and allowing next player to play there's a delay, we don't wont to allow clicks in that period
        currentHandLeadId
      }
    }
    case 'FIND_HAND_WINNER': {
      const communitySum = findCardsSum(state.community)
      // after we go through full round, we take all the cards from community, give it to the lead, and increase his score
      const handWinner = {
        ...state.players[state.currentHandLeadId],
        wonCards: [
          ...state.players[state.currentHandLeadId].wonCards,
          ...state.community
        ],
        score: state.players[state.currentHandLeadId].score + communitySum
      }

      let playersInTheLead = state.playersInTheLead

      // if the hand lead (now winner, whole round's over) overthrows the game lead, he takes his place
      // it he wins same number of points as the game lead, he's added to the list of leads
      // there's at least 1 winner, and everybody can be a winner at the same time if they all have same number of points
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
