import {
  addIndex,
  is,
  forEach,
  length,
  map,
  match
} from "ramda"

import {
  CARD_DIMENSIONS,
  NUMBER_OF_CARDS_PER_PLAYER,
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

// map and forEachIndexed can be easily combined into only one map function, but no time for that right now
export const transformResponse = cardsString => {
  const cardsArray = map(card => ({
    id: card,
    rank: Number(card[0]) || CARDS_MAP[card[0]], // '6' ---> 6, '0' ---> 10, J ---> 12
    suit: card[1], // currently not used in the app
    img: `https://deckofcardsapi.com/static/img/${card}.png`
  }), match(/.{1,2}/g, cardsString))

  let players = Array.from(Array(length(cardsArray) / NUMBER_OF_CARDS_PER_PLAYER), () => ({
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
        card
      ]
    }
  }, cardsArray)

  return players
}
