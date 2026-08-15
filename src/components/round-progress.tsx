import { NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { usePlayGameContext } from '@cg/hooks/use-play-game'

import styles from '@cg/components/round-progress.module.css'

export const RoundProgress = () => {
  const game = usePlayGameContext()
  // roundNumber runs to 11 to signal the game is over; the indicator stops at 10.
  const round = Math.min(game.roundNumber, NUMBER_OF_CARDS_PER_PLAYER)

  return (
    <p className={styles.progress}>
      <span className={styles.label}>Round</span>
      <span className={styles.count}>{`${round} / ${NUMBER_OF_CARDS_PER_PLAYER}`}</span>
    </p>
  )
}
