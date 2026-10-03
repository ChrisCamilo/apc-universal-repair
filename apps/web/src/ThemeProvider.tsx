import { useEffect, useState, type ReactNode } from 'react'
import { isMode, isStyle, STYLES, THEME_STORAGE_KEYS, type Mode, type Style } from '@apc/shared/theme'
import { readStored, writeStored } from './storage.ts'
import { ThemeContext, type ThemeState } from './useTheme.ts'

// Holds the style and mode, stamps them on <html> (where the theme CSS variables hang) and saves
// every explicit choice. The first values come from the boot script in index.html (see theme.ts).

const LIGHT_QUERY = '(prefers-color-scheme: light)'

/**
 * Picks the mode that matches the system color scheme.
 * @returns "day" when the system prefers light colors, otherwise "night".
 */
function systemMode(): Mode {
  return window.matchMedia?.(LIGHT_QUERY).matches ? 'day' : 'night'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const root = document.documentElement
  const [style, setStyleState] = useState<Style>(() => (isStyle(root.dataset.style) ? root.dataset.style : STYLES[0]))
  const [mode, setModeState] = useState<Mode>(() => (isMode(root.dataset.mode) ? root.dataset.mode : systemMode()))
  const [modeChosen, setModeChosen] = useState(() => isMode(readStored(THEME_STORAGE_KEYS.mode)))

  useEffect(() => {
    root.dataset.style = style
    root.dataset.mode = mode
  }, [root, style, mode])

  // Until the user picks a mode, follow the system color scheme as it changes.
  useEffect(() => {
    if (modeChosen || !window.matchMedia) {
      return
    }
    const query = window.matchMedia(LIGHT_QUERY)
    const follow = () => setModeState(query.matches ? 'day' : 'night')
    query.addEventListener('change', follow)
    return () => query.removeEventListener('change', follow)
  }, [modeChosen])

  const value: ThemeState = {
    style,
    mode,
    setStyle: (next) => {
      setStyleState(next)
      writeStored(THEME_STORAGE_KEYS.style, next)
    },
    setMode: (next) => {
      setModeState(next)
      setModeChosen(true)
      writeStored(THEME_STORAGE_KEYS.mode, next)
    },
  }
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
