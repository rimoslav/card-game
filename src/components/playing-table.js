import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'

import {
  ALIGN,
  COLORS
} from 'utils/variables'



const StyledPlayingTable = styled.div(props => [
  {
    position: 'relative',
    display: 'flex',
    ...(props.align && { alignItems: ALIGN[props.align] }),
    justifyContent: 'center'
  },
  {
    minHeight: '100vh'
  },
  {
    background: COLORS.green,
    borderWidth: 10,
    borderColor: COLORS.primary,
    borderStyle: 'solid',
    padding: '20px'
  }
])

const PlayingTable = ({
  align = "center",
  children
}) => (
  <StyledPlayingTable align={align}>
    {children}
  </StyledPlayingTable>
)

PlayingTable.propTypes = {
  align: PropTypes.string,
  children: PropTypes.object
}

export default PlayingTable
