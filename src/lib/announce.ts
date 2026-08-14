import { NUMBER_OF_CARDS_PER_PLAYER, USERS_POSITION } from '@cg/constants'
import { cardName } from '@cg/lib/cards'
import { winningIndexOf } from '@cg/lib/seats'
import type { Card, Player } from '@cg/types'

export interface AnnounceState {
  roundNumber: number
  community: Card[]
  players: Player[]
  gameLeads: Player[]
  lastRoundWinnerId: number | null
  numberOfPlayers: number
}

/*
 * A pure function of state, deliberately. The live region renders whatever this returns;
 * assistive technology announces it when it changes, so there is no "has this already been
 * said" bookkeeping to get wrong — and the whole thing is testable without a DOM.
 *
 * Every play is announced, not only the user's. Announcing outcomes alone would leave a
 * screen-reader user unable to follow the table at all, and a polite live region coalesces
 * updates rather than queueing every one.
 */
export const announcementFor = ({
  roundNumber,
  community,
  players,
  gameLeads,
  lastRoundWinnerId,
  numberOfPlayers
}: AnnounceState): string => {
  if (roundNumber > NUMBER_OF_CARDS_PER_PLAYER) {
    if (gameLeads.length === 0) {
      return ''
    }

    const names = gameLeads.map(lead => lead.name).join(' and ')
    const { score } = gameLeads[0]

    if (gameLeads.length > 1) {
      return `Game over. ${names} tie with ${score} points.`
    }

    return gameLeads[0].id === USERS_POSITION
      ? `Game over. You win with ${score} points.`
      : `Game over. ${names} wins with ${score} points.`
  }

  // Within a round players discard in activePlayerId order starting at 0, so the card just
  // added is at index community.length - 1 and was played by that seat.
  if (community.length > 0) {
    const seat = community.length - 1
    const name = cardName(community[seat])

    return seat === USERS_POSITION
      ? `You played ${name}`
      : `${players[seat].name} played ${name}`
  }

  if (lastRoundWinnerId === null) {
    return ''
  }

  const winner = players[lastRoundWinnerId]
  // The pot was appended to wonCards whole, so the newest numberOfPlayers cards are it.
  const pot = winner.wonCards.slice(-numberOfPlayers)

  if (pot.length === 0) {
    return ''
  }

  const total = pot.reduce((sum, card) => sum + card.rank, 0)
  const best = cardName(pot[winningIndexOf(pot)])

  return winner.id === USERS_POSITION
    ? `You win the round with ${best}, ${total} points`
    : `${winner.name} wins the round with ${best}, ${total} points`
}
