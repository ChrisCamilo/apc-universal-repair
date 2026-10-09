import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import {
  isMode,
  isStyle,
  scales,
  STYLES,
  THEME_STORAGE_KEYS,
  themes,
  type Mode,
  type Style,
  type Theme,
} from '@apc/shared/theme';

// Holds the style and mode, hands their tokens to the components and saves every explicit choice.
// Until the user picks a mode, it follows the system color scheme.

const ThemeContext = createContext<ActiveTheme>({
  ...themes.eighties.night,
  style: 'eighties',
  mode: 'night',
  setStyle: () => {},
  setMode: () => {},
});
/** App storage on the device; tests reach the same in-memory instance through it. */
export const themeStorage = createAsyncStorage('apc-universal-repair');
const WEIGHTS = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' } as const;

export type ActiveTheme = Theme & {
  style: Style;
  mode: Mode;
  setStyle: (style: Style) => void;
  setMode: (mode: Mode) => void;
};
export type FontWeight = keyof typeof WEIGHTS;
type SavedTheme = { style: Style | null; mode: Mode | null };

/**
 * Names the bundled font file for a family and weight, as Android and iOS expect in `fontFamily`.
 * @param family Font family, e.g. "Barlow Condensed".
 * @param weight Font weight; defaults to 400.
 * @returns File name without extension, e.g. "BarlowCondensed-SemiBold".
 */
export function fontFamily(family: string, weight: FontWeight = 400): string {
  return `${family.replace(/\s+/g, '')}-${WEIGHTS[weight]}`;
}

/**
 * Reads the saved style and mode, treating unreadable storage or unknown values as "nothing saved".
 * @returns The saved style and mode, each null when there is no valid saved value.
 */
async function readSaved(): Promise<SavedTheme> {
  try {
    const saved = await themeStorage.getMany([THEME_STORAGE_KEYS.style, THEME_STORAGE_KEYS.mode]);
    const style = saved[THEME_STORAGE_KEYS.style];
    const mode = saved[THEME_STORAGE_KEYS.mode];
    return { style: isStyle(style) ? style : null, mode: isMode(mode) ? mode : null };
  } catch {
    return { style: null, mode: null };
  }
}

/**
 * Saves a value in the background; when storage fails, the choice lasts until the app restarts.
 * @param key Storage key.
 * @param value Value to save.
 */
export function save(key: string, value: string): void {
  themeStorage.setItem(key, value).catch(() => {});
}

/**
 * Reads the active theme from the nearest ThemeProvider (Anos 80 at night when there is none).
 * @returns Tokens of the active style and mode, which style and mode they are, and the setters.
 */
export function useTheme(): ActiveTheme {
  return useContext(ThemeContext);
}

/**
 * Picks the soft hairline of soft separators: panel borders and dividers.
 * @param theme Active theme.
 * @returns The hairline color at the soft opacity.
 */
export function softHairline(theme: ActiveTheme): string {
  return withAlpha(theme.colors.hairline, scales.hairlineSoft);
}

/**
 * Adds an opacity to a hex token color, for tints such as the focus ring.
 * @param hex Color as `#RRGGBB`.
 * @param opacity Opacity from 0 to 1.
 * @returns The color as `#RRGGBBAA`.
 */
export function withAlpha(hex: string, opacity: number): string {
  return hex + Math.round(opacity * 255).toString(16).padStart(2, '0').toUpperCase();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [saved, setSaved] = useState<SavedTheme | null>(null);

  useEffect(() => {
    readSaved().then(setSaved);
  }, []);

  // Render nothing until the saved theme is known, so the first frame is never in the wrong theme.
  if (!saved) {
    return null;
  }

  const style = saved.style ?? STYLES[0];
  const mode = saved.mode ?? (system === 'light' ? 'day' : 'night');
  const value: ActiveTheme = {
    ...themes[style][mode],
    style,
    mode,
    setStyle: (next) => {
      setSaved((prev) => ({ mode: null, ...prev, style: next }));
      save(THEME_STORAGE_KEYS.style, next);
    },
    setMode: (next) => {
      setSaved((prev) => ({ style: null, ...prev, mode: next }));
      save(THEME_STORAGE_KEYS.mode, next);
    },
  };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
