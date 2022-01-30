import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  map,
  range
} from 'ramda'

import { useDeck } from 'hooks/use-deck'

import { Button } from 'components/common/button'
import { Wrap } from 'components/common/wrap'
import { Blank } from 'components/common/blank'
import { Text } from 'components/common/text'
import PlayingTable from 'components/playing-table'



const Home = () => {
  const navigate = useNavigate()
  const {
    isCreatingDeck,
    deckId,
  } = useDeck()

  const goToGameScreen = numOfPlayers => {
    navigate(`/game/${deckId}/${numOfPlayers}`)
  }

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
                onClick={() => goToGameScreen(num)}
                textColor="darkSlateGray"
                isDisabled={isCreatingDeck}>
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
