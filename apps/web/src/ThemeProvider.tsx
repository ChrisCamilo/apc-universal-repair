import { useEffect, useState, type ReactNode } from 'react'
import { isMode, isStyle, STYLES, THEME_STORAGE_KEYS, type Mode, type Style } from '@apc/shared/theme'
import { ThemeContext, type ThemeState } from './useTheme.ts'

// Holds the style and mode, stamps them on <html> (where the theme CSS variables hang) and saves
// every explicit choice. The first values come from the boot script in index.html (see theme.ts).

const LIGHT_QUERY = '(prefers-color-scheme: light)'

/**
 * Reads a saved value without failing when storage is blocked (private mode, disabled cookies).
 * @param key Storage key.
 * @returns The saved value, or null when there is none or storage can't be read.
 */
function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Picks the mode that matches the system color scheme.
 * @returns "day" when the system prefers light colors, otherwise "night".
 */
function systemMode(): Mode {
  return window.matchMedia?.(LIGHT_QUERY).matches ? 'day' : 'night'
}

/**
 * Saves a value, ignoring blocked storage: the choice then lasts until the page reloads.
 * @param key Storage key.
 * @param value Value to save.
 */
function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable: keep the choice in memory only
  }
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
