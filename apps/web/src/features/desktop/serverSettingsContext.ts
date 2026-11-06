import { createContext, useContext, useEffect } from 'react'

/** What the Servidor dialog opens on: its start, its import, or its port field. */
export type ServerSettingsFocus = 'import' | 'port'
/**
 * Opens the desktop app's Servidor dialog (see ServerSettings.tsx), on its import or its port field when asked; outside it, as in a
 * browser, it does nothing.
 */
export const ServerSettingsContext = createContext<(focus?: ServerSettingsFocus) => void>(() => {})

/**
 * Tells the Servidor dialog's provider whether a screen before the session, the login or the sign-up, is on: the only
 * screens the first start's offer to import an old server shows over.
 */
export const EntryScreenContext = createContext<(on: boolean) => void>(() => {})

/**
 * Marks the screen that calls it as one before the session while it is on, so the first start's offer can show over it.
 */
export function useEntryScreen(): void {
  const mark = useContext(EntryScreenContext)
  useEffect(() => {
    mark(true)
    return () => mark(false)
  }, [mark])
}

/**
 * Gets the way to open the Servidor dialog, as the user menu does.
 * @returns A function that opens it, on its import or its port field when asked.
 */
export function useOpenServerSettings(): (focus?: ServerSettingsFocus) => void {
  return useContext(ServerSettingsContext)
}
