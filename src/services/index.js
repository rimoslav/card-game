import axios from 'axios'


export const createADeck = () => (
  axios.get('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1')
)

export const drawCards = ({ deckId, numberOfCards }) => (
  axios.get(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=${numberOfCards}`)
)
