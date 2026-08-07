import { Card } from '@cg/components/card'
import { cx } from '@cg/lib/utils'
import type { Card as CardType } from '@cg/types'

import styles from '@cg/components/players-cards.module.css'

export const PlayersCards = ({
  cards,
  areCardsFlipped = false,
  hasBorder = false,
  isStacked = false,
  onCardClick
}: {
  cards: CardType[]
  areCardsFlipped?: boolean
  hasBorder?: boolean
  isStacked?: boolean
  onCardClick?: (card: CardType) => void
}) => (
  <div className={cx(styles.hand, isStacked && styles.stacked, hasBorder && styles.bordered)}>
    {cards.map(card => (
      <Card
        key={card.id}
        isFlipped={areCardsFlipped}
        card={card}
        onCardClick={onCardClick}
      />
    ))}
  </div>
)
