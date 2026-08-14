import { describe, expect, it } from 'vitest'

import { departedFrom } from '@cg/hooks/use-departed'

interface Item {
  id: string
}

const item = (id: string): Item => ({ id })
const idOf = (value: Item): string => value.id

describe('departedFrom', () => {
  it('returns the item that was present last render and is absent now', () => {
    const previous = [item('a'), item('b'), item('c')]
    const current = [item('a'), item('c')]

    expect(departedFrom(previous, current, idOf).map(idOf)).toEqual(['b'])
  })

  it('returns nothing when the list only grows', () => {
    const previous = [item('a')]
    const current = [item('a'), item('b')]

    expect(departedFrom(previous, current, idOf)).toEqual([])
  })

  it('returns nothing when the list is unchanged', () => {
    const previous = [item('a'), item('b')]

    expect(departedFrom(previous, [item('a'), item('b')], idOf)).toEqual([])
  })

  // The pot case: HANDLE_ROUND_COMPLETED empties the whole community in one dispatch.
  it('returns the whole list when it empties at once', () => {
    const previous = [item('a'), item('b'), item('c'), item('d')]

    expect(departedFrom(previous, [], idOf).map(idOf)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('preserves the original order, which is seat order for the community', () => {
    const previous = [item('a'), item('b'), item('c'), item('d')]

    expect(departedFrom(previous, [item('b')], idOf).map(idOf)).toEqual(['a', 'c', 'd'])
  })

  it('returns nothing when the previous list was empty', () => {
    expect(departedFrom([], [item('a')], idOf)).toEqual([])
  })

  it('compares by key, not by identity', () => {
    const previous = [item('a'), item('b')]
    // Fresh objects with the same ids — every render of the game rebuilds its card objects.
    const current = [item('a'), item('b')]

    expect(departedFrom(previous, current, idOf)).toEqual([])
  })
})
