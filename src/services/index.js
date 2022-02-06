import axios from 'axios'



export const createADeckAPI = () => (
  axios.get('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1')
)

export const drawCardsAPI = ({
  deckId,
  numberOfCards
}) => (
  axios.get(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=${numberOfCards}`)
)
