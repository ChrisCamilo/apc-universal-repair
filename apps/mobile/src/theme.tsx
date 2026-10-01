import { createContext, useContext, type ReactNode } from 'react';
import { themes, type Mode, type Style, type Theme } from '@apc/shared/theme';

// Hands the shared tokens to the components. Switching style and mode at runtime comes with #8.

const ThemeContext = createContext<ActiveTheme>({ ...themes.eighties.night, style: 'eighties', mode: 'night' });
const WEIGHTS = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' } as const;

export type ActiveTheme = Theme & { style: Style; mode: Mode };
export type FontWeight = keyof typeof WEIGHTS;

export function ThemeProvider({
  style = 'eighties',
  mode = 'night',
  children,
}: {
  style?: Style;
  mode?: Mode;
  children: ReactNode;
}) {
  return <ThemeContext.Provider value={{ ...themes[style][mode], style, mode }}>{children}</ThemeContext.Provider>;
}

/**
 * Reads the active theme from the nearest ThemeProvider (Anos 80 at night when there is none).
 * @returns Tokens of the active style and mode, plus which style and mode they are.
 */
export function useTheme(): ActiveTheme {
  return useContext(ThemeContext);
}

/**
 * Names the bundled font file for a family and weight, as Android and iOS expect in `fontFamily`.
 * @param family Font family, e.g. "Barlow Condensed".
 * @param weight Font weight; defaults to 400.
 * @returns File name without extension, e.g. "BarlowCondensed-SemiBold".
 */
export function fontFamily(family: string, weight: FontWeight = 400): string {
  return `${family.replace(/\s+/g, '')}-${WEIGHTS[weight]}`;
}
