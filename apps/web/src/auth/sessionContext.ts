import { createContext, useContext } from 'react'
import type { SessionUser } from '@apc/shared/auth'

/** The logged user, shared by the routes: undefined while the saved session is being read, null when nobody is. */
export const SessionContext = createContext<Session | null>(null)

export type Session = {
  user: SessionUser | null | undefined
  /** Takes the user who just logged in, or null after a logout. */
  setUser: (user: SessionUser | null) => void
}

/**
 * Reads the session around the caller.
 * @returns The logged user and the way to change it.
 */
export function useSession(): Session {
  return useContext(SessionContext)!
}
