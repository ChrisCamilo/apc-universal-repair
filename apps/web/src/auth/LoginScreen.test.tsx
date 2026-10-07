import { LOGIN_MESSAGES } from '@apc/shared/auth'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { LoginScreen } from './LoginScreen.tsx'

const root = document.documentElement

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
  await page.viewport(1280, 720)
})

afterEach(async () => {
  await page.viewport(1280, 720)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the login in one style and mode, and checks the badge heads the page with its needle in the
    // accent, the two fields are labeled and "Entrar" is filled with the accent.
    test(`Web: the login follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<LoginScreen onSubmit={() => {}} />)
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
  const onSubmit = vi.fn()
  const screen = await render(<LoginScreen onSubmit={onSubmit} />)
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
  expect(onSubmit).not.toHaveBeenCalled()
})

// Fills both fields and presses Enter in the password, and checks the login is sent with what was typed; a user
// of only spaces counts as empty.
test('Web: Enter sends the filled-in login', async () => {
  const onSubmit = vi.fn()
  const screen = await render(<LoginScreen onSubmit={onSubmit} />)
  await userEvent.type(screen.getByLabelText('Usuário'), '   ')
  await userEvent.type(screen.getByLabelText('Senha', { exact: true }), 'opala4100{Enter}')
  await expect.element(screen.getByText(LOGIN_MESSAGES.username)).toBeVisible()
  expect(onSubmit).not.toHaveBeenCalled()

  await userEvent.fill(screen.getByLabelText('Usuário'), 'christian.camilo')
  await userEvent.click(screen.getByLabelText('Senha', { exact: true }))
  await userEvent.keyboard('{Enter}')
  expect(onSubmit).toHaveBeenCalledWith({ username: 'christian.camilo', password: 'opala4100' })
})

// Checks the password's toggle says what it will do, "Mostrar senha" and then "Ocultar senha", and that
// "Esqueceu a senha?" is a button that doesn't send the form.
test('Web: the password toggle names its action and the forgotten-password link sends nothing', async () => {
  const onSubmit = vi.fn()
  const screen = await render(<LoginScreen onSubmit={onSubmit} />)
  await screen.getByRole('button', { name: 'Mostrar senha' }).click()
  await expect.element(screen.getByRole('button', { name: 'Ocultar senha' })).toBeVisible()
  await screen.getByRole('button', { name: 'Esqueceu a senha?' }).click()
  await expect.element(screen.getByText(LOGIN_MESSAGES.username)).not.toBeInTheDocument()
  expect(onSubmit).not.toHaveBeenCalled()
})

// Lays the login out at 1280×720 and on a 360×780 phone, and checks the badge sits beside the form on desktop
// and above it, smaller, on the phone, with "Entrar" on screen and nothing scrolling sideways.
test('Web: the badge sits beside the form on desktop and above it on a phone', async () => {
  const screen = await render(<LoginScreen onSubmit={() => {}} />)
  const mark = () => screen.getByRole('img', { name: 'APC Universal Repair' }).element().getBoundingClientRect()
  const field = () => screen.getByLabelText('Usuário').element().getBoundingClientRect()
  expect(field().left).toBeGreaterThan(mark().right)
  const desktopWidth = mark().width

  await page.viewport(360, 780)
  expect(field().top).toBeGreaterThan(mark().bottom)
  expect(mark().width).toBeLessThan(desktopWidth)
  expect(screen.getByRole('button', { name: 'Entrar' }).element().getBoundingClientRect().bottom).toBeLessThanOrEqual(780)
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360)
})
