import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, beforeEach } from 'vitest'

import { ALL_CODES } from '@cg/lib/cards'
import { saveGame, setStore } from '@cg/lib/storage'
import { Home } from '@cg/pages/home'
import { Game } from '@cg/pages/game'

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
  it('shows the prompt and all three player-count buttons', () => {
    const html = render(h(Home))
    expect(html).toContain('Select Number Of Players')
    expect(html).toContain('2 Players')
    expect(html).toContain('3 Players')
    expect(html).toContain('4 Players')
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

  it('uses the local image for the ace of diamonds', () => {
    const hands = [['AD', ...ALL_CODES.slice(1, 10)], ALL_CODES.slice(10, 20)]
    saveGame({ playerCount: 2, hands })

    expect(render(h(Game), '/game')).toContain('ace-of-diamonds.png')
  })

  it('redirects when no game is stored', () => {
    const html = render(h(Game), '/game')
    expect(html).not.toContain('Name: User')
  })
})
