import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'

import { COLORS } from 'src/utils/variables'



const StyledText = styled.div(props => ({
  fontSize: props.size,
  lineHeight: props.height,
  color: COLORS[props.color] ?? COLORS.primary,
  fontWeight: props.weight,
  fontFamily: 'Helvetica',
  ...(props.align && { textAlign: props.align }),
  ...props.style
}))

export const Text = ({
  size = 16,
  height = 1.6,
  color = 'primary',
  weight = 'normal',
  align,
  style = {},
  children
}) => (
  <StyledText
    size={size}
    height={height}
    color={color}
    weight={weight}
    align={align}
    style={style}>
    {children}
  </StyledText>
)

Text.propTypes = {
  size: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  height: PropTypes.number,
  color: PropTypes.string,
  weight: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  align: PropTypes.string,
  style: PropTypes.object,
  children: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ])
}
