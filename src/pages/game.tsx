import { Navigate, useNavigate } from 'react-router'

import { Blank } from '@cg/components/common/blank'
import { CommunityCards } from '@cg/components/community-cards'
import { LiveRegion } from '@cg/components/live-region'
import { Modal } from '@cg/components/modal'
import { Player } from '@cg/components/player'
import { PlayingTable } from '@cg/components/playing-table'
import { RoundProgress } from '@cg/components/round-progress'
import { SoundToggle } from '@cg/components/sound-toggle'
import { PlayGameContextProvider, usePlayGame } from '@cg/hooks/use-play-game'
import { clearGame, loadGame } from '@cg/lib/storage'
import type { StoredGame } from '@cg/lib/storage'

import styles from '@cg/pages/game.module.css'

const Board = ({ game: stored }: { game: StoredGame }) => {
  const navigate = useNavigate()
  const game = usePlayGame({
    playerCount: stored.playerCount,
    hands: stored.hands
  })

  return (
    <PlayGameContextProvider value={game}>
      <PlayingTable
        hasManyPlayers={game.hasMoreThanTwoPlayers}
        header={
          <>
            <button
              type="button"
              className={styles.headerAction}
              onClick={() => {
                clearGame()
                void navigate('/')
              }}>
              New game
            </button>
            <RoundProgress />
            <SoundToggle />
          </>
        }>
        <div className={styles.board} data-many-players={game.hasMoreThanTwoPlayers}>
          <div className={styles.colA}>
            <Player player={game.players[0]} />
            <Blank height={40} />
            <Player player={game.players[1]} />
          </div>
          <div className={styles.colB}>
            <CommunityCards />
            <div className={styles.spacer}>
              <Blank height={20} />
            </div>
          </div>
          {game.hasMoreThanTwoPlayers
            ? <div className={styles.colC}>
              <Player player={game.players[2]} />
              <Blank height={40} />
              <Player player={game.players[3]} />
            </div>
            : null
          }
        </div>
      </PlayingTable>
      <Modal />
      <LiveRegion />
    </PlayGameContextProvider>
  )
}

export const Game = () => {
  const stored = loadGame()

  if (!stored) {
    return <Navigate to="/" replace />
  }

  return <Board game={stored} />
}
