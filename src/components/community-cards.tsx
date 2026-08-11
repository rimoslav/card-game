import { Card } from '@cg/components/card'
import { usePlayGameContext } from '@cg/hooks/use-play-game'
import { range } from '@cg/lib/utils'

import styles from '@cg/components/community-cards.module.css'

export const CommunityCards = () => {
  const game = usePlayGameContext()
  const emptySlots = range(0, game.numberOfPlayers - game.community.length)

  return (
    <div className={styles.community}>
      {game.community.map(card => (
        <div key={card.id} className={styles.slot}>
          <Card card={card} />
        </div>
      ))}
      {emptySlots.map(slot => (
        <div key={slot} className={styles.slot} />
      ))}
    </div>
  )
}
