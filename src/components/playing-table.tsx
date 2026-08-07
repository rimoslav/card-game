import type { ReactNode } from 'react'

import styles from '@cg/components/playing-table.module.css'

export const PlayingTable = ({
  hasManyPlayers = false,
  children
}: {
  hasManyPlayers?: boolean
  children?: ReactNode
}) => (
  <div className={styles.table} data-many-players={hasManyPlayers}>
    {children}
  </div>
)
