import { useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY, type Locale } from '@apc/domain/locale'
import { desktopBridge } from '../features/desktop/desktopBridge.ts'
import { readStored, writeStored } from './storage.ts'
import { LocaleContext, type LocaleState } from './useLocale.ts'

// Holds the language chosen on this device, Portuguese until changed (in the desktop app, the one chosen at install),
// stamps it on <html lang>, saves every choice (see @apc/domain/locale) and, in the desktop app, tells it on opening and
// on each change, for its own dialogs, tray and pages.

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = readStored(LOCALE_STORAGE_KEY)
    return isLocale(saved) ? saved : (desktopBridge()?.locale ?? DEFAULT_LOCALE)
  })

  useEffect(() => {
    document.documentElement.lang = locale
    desktopBridge()?.setLocale(locale)
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
