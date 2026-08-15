import { useEffect, useRef } from 'react'

import { PlayingTable } from '@cg/components/playing-table'
import { SoundToggle } from '@cg/components/sound-toggle'
import { MAX_PLAYERS, MIN_PLAYERS } from '@cg/constants'
import { useCreateNewGame } from '@cg/hooks/use-create-game'
import { range } from '@cg/lib/utils'

import styles from '@cg/pages/home.module.css'

export const Home = () => {
  const { isLoading, error, startNewGame } = useCreateNewGame()
  const firstSegmentRef = useRef<HTMLButtonElement | null>(null)

  /*
   * Native `disabled` drops focus to <body> when the row disables mid-deal. On success that
   * is harmless — the route changes a moment later. On failure the buttons come back and the
   * player is left with focus nowhere, having to tab from the top of the document to retry.
   * Put it back on the row. The error announces itself separately via role="alert".
   *
   * Gated on orphaned focus, so a mouse user who never left <body> is not disturbed and
   * StrictMode's double invoke on mount is a no-op.
   */
  useEffect(() => {
    if (!error || typeof document === 'undefined') {
      return
    }

    if (document.activeElement === null || document.activeElement === document.body) {
      firstSegmentRef.current?.focus()
    }
  }, [error])

  return (
    // .header is `justify-content: space-between`, built for the game route's three
    // children. The empty span is a spacer that takes the flex-start slot so the sole
    // real child, SoundToggle, lands in the flex-end slot — pinned top-right per spec §6.
    <PlayingTable header={<><span aria-hidden="true" /><SoundToggle /></>}>
      <div className={styles.panel}>
        <h1 className={styles.title}>Card Game</h1>
        <p className={styles.instruction}>
          Highest card takes the pot. Ten rounds — the best score wins.
        </p>
        <p className={styles.prompt} id="player-count-label">Select number of players</p>
        <div className={styles.segmented} role="group" aria-labelledby="player-count-label">
          {range(MIN_PLAYERS, MAX_PLAYERS + 1).map(count => (
            <button
              key={count}
              ref={count === MIN_PLAYERS ? firstSegmentRef : undefined}
              type="button"
              className={styles.segment}
              disabled={isLoading}
              onClick={() => void startNewGame(count)}>
              {`${count} Players`}
            </button>
          ))}
        </div>
        {/* role="status" so the deal is announced, not just drawn. The spinner is decorative
            and hidden; the text is the whole of the message. */}
        {isLoading
          ? <p className={styles.loading} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            Dealing…
          </p>
          : null
        }
        {error
          ? <p className={styles.error} role="alert">{error}</p>
          : null
        }
      </div>
    </PlayingTable>
  )
}
