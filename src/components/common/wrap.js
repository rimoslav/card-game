import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'

import {
  ALIGN,
  DIRECTION
} from 'utils/variables'
import { isNum } from 'utils/helpers'



const StyledWrap = styled.div(props => [
  {
    position: 'relative',
    display: 'flex',
    flexDirection: DIRECTION[props.direction] ?? 'row',
    ...(props.align && { alignItems: ALIGN[props.align] }),
    ...(props.alignSelf && { alignSelf: ALIGN[props.alignSelf] }),
    ...(props.justify && { justifyContent: ALIGN[props.justify] }),
    ...(isNum(props.flex) && { flex: props.flex }),
    ...(isNum(props.order) && { order: props.order }),
    flexWrap: props.wrap ?? 'nowrap',
    cursor: props.onClick ? 'pointer' : 'auto',
    ...props.style
  }
])

export const Wrap = ({
  direction = 'row', // row, col, row-rev, col-rev
  align,
  alignSelf,
  justify,
  flex,
  order,
  wrap,
  style,
  onClick,
  children = ''
}) => (
  <StyledWrap
    direction={direction}
    align={align}
    alignSelf={alignSelf}
    justify={justify}
    flex={flex}
    order={order}
    wrap={wrap}
    style={style}
    onClick={onClick}>
    {children}
  </StyledWrap>
)

Wrap.propTypes = {
  direction: PropTypes.string,
  align: PropTypes.string,
  alignSelf: PropTypes.string,
  justify: PropTypes.string,
  flex: PropTypes.number,
  order: PropTypes.number,
  wrap: PropTypes.string,
  style: PropTypes.object,
  onClick: PropTypes.func,
  children: PropTypes.any
}
