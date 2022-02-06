import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'

import { mapSizesToProps } from 'src/utils/helpers'

import { Wrap } from 'src/components/common/wrap'

import { withWindowSize } from 'src/hooks/with-window-size'



const StyledCard = styled.img`
  width: ${props => props.width}px;
  height: ${props => props.height}px;
  box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
  transition: 0.3s;
  &:hover, &:active {
    box-shadow: 0 8px 16px 0 rgba(0,0,0,0.2);
  }
`

const CardContent = ({
  isFlipped,
  card,
  left,
  onCardClick,
  cardWidth,
  cardHeight
}) => (
  <Wrap
    style={{ left }}
    onClick={onCardClick
      ? () => onCardClick(card)
      : undefined
    }> {/* avioding optional chaining here, so we don't get cursor: pointer on cards where there's no click */}
    <StyledCard
      src={isFlipped
        ? `${process.env.PUBLIC_URL}/card-back.jpeg`
        : card.img
      }
      alt={`Card ${card.id}`}
      width={cardWidth}
      height={cardHeight}
    />
  </Wrap>
)

CardContent.propTypes = {
  isFlipped: PropTypes.bool,
  card: PropTypes.shape({
    id: PropTypes.string.isRequired,
    rank: PropTypes.number.isRequired,
    suit: PropTypes.string.isRequired,
    img: PropTypes.string.isRequired
  }).isRequired,
  left: PropTypes.number,
  onCardClick: PropTypes.func,
  cardWidth: PropTypes.number.isRequired,
  cardHeight: PropTypes.number.isRequired
}

export const Card = withWindowSize(mapSizesToProps)(CardContent)
