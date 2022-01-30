import React from 'react'
import styled from 'styled-components'
import {
  length,
  map
} from 'ramda'

import {
  COLORS,
  NUMBER_OF_ROUNDS
} from 'utils/variables'

import { Wrap } from 'components/common/wrap'
import { Blank } from 'components/common/blank'
import { Text } from 'components/common/text'
import { Button } from 'components/common/button'

import { useGameContext } from 'hooks/use-game'



const StyledModalWrapper = styled.div(props => ({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'rgba(0, 0, 0, 0.6)',
  zIndex: props.isOpen ? 9999 : -9999
}))

const StyledModalContent = styled.div(props => {
  const hOffset = props.isOpen ? 16 : -32
  const vOffset = props.isOpen ? 32 : 0

  return {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: 500,
    maxWidth: 'calc(100vw - 10px)',
    height: 'auto',
    background: COLORS.white,
    border: '1px solid #ccc',
    transition: '1.1s ease-out',
    boxShadow: `${hOffset}px ${vOffset}px ${vOffset}px rgba(0, 0, 0, 0.2)`,
    filter: `blur(${props.isOpen ? 0 : 8}px)`,
    transform: `scale(${props.isOpen ? 1 : 0.33}) translate(-50%,-50%)`,
    opacity: props.isOpen ? 1 : 0,
    visibility: props.isOpen ? 'visible' : 'hidden'
}})



const Modal = () => {
  const gameHookObj = useGameContext()
  const numberOfWinners = length(gameHookObj.playersInTheLead)

  const isOpen = gameHookObj.roundNumber > NUMBER_OF_ROUNDS

  return (
    <StyledModalWrapper isOpen={isOpen}>
      <StyledModalContent isOpen={isOpen}>
        <Wrap
          direction="col"
          align="center"
          justify="center">
          <Text align="center">
            {`WE HAVE ${numberOfWinners} WINNER${numberOfWinners > 1 ? 'S' : ''}`}
          </Text>
          <Blank height={20} />
          {map(winner => (
            <Wrap
              key={winner.id}
              direction="col">
              <Blank height={10} />
              <Text>{`${winner.name}, ${winner.score} points`}</Text>
              <Blank height={10} />
            </Wrap>
          ), gameHookObj.playersInTheLead)}
          <Blank height={20} />
          <Button onClick={gameHookObj.navigateHome}>NEW GAME</Button>
        </Wrap>
      </StyledModalContent>
    </StyledModalWrapper>
  )
}

export default Modal
