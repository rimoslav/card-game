import { useEffect, useReducer, useRef } from 'react'
import { useNavigate } from 'react-router'

import { NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { play } from '@cg/lib/sound'
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

  // A second click can land before the dispatch above has re-rendered the buttons as
  // disabled — state updates are not synchronous, so the UI alone cannot prevent a
  // double start. This ref closes that window.
  const isStartingRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    // Assign on setup, not just on cleanup. StrictMode runs setup, cleanup, then setup
    // again on mount; without this line the cleanup would leave the flag false forever
    // and every navigation would be silently skipped.
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const startNewGame = async (playerCount: number): Promise<void> => {
    if (isStartingRef.current) {
      return
    }

    isStartingRef.current = true
    dispatch({ type: 'REQUEST' })

    try {
      const deckId = await createDeck()
      const codes = await drawCards(deckId, playerCount * NUMBER_OF_CARDS_PER_PLAYER)

      saveGame({
        playerCount,
        hands: chunk(NUMBER_OF_CARDS_PER_PLAYER, codes)
      })

      play('deal')

      // Navigation is router-level, not component-level, so an in-flight request could
      // otherwise yank a user who has already left this screen over to /game.
      if (isMountedRef.current) {
        navigate('/game')
      }
    } catch (error) {
      // The player sees one generic line, but swallowing the cause entirely would leave
      // nothing to diagnose a failed deal with.
      console.error('Failed to start a new game', error)
      dispatch({ type: 'ERROR', payload: 'Could not deal a new game. Please try again.' })
    } finally {
      isStartingRef.current = false
    }
  }

  return { ...state, startNewGame }
}
