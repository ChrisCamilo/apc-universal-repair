import { createMockAuth, REGISTER_MESSAGES, type AuthService, type RegisterResult } from '@apc/shared/auth'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import { isStyleId } from '@apc/shared/style-ids'
import { TEST_USERS } from '@apc/shared/test-users'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render, type RenderResult } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { RegisterScreen } from './RegisterScreen.tsx'

// The fields as a new user fills them in.
const NEW_USER = { displayName: 'Ana Souza', username: 'Ana.Souza', email: 'ana@oficina.com', password: 'freio1234' }
const root = document.documentElement

/**
 * Builds a sign-up that keeps no session and answers at once, knowing the test users.
 * @returns The AuthService.
 */
function mockAuth(): AuthService {
  return createMockAuth({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }, TEST_USERS, 0)
}

/**
 * Converts a hex color to the `rgb(r, g, b)` form the browser reports for computed styles.
 * @param hex Color as `#RRGGBB`.
 * @returns The same color as `rgb(r, g, b)`.
 */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Fills in every field of the sign-up.
 * @param screen The rendered screen.
 * @param user The fields to type; the password is typed again in the confirmation.
 */
async function fillIn(screen: RenderResult, user = NEW_USER) {
  await userEvent.fill(screen.getByLabelText('Nome'), user.displayName)
  await userEvent.fill(screen.getByLabelText('Usuário'), user.username)
  await userEvent.fill(screen.getByLabelText('E-mail'), user.email)
  await userEvent.fill(screen.getByLabelText('Senha', { exact: true }), user.password)
  await userEvent.fill(screen.getByLabelText('Confirmar senha'), user.password)
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
    // Renders the sign-up in one style and mode, and checks the badge heads the page, the five fields are labeled,
    // the passwords are hidden and offer to make one up, and "Criar conta" is filled with the accent.
    test(`Web: the sign-up follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<RegisterScreen auth={mockAuth()} onRegistered={() => {}} onLogin={() => {}} />)
      await expect.element(screen.getByRole('heading', { level: 1 }).getByRole('img', { name: 'APC Universal Repair' })).toBeVisible()
      for (const label of ['Nome', 'Usuário', 'E-mail']) {
        await expect.element(screen.getByLabelText(label)).toBeVisible()
      }
      for (const password of [screen.getByLabelText('Senha', { exact: true }), screen.getByLabelText('Confirmar senha')]) {
        await expect.element(password).toHaveAttribute('type', 'password')
        await expect.element(password).toHaveAttribute('autocomplete', 'new-password')
      }
      expect(getComputedStyle(screen.getByRole('button', { name: 'Criar conta' }).element()).backgroundColor).toBe(rgb(colors.accent))
    })
  }
}

// Presses "Criar conta" empty, then with a short password typed differently twice, and checks nothing is sent: each
// field that breaks a rule shows its message, the cursor goes to the first, and a message goes once its field changes.
test('Web: a sign-up breaking a rule is not sent and the cursor goes to the first field', async () => {
  const auth = mockAuth()
  const register = vi.spyOn(auth, 'register')
  const screen = await render(<RegisterScreen auth={auth} onRegistered={() => {}} onLogin={() => {}} />)
  await screen.getByRole('button', { name: 'Criar conta' }).click()
  for (const message of [REGISTER_MESSAGES.displayName, REGISTER_MESSAGES.username, REGISTER_MESSAGES.email, REGISTER_MESSAGES.password, REGISTER_MESSAGES.confirm]) {
    await expect.element(screen.getByText(message)).toBeVisible()
  }
  await expect.element(screen.getByLabelText('Nome')).toHaveFocus()

  await fillIn(screen, { ...NEW_USER, password: 'curta' })
  await userEvent.fill(screen.getByLabelText('Confirmar senha'), 'outra')
  await expect.element(screen.getByText(REGISTER_MESSAGES.confirm)).not.toBeInTheDocument()
  await screen.getByRole('button', { name: 'Criar conta' }).click()
  await expect.element(screen.getByText(REGISTER_MESSAGES.passwordShort)).toBeVisible()
  await expect.element(screen.getByText(REGISTER_MESSAGES.confirmMismatch)).toBeVisible()
  await expect.element(screen.getByLabelText('Senha', { exact: true })).toHaveFocus()
  expect(register).not.toHaveBeenCalled()
})

// Fills in a new user and presses Enter, and checks the sign-up goes to the AuthService without the confirmation and
// hands the new user over, logged in.
test('Web: Enter sends the sign-up and hands over the new user', async () => {
  const auth = mockAuth()
  const register = vi.spyOn(auth, 'register')
  const onRegistered = vi.fn()
  const screen = await render(<RegisterScreen auth={auth} onRegistered={onRegistered} onLogin={() => {}} />)
  await fillIn(screen)
  await userEvent.click(screen.getByLabelText('Confirmar senha'))
  await userEvent.keyboard('{Enter}')
  expect(register).toHaveBeenCalledWith(NEW_USER)
  await expect.poll(() => onRegistered.mock.calls.length).toBe(1)
  expect(onRegistered).toHaveBeenCalledWith({ id: 'user-ana.souza', username: 'ana.souza', displayName: 'Ana Souza', initials: 'AS' })
})

// Signs up with a test user's username, and checks the refusal shows above the form, the fields stay as typed and
// nobody is handed over.
test('Web: a taken username is refused above the form', async () => {
  const onRegistered = vi.fn()
  const screen = await render(<RegisterScreen auth={mockAuth()} onRegistered={onRegistered} onLogin={() => {}} />)
  await fillIn(screen, { ...NEW_USER, username: TEST_USERS[0].username })
  await screen.getByRole('button', { name: 'Criar conta' }).click()
  const alert = screen.getByRole('alert')
  await expect.element(alert).toHaveTextContent(REGISTER_MESSAGES.taken)
  expect(screen.getByTestId('auth.register-screen.form').element().firstElementChild).toBe(alert.element())
  await expect.element(screen.getByLabelText('Usuário')).toHaveValue(TEST_USERS[0].username)
  expect(onRegistered).not.toHaveBeenCalled()
})

// Holds the sign-up's answer and checks "Criar conta" says it is busy and the sign-up is sent only once.
test('Web: Criar conta shows it is busy and the sign-up is sent only once', async () => {
  let answer: (result: RegisterResult) => void = () => {}
  const slow: AuthService = { ...mockAuth(), register: vi.fn(() => new Promise<RegisterResult>((resolve) => (answer = resolve))) }
  const screen = await render(<RegisterScreen auth={slow} onRegistered={() => {}} onLogin={() => {}} />)
  await fillIn(screen)
  const create = screen.getByRole('button', { name: /Criar conta/ })
  await create.click()
  await expect.element(create).toHaveAttribute('aria-busy', 'true')
  await create.click({ force: true })
  expect(slow.register).toHaveBeenCalledTimes(1)
  answer({ refused: REGISTER_MESSAGES.failed })
  await expect.element(screen.getByRole('alert')).toHaveTextContent(REGISTER_MESSAGES.failed)
  await expect.element(create).not.toHaveAttribute('aria-busy', 'true')
})

// Presses "Já tem conta? Entrar" and checks it asks to go back to the login.
test('Web: Já tem conta? Entrar goes back to the login', async () => {
  const onLogin = vi.fn()
  const screen = await render(<RegisterScreen auth={mockAuth()} onRegistered={() => {}} onLogin={onLogin} />)
  await screen.getByRole('button', { name: 'Já tem conta? Entrar' }).click()
  expect(onLogin).toHaveBeenCalledTimes(1)
})

// Checks the parts of the screen carry their style ids, the same as the login's under auth.register-screen, and that
// every id on the screen is written as the convention asks.
test('Web: the sign-up screen carries its style ids', async () => {
  const screen = await render(<RegisterScreen auth={mockAuth()} onRegistered={() => {}} onLogin={() => {}} />)
  const tag = (id: string) => screen.getByTestId(id).element().tagName
  expect(tag('auth.register-screen')).toBe('MAIN')
  expect(tag('auth.register-screen.brand.title')).toBe('H1')
  expect(tag('auth.register-screen.form')).toBe('FORM')
  await expect.element(screen.getByTestId('auth.register-screen.form.actions').getByRole('button', { name: 'Criar conta' })).toBeVisible()
  const ids = [...screen.container.querySelectorAll('[data-testid]')].map((element) => element.getAttribute('data-testid')!)
  expect(ids.filter((id) => id.startsWith('auth.') && !isStyleId(id))).toEqual([])
})

// Lays the sign-up out on a 360×780 phone and checks the badge sits above the form and nothing scrolls sideways.
test('Web: the sign-up fits a phone with the badge above the form', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const screen = await render(<RegisterScreen auth={mockAuth()} onRegistered={() => {}} onLogin={() => {}} />)
  const mark = screen.getByRole('img', { name: 'APC Universal Repair' }).element().getBoundingClientRect()
  expect(screen.getByLabelText('Nome').element().getBoundingClientRect().top).toBeGreaterThan(mark.bottom)
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(MIN_MOBILE_WIDTH)
})
