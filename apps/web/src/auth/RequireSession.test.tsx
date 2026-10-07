import type { AuthService, SessionUser } from '@apc/shared/auth'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { RequireSession } from './RequireSession.tsx'
import { SessionProvider } from './SessionProvider.tsx'
import { useSession } from './sessionContext.ts'

const USER: SessionUser = { id: 'user-christian', username: 'christian.camilo', displayName: 'Christian Camilo', initials: 'CC' }

/**
 * Builds an AuthService whose saved session is read only when the test says so.
 * @returns The service and the function that answers the read with a user or null.
 */
function heldSession(): { auth: AuthService; answer: (user: SessionUser | null) => void } {
  let answer: (user: SessionUser | null) => void = () => {}
  const read = new Promise<SessionUser | null>((resolve) => (answer = resolve))
  return { auth: { login: async () => null, logout: async () => {}, currentUser: () => read }, answer }
}

// Opens /inventory while the saved session is still being read, and checks nothing of the Dashboard is drawn and
// nobody is sent anywhere; once the read finds a user, the Dashboard shows.
test('Web: nothing shows while the session is read, then a logged user gets through', async () => {
  const { auth, answer } = heldSession()
  const screen = await render(<App auth={auth} />)
  expect(screen.container.textContent).toBe('')
  answer(USER)
  await expect.element(screen.getByText('Painel de christian.camilo')).toBeVisible()
})

// Opens /inventory?q=freio with no saved session, and checks the guard sends the user to /login and tells it where
// they were going, search included.
test('Web: without a session the guard sends to the login with where the user was going', async () => {
  const { auth, answer } = heldSession()
  const screen = await render(<App auth={auth} />)
  answer(null)
  await expect.element(screen.getByText('Login, depois /inventory?q=freio')).toBeVisible()
  expect(screen.container.textContent).not.toContain('Painel')
})

// Logs in while the saved session is still being read, then lets the read find nobody, and checks the late read
// doesn't log the user back out.
test('Web: a login made while the session is read is kept', async () => {
  const { auth, answer } = heldSession()
  const screen = await render(
    <SessionProvider auth={auth}>
      <LogIn />
    </SessionProvider>,
  )
  await screen.getByRole('button', { name: 'Entrar' }).click()
  answer(null)
  // let the read's answer reach the provider before looking
  await auth.currentUser()
  await new Promise((resolve) => setTimeout(resolve, 50))
  await expect.element(screen.getByText('Logado: christian.camilo')).toBeVisible()
})

function App({ auth }: { auth: AuthService }) {
  return (
    <MemoryRouter initialEntries={['/inventory?q=freio']}>
      <SessionProvider auth={auth}>
        <Routes>
          <Route path="/login" element={<LoginStub />} />
          <Route
            path="/inventory"
            element={
              <RequireSession>
                <Dashboard />
              </RequireSession>
            }
          />
        </Routes>
      </SessionProvider>
    </MemoryRouter>
  )
}

function Dashboard() {
  return <p>Painel de {useSession().user?.username}</p>
}

function LoginStub() {
  const from = (useLocation().state as { from?: string } | null)?.from
  return <p>Login, depois {from}</p>
}

function LogIn() {
  const { user, setUser } = useSession()
  return user ? (
    <p>Logado: {user.username}</p>
  ) : (
    <button type="button" onClick={() => setUser(USER)}>
      Entrar
    </button>
  )
}
