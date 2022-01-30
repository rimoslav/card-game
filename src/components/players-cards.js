import React from 'react'
import {
  addIndex,
  length,
  map
} from 'ramda'
import PropTypes from 'prop-types'

import { mapSizesToProps } from 'utils/helpers'

import { withWindowSize } from 'hooks/with-window-size'

import { Wrap } from "components/common/wrap"
import { Card } from 'components/card'



const mapIndexed = addIndex(map)

const PlayersCards = ({
  hasBorder,
  areCardsFlipped = false,
  cardStickingOutPx,
  CARD_SIZE,
  cards,
  moveCardValue = -CARD_SIZE.width + cardStickingOutPx,
  width = CARD_SIZE.width + (length(cards) - 1) * cardStickingOutPx,
  onCardClick
}) => (
  <Wrap style={{
    width,
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
  CARD_SIZE: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired
  }),
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      rank: PropTypes.number.isRequired,
      suit: PropTypes.string.isRequired,
      img: PropTypes.string.isRequired
    })
  ),
  moveCardValue: PropTypes.number,
  width: PropTypes.number,
  onCardClick: PropTypes.func
}

export default withWindowSize(mapSizesToProps)(PlayersCards)
