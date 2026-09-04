import { useEffect, useState } from 'react'
import { THEME_KEY } from './storage'

export type ThemeChoice = 'auto' | 'light' | 'dark'

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

/**
 * "auto" removes the attribute entirely so the prefers-color-scheme block in
 * tokens.css takes over; an explicit choice stamps data-theme, which both the
 * light and the dark rules are written to lose to.
 */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement
  if (choice === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
  corDaBarra(choice)
}

/** As mesmas cores de --bg. Duplicadas no <script> de arranque do index.html,
 *  que corre antes de isto existir. */
const FUNDO: Record<'light' | 'dark', string> = { light: '#F6F8FC', dark: '#07070E' }
const MARCA = 'data-easy-barra'

/**
 * A cor da barra do sistema segue o tema escolhido, e nao o do telemovel.
 * Instalada no ecra principal, a app pinta ate' a' barra de estado: com uma
 * escolha manual contra o sistema, ficava clara por cima de um ecra escuro.
 * O browser fica pelo primeiro <meta> que combina, por isso este entra a'
 * frente dos dois que respondem ao prefers-color-scheme — e sai quando a
 * escolha volta a "auto", devolvendo-lhes o lugar.
 */
function corDaBarra(choice: ThemeChoice): void {
  const anterior = document.head.querySelector(`meta[${MARCA}]`)
  if (choice === 'auto') {
    anterior?.remove()
    return
  }
  const meta = (anterior as HTMLMetaElement | null) ?? document.createElement('meta')
  meta.setAttribute('name', 'theme-color')
  meta.setAttribute(MARCA, '')
  meta.setAttribute('content', FUNDO[choice])
  if (!anterior) document.head.insertBefore(meta, document.head.firstChild)
}

export function useTheme(): [ThemeChoice, (c: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>(read)

  useEffect(() => {
    applyTheme(choice)
    try {
      if (choice === 'auto') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, choice)
    } catch {
      // ignored
    }
  }, [choice])

  return [choice, setChoice]
}

/** Applied before React mounts, so the first paint is already the right theme. */
export function initTheme(): void {
  applyTheme(read())
}
