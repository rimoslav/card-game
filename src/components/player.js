import React from 'react'
import { length } from 'ramda'
import PropTypes from 'prop-types'

import { USERS_POSITION } from 'utils/variables'
import { mapSizesToProps } from 'utils/helpers'

import { Wrap } from 'components/common/wrap'
import { Blank } from 'components/common/blank'
import NameAndPoints from 'components/name-and-points'
import PlayersCards from 'components/players-cards'

import { usePlayGameContext } from 'hooks/use-play-game'
import { withWindowSize } from 'hooks/with-window-size'



export const Player = ({
  player,
  shouldShowWonCards,
  cardStickingOutPx,
  CARD_SIZE
}) => {
  const gameHookObj = usePlayGameContext()

  if (!player) {
    return <Wrap flex={1} />
  }

  return (
    <Wrap
      flex={1}
      direction="col"
      justify="center"
      align="center">
      <Blank height={20} />
      <NameAndPoints player={player} />
      <Blank height={20} />
      <Wrap>
        <PlayersCards
          onCardClick={player.id === USERS_POSITION && gameHookObj.canUserPlay
            ? gameHookObj.discardACard
            : undefined
          }
          areCardsFlipped={player.id !== USERS_POSITION}
          cards={player.remainingCards}
        />
        {shouldShowWonCards
          ? <Wrap>
            <Blank width={10 + (10 - length(player.remainingCards)) * cardStickingOutPx} />
            <PlayersCards
              hasBorder
              moveCardValue={-CARD_SIZE.width}
              width={CARD_SIZE.width}
              cards={player.wonCards}
          />
          </Wrap>
          : null
        }
      </Wrap>
    </Wrap>
  )
}

Player.propTypes = {
  player: PropTypes.PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired,
    remainingCards: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        rank: PropTypes.number.isRequired,
        suit: PropTypes.string.isRequired,
        img: PropTypes.string.isRequired
      }).isRequired,
    ).isRequired,
    wonCards: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        rank: PropTypes.number.isRequired,
        suit: PropTypes.string.isRequired,
        img: PropTypes.string.isRequired
      }).isRequired,
    ).isRequired
  }),
  shouldShowWonCards: PropTypes.bool,
  cardStickingOutPx: PropTypes.number,
  CARD_SIZE: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired
  })
}

export default withWindowSize(mapSizesToProps)(Player)
