import { Blank } from '@cg/components/common/blank'
import { NameAndPoints } from '@cg/components/name-and-points'
import { PlayersCards } from '@cg/components/players-cards'
import { USERS_POSITION } from '@cg/constants'
import { usePlayGameContext } from '@cg/hooks/use-play-game'
import { cx } from '@cg/lib/utils'
import type { Player as PlayerType } from '@cg/types'

import styles from '@cg/components/player.module.css'

export const Player = ({ player }: { player?: PlayerType }) => {
  const game = usePlayGameContext()

  if (!player) {
    return <div className={styles.player} />
  }

  const canDiscard = player.id === USERS_POSITION && game.canUserPlay
  const isActive = player.id === game.activePlayerId
  // The pot has settled onto this player when the community is empty again.
  const hasJustWon = game.lastRoundWinnerId === player.id && game.community.length === 0

  return (
    <div className={styles.player}>
      <Blank height={20} />
      <NameAndPoints
        player={player}
        isPlayerLeading={game.getIsPlayerLeading(player)}
        isActive={isActive}
        isYourTurn={canDiscard}
      />
      <Blank height={20} />
      <div className={styles.hands}>
        <PlayersCards
          cards={player.remainingCards}
          areCardsFlipped={player.id !== USERS_POSITION}
          isPlayable={canDiscard}
          onCardClick={player.id === USERS_POSITION ? game.discardACard : undefined}
        />
        {/*
          * Keyed on the round so the pile remounts each round. A CSS animation only runs
          * when its element mounts or the class is added; without the key, a player who
          * won two rounds running would keep the class and pulse only the first time.
          */}
        <div
          key={game.roundNumber}
          className={cx(styles.wonCards, hasJustWon && styles.justWon)}>
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
