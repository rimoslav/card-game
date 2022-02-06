import React from 'react'
import {
  addIndex,
  length,
  map
} from 'ramda'
import PropTypes from 'prop-types'

import { mapSizesToProps } from 'src/utils/helpers'

import { withWindowSize } from 'src/hooks/with-window-size'

import { Wrap } from 'src/components/common/wrap'
import { Card } from 'src/components/card'



const mapIndexed = addIndex(map)

const PlayersCards = ({
  hasBorder,
  areCardsFlipped = false,
  cardStickingOutPx,
  cardWidth,
  cardHeight,
  cards,
  moveCardValue = -cardWidth + cardStickingOutPx,
  totalWidth = cardWidth + (length(cards) - 1) * cardStickingOutPx,
  onCardClick
}) => (
  <Wrap style={{
    width: totalWidth,
    height: cardHeight,
    border: hasBorder
      ? '2px solid white'
      : '',
    borderRadius: 8
  }}>
    {mapIndexed((card, index) => (
      <Card
        key={card.id}
        isFlipped={areCardsFlipped}
        left={index * moveCardValue}
        card={card}
        onCardClick={onCardClick}
      />
    ), cards)}
  </Wrap>
)

PlayersCards.propTypes = {
  hasBorder: PropTypes.bool,
  areCardsFlipped: PropTypes.bool,
  cardStickingOutPx: PropTypes.number,
  cardWidth: PropTypes.number.isRequired,
  cardHeight: PropTypes.number.isRequired,
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      rank: PropTypes.number.isRequired,
      suit: PropTypes.string.isRequired,
      img: PropTypes.string.isRequired
    })
  ),
  moveCardValue: PropTypes.number,
  totalWidth: PropTypes.number,
  onCardClick: PropTypes.func
}

export default withWindowSize(mapSizesToProps)(PlayersCards)
