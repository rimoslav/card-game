import React, {
  Fragment
} from 'react'
import {
  useParams,
  useNavigate
} from 'react-router-dom'
import { includes } from 'ramda'

import { NUMBER_OF_ROUNDS } from 'utils/variables'
import { mapSizesToProps } from 'utils/helpers'

import { Text } from 'components/common/text'
import { Wrap } from 'components/common/wrap'
import { Blank } from 'components/common/blank'
import { Button } from 'components/common/button'
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

  if (gameHookObj.isDealingCards) {
    return <Text>Loading</Text>
  }

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
          ? <Text size={24}>Loading</Text>
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
              <Blank height={40} />
              <Player player={gameHookObj.players[1]} />
            </Wrap>
            <Wrap
              flex={1}
              align="center"
              justify="center"
              order={!props.isLargeScreen ? 1 : 2}>
              {NUMBER_OF_ROUNDS > 10
                ? <Button onClick={navigateHome}>
                  NEW GAME
                </Button>
                : <Fragment>
                  <CommunityCards />
                  {!props.isLargeScreen
                    ? <Blank height={20} />
                    : null
                  }
                </Fragment>
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
