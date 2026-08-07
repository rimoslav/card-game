import { Blank } from '@cg/components/common/blank'
import { NameAndPoints } from '@cg/components/name-and-points'
import { PlayersCards } from '@cg/components/players-cards'
import { USERS_POSITION } from '@cg/constants'
import { usePlayGameContext } from '@cg/hooks/use-play-game'
import type { Player as PlayerType } from '@cg/types'

import styles from './player.module.css'

export const Player = ({ player }: { player?: PlayerType }) => {
  const game = usePlayGameContext()

  if (!player) {
    return <div className={styles.player} />
  }

  const canDiscard = player.id === USERS_POSITION && game.canUserPlay

  return (
    <div className={styles.player}>
      <Blank height={20} />
      <NameAndPoints
        player={player}
        isPlayerLeading={game.getIsPlayerLeading(player)}
      />
      <Blank height={20} />
      <div className={styles.hands}>
        <PlayersCards
          cards={player.remainingCards}
          areCardsFlipped={player.id !== USERS_POSITION}
          onCardClick={canDiscard ? game.discardACard : undefined}
        />
        <div className={styles.wonCards}>
          <PlayersCards
            isStacked
            hasBorder
            cards={player.wonCards}
          />
        </div>
      </div>
    </div>
  )
}
