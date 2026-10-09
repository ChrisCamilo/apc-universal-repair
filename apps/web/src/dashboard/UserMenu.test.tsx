import { SESSION_STORAGE_KEY, type SessionUser } from '@apc/shared/auth'
import { OPEN_ITEM_ON_ROW_STORAGE_KEY } from '@apc/shared/items'
import { PAGE_SIZE_STORAGE_KEY } from '@apc/shared/pagination'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH } from '@apc/shared/screens'
import { REORDER_TABS_STORAGE_KEY } from '@apc/shared/tabs'
import { THEME_STORAGE_KEYS } from '@apc/shared/theme'
import { useState, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeAll, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { SessionContext } from '../auth/sessionContext.ts'
import { themeCss } from '../theme.ts'
import { ThemeProvider } from '../ThemeProvider.tsx'
import { OpenItemOnRowContext, useOpenItemOnRowChoice } from './openItemOnRowContext.ts'
import { PageSizeContext, usePageSizeChoice } from './pageSizeContext.ts'
import { TabReorderContext, useReorderChoice } from './tabReorderContext.ts'
import { UserMenu } from './UserMenu.tsx'

const root = document.documentElement
const USER: SessionUser = { id: 'user-christian', username: 'christian.camilo', displayName: 'Christian Camilo', initials: 'CC' }

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

beforeEach(() => {
  localStorage.clear()
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
})

// Opens the menu and checks the trigger and the header show the logged user, and the menu holds dark mode (on, at
// night), the theme on the active style, the tab reorder choice, off until turned on, and the Inventory's "Abrir
// item ao clicar na linha", on until turned off.
test('Web: the user menu shows the logged user and the display preferences', async () => {
  const screen = await render(<Sample />)
  const trigger = screen.getByRole('button', { name: 'Menu do usuário' })
  await expect.element(trigger).toHaveTextContent('CCchristian.camilo')
  await trigger.click()
  await expect.element(screen.getByRole('menu').getByText('Christian Camilo')).toBeVisible()
  await expect.element(screen.getByRole('menuitemcheckbox', { name: 'Modo escuro' })).toHaveAttribute('aria-checked', 'true')
  await expect.element(screen.getByRole('menuitemradio', { name: 'Anos 80' })).toHaveAttribute('aria-checked', 'true')
  await expect.element(screen.getByRole('menuitemcheckbox', { name: /Arrastar para reordenar/ })).toHaveAttribute('aria-checked', 'false')
  await expect.element(screen.getByRole('menu').getByText('Estoque')).toBeVisible()
  await expect.element(screen.getByRole('menuitemcheckbox', { name: /Abrir item ao clicar na linha/ })).toHaveAttribute('aria-checked', 'true')
})

// Turns dark mode off and picks GT4, and checks each applies to the page and is saved at once, with the menu still
// open between the two.
test('Web: dark mode and the theme apply and are saved at once, keeping the menu open', async () => {
  const screen = await render(<Sample />)
  await screen.getByRole('button', { name: 'Menu do usuário' }).click()
  await screen.getByRole('menuitemcheckbox', { name: 'Modo escuro' }).click()
  await expect.poll(() => root.dataset.mode).toBe('day')
  expect(localStorage.getItem(THEME_STORAGE_KEYS.mode)).toBe('day')
  await expect.element(screen.getByRole('menu')).toBeVisible()
  await screen.getByRole('menuitemradio', { name: 'GT4' }).click()
  await expect.poll(() => root.dataset.style).toBe('gt4')
  expect(localStorage.getItem(THEME_STORAGE_KEYS.style)).toBe('gt4')
  await expect.element(screen.getByRole('menuitemradio', { name: 'GT4' })).toHaveAttribute('aria-checked', 'true')
  await expect.element(screen.getByRole('menu')).toBeVisible()
})

// Turns tab reordering on and checks it is saved on the device and comes back on when the menu is drawn again.
test('Web: the tab reorder choice is saved and comes back', async () => {
  const screen = await render(<Sample />)
  await screen.getByRole('button', { name: 'Menu do usuário' }).click()
  await screen.getByRole('menuitemcheckbox', { name: /Arrastar para reordenar/ }).click()
  expect(localStorage.getItem(REORDER_TABS_STORAGE_KEY)).toBe('true')
  await userEvent.keyboard('{Escape}')

  const again = await render(<Sample />)
  await again.getByRole('button', { name: 'Menu do usuário' }).last().click()
  await expect.element(again.getByRole('menuitemcheckbox', { name: /Arrastar para reordenar/ })).toHaveAttribute('aria-checked', 'true')
})

// Turns "Abrir item ao clicar na linha" off and checks it is saved on the device and comes back off when the menu is
// drawn again.
test('Web: the open-item-on-row choice is saved and comes back', async () => {
  const screen = await render(<Sample />)
  await screen.getByRole('button', { name: 'Menu do usuário' }).click()
  await screen.getByRole('menuitemcheckbox', { name: /Abrir item ao clicar na linha/ }).click()
  expect(localStorage.getItem(OPEN_ITEM_ON_ROW_STORAGE_KEY)).toBe('false')
  await expect.element(screen.getByRole('menu')).toBeVisible()
  await userEvent.keyboard('{Escape}')

  const again = await render(<Sample />)
  await again.getByRole('button', { name: 'Menu do usuário' }).last().click()
  await expect.element(again.getByRole('menuitemcheckbox', { name: /Abrir item ao clicar na linha/ })).toHaveAttribute('aria-checked', 'false')
})

// Picks 50 items per page and checks it is saved on the device and comes back chosen when the menu is drawn again,
// with 25 chosen until then.
test('Web: the items per page default is saved and comes back', async () => {
  const screen = await render(<Sample />)
  await screen.getByRole('button', { name: 'Menu do usuário' }).click()
  await expect.element(screen.getByRole('menuitemradio', { name: '25' })).toHaveAttribute('aria-checked', 'true')
  await screen.getByRole('menuitemradio', { name: '50' }).click()
  expect(localStorage.getItem(PAGE_SIZE_STORAGE_KEY)).toBe('50')
  await expect.element(screen.getByRole('menu')).toBeVisible()
  await userEvent.keyboard('{Escape}')

  const again = await render(<Sample />)
  await again.getByRole('button', { name: 'Menu do usuário' }).last().click()
  await expect.element(again.getByRole('menuitemradio', { name: '50' })).toHaveAttribute('aria-checked', 'true')
})

// Saves a session and some preferences, picks "Sair" at the end of the menu, and checks the session is gone, nobody
// is logged in any more and the app is on /login, while the theme and the reorder choice stay on the device.
test('Web: Sair ends the session and goes to the login, keeping the preferences', async () => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(USER))
  localStorage.setItem(THEME_STORAGE_KEYS.style, 'fiat90')
  localStorage.setItem(REORDER_TABS_STORAGE_KEY, 'true')
  const screen = await render(<Sample />)
  await screen.getByRole('button', { name: 'Menu do usuário' }).click()
  const items = screen.getByRole('menu').element().querySelectorAll('[role^="menuitem"]')
  expect(items[items.length - 1].textContent).toBe('Sair')
  await expect.element(screen.getByRole('menu').getByRole('separator')).toBeInTheDocument()
  await screen.getByRole('menuitem', { name: 'Sair' }).click()
  await expect.element(screen.getByText('Tela de login, ninguém logado')).toBeVisible()
  expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  expect(localStorage.getItem(THEME_STORAGE_KEYS.style)).toBe('fiat90')
  expect(localStorage.getItem(REORDER_TABS_STORAGE_KEY)).toBe('true')
})

function Sample() {
  const [user, setUser] = useState<SessionUser | null>(USER)
  return (
    <MemoryRouter initialEntries={['/inventory']}>
      <ThemeProvider>
        <SessionContext.Provider value={{ user, setUser }}>
          <Routes>
            <Route
              path="/inventory"
              element={
                // At the right of the page, as in the Dashboard header, so the menu opens on screen.
                <div className="flex justify-end">
                  <Preferences>
                    <UserMenu />
                  </Preferences>
                </div>
              }
            />
            <Route path="/login" element={<p>Tela de login, {user ? 'alguém logado' : 'ninguém logado'}</p>} />
          </Routes>
        </SessionContext.Provider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

function Preferences({ children }: { children: ReactNode }) {
  return (
    <TabReorderContext.Provider value={useReorderChoice()}>
      <OpenItemOnRowContext.Provider value={useOpenItemOnRowChoice()}>
        <PageSizeContext.Provider value={usePageSizeChoice()}>{children}</PageSizeContext.Provider>
      </OpenItemOnRowContext.Provider>
    </TabReorderContext.Provider>
  )
}
