import { useState } from 'react'

import { isEnabled, setEnabled } from '@cg/lib/sound'

/*
 * Local state, deliberately — the toggle is rendered once per route and play() reads the
 * preference straight from storage, so there is nothing for a provider to synchronise.
 */
export const useSound = (): { isSoundOn: boolean; toggleSound: () => void } => {
  const [isSoundOn, setIsSoundOn] = useState(isEnabled)

  return {
    isSoundOn,
    toggleSound: () => {
      const next = !isSoundOn

      setEnabled(next)
      setIsSoundOn(next)
    }
  }
}
