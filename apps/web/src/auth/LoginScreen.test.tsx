import { createMockAuth, LOGIN_MESSAGES, type AuthService, type SessionUser } from '@apc/shared/auth'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import { TEST_USERS } from '@apc/shared/test-users'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { LoginScreen } from './LoginScreen.tsx'

// A login that keeps no session and answers at once.
const AUTH = createMockAuth({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }, TEST_USERS, 0)
const root = document.documentElement
const USER = TEST_USERS[0]

/**
 * Converts a hex color to the `rgb(r, g, b)` form the browser reports for computed styles.
 * @param hex Color as `#RRGGBB`.
 * @returns The same color as `rgb(r, g, b)`.
 */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

afterEach(async () => {
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the login in one style and mode, and checks the badge heads the page with its needle in the
    // accent, the two fields are labeled and "Entrar" is filled with the accent.
    test(`Web: the login follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} />)
      const mark = screen.getByRole('heading', { level: 1 }).getByRole('img', { name: 'APC Universal Repair' })
      await expect.element(mark).toBeVisible()
      expect(getComputedStyle(mark.element().querySelector('[data-part="needle"]')!).stroke).toBe(rgb(colors.accent))
      await expect.element(screen.getByLabelText('Usuário')).toBeVisible()
      await expect.element(screen.getByLabelText('Senha', { exact: true })).toBeVisible()
      expect(getComputedStyle(screen.getByRole('button', { name: 'Entrar' }).element()).backgroundColor).toBe(rgb(colors.accent))
    })
  }
}

// Presses "Entrar" with both fields empty, then with only the user, and checks nothing is sent: each empty field
// shows its message and is marked invalid, and the cursor goes to the first empty one.
test('Web: empty fields are not sent and the cursor goes to the first one', async () => {
  const login = vi.spyOn(AUTH, 'login')
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} />)
  await screen.getByRole('button', { name: 'Entrar' }).click()
  await expect.element(screen.getByText(LOGIN_MESSAGES.username)).toBeVisible()
  await expect.element(screen.getByText(LOGIN_MESSAGES.password)).toBeVisible()
  await expect.element(screen.getByLabelText('Usuário')).toHaveAttribute('aria-invalid', 'true')
  await expect.element(screen.getByLabelText('Usuário')).toHaveFocus()

  await userEvent.type(screen.getByLabelText('Usuário'), 'christian.camilo')
  await expect.element(screen.getByText(LOGIN_MESSAGES.username)).not.toBeInTheDocument()
  await screen.getByRole('button', { name: 'Entrar' }).click()
  await expect.element(screen.getByText(LOGIN_MESSAGES.password)).toBeVisible()
  await expect.element(screen.getByLabelText('Senha', { exact: true })).toHaveFocus()
  expect(login).not.toHaveBeenCalled()
  login.mockRestore()
})

// Fills in a test user and presses Enter in the password, and checks the login goes to the AuthService with what
// was typed and, accepted, hands the user over; a user of only spaces counts as empty and isn't sent.
test('Web: Enter sends the filled-in login and hands over the user', async () => {
  const onLoggedIn = vi.fn()
  const login = vi.spyOn(AUTH, 'login')
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={onLoggedIn} />)
  await userEvent.type(screen.getByLabelText('Usuário'), '   ')
  await userEvent.type(screen.getByLabelText('Senha', { exact: true }), `${USER.password}{Enter}`)
  await expect.element(screen.getByText(LOGIN_MESSAGES.username)).toBeVisible()
  expect(login).not.toHaveBeenCalled()

  await userEvent.fill(screen.getByLabelText('Usuário'), USER.username)
  await userEvent.click(screen.getByLabelText('Senha', { exact: true }))
  await userEvent.keyboard('{Enter}')
  expect(login).toHaveBeenCalledWith({ username: USER.username, password: USER.password })
  await expect.poll(() => onLoggedIn.mock.calls.length).toBe(1)
  expect(onLoggedIn).toHaveBeenCalledWith(expect.objectContaining({ username: USER.username, initials: 'CC' }))
  login.mockRestore()
})

// Sends a wrong password and checks one message shows above the form without blaming a field, the password is
// emptied and focused, the user stays, and nothing is handed over.
test('Web: a refused login says so above the form and empties the password', async () => {
  const onLoggedIn = vi.fn()
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={onLoggedIn} />)
  await userEvent.type(screen.getByLabelText('Usuário'), USER.username)
  await userEvent.type(screen.getByLabelText('Senha', { exact: true }), 'errada{Enter}')
  const alert = screen.getByRole('alert')
  await expect.element(alert).toHaveTextContent(LOGIN_MESSAGES.failed)
  const form = screen.container.querySelector('form')!
  expect(form.firstElementChild).toBe(alert.element())
  await expect.element(screen.getByLabelText('Senha', { exact: true })).toHaveValue('')
  await expect.element(screen.getByLabelText('Senha', { exact: true })).toHaveFocus()
  await expect.element(screen.getByLabelText('Usuário')).toHaveValue(USER.username)
  await expect.element(screen.getByLabelText('Usuário')).not.toHaveAttribute('aria-invalid')
  expect(onLoggedIn).not.toHaveBeenCalled()
})

// Holds the login's answer, presses "Entrar" and Enter again meanwhile, and checks "Entrar" says it is busy and
// the login is sent only once; once it answers, the button is back.
test('Web: Entrar shows it is busy and the login is sent only once', async () => {
  let answer: (user: SessionUser | null) => void = () => {}
  const slow: AuthService = { ...AUTH, login: vi.fn(() => new Promise<SessionUser | null>((resolve) => (answer = resolve))) }
  const screen = await render(<LoginScreen auth={slow} onLoggedIn={() => {}} />)
  await userEvent.type(screen.getByLabelText('Usuário'), USER.username)
  await userEvent.type(screen.getByLabelText('Senha', { exact: true }), USER.password)
  const entrar = screen.getByRole('button', { name: /Entrar/ })
  await entrar.click()
  await expect.element(entrar).toHaveAttribute('aria-busy', 'true')
  await entrar.click({ force: true })
  await userEvent.click(screen.getByLabelText('Senha', { exact: true }))
  await userEvent.keyboard('{Enter}')
  expect(slow.login).toHaveBeenCalledTimes(1)
  answer(null)
  await expect.element(entrar).not.toHaveAttribute('aria-busy', 'true')
})

// Checks the password's toggle says what it will do, "Mostrar senha" and then "Ocultar senha".
test('Web: the password toggle names its action', async () => {
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} />)
  await screen.getByRole('button', { name: 'Mostrar senha' }).click()
  await expect.element(screen.getByRole('button', { name: 'Ocultar senha' })).toBeVisible()
})

// Opens "Esqueceu a senha?" three times and closes the notice with "Entendi", Escape and a click outside, and checks
// it asks for the workshop's admin, starts on "Entendi", gives the focus back to the link each time and sends no
// login.
test('Web: the forgotten-password notice says whom to ask and closes three ways', async () => {
  const login = vi.spyOn(AUTH, 'login')
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} />)
  const link = screen.getByRole('button', { name: 'Esqueceu a senha?' })
  const dialog = screen.getByRole('dialog', { name: 'Esqueceu a senha?' })

  await link.click()
  await expect.element(dialog).toMatchTextContent(LOGIN_MESSAGES.forgotPassword)
  await expect.element(screen.getByRole('button', { name: 'Entendi' })).toHaveFocus()
  await screen.getByRole('button', { name: 'Entendi' }).click()
  await expect.element(dialog).not.toBeInTheDocument()
  await expect.element(link).toHaveFocus()

  await link.click()
  await userEvent.keyboard('{Escape}')
  await expect.element(dialog).not.toBeInTheDocument()
  await expect.element(link).toHaveFocus()

  await link.click()
  ;(dialog.element() as HTMLDialogElement).click()
  await expect.element(dialog).not.toBeInTheDocument()
  await expect.element(link).toHaveFocus()
  expect(login).not.toHaveBeenCalled()
  login.mockRestore()
})

// Lays the login out at 1280×720 and on a 360×780 phone, and checks the badge sits beside the form on desktop
// and above it, smaller, on the phone, with "Entrar" on screen and nothing scrolling sideways.
test('Web: the badge sits beside the form on desktop and above it on a phone', async () => {
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} />)
  const mark = () => screen.getByRole('img', { name: 'APC Universal Repair' }).element().getBoundingClientRect()
  const field = () => screen.getByLabelText('Usuário').element().getBoundingClientRect()
  expect(field().left).toBeGreaterThan(mark().right)
  const desktopWidth = mark().width

  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  expect(field().top).toBeGreaterThan(mark().bottom)
  expect(mark().width).toBeLessThan(desktopWidth)
  expect(screen.getByRole('button', { name: 'Entrar' }).element().getBoundingClientRect().bottom).toBeLessThanOrEqual(MIN_MOBILE_HEIGHT)
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(MIN_MOBILE_WIDTH)
})
