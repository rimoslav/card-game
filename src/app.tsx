import { BrowserRouter, Route, Routes } from 'react-router'

import { Game } from '@cg/pages/game'
import { Home } from '@cg/pages/home'

export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/game" element={<Game />} />
    </Routes>
  </BrowserRouter>
)
