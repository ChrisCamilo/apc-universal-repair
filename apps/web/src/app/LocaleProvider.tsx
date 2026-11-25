import { useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY, type Locale } from '@apc/domain/locale'
import { readStored, writeStored } from './storage.ts'
import { LocaleContext, type LocaleState } from './useLocale.ts'

// Holds the language chosen on this device, Portuguese until changed, stamps it on <html lang> and saves every choice
// (see @apc/domain/locale).

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = readStored(LOCALE_STORAGE_KEY)
    return isLocale(saved) ? saved : DEFAULT_LOCALE
  })

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value: LocaleState = {
    locale,
    setLocale: (next) => {
      setLocaleState(next)
      writeStored(LOCALE_STORAGE_KEY, next)
    },
  }
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
