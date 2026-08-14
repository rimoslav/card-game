import type { CSSProperties, ReactNode } from 'react'

import styles from '@cg/components/common/text.module.css'

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'white'
  | 'black'
  | 'silver'
  | 'darkSlateGray'

/*
 * Transitional. The old --color-* palette is gone; these names survive only until the
 * last component stops importing Text and Button. Task 12 of the UI overhaul plan
 * deletes both files. Do not add a new call site.
 */
export const COLOR_VARIABLE: Record<TextColor, string> = {
  primary: 'var(--accent)',
  secondary: 'var(--text-hi)',
  white: 'var(--text-hi)',
  black: 'var(--surface-0)',
  silver: 'var(--text-lo)',
  darkSlateGray: 'var(--surface-1)'
}

export const Text = ({
  size = 16,
  height = 1.6,
  color = 'primary',
  weight = 'normal',
  align,
  style,
  children
}: {
  size?: number | string
  height?: number
  color?: TextColor
  weight?: number | string
  align?: CSSProperties['textAlign']
  style?: CSSProperties
  children?: ReactNode
}) => (
  <div
    className={styles.text}
    style={{
      '--text-size': typeof size === 'number' ? `${size}px` : size,
      '--text-height': height,
      '--text-color': COLOR_VARIABLE[color],
      '--text-weight': weight,
      textAlign: align,
      ...style
    } as CSSProperties}>
    {children}
  </div>
)
