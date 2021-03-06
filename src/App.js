
import React from 'react'
import {
  BrowserRouter as Router,
  Route,
  Routes
} from 'react-router-dom'
import {
  createGlobalStyle,
  ThemeProvider
} from 'styled-components'

import { COLORS } from 'src/utils/variables'

import Home from 'src/pages/home'
import Game from 'src/pages/game'



const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
  }
`

const App = () => {
  return (
    <ThemeProvider theme={{ COLORS }}>
      <GlobalStyle />
      <Router>
        <Routes>
          <Route
            index={false}
            path="/"
            element={<Home />}
          />

          <Route
            index={false}
            path="game/players/:numberOfPlayers/cards/:cards"
            element={<Game />}
          />

        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
