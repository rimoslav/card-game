import type { Card } from '@cg/types'

/*
 * Where each seat sits relative to the community pile, as a translation a card animates
 * from on arrival and travels to when the pot is awarded. Seats 0 and 1 share the left
 * column and 2 and 3 the right, which is how game.module.css lays the board out above
 * 1200px. Below that the board stacks vertically and these offsets become approximate —
 * deliberately so. The cue is direction, not a survey, and the alternative is measuring
 * layout, which is exactly the FLIP machinery spec section 4 rejected.
 */
export const SEAT_OFFSETS: Record<number, { x: string; y: string }> = {
  0: { x: '-70px', y: '80px' },
  1: { x: '-70px', y: '-80px' },
  2: { x: '70px', y: '80px' },
  3: { x: '70px', y: '-80px' }
}

/*
 * The index of the card that takes the pot. Mirrors playGameReducer's >= comparison, so a
 * rank tie resolves to the later player — the glow must land on the card the pot was
 * actually awarded for.
 */
export const winningIndexOf = (cards: readonly Card[]): number => {
  let winner = -1

  cards.forEach((card, index) => {
    if (winner === -1 || card.rank >= cards[winner].rank) {
      winner = index
    }
  })

  return winner
}
