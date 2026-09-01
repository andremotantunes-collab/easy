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
