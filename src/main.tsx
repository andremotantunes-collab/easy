import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { initTheme } from './lib/theme'
import './styles/index.css'

// Applied before the first paint so the app never flashes the wrong theme.
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* O prefixo vem da build: '/' em casa, '/easy/' no GitHub Pages. Sem
        isto, todas as rotas apontavam para a raiz do dominio. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
