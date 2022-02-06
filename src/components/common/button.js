import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'

import { COLORS } from 'src/utils/variables'



const StyledButton = styled.button(props => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px 40px',
  border: '2px solid white',
  borderRadius: '10px',
  fontSize: '1em',
  margin: '1em',
  textTransform: 'uppercase',
  fontWeight: 600,
  backgroundColor: COLORS[props.color] ?? COLORS.primary,
  color: COLORS[props.textColor] ?? COLORS.secondary,
  opacity: props.disabled ? 0.6 : 1,
  cursor: props.disabled ? 'auto' : 'pointer'
})
)

export const Button = ({
  isDisabled = false,
  textColor = 'secondary',
  color = 'primary',
  onClick,
  children
}) => (
  <StyledButton
    disabled={isDisabled}
    textColor={textColor}
    color={color}
    onClick={onClick}>
    {children}
  </StyledButton>
)

Button.propTypes = {
  isDisabled: PropTypes.bool,
  textColor: PropTypes.string,
  color: PropTypes.string,
  onClick: PropTypes.func,
  children: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ])
}
