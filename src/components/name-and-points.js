import React from 'react'
import PropTypes from 'prop-types'

import { COLORS } from 'src/utils/variables'

import { Wrap } from 'src/components/common/wrap'
import { Text } from 'src/components/common/text'



const NameAndPoints = ({
  player,
  isPlayerLeading
}) => {
  return (
    <Wrap
      alignSelf="stretch"
      justify="between"
      style={{
        background: isPlayerLeading ? COLORS.nameTagLead : COLORS.nameTag,
        padding: 10,
        borderRadius: 5
      }}>
      <Text weight="bold">{`Name: ${player.name}`}</Text>
      <Text weight="bold">{`Score: ${player.score}`}</Text>
    </Wrap>
  )
}

NameAndPoints.propTypes = {
  player: PropTypes.object,
  isPlayerLeading: PropTypes.bool
}

export default NameAndPoints
