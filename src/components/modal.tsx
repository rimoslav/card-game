import { useNavigate } from 'react-router'

import { Blank } from '@cg/components/common/blank'
import { Button } from '@cg/components/common/button'
import { Text } from '@cg/components/common/text'
import { NUMBER_OF_CARDS_PER_PLAYER } from '@cg/constants'
import { usePlayGameContext } from '@cg/hooks/use-play-game'

import styles from './modal.module.css'

export const Modal = () => {
  const navigate = useNavigate()
  const game = usePlayGameContext()

  const isOpen = game.roundNumber > NUMBER_OF_CARDS_PER_PLAYER
  const winners = game.gameLeads.map(lead => lead.name).join(' & ')

  return (
    <div className={styles.overlay} data-open={isOpen}>
      <div className={styles.content} data-open={isOpen}>
        <div className={styles.rows}>
          <Blank height={20} />
          <Text size={20} weight="bold">
            {game.gameLeads.length > 1
              ? `It's a tie — ${winners} win!`
              : `${winners} wins!`
            }
          </Text>
          <Blank height={20} />
          <Text size={16} color="silver">Final scores</Text>
          <Blank height={10} />
          {game.playersSortedByPoints.map(player => (
            <div key={player.id} className={styles.row}>
              <Blank height={10} />
              <Text
                size={18}
                weight="bold"
                color="silver">
                {`${player.name} - ${player.score} points`}
              </Text>
              <Blank height={10} />
            </div>
          ))}
          <Blank height={20} />
          <Button onClick={() => navigate('/')}>NEW GAME</Button>
        </div>
      </div>
    </div>
  )
}
