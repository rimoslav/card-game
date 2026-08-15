import { useCountUp } from '@cg/hooks/use-count-up'
import { cx } from '@cg/lib/utils'
import type { Player } from '@cg/types'

import styles from '@cg/components/name-and-points.module.css'

// Matches --dur-pot. The count runs from the settle dispatch, so it completes while the pot
// is still travelling rather than on arrival — a known overlap with the pot ceremony's
// sequence in spec section 4, kept because threading a delay through useCountUp would add a
// timer to a hook whose whole value is that it has none. On the manual-pass list.
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
