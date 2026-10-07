import { useEffect, useState, type ReactNode } from 'react'
import type { AuthService, SessionUser } from '@apc/shared/auth'
import { SessionContext } from './sessionContext.ts'

// Holds the logged user for the routes: it reads the session saved on the device once, on start, and then takes
// the user a login hands over (or null after a logout).

type SessionProviderProps = { auth: AuthService; children: ReactNode }

export function SessionProvider({ auth, children }: SessionProviderProps) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined)

  // Read the saved session, unless a login already set the user meanwhile.
  useEffect(() => {
    let live = true
    auth.currentUser().then((saved) => live && setUser((current) => (current === undefined ? saved : current)))
    return () => {
      live = false
    }
  }, [auth])

  return <SessionContext.Provider value={{ user, setUser }}>{children}</SessionContext.Provider>
}
