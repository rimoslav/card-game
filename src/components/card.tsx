import type { CSSProperties, Ref } from 'react'

import { cardName } from '@cg/lib/cards'
import { cx } from '@cg/lib/utils'
import type { Card as CardType } from '@cg/types'

import styles from '@cg/components/card.module.css'

const sourceFor = (card: CardType, isFlipped: boolean): string => isFlipped
  ? `${import.meta.env.BASE_URL}card-back.jpeg`
  : card.img

/*
 * Decorative by design. Opponent hands are face-down and identical and the community pile
 * is summarised by the live region, so announcing each image would be noise. alt="" plus
 * aria-hidden keeps them out of the accessibility tree entirely.
 */
export const Card = ({
  card,
  isFlipped = false,
  isGhost = false,
  className,
  style
}: {
  card: CardType
  isFlipped?: boolean
  isGhost?: boolean
  className?: string
  style?: CSSProperties
}) => (
  <img
    className={cx(styles.card, isGhost && styles.ghost, className)}
    src={sourceFor(card, isFlipped)}
    alt=""
    aria-hidden="true"
    style={style}
  />
)

/*
 * The user's own hand. aria-disabled rather than the native disabled attribute: a disabled
 * button is removed from the tab order, so the browser would yank focus out of the hand
 * every time a card was played and the delay began. aria-disabled keeps the button
 * focusable and stably placed while still announcing that it cannot be activated; the
 * click is guarded here and pointer-events are dropped in CSS.
 */
export const PlayableCard = ({
  card,
  isPlayable,
  tabIndex,
  buttonRef,
  onCardClick
}: {
  card: CardType
  isPlayable: boolean
  tabIndex: number
  buttonRef?: Ref<HTMLButtonElement>
  onCardClick: (card: CardType) => void
}) => (
  <button
    ref={buttonRef}
    type="button"
    className={cx(styles.cardButton, !isPlayable && styles.notPlayable)}
    aria-label={cardName(card)}
    aria-disabled={!isPlayable}
    tabIndex={tabIndex}
    onClick={isPlayable
      ? () => onCardClick(card)
      : undefined
    }>
    <img className={styles.card} src={card.img} alt="" aria-hidden="true" />
  </button>
)
