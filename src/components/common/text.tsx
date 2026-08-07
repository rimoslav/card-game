import type { CSSProperties, ReactNode } from 'react'

import styles from './text.module.css'

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'white'
  | 'black'
  | 'silver'
  | 'darkSlateGray'

const COLOR_VARIABLE: Record<TextColor, string> = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  white: 'var(--color-white)',
  black: 'var(--color-black)',
  silver: 'var(--color-silver)',
  darkSlateGray: 'var(--color-dark-slate-gray)'
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
