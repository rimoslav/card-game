export type Suit = 'S' | 'D' | 'C' | 'H'

export interface Card {
  id: string
  rank: number
  suit: Suit
  img: string
}

export interface Player {
  id: number
  name: string
  score: number
  remainingCards: Card[]
  wonCards: Card[]
}

export interface GameState {
  canUserPlay: boolean
  activePlayerId: number
  roundNumber: number
  players: Player[]
  community: Card[]
  gameLeads: Player[]
}

export type GameAction =
  | { type: 'CARD_DISCARDED'; payload: { cardObj: Card; numberOfPlayers: number } }
  | { type: 'HANDLE_ROUND_COMPLETED'; payload: number }
