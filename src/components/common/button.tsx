import type { CSSProperties, ReactNode } from 'react'

import { COLOR_VARIABLE, type TextColor } from '@cg/components/common/text'

import styles from '@cg/components/common/button.module.css'

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
