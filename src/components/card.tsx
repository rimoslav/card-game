import { cx } from '@cg/lib/utils'
import type { Card as CardType } from '@cg/types'

import styles from './card.module.css'

export const Card = ({
  card,
  isFlipped = false,
  onCardClick
}: {
  card: CardType
  isFlipped?: boolean
  onCardClick?: (card: CardType) => void
}) => (
  <img
    className={cx(styles.card, onCardClick && styles.clickable)}
    src={isFlipped
      ? `${import.meta.env.BASE_URL}card-back.jpeg`
      : card.img
    }
    alt={`Card ${card.id}`}
    onClick={onCardClick
      ? () => onCardClick(card)
      : undefined
    }
  />
)
