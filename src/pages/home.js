import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  join,
  map,
  range
} from 'ramda'

import { useCreateNewGame } from 'hooks/use-create-game'

import { Button } from 'components/common/button'
import { Wrap } from 'components/common/wrap'
import { Blank } from 'components/common/blank'
import { Text } from 'components/common/text'
import PlayingTable from 'components/playing-table'



const Home = () => {
  const navigate = useNavigate()

  const goToGameScreen = (numberOfPlayers, cardsArray) => {
    // we can make custom function to make cardsString with only one loop
    const cardCodesArray = map(card => card.code, cardsArray)
    const cardsString = join('', cardCodesArray)

    navigate(`game/players/${numberOfPlayers}/cards/${cardsString}`)
  }

  const {
    isLoading,
    startNewGame
  } = useCreateNewGame({ goToGameScreen })

  return (
    <PlayingTable>
      <Wrap
        direction="col"
        align="center">
        <Text size={30} align="center">
          Select Number Of Players
        </Text>
        <Blank height={50} />
        <Wrap
          dir="col"
          align="center"
          justify="center"
          wrap="wrap">
          {map(num => (
            <Wrap key={num}>
              <Blank width={20} />
              <Button
                onClick={() => startNewGame(num)}
                textColor="darkSlateGray"
                isDisabled={isLoading}>
                {`${num} Players`}
              </Button>
              <Blank width={20} />
            </Wrap>
          ), range(2, 5))}
        </Wrap>
      </Wrap>
    </PlayingTable>
  )
}

export default Home
