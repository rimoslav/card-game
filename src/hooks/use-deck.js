import {
  useEffect, 
  useReducer
} from 'react'

import { createADeck } from 'services'



const initialState = {
  isCreatingDeck: false,
  deckId: ''
}

const deckReducer = (state, action) => {
  switch (action.type) {
    case 'CREATE_NEW_DECK_REQUEST':
      return {
        ...state,
        isCreatingDeck: true
      }
    case 'CREATE_NEW_DECK_SUCCESS':
      return {
        ...state,
        isCreatingDeck: false,
        deckId: action.payload['deck_id']
      }
    case 'CREATE_NEW_DECK_ERROR':
      return {
        ...state,
        isCreatingDeck: false
      }

    default:
      throw new Error('Invalid case in deckReducer')
  }
}

export const useDeck = () => {
  const [state, dispatch] = useReducer(deckReducer, initialState)

  useEffect(() => {
    startNewGame()
  }, [])


  const startNewGame = async () => {
    dispatch({ type: 'CREATE_NEW_DECK_REQUEST' })
    try {
      const gameObj = await createADeck()

      dispatch({ type: 'CREATE_NEW_DECK_SUCCESS', payload: gameObj.data })
    } catch (e) {
      dispatch({ type: 'CREATE_NEW_DECK_ERROR' })
    }
  }

  return state
}
