import { PlayingTable } from '@cg/components/playing-table'
import { SoundToggle } from '@cg/components/sound-toggle'
import { MAX_PLAYERS, MIN_PLAYERS } from '@cg/constants'
import { useCreateNewGame } from '@cg/hooks/use-create-game'
import { range } from '@cg/lib/utils'

import styles from '@cg/pages/home.module.css'

export const Home = () => {
  const { isLoading, error, startNewGame } = useCreateNewGame()

  return (
    <PlayingTable header={<SoundToggle />}>
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
              type="button"
              className={styles.segment}
              disabled={isLoading}
              onClick={() => void startNewGame(count)}>
              {`${count} Players`}
            </button>
          ))}
        </div>
        {isLoading
          ? <p className={styles.loading}>
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
