
import React from "react"
import {
  BrowserRouter as Router,
  Route,
  Routes
} from "react-router-dom"
import {
  createGlobalStyle,
  ThemeProvider
} from 'styled-components'

import { COLORS } from "utils/variables"

import Home from "pages/home"
import Game from "pages/game"



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
            path="game/:deckId/:numberOfPlayers"
            element={<Game />}
          />

        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App;
