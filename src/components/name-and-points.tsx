import { Text } from '@cg/components/common/text'
import { cx } from '@cg/lib/utils'
import type { Player } from '@cg/types'

import styles from './name-and-points.module.css'

export const NameAndPoints = ({
  player,
  isPlayerLeading
}: {
  player: Player
  isPlayerLeading: boolean
}) => (
  <div className={cx(styles.nameTag, isPlayerLeading && styles.leading)}>
    <Text weight="bold">{`Name: ${player.name}`}</Text>
    <Text weight="bold">{`Score: ${player.score}`}</Text>
  </div>
)
