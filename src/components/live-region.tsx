import { usePlayGameContext } from '@cg/hooks/use-play-game'
import { announcementFor } from '@cg/lib/announce'

import styles from '@cg/components/live-region.module.css'

export const LiveRegion = () => {
  const game = usePlayGameContext()

  return (
    <div className={styles.live} aria-live="polite" aria-atomic="true">
      {announcementFor(game)}
    </div>
  )
}
