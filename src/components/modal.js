import React from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import {
  length,
  map
} from 'ramda'

import {
  COLORS,
  NUMBER_OF_CARDS_PER_PLAYER
} from 'src/utils/variables'

import { Wrap } from 'src/components/common/wrap'
import { Blank } from 'src/components/common/blank'
import { Text } from 'src/components/common/text'
import { Button } from 'src/components/common/button'

import { usePlayGameContext } from 'src/hooks/use-play-game'



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
  }
})



const Modal = () => {
  const navigate = useNavigate()
  const gameHookObj = usePlayGameContext()
  const numberOfWinners = length(gameHookObj.gameLeads)

  const navigateHome = () => navigate('/')

  const isOpen = gameHookObj.roundNumber > NUMBER_OF_CARDS_PER_PLAYER

  return (
    <StyledModalWrapper isOpen={isOpen}>
      <StyledModalContent isOpen={isOpen}>
        <Wrap
          direction="col"
          align="center"
          justify="center">
          <Blank height={20} />
          <Text
            size={20}
            weight="bold">
            {`We have ${numberOfWinners} winner${numberOfWinners > 1 ? 's' : ''}!`}
          </Text>
          <Blank height={20} />
          {map(winner => (
            <Wrap
              key={winner.id}
              direction="col">
              <Blank height={10} />
              <Text
                size={18}
                weight="bold"
                color="silver">{`${winner.name} - ${winner.score} points`}</Text>
              <Blank height={10} />
            </Wrap>
          ), gameHookObj.playersSortedByPoints)}
          <Blank height={20} />
          <Button onClick={navigateHome}>NEW GAME</Button>
        </Wrap>
      </StyledModalContent>
    </StyledModalWrapper>
  )
}

export default Modal
