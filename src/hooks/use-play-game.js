import {
  createContext,
  useContext,
  useEffect, 
  useReducer,
  useRef
} from 'react'
import {
  any,
  find,
  length,
  modulo,
  reject,
  sort,
  update
} from 'ramda'

import {
  TIME_BETWEEN_PLAYS_MS,
  USERS_POSITION
} from 'src/utils/variables'
import {
  getRandomInt,
  mapCardsToPlayers
} from 'src/utils/helpers'



const initialState = {
  canUserPlay: true,
  activePlayerId: 0,
  roundNumber: 1,
  players: [],
  community: [],
  gameLeads: []
}

const playGameReducer = (state, action) => {
  switch (action.type) {
    case 'CARD_DISCARDED': {
      const activePlayer = state.players[state.activePlayerId] // player that discarded the last card

      return {
        ...state,
        canUserPlay: false, // between throwing a card and allowing next player to play there's a delay, we don't wont to allow clicks in that period
        activePlayerId: modulo(state.activePlayerId + 1, action.payload.numberOfPlayers), // increase by 1, or reset to 0
        players: update(state.activePlayerId, {
          ...activePlayer,
          remainingCards: reject(card => card.id === action.payload.cardObj.id, activePlayer.remainingCards) // reject the card that player chose
        }, state.players),
        community: [
          ...state.community,
          action.payload.cardObj // and add it to community cards
        ]
      }
    }
    case 'HANDLE_ROUND_COMPLETED': {
      let communitySum = state.community[0].rank
      let roundWinnerId = 0
      let gameLeads = [state.players[USERS_POSITION]]

      // determine communitySum and roundWinnerId for this round, and gameLeads up until previous round, then update it after awarding roundWinner with latest points
      for (let index = 1; index < action.payload; index++) {
        communitySum += state.community[index].rank // increase community sum in each itteration

        if (state.community[index].rank >= state.community[roundWinnerId].rank) { // if state.community[index] card has greater than or equal to rank to the current highest ranked card, it should replace it as the greatest, meaning player at that same index is the current round lead
          roundWinnerId = index
        }

        if (state.roundNumber > 1) {
          if (state.players[index].score > gameLeads[0].score) {
            gameLeads = [state.players[index]]
          } else if (state.players[index].score === gameLeads[0].score) {
            gameLeads = [
              ...gameLeads,
              state.players[index]
            ]
          }
        }
      }

      // we know who's round winner and cards he's getting, now let's set his new cards and score, before updating him in state
      const roundWinnerUpdated = {
        ...state.players[roundWinnerId],
        wonCards: [
          ...state.players[roundWinnerId].wonCards,
          ...state.community
        ],
        score: state.players[roundWinnerId].score + communitySum
      }

      // we've calculated gameLeads with state from previous round (no way of knowing before)
      // do one last check and see if list should be updated and how
      if (roundWinnerUpdated.score > gameLeads[0].score) {
        gameLeads = [roundWinnerUpdated]
      } else if (roundWinnerUpdated.score === gameLeads[0].score) {
        gameLeads = [
          ...state.gameLeads,
          roundWinnerUpdated
        ]
      }

      return {
        ...state,
        canUserPlay: !state.activePlayerId,
        roundNumber: state.roundNumber + 1,
        players: update(roundWinnerId, roundWinnerUpdated, state.players),
        community: [],
        gameLeads
      }
    }
    default:
      throw new Error('Invalid case in playGameReducer')
  }
}

export const usePlayGame = ({
  numberOfPlayers,
  cardsString
}) => {
  const [state, dispatch] = useReducer(playGameReducer, {
    ...initialState,
    players: mapCardsToPlayers(cardsString)
  })

  const didMountRef = useRef(false)

  useEffect(() => {
    if (state.activePlayerId !== USERS_POSITION) {
      discardActivePlayersRandomCard()
    } else if (didMountRef.current) { // we came full circle, it's user's turn again. before he can play we need to award community cards to round winner
      handleRoundCompleted()
    } else { // the game is getting started, hook has mounted
      didMountRef.current = true
    }
  }, [state.activePlayerId])

  const discardActivePlayersRandomCard = () => {
    const activePlayer = find(player => player.id === state.activePlayerId, state.players)
    const cardIndex = getRandomInt(length(activePlayer.remainingCards))

    setTimeout(() => {
      discardACard(activePlayer.remainingCards[cardIndex])
    }, TIME_BETWEEN_PLAYS_MS)
  }

  const discardACard = cardObj => {
    dispatch({
      type: 'CARD_DISCARDED',
      payload: {
        cardObj,
        numberOfPlayers
      }
    })
  }

  const handleRoundCompleted = () => {
    setTimeout(() => {
      dispatch({ type: 'HANDLE_ROUND_COMPLETED', payload: numberOfPlayers })
    }, TIME_BETWEEN_PLAYS_MS)
  }

  return {
    ...state,
    numberOfPlayers,
    hasMoreThanTwoPlayers: numberOfPlayers > 2,
    playersSortedByPoints: sort((player1, player2) => player2.score - player1.score, state.players),
    getIsPlayerLeading: player => any(lead => lead.id === player.id)(state.gameLeads),
    discardACard
  }
}

const GameContext = createContext()

export const PlayGameContextProvider = GameContext.Provider

export const usePlayGameContext = () => useContext(GameContext)
