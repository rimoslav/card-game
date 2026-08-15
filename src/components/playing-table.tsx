import type { ReactNode } from 'react'

import styles from '@cg/components/playing-table.module.css'

export const PlayingTable = ({
  hasManyPlayers = false,
  header,
  children
}: {
  hasManyPlayers?: boolean
  header?: ReactNode
  children?: ReactNode
}) => (
  <div className={styles.table} data-many-players={hasManyPlayers}>
    {header
      ? <div className={styles.header}>{header}</div>
      : null
    }
    {children}
  </div>
)
