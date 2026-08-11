import { describe, expect, it } from 'vitest'
import { chunk, cx, range, replaceAt } from '@cg/lib/utils'

describe('range', () => {
  it('produces a half-open range', () => {
    expect(range(2, 5)).toEqual([2, 3, 4])
  })

  it('returns empty when start is not less than end', () => {
    expect(range(3, 3)).toEqual([])
    expect(range(4, 1)).toEqual([])
  })
})

describe('replaceAt', () => {
  it('replaces the element at the index', () => {
    const original = ['a', 'b', 'c']
    const result = replaceAt(1, 'x', original)
    expect(result).toEqual(['a', 'x', 'c'])
    expect(result).not.toBe(original)
  })

  it('does not mutate the input', () => {
    const original = ['a', 'b', 'c']
    replaceAt(1, 'x', original)
    expect(original).toEqual(['a', 'b', 'c'])
  })

  it('returns an unchanged copy when the index is out of range', () => {
    const original = ['a', 'b']
    const result = replaceAt(5, 'x', original)
    expect(result).toEqual(['a', 'b'])
    expect(result).not.toBe(original)
  })
})

describe('chunk', () => {
  it('splits into equal groups', () => {
    expect(chunk(2, [1, 2, 3, 4])).toEqual([[1, 2], [3, 4]])
  })

  it('leaves a short final group', () => {
    expect(chunk(2, [1, 2, 3])).toEqual([[1, 2], [3]])
  })

  it('returns empty for an empty input', () => {
    expect(chunk(3, [])).toEqual([])
  })

  it('throws on zero size', () => {
    expect(() => chunk(0, [1, 2, 3])).toThrow(RangeError)
  })

  it('throws on negative size', () => {
    expect(() => chunk(-1, [1, 2, 3])).toThrow(RangeError)
  })

  it('returns single chunk when size is larger than array', () => {
    expect(chunk(10, [1, 2, 3])).toEqual([[1, 2, 3]])
  })
})

describe('cx', () => {
  it('joins truthy class names and drops the rest', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b')
  })
})
