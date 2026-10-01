import { createContext, useContext, type ReactNode } from 'react';
import { themes, type Mode, type Style, type Theme } from '@apc/shared/theme';

// Hands the shared tokens to the components. Switching style and mode at runtime comes with #8.

export type ActiveTheme = Theme & { style: Style; mode: Mode };

const ThemeContext = createContext<ActiveTheme>({ ...themes.eighties.night, style: 'eighties', mode: 'night' });

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

export function useTheme(): ActiveTheme {
  return useContext(ThemeContext);
}

const WEIGHTS = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' } as const;
export type FontWeight = keyof typeof WEIGHTS;

/** Name of the bundled font file for a family and weight: ('Barlow Condensed', 600) → 'BarlowCondensed-SemiBold'. */
export function fontFamily(family: string, weight: FontWeight = 400): string {
  return `${family.replace(/\s+/g, '')}-${WEIGHTS[weight]}`;
}
