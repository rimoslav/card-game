import React from 'react'
import styled from 'styled-components'
import {
  length,
  map,
  range
} from 'ramda'
import PropTypes from 'prop-types'

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


const CommunityCards = ({
  cardWidth,
  cardHeight
}) => {
  const gameHookObj = usePlayGameContext()

  return (
    <Wrap style={{
      width: gameHookObj.numberOfPlayers * (cardWidth + 6),
      height: cardHeight
    }}>
      {map(card => (
        <CommunityCardWrapper
          key={card.id}
          width={cardWidth}
          height={cardHeight}>
          <Card card={card} />
        </CommunityCardWrapper>
      ), gameHookObj.community)}
      {map(num => (
        <CommunityCardWrapper
          key={num}
          theresNoCard
          width={cardWidth}
          height={cardHeight}
        />
      ), range(0, gameHookObj.numberOfPlayers - length(gameHookObj.community)))}
    </Wrap>
  )
}

CommunityCards.propTypes = {
  cardWidth: PropTypes.number.isRequired,
  cardHeight: PropTypes.number.isRequired
}

export default withWindowSize(mapSizesToProps)(CommunityCards)
