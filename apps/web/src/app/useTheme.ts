import { createContext, useContext } from 'react'
import type { Mode, Style } from '@apc/shared/theme'

export const ThemeContext = createContext<ThemeState | null>(null)

export type ThemeState = {
  style: Style
  mode: Mode
  setStyle: (style: Style) => void
  setMode: (mode: Mode) => void
}

/**
 * Reads the active style and mode, and the setters that switch them, from the nearest ThemeProvider.
 * @returns Current style and mode with `setStyle` and `setMode`.
 */
export function useTheme(): ThemeState {
  const theme = useContext(ThemeContext)
  if (!theme) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }
  return theme
}
