/**
 * Entry point for the shareable single-file preview only — never for the app
 * that ships. Two differences from `main.tsx`: HashRouter, because the preview
 * is served as one page and a path refresh would 404, and no service worker,
 * because there is nothing beside the page to precache.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { initTheme } from './lib/theme'
import './styles/index.css'

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
