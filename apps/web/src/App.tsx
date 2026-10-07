import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { auth } from './auth/auth.ts'
import { LoginScreen } from './auth/LoginScreen.tsx'
import { RequireSession } from './auth/RequireSession.tsx'
import { SessionProvider } from './auth/SessionProvider.tsx'
import { useSession } from './auth/sessionContext.ts'
import { DashboardLayout } from './dashboard/DashboardLayout.tsx'
import { InventoryTab } from './dashboard/InventoryTab.tsx'
import { UserMenu } from './dashboard/UserMenu.tsx'

// The app's routes. /login is the login screen; the Dashboard, behind it, frames every tab at its own path. "/"
// opens the last tab used (the Inventory tab the first time) and any unknown path goes back there. Only a logged
// user reaches the Dashboard: anyone else goes to /login and, once logged in, back to where they were going.

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider auth={auth}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireSession>
                <DashboardLayout userMenu={<UserMenu />} />
              </RequireSession>
            }
          >
            <Route path="inventory" element={<InventoryTab />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  )
}

// The login, or straight on to the Dashboard when someone is already logged in. A login goes on to the route
// that sent the user here, or to the Dashboard.
function LoginPage() {
  const { user, setUser } = useSession()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  if (user === undefined) {
    return null
  }
  if (user) {
    return <Navigate to={from} replace />
  }
  return (
    <LoginScreen
      auth={auth}
      onLoggedIn={(loggedIn) => {
        setUser(loggedIn)
        navigate(from, { replace: true })
      }}
    />
  )
}
