import React from 'react'
import PropTypes from 'prop-types'

import { COLORS } from 'utils/variables'

import { Wrap } from 'components/common/wrap'
import { Text } from 'components/common/text'



const NameAndPoints = ({ player }) => {
  return (
    <Wrap
      alignSelf="stretch"
      justify="between"
      style={{
        background: COLORS.nameTag,
        padding: 10,
        borderRadius: 5
      }}>
      <Text weight="bold">{`Name: ${player.name}`}</Text>
      <Text weight="bold">{`Score: ${player.score}`}</Text>
    </Wrap>
  )
}

NameAndPoints.propTypes = {
  player: PropTypes.object
}

export default NameAndPoints
