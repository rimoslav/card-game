import type { CSSProperties, ReactNode } from 'react'

import { cx } from '@cg/lib/utils'

import styles from '@cg/components/common/wrap.module.css'

export type Direction = 'row' | 'row-rev' | 'col' | 'col-rev'
export type AlignItems = 'start' | 'end' | 'center' | 'stretch'
export type JustifyContent = 'start' | 'end' | 'center' | 'between' | 'around'

const DIRECTION: Record<Direction, string> = {
  'row': styles.dirRow,
  'row-rev': styles.dirRowRev,
  'col': styles.dirCol,
  'col-rev': styles.dirColRev
}

const ALIGN_ITEMS: Record<AlignItems, string> = {
  start: styles.alignStart,
  end: styles.alignEnd,
  center: styles.alignCenter,
  stretch: styles.alignStretch
}

const ALIGN_SELF: Record<AlignItems, string> = {
  start: styles.selfStart,
  end: styles.selfEnd,
  center: styles.selfCenter,
  stretch: styles.selfStretch
}

const JUSTIFY: Record<JustifyContent, string> = {
  start: styles.justifyStart,
  end: styles.justifyEnd,
  center: styles.justifyCenter,
  between: styles.justifyBetween,
  around: styles.justifyAround
}

export const Wrap = ({
  direction = 'row',
  align,
  alignSelf,
  justify,
  flex,
  order,
  wrap = false,
  style,
  className,
  onClick,
  children
}: {
  direction?: Direction
  align?: AlignItems
  alignSelf?: AlignItems
  justify?: JustifyContent
  flex?: number
  order?: number
  wrap?: boolean
  style?: CSSProperties
  className?: string
  onClick?: () => void
  children?: ReactNode
}) => (
  <div
    className={cx(
      styles.wrap,
      DIRECTION[direction],
      align && ALIGN_ITEMS[align],
      alignSelf && ALIGN_SELF[alignSelf],
      justify && JUSTIFY[justify],
      wrap && styles.wrapping,
      onClick && styles.clickable,
      className
    )}
    style={{ flex, order, ...style }}
    onClick={onClick}>
    {children}
  </div>
)
