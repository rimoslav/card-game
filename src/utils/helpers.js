import {
  addIndex,
  is,
  forEach,
  length
} from "ramda"

import {
  CARD_DIMENSIONS,
  NUMBER_OF_ROUNDS,
  CARDS_MAP,
  USERS_POSITION
} from 'utils/variables'



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

// we shouldn't use object CARD_SIZE here. it should be separated into two values - cardWidth and cardHeight
export const mapSizesToProps = ({ ww }) => ({
  CARD_SIZE: ww >= 1500 || (ww < 1200 && ww >= 700)
    ? CARD_DIMENSIONS.lg
    : CARD_DIMENSIONS.sm,
  shouldShowWonCards: ww >= 400,
  cardStickingOutPx: ww < 1200 && ww >= 700 ? 30 : 20,
  isLargeScreen: ww >= 1200
})

export const findCardsSum = cards => {
  let cardsSum = 0
  forEach(card => cardsSum += card.rank, cards)

  return cardsSum
}

export const transformResponse = cardsArray => {
  let players = Array.from(Array(length(cardsArray) / NUMBER_OF_ROUNDS), () => ({
    remainingCards: [],
    wonCards: []
  }))

  forEachIndexed((card, cardIndex) => {
    const playersIndex = Math.floor(cardIndex / NUMBER_OF_ROUNDS)

    players[playersIndex] = {
      ...players[playersIndex],
      id: playersIndex,
      name: playersIndex === USERS_POSITION
        ? 'User'
        : `Player ${playersIndex}`,
      score: 0,
      remainingCards: [
        ...players[playersIndex].remainingCards,
        {
          id: card.code,
          rank: Number(card.value) || CARDS_MAP[card.value], // '6' ---> 6, JACK ---> 12
          suit: card.suit,
          img: card.image
        }
      ]
    }
  }, cardsArray)

  return players
}