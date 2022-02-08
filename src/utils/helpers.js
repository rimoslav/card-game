import {
  addIndex,
  is,
  forEach,
  length,
  match
} from 'ramda'

import {
  CARD_SIZE,
  NUMBER_OF_CARDS_PER_PLAYER,
  CARDS_MAP,
  USERS_POSITION
} from 'src/utils/variables'



const forEachIndexed = addIndex(forEach)

export const isNum = value => is(Number, value)

export const getRandomInt = max => {
  return Math.floor(Math.random() * max)
}

export const debounce = function (fn, ms) {
  let timer

  return _ => {
    clearTimeout(timer)
    timer = setTimeout(_ => {
      timer = null
      fn.apply(this, arguments)
    }, ms)
  }
}

export const mapSizesToProps = ({ ww }) => {
  const CARD_DIMENSIONS = ww >= 1500 || (ww < 1200 && ww >= 700)
    ? CARD_SIZE.lg
    : CARD_SIZE.sm

  return {
    cardWidth: CARD_DIMENSIONS.width,
    cardHeight: CARD_DIMENSIONS.height,
    shouldShowWonCards: ww >= 400,
    cardStickingOutPx: ww < 1200 && ww >= 700 ? 30 : 20,
    isLargeScreen: ww >= 1200
  }
}

export const mapCardsToPlayers = cardsString => {
  // eg. cardsString consists of 80 chars, 2 chars per card (first determening rank, the second determening suit) => 40 cards
  // 40 cards, 10 cards per player => 4 players
  // create players array as an array of 4 arrays
  let players = Array.from(Array(length(cardsString) / (2 * NUMBER_OF_CARDS_PER_PLAYER)), () => ({
    remainingCards: [],
    wonCards: []
  }))

  forEachIndexed((card, cardIndex) => {
    const playersIndex = Math.floor(cardIndex / NUMBER_OF_CARDS_PER_PLAYER)

    players[playersIndex] = {
      ...players[playersIndex],
      id: playersIndex,
      name: playersIndex === USERS_POSITION
        ? 'User'
        : `Player ${playersIndex}`, // not really needed, more of a mimick of real life game
      score: 0,
      remainingCards: [
        ...players[playersIndex].remainingCards,
        {
          id: card,
          rank: Number(card[0]) || CARDS_MAP[card[0]], // '6' ---> 6, '0' ---> 10, J ---> 12
          suit: card[1], // currently not used in the app
          img: card === 'AD'
            ? `${process.env.PUBLIC_URL}/ace-of-diamonds.png`
            : `https://deckofcardsapi.com/static/img/${card}.png`
        }
      ]
    }
  }, match(/.{1,2}/g, cardsString))

  return players
}
