import { createMockAuth, LOGIN_BRAND, LOGIN_INTRO, LOGIN_MESSAGES, tooManyAttempts, type AuthService, type SessionUser } from '@apc/shared/auth'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH, MIN_TOUCH_TARGET } from '@apc/shared/screens'
import { isStyleId } from '@apc/shared/style-ids'
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
      const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} onRegister={() => {}} />)
      const mark = screen.getByRole('heading', { level: 1 }).getByRole('img', { name: 'APC Universal Repair' })
      await expect.element(mark).toBeVisible()
      expect(getComputedStyle(mark.element().querySelector('[data-testid="common.brand-mark.needle"]')!).stroke).toBe(rgb(colors.accent))
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
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} onRegister={() => {}} />)
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
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={onLoggedIn} onRegister={() => {}} />)
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

// Opens the login filled in, as the demo does after "Sair", and checks the fields show the user and password, and
// "Entrar" sends them as they are.
test('Web: a login opened filled in sends what it shows', async () => {
  const login = vi.spyOn(AUTH, 'login')
  const filled = { username: USER.username, password: USER.password }
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} onRegister={() => {}} initialCredentials={filled} />)
  await expect.element(screen.getByLabelText('Usuário')).toHaveValue(USER.username)
  await expect.element(screen.getByLabelText('Senha', { exact: true })).toHaveValue(USER.password)
  await screen.getByRole('button', { name: 'Entrar' }).click()
  expect(login).toHaveBeenCalledWith(filled)
  login.mockRestore()
})

// Sends a wrong password and checks one message shows above the form without blaming a field, the password is
// emptied and focused, the user stays, and nothing is handed over.
test('Web: a refused login says so above the form and empties the password', async () => {
  const onLoggedIn = vi.fn()
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={onLoggedIn} onRegister={() => {}} />)
  await userEvent.type(screen.getByLabelText('Usuário'), USER.username)
  await userEvent.type(screen.getByLabelText('Senha', { exact: true }), 'errada{Enter}')
  const alert = screen.getByRole('alert')
  await expect.element(alert).toHaveTextContent(LOGIN_MESSAGES.failed)
  const form = screen.getByTestId('auth.login-screen.form').element()
  expect(form.firstElementChild).toBe(alert.element())
  await expect.element(screen.getByLabelText('Senha', { exact: true })).toHaveValue('')
  await expect.element(screen.getByLabelText('Senha', { exact: true })).toHaveFocus()
  await expect.element(screen.getByLabelText('Usuário')).toHaveValue(USER.username)
  await expect.element(screen.getByLabelText('Usuário')).not.toHaveAttribute('aria-invalid')
  expect(onLoggedIn).not.toHaveBeenCalled()
})

// Opens the login after the session expired, and checks the notice heads the form as a status until a login is
// sent, which a refused one then replaces with its own message.
test('Web: the login says the session expired until a login is sent', async () => {
  const screen = await render(<LoginScreen auth={AUTH} notice={LOGIN_MESSAGES.expired} onLoggedIn={() => {}} onRegister={() => {}} />)
  const status = screen.getByRole('status')
  await expect.element(status).toHaveTextContent(LOGIN_MESSAGES.expired)
  expect(screen.getByTestId('auth.login-screen.form').element().firstElementChild).toBe(status.element())
  await userEvent.type(screen.getByLabelText('Usuário'), USER.username)
  await userEvent.type(screen.getByLabelText('Senha', { exact: true }), 'errada{Enter}')
  await expect.element(screen.getByRole('alert')).toHaveTextContent(LOGIN_MESSAGES.failed)
  expect(screen.container.textContent).not.toContain(LOGIN_MESSAGES.expired)
})

// Checks the parts of the screen carry their style ids, the same as on mobile: the page, the badge's heading, the
// form and its actions, each on its own element; and that every id on the screen is written as the convention asks.
test('Web: the login screen carries its style ids', async () => {
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} onRegister={() => {}} />)
  const tag = (id: string) => screen.getByTestId(id).element().tagName
  expect(tag('auth.login-screen')).toBe('MAIN')
  expect(tag('auth.login-screen.layout')).toBe('DIV')
  expect(tag('auth.login-screen.brand.title')).toBe('H1')
  expect(tag('auth.login-screen.form')).toBe('FORM')
  await expect.element(screen.getByTestId('auth.login-screen.form.actions').getByRole('button', { name: 'Entrar' })).toBeVisible()
  const ids = [...screen.container.querySelectorAll('[data-testid]')].map((element) => element.getAttribute('data-testid')!)
  expect(ids.filter((id) => id.startsWith('auth.') && !isStyleId(id))).toEqual([])
})

// Holds the login's answer, presses "Entrar" and Enter again meanwhile, and checks "Entrar" says it is busy and
// the login is sent only once; once it answers, the button is back.
test('Web: Entrar shows it is busy and the login is sent only once', async () => {
  let answer: (user: SessionUser | null) => void = () => {}
  const slow: AuthService = { ...AUTH, login: vi.fn(() => new Promise<SessionUser | null>((resolve) => (answer = resolve))) }
  const screen = await render(<LoginScreen auth={slow} onLoggedIn={() => {}} onRegister={() => {}} />)
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

// Makes the login fail to be checked, as when the API is out of reach, and checks the screen says so instead of
// blaming the user or password, keeping the password typed.
test('Web: a login that can\'t be checked says the API is out of reach', async () => {
  const offline: AuthService = { ...AUTH, login: vi.fn(() => Promise.reject(new TypeError('fetch failed'))) }
  const screen = await render(<LoginScreen auth={offline} onLoggedIn={() => {}} onRegister={() => {}} />)
  await userEvent.type(screen.getByLabelText('Usuário'), USER.username)
  await userEvent.type(screen.getByLabelText('Senha', { exact: true }), `${USER.password}{Enter}`)
  await expect.element(screen.getByRole('alert')).toHaveTextContent(LOGIN_MESSAGES.unreachable)
  await expect.element(screen.getByLabelText('Senha', { exact: true })).toHaveValue(USER.password)
})

// Has the login refused after too many attempts, and checks the screen says how many minutes to wait, keeping the
// password typed and "Entrar" enabled, and hands nothing over.
test('Web: too many attempts say how many minutes to wait', async () => {
  const onLoggedIn = vi.fn()
  const limited: AuthService = { ...AUTH, login: vi.fn(async () => ({ refused: tooManyAttempts('840') })) }
  const screen = await render(<LoginScreen auth={limited} onLoggedIn={onLoggedIn} onRegister={() => {}} />)
  await userEvent.type(screen.getByLabelText('Usuário'), USER.username)
  await userEvent.type(screen.getByLabelText('Senha', { exact: true }), `${USER.password}{Enter}`)
  await expect.element(screen.getByRole('alert')).toHaveTextContent('Muitas tentativas. Tente de novo em 14 min.')
  await expect.element(screen.getByLabelText('Senha', { exact: true })).toHaveValue(USER.password)
  await expect.element(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  expect(onLoggedIn).not.toHaveBeenCalled()
})

// Presses "Criar conta" and checks it asks to open the sign-up, sending no login.
test('Web: Criar conta opens the sign-up', async () => {
  const onRegister = vi.fn()
  const login = vi.spyOn(AUTH, 'login')
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} onRegister={onRegister} />)
  await screen.getByRole('button', { name: 'Criar conta' }).click()
  expect(onRegister).toHaveBeenCalledTimes(1)
  expect(login).not.toHaveBeenCalled()
  login.mockRestore()
})

// Without the way to open the Servidor dialog, as in a browser, the login has no link to it.
test('Web: in a browser the login has no Servidor link', async () => {
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} onRegister={() => {}} />)
  await expect.element(screen.getByRole('button', { name: 'Criar conta' })).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Servidor e banco de dados' })).not.toBeInTheDocument()
})

// With the way to open the Servidor dialog, as in the desktop app, the link opens it, sending no login.
test('Web: in the desktop app the login opens the Servidor dialog', async () => {
  const onServerSettings = vi.fn()
  const login = vi.spyOn(AUTH, 'login')
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} onRegister={() => {}} onServerSettings={onServerSettings} />)
  await screen.getByRole('button', { name: 'Servidor e banco de dados' }).click()
  expect(onServerSettings).toHaveBeenCalledTimes(1)
  expect(login).not.toHaveBeenCalled()
  login.mockRestore()
})

// Checks the password's toggle says what it will do, "Mostrar senha" and then "Ocultar senha".
test('Web: the password toggle names its action', async () => {
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} onRegister={() => {}} />)
  await screen.getByRole('button', { name: 'Mostrar senha' }).click()
  await expect.element(screen.getByRole('button', { name: 'Ocultar senha' })).toBeVisible()
})

// Opens "Esqueceu a senha?" three times and closes the notice with "Entendi", Escape and a click outside, and checks
// it asks for the workshop's admin, starts on "Entendi", gives the focus back to the link each time and sends no
// login.
test('Web: the forgotten-password notice says whom to ask and closes three ways', async () => {
  const login = vi.spyOn(AUTH, 'login')
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} onRegister={() => {}} />)
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

// Lays the login out at 1280×720 and checks the desktop as it was: the badge, which names the page, beside the form,
// "Criar conta" a link under "Entrar", and none of the phone's brand, intro or bottom button.
test('Web: on the desktop the badge sits beside the form', async () => {
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} onRegister={() => {}} />)
  const mark = screen.getByRole('img', { name: 'APC Universal Repair' }).element().getBoundingClientRect()
  expect(screen.getByLabelText('Usuário').element().getBoundingClientRect().left).toBeGreaterThan(mark.right)
  await expect.element(screen.getByRole('heading', { level: 1 })).toContainElement(screen.getByRole('img', { name: 'APC Universal Repair' }).element() as HTMLElement)
  await expect.element(screen.getByText(LOGIN_INTRO)).not.toBeVisible()
  await expect.element(screen.getByText('Ainda não tem conta?')).not.toBeVisible()
  const register = screen.getByRole('button', { name: 'Criar conta' })
  await expect.element(register).toBeVisible()
  expect(register.element().getBoundingClientRect().top).toBeGreaterThan(screen.getByRole('button', { name: 'Entrar' }).element().getBoundingClientRect().bottom)
})

// Lays the login out on a 360×780 phone and checks the mockup's one column: the 72px mark over the name and the
// tagline, which head the page as "APC Universal Repair", what the login asks for, the fields, "Esqueceu a senha?" at
// the right under the password, 44px tall, "Entrar" across, and the question with an outline "Criar conta" across the
// bottom of the screen, with nothing scrolling sideways.
test('Web: on a phone the login is one column, the brand on top and Criar conta at the bottom', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const onRegister = vi.fn()
  const screen = await render(<LoginScreen auth={AUTH} onLoggedIn={() => {}} onRegister={onRegister} />)
  const box = (element: Element) => element.getBoundingClientRect()
  const heading = screen.getByRole('heading', { level: 1, name: 'APC Universal Repair' })
  await expect.element(heading).toBeVisible()
  await expect.element(screen.getByRole('img', { name: 'APC Universal Repair' })).not.toBeInTheDocument()
  const mark = box(screen.getByTestId('auth.login-screen.heading').element().querySelector('svg')!)
  expect([mark.width, mark.height]).toEqual([LOGIN_BRAND.mark, LOGIN_BRAND.mark])
  expect(mark.left + mark.width / 2).toBeCloseTo(MIN_MOBILE_WIDTH / 2, 0)
  expect(getComputedStyle(screen.getByTestId('auth.login-screen.heading.title.name').element()).fontSize).toBe(`${LOGIN_BRAND.name}px`)
  expect(getComputedStyle(screen.getByTestId('auth.login-screen.heading.title.tagline').element()).fontSize).toBe(`${LOGIN_BRAND.tagline}px`)

  const intro = box(screen.getByText(LOGIN_INTRO).element())
  const username = box(screen.getByLabelText('Usuário').element().parentElement!)
  const password = box(screen.getByLabelText('Senha', { exact: true }).element().parentElement!)
  const forgot = box(screen.getByRole('button', { name: 'Esqueceu a senha?' }).element())
  const submit = box(screen.getByRole('button', { name: 'Entrar' }).element())
  expect(intro.top).toBeGreaterThan(box(heading.element()).bottom)
  expect(username.top).toBeGreaterThan(intro.bottom)
  expect(forgot.top).toBeGreaterThan(password.bottom)
  expect(forgot.right).toBeCloseTo(password.right, 0)
  expect(forgot.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET)
  expect(submit.top).toBeGreaterThan(forgot.bottom)
  expect(submit.width).toBeCloseTo(password.width, 0)
  expect(submit.bottom).toBeLessThanOrEqual(MIN_MOBILE_HEIGHT)

  await expect.element(screen.getByText('Ainda não tem conta?')).toBeVisible()
  const register = screen.getByRole('button', { name: 'Criar conta' })
  expect(box(register.element()).width).toBeCloseTo(password.width, 0)
  expect(box(register.element()).bottom).toBeGreaterThan(MIN_MOBILE_HEIGHT - 64)
  expect(box(register.element()).bottom).toBeLessThanOrEqual(MIN_MOBILE_HEIGHT)
  await register.click()
  expect(onRegister).toHaveBeenCalledOnce()
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(MIN_MOBILE_WIDTH)
})
