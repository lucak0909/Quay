import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.tsx'
import { isDesktop, openExternalLinksInBrowser } from './desktop'
import './index.css'
import Cram from './pages/Cram'
import DeckView from './pages/DeckView'
import Study from './pages/Study'
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
      { path: '/decks/:id/study', element: <Study /> },
      { path: '/decks/:id/cram', element: <Cram /> },
      // The editor is large, so it loads only when a note is opened.
      { path: '/notes/:id', lazy: () => import('./pages/Note').then((m) => ({ Component: m.default })) },
      { path: '/help', element: <Help /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
])

openExternalLinksInBrowser()

// In a browser, ask for storage that isn't cleared automatically when space runs low.
// (The desktop app keeps its data in its own folder, so it doesn't need this.)
if (!isDesktop) navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
