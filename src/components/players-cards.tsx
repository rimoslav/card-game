import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { Card, PlayableCard } from '@cg/components/card'
import { cx } from '@cg/lib/utils'
import type { Card as CardType } from '@cg/types'

import styles from '@cg/components/players-cards.module.css'

export const PlayersCards = ({
  cards,
  areCardsFlipped = false,
  hasBorder = false,
  isStacked = false,
  isPlayable = false,
  onCardClick
}: {
  cards: CardType[]
  areCardsFlipped?: boolean
  hasBorder?: boolean
  isStacked?: boolean
  isPlayable?: boolean
  onCardClick?: (card: CardType) => void
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])

  // The hand shrinks all game. Clamping at render rather than storing a clamped value
  // keeps the roving index valid without an effect that fights the user's arrow keys.
  const rovingIndex = Math.min(focusedIndex, Math.max(cards.length - 1, 0))

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return
    }

    event.preventDefault()

    const delta = event.key === 'ArrowRight' ? 1 : -1
    const next = Math.min(Math.max(rovingIndex + delta, 0), cards.length - 1)

    setFocusedIndex(next)
    buttonsRef.current[next]?.focus()
  }

  if (!onCardClick) {
    return (
      <div className={cx(styles.hand, isStacked && styles.stacked, hasBorder && styles.bordered)}>
        {cards.map(card => (
          <Card
            key={card.id}
            card={card}
            isFlipped={areCardsFlipped}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={styles.hand}
      role="group"
      aria-label="Your hand"
      onKeyDown={handleKeyDown}>
      {cards.map((card, index) => (
        <PlayableCard
          key={card.id}
          card={card}
          isPlayable={isPlayable}
          tabIndex={index === rovingIndex ? 0 : -1}
          buttonRef={element => { buttonsRef.current[index] = element }}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  )
}
