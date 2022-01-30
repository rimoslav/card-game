import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'



const StyledBlank = styled.div(props => ({
    [`padding${props.width ? 'Right' : 'Top'}`]: props.width || props.height
  })
)

export const Blank = ({
  width = 0,
  height = 0
}) => (
  <StyledBlank
    width={width}
    height={height}
  />
)

Blank.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number
}
