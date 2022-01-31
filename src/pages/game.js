import React from 'react'
import {
  useParams,
  useNavigate
} from 'react-router-dom'
import { includes } from 'ramda'

import { mapSizesToProps } from 'utils/helpers'

import { Text } from 'components/common/text'
import { Wrap } from 'components/common/wrap'
import { Blank } from 'components/common/blank'
import Player from 'components/player'
import CommunityCards from 'components/community-cards'
import PlayingTable from 'components/playing-table'
import Modal from 'components/modal'

import { withWindowSize } from 'hooks/with-window-size'
import {
  useGame,
  GameContextProvider
} from 'hooks/use-game'



const Game = props => {
  const navigate = useNavigate()
  const {
    deckId,
    numberOfPlayers
  } = useParams()

  const navigateHome = () => navigate('/')

  const gameHookObj = useGame({
    deckId,
    numberOfPlayers: includes(Number(numberOfPlayers), [2, 3])
      ? Number(numberOfPlayers)
      : 4,
    navigateHome
  })

  return (
    <GameContextProvider value={{
      ...gameHookObj,
      navigateHome
    }}>
      <PlayingTable
        align={props.isLargeScreen && gameHookObj.hasMoreThanTwoPlayers
          ? 'stretch'
          : 'center'
        }>
        {gameHookObj.isDealingCards
          ? <Text size={30}>Loading</Text>
          : <Wrap
            flex={1}
            align={props.isLargeScreen && gameHookObj.hasMoreThanTwoPlayers
              ? 'stretch'
              : 'center'
            }
            direction={props.isLargeScreen && gameHookObj.hasMoreThanTwoPlayers
              ? 'row'
              : props.isLargeScreen
                ? 'col-rev'
                : 'col'
            }
            style={{ maxWidth: 1400 }}>
            <Wrap
              direction={props.isLargeScreen && gameHookObj.hasMoreThanTwoPlayers
                ? "col-rev"
                : "col"
              }
              flex={1}
              order={!props.isLargeScreen ? 2 : 1}
              justify="center">
              <Player player={gameHookObj.players[0]} />
              {/* WE CAN INSERT <CommunityCards /> HERE INSTEAD OF BELOW IF THERE ARE ONLY TWO PLAYERS */}
              <Blank height={40} />
              <Player player={gameHookObj.players[1]} />
            </Wrap>
            <Wrap
              flex={1}
              align="center"
              justify="center"
              order={!props.isLargeScreen ? 1 : 2}>
              <CommunityCards />
              {!props.isLargeScreen
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
    </GameContextProvider>
  )
}

export default withWindowSize(mapSizesToProps)(Game)
