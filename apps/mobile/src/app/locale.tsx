import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY, type Catalog, type Locale } from '@apc/domain/locale';
import { save, themeStorage } from './theme';
import { nameNotificationChannel } from '../features/notifications/systemNotifications';

// Holds the language chosen on this phone, Portuguese until changed, and saves every choice in the app's storage,
// where the background sync reads it too (see @apc/domain/locale); Android's settings name the notifications' channel
// in it.

export const LocaleContext = createContext<LocaleState>({ locale: DEFAULT_LOCALE, setLocale: () => {} });

export type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

/**
 * Reads the language saved on the phone, treating unreadable storage or an unknown value as Portuguese.
 * @returns The language.
 */
export async function loadLocale(): Promise<Locale> {
  const saved = await themeStorage.getItem(LOCALE_STORAGE_KEY).catch(() => null);
  return isLocale(saved) ? saved : DEFAULT_LOCALE;
}

/**
 * Reads the language chosen, and the setter that changes it, from the nearest LocaleProvider (Portuguese when there
 * is none).
 * @returns The language with `setLocale`.
 */
export function useLocale(): LocaleState {
  return useContext(LocaleContext);
}

/**
 * Reads a feature's texts in the language chosen.
 * @param catalog The feature's catalog.
 * @returns Its texts in that language.
 */
export function useMessages<Messages>(catalog: Catalog<Messages>): Messages {
  return catalog[useLocale().locale];
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale | null>(null);

  useEffect(() => {
    loadLocale().then(setLocaleState);
  }, []);

  // Name the notifications' channel in the language, at start and on each change.
  useEffect(() => {
    if (locale) {
      nameNotificationChannel(locale);
    }
  }, [locale]);

  // Render nothing until the saved language is known, so the first frame is never in the wrong one.
  if (!locale) {
    return null;
  }

  const value: LocaleState = {
    locale,
    setLocale: (next) => {
      setLocaleState(next);
      save(LOCALE_STORAGE_KEY, next);
    },
  };
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
