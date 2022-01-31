import { useReducer } from 'react'

import { NUMBER_OF_CARDS_PER_PLAYER } from 'utils/variables'

import {
  createADeckAPI,
  drawCardsAPI
} from 'services'



const initialState = {
  isLoading: false
}

const createNewGameReducer = (state, action) => {
  switch (action.type) {
    case 'CREATE_DECK_AND_DRAW_CARDS_REQUEST':
      return {
        ...state,
        isLoading: true
      }
    case 'CREATE_DECK_AND_DRAW_CARDS_ERROR':
      return {
        ...state,
        isLoading: false
      }
    default:
      throw new Error('Invalid case in createNewGameReducer')
  }
}

export const useCreateNewGame = ({ goToGameScreen }) => {
  const [state, dispatch] = useReducer(createNewGameReducer, initialState)

  const startNewGame = async numberOfPlayers => {
    dispatch({ type: 'CREATE_DECK_AND_DRAW_CARDS_REQUEST' })
    try {
      const gameObj = await createADeckAPI()

      const cardsObj = await drawCardsAPI({
        deckId: gameObj.data.deck_id,
        numberOfCards: numberOfPlayers * NUMBER_OF_CARDS_PER_PLAYER
      })

      goToGameScreen(numberOfPlayers, cardsObj.data.cards)

    } catch (e) {
      dispatch({ type: 'CREATE_DECK_AND_DRAW_CARDS_ERROR' })
    }
  }

  return {
    ...state,
    startNewGame
  }
}
