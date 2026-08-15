import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, beforeEach } from 'vitest'

import { NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { Modal } from '@cg/components/modal'
import { PlayGameContextProvider } from '@cg/hooks/use-play-game'
import type { PlayGameValue } from '@cg/hooks/use-play-game'
import { ALL_CODES } from '@cg/lib/cards'
import { saveGame, setStore } from '@cg/lib/storage'
import { Home } from '@cg/pages/home'
import { Game } from '@cg/pages/game'
import type { Player } from '@cg/types'

const mem = (): Storage => {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k) },
    setItem: (k: string, v: string) => { m.set(k, v) }
  }
}

const render = (el: Parameters<typeof renderToString>[0], path = '/') =>
  renderToString(h(MemoryRouter, { initialEntries: [path] }, el))

beforeEach(() => { setStore(mem()) })

describe('Home renders', () => {
  it('shows the title, the instruction and all three player-count buttons', () => {
    const html = render(h(Home))

    expect(html).toContain('Card Game')
    expect(html).toContain('Highest card takes the pot. Ten rounds — the best score wins.')
    expect(html).toContain('Select number of players')
    expect(html).toContain('2 Players')
    expect(html).toContain('3 Players')
    expect(html).toContain('4 Players')
  })

  it('renders the sound toggle, which the deal cue needs to be reachable from here', () => {
    expect(render(h(Home))).toContain('aria-label="Sound"')
  })
})

describe('Game renders a dealt game', () => {
  it('renders the table with card images for a 4 player game', () => {
    const hands = [0, 1, 2, 3].map(i => ALL_CODES.slice(i * 10, i * 10 + 10))
    saveGame({ playerCount: 4, hands })

    const html = render(h(Game), '/game')

    expect(html).toContain('Name: User')
    expect(html).toContain('Player 1')
    expect(html).toContain('Score: 0')
    // face-down opponents use the local card back; the user's own cards are face up
    expect(html).toContain('card-back.jpeg')
    expect(html).toContain('deckofcardsapi.com/static/img/')
  })

  it('shows which round the game is on', () => {
    const hands = [0, 1, 2, 3].map(i => ALL_CODES.slice(i * 10, i * 10 + 10))
    saveGame({ playerCount: 4, hands })

    expect(render(h(Game), '/game')).toContain('1 / 10')
  })

  it('uses the local image for the ace of diamonds', () => {
    const hands = [['AD', ...ALL_CODES.slice(1, 10)], ALL_CODES.slice(10, 20)]
    saveGame({ playerCount: 2, hands })

    expect(render(h(Game), '/game')).toContain('ace-of-diamonds.png')
  })

  it('redirects when no game is stored', () => {
    const html = render(h(Game), '/game')
    expect(html).not.toContain('Name: User')
  })

  it('renders the user\'s own cards as labelled buttons and the opponents\' as images', () => {
    const hands = [['7S', ...ALL_CODES.slice(1, 10)], ALL_CODES.slice(10, 20)]
    saveGame({ playerCount: 2, hands })

    const html = render(h(Game), '/game')

    // The user's hand is operable; every other card on the table is decorative.
    expect(html).toContain('aria-label="Seven of Spades"')
    expect(html).toContain('<button')
    // The old alt="Card 7S" is gone: opponent and community cards are aria-hidden now.
    expect(html).not.toContain('alt="Card ')
  })
})

describe('Modal names the winner', () => {
  const player = (id: number, score: number): Player => ({
    id,
    name: id === 0 ? 'User' : `Player ${id}`,
    score,
    remainingCards: [],
    wonCards: []
  })

  const finished = (leads: Player[], players: Player[]): PlayGameValue => ({
    canUserPlay: false,
    activePlayerId: 0,
    roundNumber: NUMBER_OF_CARDS_PER_PLAYER + 1,
    players,
    community: [],
    gameLeads: leads,
    lastRoundWinnerId: leads[0].id,
    numberOfPlayers: players.length,
    hasMoreThanTwoPlayers: players.length > 2,
    playersSortedByPoints: [...players].sort((first, second) => second.score - first.score),
    getIsPlayerLeading: candidate => leads.some(lead => lead.id === candidate.id),
    discardACard: () => undefined
  })

  // createElement's overload for a component with a required `children` prop checks the
  // props object literally — it does not merge a variadic third argument into that check
  // the way JSX does. Passing children inside the props object sidesteps that without
  // loosening PlayGameContextProvider's children prop to optional in production code.
  const renderModal = (value: PlayGameValue) =>
    render(h(PlayGameContextProvider, { value, children: h(Modal) }))

  it('names a single winner and lists the final scores', () => {
    const players = [player(0, 84), player(1, 61)]
    const html = renderModal(finished([players[0]], players))

    expect(html).toContain('User wins!')
    expect(html).toContain('Final scores')
    expect(html).toContain('84')
    expect(html).toContain('61')
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
  })

  it('names both winners on a tie', () => {
    const players = [player(0, 70), player(1, 70)]
    const html = renderModal(finished(players, players))

    expect(html).toContain('User &amp; Player 1')
  })
})
