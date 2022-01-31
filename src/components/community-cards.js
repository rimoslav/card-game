import React from 'react'
import styled from 'styled-components'
import {
  length,
  map,
  range
} from 'ramda'

import { mapSizesToProps } from 'utils/helpers'

import { Wrap } from 'components/common/wrap'
import { Card } from 'components/card'

import { usePlayGameContext } from 'hooks/use-play-game'
import { withWindowSize } from 'hooks/with-window-size'



const CommunityCardWrapper = styled.div(props => ({
  width: props.width + (props.theresNoCard ? 6 : 0),
  height: props.height,
  borderRadius: 8,
  borderWidth: 3,
  borderColor: 'white',
  borderStyle: 'solid' 
}))


const CommunityCards = ({ CARD_SIZE }) => {
  const gameHookObj = usePlayGameContext()

  return (
    <Wrap style={{
      width: gameHookObj.numberOfPlayers * (CARD_SIZE.width + 6),
      height: CARD_SIZE.height
    }}>
      {map(card => (
        <CommunityCardWrapper
          key={card.id}
          width={CARD_SIZE.width}
          height={CARD_SIZE.height}>
          <Card card={card} />
        </CommunityCardWrapper>
      ), gameHookObj.community)}
      {map(num => (
        <CommunityCardWrapper
          key={num}
          theresNoCard
          width={CARD_SIZE.width}
          height={CARD_SIZE.height}
        />
      ), range(0, gameHookObj.numberOfPlayers - length(gameHookObj.community)))}
    </Wrap>
  )
}

export default withWindowSize(mapSizesToProps)(CommunityCards)
