import React from 'react'
import { useParams } from 'react-router-dom'
import { includes } from 'ramda'
import PropTypes from 'prop-types'

import { mapSizesToProps } from 'src/utils/helpers'

import { Text } from 'src/components/common/text'
import { Wrap } from 'src/components/common/wrap'
import { Blank } from 'src/components/common/blank'
import Player from 'src/components/player'
import CommunityCards from 'src/components/community-cards'
import PlayingTable from 'src/components/playing-table'
import Modal from 'src/components/modal'

import { withWindowSize } from 'src/hooks/with-window-size'
import {
  usePlayGame,
  PlayGameContextProvider
} from 'src/hooks/use-play-game'



const Game = ({ isLargeScreen }) => {
  const {
    numberOfPlayers,
    cards
  } = useParams()

  const gameHookObj = usePlayGame({
    numberOfPlayers: includes(Number(numberOfPlayers), [2, 3])
      ? Number(numberOfPlayers)
      : 4,
    cardsString: cards
  })

  return (
    <PlayGameContextProvider value={gameHookObj}>
      <PlayingTable align={isLargeScreen && gameHookObj.hasMoreThanTwoPlayers
        ? 'stretch'
        : 'center'
      }>
        {gameHookObj.isDealingCards
          ? <Text size={24}>Loading</Text>
          : <Wrap
            flex={1}
            align={isLargeScreen && gameHookObj.hasMoreThanTwoPlayers
              ? 'stretch'
              : 'center'
            }
            direction={isLargeScreen && gameHookObj.hasMoreThanTwoPlayers
              ? 'row'
              : isLargeScreen
                ? 'col-rev'
                : 'col'
            }
            style={{ maxWidth: 1400 }}>
            <Wrap
              direction={isLargeScreen && gameHookObj.hasMoreThanTwoPlayers
                ? 'col-rev'
                : 'col'
              }
              flex={1}
              order={!isLargeScreen ? 2 : 1}
              justify="center">
              <Player player={gameHookObj.players[0]} />
              <Blank height={40} />
              <Player player={gameHookObj.players[1]} />
            </Wrap>
            <Wrap
              flex={1}
              align="center"
              justify="center"
              order={!isLargeScreen ? 1 : 2}>
              <CommunityCards />
              {!isLargeScreen
                ? <Blank height={20} />
                : null
              }
            </Wrap>
            {gameHookObj.hasMoreThanTwoPlayers
              ? <Wrap
                direction="col"
                justify="center"
                flex={1}
                order={3}>
                <Player player={gameHookObj.players[2]} />
                <Blank height={40} />
                <Player player={gameHookObj.players[3]} />
              </Wrap>
              : null
            }
          </Wrap>
        }
      </PlayingTable>
      <Modal />
    </PlayGameContextProvider>
  )
}

Game.propTypes = {
  isLargeScreen: PropTypes.bool
}

export default withWindowSize(mapSizesToProps)(Game)
