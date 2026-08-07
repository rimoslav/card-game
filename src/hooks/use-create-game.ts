import { useReducer } from 'react'
import { useNavigate } from 'react-router'

import { NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { saveGame } from '@cg/lib/storage'
import { chunk } from '@cg/lib/utils'
import { createDeck, drawCards } from '@cg/services/deck-api'

interface CreateGameState {
  isLoading: boolean
  error: string | null
}

type CreateGameAction =
  | { type: 'REQUEST' }
  | { type: 'ERROR'; payload: string }

const initialState: CreateGameState = {
  isLoading: false,
  error: null
}

const createNewGameReducer = (
  state: CreateGameState,
  action: CreateGameAction
): CreateGameState => {
  switch (action.type) {
    case 'REQUEST':
      return { ...state, isLoading: true, error: null }
    case 'ERROR':
      return { ...state, isLoading: false, error: action.payload }
    default: {
      const unhandled: never = action

      throw new Error(`Invalid action in createNewGameReducer: ${JSON.stringify(unhandled)}`)
    }
  }
}

export const useCreateNewGame = () => {
  const [state, dispatch] = useReducer(createNewGameReducer, initialState)
  const navigate = useNavigate()

  const startNewGame = async (playerCount: number): Promise<void> => {
    dispatch({ type: 'REQUEST' })

    try {
      const deckId = await createDeck()
      const codes = await drawCards(deckId, playerCount * NUMBER_OF_CARDS_PER_PLAYER)

      saveGame({
        playerCount,
        hands: chunk(NUMBER_OF_CARDS_PER_PLAYER, codes)
      })

      navigate('/game')
    } catch {
      dispatch({ type: 'ERROR', payload: 'Could not deal a new game. Please try again.' })
    }
  }

  return { ...state, startNewGame }
}
