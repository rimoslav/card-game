import { useCountUp } from '@cg/hooks/use-count-up'
import { cx } from '@cg/lib/utils'
import type { Player } from '@cg/types'

import styles from '@cg/components/name-and-points.module.css'

// Matches --dur-pot, so the score finishes counting as the pot finishes arriving. Read as
// a number here rather than from the token because useCountUp drives rAF, not CSS;
// prefersReducedMotion inside the hook is what honours the reduce preference.
const COUNT_MS = 420

export const NameAndPoints = ({
  player,
  isPlayerLeading,
  isActive,
  isYourTurn
}: {
  player: Player
  isPlayerLeading: boolean
  isActive: boolean
  isYourTurn: boolean
}) => {
  const score = useCountUp(player.score, COUNT_MS)

  return (
    <div
      className={cx(
        styles.nameTag,
        isPlayerLeading && styles.leading,
        isActive && styles.active
      )}>
      <span className={styles.name}>{`Name: ${player.name}`}</span>
      {isYourTurn
        ? <span className={styles.turnCue}>Your turn</span>
        : null
      }
      <span className={styles.score}>{`Score: ${score}`}</span>
    </div>
  )
}
