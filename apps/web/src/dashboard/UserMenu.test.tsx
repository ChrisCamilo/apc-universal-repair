import { SESSION_STORAGE_KEY, type SessionUser } from '@apc/shared/auth'
import { playIcon } from '@apc/shared/icons'
import { PAGE_SIZE_STORAGE_KEY } from '@apc/shared/pagination'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH } from '@apc/shared/screens'
import { REORDER_TABS_STORAGE_KEY } from '@apc/shared/tabs'
import { THEME_STORAGE_KEYS, themes } from '@apc/shared/theme'
import { useState, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { RELEASE_NOTES, RELEASE_VERSION } from 'virtual:apc-release'
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { SessionContext } from '../auth/sessionContext.ts'
import type { DesktopBridge } from '../desktop/desktopBridge.ts'
import { ServerSettingsContext } from '../desktop/serverSettingsContext.ts'
import { themeCss } from '../theme.ts'
import { ThemeProvider } from '../ThemeProvider.tsx'
import { PageSizeContext, usePageSizeChoice } from './pageSizeContext.ts'
import { TabReorderContext, useReorderChoice } from './tabReorderContext.ts'
import { UserMenu } from './UserMenu.tsx'

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
const USER: SessionUser = { id: 'user-christian', username: 'christian.camilo', displayName: 'Christian Camilo', initials: 'CC', inventoryTutorialSeen: true }

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

afterEach(() => {
  delete window.apcDesktop
})

beforeEach(() => {
  localStorage.clear()
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
})

// Opens the menu and checks the trigger and the header show the logged user, and the menu holds dark mode (on, at
// night), the theme on the active style, the tab reorder choice, off until turned on, and the Inventory's section,
// with no choice of opening an item on a row's click, which the list always does.
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
  expect(screen.getByRole('menuitemcheckbox', { name: /Abrir item ao clicar na linha/ }).elements()).toHaveLength(0)
})

// Opens the menu and checks "Tutorial do estoque" shows the play icon, its ring and triangle, in the accent.
test('Web: Tutorial do estoque shows the play icon', async () => {
  const screen = await render(<Sample />)
  await screen.getByRole('button', { name: 'Menu do usuário' }).click()
  const icon = screen.getByRole('menuitem', { name: 'Tutorial do estoque' }).element().querySelector('svg')!
  expect(icon.querySelector('circle')).not.toBeNull()
  expect(icon.querySelector('path')!.getAttribute('d')).toBe((playIcon[1] as { d: string }).d)
  expect(getComputedStyle(icon).color).toBe(rgb(themes.eighties.night.colors.accent))
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

// Picks "Sobre esta versão", set apart just before Sair, and checks the menu closes and the dialog opens on the version
// the app was built for, with its notes, which the build found in docs/releases, until Fechar closes it.
test('Web: Sobre esta versão opens the version in use and its notes', async () => {
  const screen = await render(<Sample />)
  await screen.getByRole('button', { name: 'Menu do usuário' }).click()
  const items = screen.getByRole('menu').element().querySelectorAll('[role^="menuitem"]')
  expect(items[items.length - 2].textContent).toBe('Sobre esta versão')
  await screen.getByRole('menuitem', { name: 'Sobre esta versão' }).click()
  await expect.element(screen.getByRole('menu')).not.toBeInTheDocument()
  const dialog = screen.getByRole('dialog', { name: 'Sobre esta versão' })
  await expect.element(dialog.getByText(`APC Universal Repair ${RELEASE_VERSION}`)).toBeVisible()
  expect(RELEASE_NOTES).toContain(`APC-Universal-Repair-Setup-${RELEASE_VERSION}.exe`)
  await expect.element(dialog.getByRole('heading', { level: 4 }).first()).toBeVisible()
  await dialog.getByRole('button', { name: 'Fechar' }).last().click()
  await expect.element(dialog).not.toBeInTheDocument()
})

// In a browser the menu has no Servidor item; in the desktop app it has "Servidor e banco de dados", which opens the
// Servidor dialog.
test('Web: in the desktop app the user menu opens the Servidor dialog', async () => {
  const plain = await render(<Sample />)
  await plain.getByRole('button', { name: 'Menu do usuário' }).click()
  await expect.element(plain.getByRole('menuitem', { name: 'Tutorial do estoque' })).toBeVisible()
  await expect.element(plain.getByRole('menuitem', { name: 'Servidor e banco de dados' })).not.toBeInTheDocument()
  plain.unmount()

  window.apcDesktop = { server: {} } as DesktopBridge
  const openServerSettings = vi.fn()
  const screen = await render(<Sample openServerSettings={openServerSettings} />)
  await screen.getByRole('button', { name: 'Menu do usuário' }).click()
  await screen.getByRole('menuitem', { name: 'Servidor e banco de dados' }).click()
  expect(openServerSettings).toHaveBeenCalledOnce()
})

function Sample({ openServerSettings = () => {} }: { openServerSettings?: () => void }) {
  const [user, setUser] = useState<SessionUser | null>(USER)
  return (
    <ServerSettingsContext.Provider value={openServerSettings}>
      <MemoryRouter initialEntries={['/inventory']}>
        <ThemeProvider>
          <SessionContext.Provider value={{ user, expired: false, setUser, markInventoryTutorialSeen: () => {} }}>
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
    </ServerSettingsContext.Provider>
  )
}

function Preferences({ children }: { children: ReactNode }) {
  return (
    <TabReorderContext.Provider value={useReorderChoice()}>
      <PageSizeContext.Provider value={usePageSizeChoice()}>{children}</PageSizeContext.Provider>
    </TabReorderContext.Provider>
  )
}
