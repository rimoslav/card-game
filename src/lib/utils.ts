export const range = (start: number, end: number): number[] => {
  const result: number[] = []

  for (let index = start; index < end; index++) {
    result.push(index)
  }

  return result
}

export const replaceAt = <T>(index: number, value: T, xs: readonly T[]): T[] => {
  const result = [...xs]

  if (index >= 0 && index < result.length) {
    result[index] = value
  }

  return result
}

export const chunk = <T>(size: number, xs: readonly T[]): T[][] => {
  if (size <= 0) {
    throw new RangeError(`chunk size must be greater than 0, got ${size}`)
  }

  const result: T[][] = []

  for (let index = 0; index < xs.length; index += size) {
    result.push(xs.slice(index, index + size))
  }

  return result
}

export const cx = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(' ')
