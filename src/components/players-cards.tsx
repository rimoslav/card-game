import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FocusEvent, KeyboardEvent } from 'react'

import { Card, PlayableCard } from '@cg/components/card'
import { useDeparted } from '@cg/hooks/use-departed'
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

  // Hands off to the community's arrival animation: the exit runs 150ms and the arrival
  // starts as the card leaves, so the eye reads one continuous motion.
  const leaving = useDeparted(cards, card => card.id, 200)

  // Whether the keyboard is currently inside this hand. Without it the effect below would
  // pull focus to the hand for a mouse player who never touched the keyboard at all.
  const hasFocusRef = useRef(false)

  // The hand shrinks all game. Clamping at render rather than storing a clamped value
  // keeps the roving index valid without an effect that fights the user's arrow keys.
  const rovingIndex = Math.min(focusedIndex, Math.max(cards.length - 1, 0))

  /*
   * Put focus back after the played card's button unmounts. `aria-disabled` keeps the hand
   * focusable through the delay, but the reducer removes the played card from
   * remainingCards in the same dispatch that plays it — so that button leaves the DOM and
   * the browser drops focus to <body>. Without this, a keyboard player would have to tab
   * back into the hand after every single play.
   *
   * Gated on state, never a mount latch: it acts only when the hand had focus AND focus is
   * now orphaned, so StrictMode's double invoke on mount is a no-op.
   */
  useEffect(() => {
    if (!hasFocusRef.current || typeof document === 'undefined') {
      return
    }

    if (document.activeElement === null || document.activeElement === document.body) {
      buttonsRef.current[rovingIndex]?.focus()
    }
  }, [cards.length, rovingIndex])

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

  const handleBlur = (event: FocusEvent<HTMLDivElement>): void => {
    // A null relatedTarget means focus was dropped rather than moved — which is precisely
    // the case the effect above recovers from, so the flag has to survive it.
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) {
      hasFocusRef.current = false
    }
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
        {leaving.map(card => (
          <Card
            key={`leaving-${card.id}`}
            isGhost
            card={card}
            isFlipped={areCardsFlipped}
            className={styles.leaving}
            style={{ '--leaving-index': cards.length } as CSSProperties}
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
      onKeyDown={handleKeyDown}
      onFocus={() => { hasFocusRef.current = true }}
      onBlur={handleBlur}>
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
      {leaving.map(card => (
        <Card
          key={`leaving-${card.id}`}
          isGhost
          card={card}
          className={styles.leaving}
          style={{ '--leaving-index': cards.length } as CSSProperties}
        />
      ))}
    </div>
  )
}
