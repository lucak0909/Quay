import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import DeckView from './pages/DeckView'
import Decks from './pages/Decks'
import Generate from './pages/Generate'
import Help from './pages/Help'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Setup from './pages/Setup'

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/setup', element: <Setup /> },
      { path: '/generate', element: <Generate /> },
      { path: '/decks', element: <Decks /> },
      { path: '/decks/:id', element: <DeckView /> },
      { path: '/help', element: <Help /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
