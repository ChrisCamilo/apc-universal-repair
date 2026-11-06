import { useEffect, useState, type ReactNode } from 'react'
import { onSessionExpired, type AuthService, type SessionUser } from '@apc/shared/auth'
import { SessionContext } from './sessionContext.ts'

// Holds the logged user for the routes: it reads the session saved on the device once, on start, and then takes
// the user a login hands over (or null after a logout). Marking the Inventory tutorial as seen changes the user at
// once, so the tutorial doesn't start twice, and saves it through the AuthService. When the API refuses the session's
// token, the session is cleared on the device and the user goes back to the login, which says the session expired
// until someone logs in again.

type SessionProviderProps = { auth: AuthService; children: ReactNode }

export function SessionProvider({ auth, children }: SessionProviderProps) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined)
  const [expired, setExpired] = useState(false)

  // Read the saved session, unless a login already set the user meanwhile.
  useEffect(() => {
    let live = true
    auth.currentUser().then((saved) => live && setUser((current) => (current === undefined ? saved : current)))
    return () => {
      live = false
    }
  }, [auth])

  // End the session when the API refuses its token.
  useEffect(
    () =>
      onSessionExpired(() => {
        void auth.logout()
        setUser(null)
        setExpired(true)
      }),
    [auth],
  )

  /** Takes the user who just logged in, or null after a logout, and drops the expired notice. */
  const takeUser = (next: SessionUser | null) => {
    setUser(next)
    setExpired(false)
  }

  /** Marks the tutorial seen on the logged user, then saves it on the device and the API. */
  const markInventoryTutorialSeen = () => {
    if (user) {
      setUser({ ...user, inventoryTutorialSeen: true })
      void auth.markInventoryTutorialSeen(user)
    }
  }

  return <SessionContext.Provider value={{ user, expired, setUser: takeUser, markInventoryTutorialSeen }}>{children}</SessionContext.Provider>
}
