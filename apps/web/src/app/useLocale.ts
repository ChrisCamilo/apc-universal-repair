import { createContext, useContext } from 'react'
import { DEFAULT_LOCALE, type Catalog, type Locale } from '@apc/domain/locale'

/** The language chosen, from the nearest LocaleProvider; Portuguese, with nothing to change, where there is none. */
export const LocaleContext = createContext<LocaleState>({ locale: DEFAULT_LOCALE, setLocale: () => {} })

export type LocaleState = {
  locale: Locale
  setLocale: (locale: Locale) => void
}

/**
 * Reads the language chosen, and the setter that changes it, from the nearest LocaleProvider.
 * @returns The language with `setLocale`.
 */
export function useLocale(): LocaleState {
  return useContext(LocaleContext)
}

/**
 * Reads a feature's texts in the language chosen.
 * @param catalog The feature's catalog.
 * @returns Its texts in that language.
 */
export function useMessages<Messages>(catalog: Catalog<Messages>): Messages {
  return catalog[useLocale().locale]
}
