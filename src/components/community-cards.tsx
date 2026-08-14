import type { CSSProperties } from 'react'

import { Card } from '@cg/components/card'
import { useDeparted } from '@cg/hooks/use-departed'
import { usePlayGameContext } from '@cg/hooks/use-play-game'
import { SEAT_OFFSETS, winningIndexOf } from '@cg/lib/seats'
import { cx, range } from '@cg/lib/utils'
import type { Card as CardType } from '@cg/types'

import styles from '@cg/components/community-cards.module.css'

// Long enough for the winning card's glow (160ms) and the pot's travel (--dur-pot, 420ms)
// to finish, and short enough to be gone before the next round's first card arrives at
// TIME_BETWEEN_PLAYS_MS (650ms).
const POT_HOLD_MS = 620

const keyOf = (card: CardType): string => card.id

export const CommunityCards = () => {
  const game = usePlayGameContext()
  const settled = useDeparted(game.community, keyOf, POT_HOLD_MS)
  const emptySlots = range(0, game.numberOfPlayers - game.community.length)

  // useDeparted preserves order, and within a round players discard in activePlayerId
  // order starting at 0 — so index i is seat i in both lists.
  const winningIndex = winningIndexOf(settled)
  const winnerSeat = game.lastRoundWinnerId ?? 0
  const potTarget = SEAT_OFFSETS[winnerSeat] ?? SEAT_OFFSETS[0]

  return (
    <div className={styles.community}>
      {game.community.map((card, index) => (
        <div key={card.id} className={styles.slot}>
          <Card
            card={card}
            className={styles.arriving}
            style={{
              '--from-x': (SEAT_OFFSETS[index] ?? SEAT_OFFSETS[0]).x,
              '--from-y': (SEAT_OFFSETS[index] ?? SEAT_OFFSETS[0]).y
            } as CSSProperties}
          />
        </div>
      ))}
      {emptySlots.map(slot => (
        <div key={slot} className={styles.slot} />
      ))}
      {settled.map((card, index) => (
        <Card
          key={`ghost-${card.id}`}
          isGhost
          card={card}
          className={cx(styles.potGhost, index === winningIndex && styles.winningGhost)}
          style={{
            '--slot-index': index,
            '--to-x': potTarget.x,
            '--to-y': potTarget.y
          } as CSSProperties}
        />
      ))}
    </div>
  )
}
