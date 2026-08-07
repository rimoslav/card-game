import type { CSSProperties, ReactNode } from 'react'

import type { TextColor } from '@cg/components/common/text'

import styles from './button.module.css'

const COLOR_VARIABLE: Record<TextColor, string> = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  white: 'var(--color-white)',
  black: 'var(--color-black)',
  silver: 'var(--color-silver)',
  darkSlateGray: 'var(--color-dark-slate-gray)'
}

export const Button = ({
  isDisabled = false,
  textColor = 'secondary',
  color = 'primary',
  onClick,
  children
}: {
  isDisabled?: boolean
  textColor?: TextColor
  color?: TextColor
  onClick?: () => void
  children?: ReactNode
}) => (
  <button
    type="button"
    className={styles.button}
    disabled={isDisabled}
    style={{
      '--button-bg': COLOR_VARIABLE[color],
      '--button-fg': COLOR_VARIABLE[textColor]
    } as CSSProperties}
    onClick={onClick}>
    {children}
  </button>
)
