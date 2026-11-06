import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useSession } from './sessionContext.ts'

// Lets only a logged user through to the routes inside, such as the Dashboard. Nothing is drawn while the saved
// session is being read, so the Dashboard never flashes before a redirect; without a session the user goes to
// /login, which sends them back here once they log in.

export function RequireSession({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const location = useLocation()
  if (user === undefined) {
    return null
  }
  if (user === null) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return children
}
