import { useState } from 'react'
import type { SessionUser } from '@apc/shared/auth'
import { addNotification, notificationsKey, type Notification } from '@apc/shared/notifications'
import { themes } from '@apc/shared/theme'
import { beforeAll, beforeEach, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import '../index.css'
import { SessionContext } from '../auth/sessionContext.ts'
import { Button } from '../components/Button.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { useToast } from '../components/toastContext.ts'
import { themeCss } from '../theme.ts'
import { NotificationsMenu } from './NotificationsMenu.tsx'

const root = document.documentElement
const ANA: SessionUser = { id: 'user-ana', username: 'ana.souza', displayName: 'Ana Souza', initials: 'AS', inventoryTutorialSeen: true }
const USER: SessionUser = { id: 'user-christian', username: 'christian.camilo', displayName: 'Christian Camilo', initials: 'CC', inventoryTutorialSeen: true }

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
 * Saves notifications for a user, as earlier visits would have.
 * @param user The user.
 * @param count How many, all unread.
 */
function saveUnread(user: SessionUser, count: number): void {
  let list: Notification[] = []
  for (let index = 1; index <= count; index++) {
    list = addNotification(list, 'info', `Aviso ${index}`, new Date())
  }
  localStorage.setItem(notificationsKey(user.id), JSON.stringify(list))
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
})

beforeEach(() => {
  localStorage.clear()
})

// Shows a success and an error toast and checks the bell counts 2 unread on its badge; its menu lists the error first,
// then the success, each with its kind's icon in its color, the ones that were unread lit, and "agora". Opening it
// clears the badge, and the list is saved under the user's key.
test('Web: the bell counts the unread toasts and lists them, newest first', async () => {
  const screen = await render(<Sample />)
  const bell = screen.getByRole('button', { name: /^Notificações/ })
  await expect.element(bell).toHaveAccessibleName('Notificações')
  await screen.getByRole('button', { name: 'Sucesso' }).click()
  await screen.getByRole('button', { name: 'Erro' }).click()
  await expect.element(bell).toHaveAccessibleName('Notificações, 2 não lidas')
  await expect.element(screen.getByTestId('notifications.bell.badge')).toHaveTextContent('2')

  await bell.click()
  const entries = screen.getByRole('list', { name: 'Últimas notificações' }).getByRole('listitem')
  expect(entries.elements().map((entry) => [entry.dataset.kind, entry.dataset.fresh, entry.textContent])).toEqual([
    ['error', 'true', 'Não foi possível salvar o item. Tente de novo.agora'],
    ['success', 'true', 'Item “Filtro de óleo” cadastrado.agora'],
  ])
  const { colors } = themes.eighties.night
  const icons = entries.elements().map((entry) => getComputedStyle(entry.querySelector('[data-testid="notifications.menu.list.item.icon"]')!).color)
  expect(icons).toEqual([rgb(colors.danger), rgb(colors.success)])
  await expect.element(bell).toHaveAccessibleName('Notificações')
  expect(screen.getByTestId('notifications.bell.badge').query()).toBeNull()
  const saved = JSON.parse(localStorage.getItem(notificationsKey(USER.id))!) as Notification[]
  expect(saved.map((notification) => [notification.kind, notification.read])).toEqual([
    ['error', true],
    ['success', true],
  ])
})

// Starts with 12 unread notifications saved, and checks the badge says "9+".
test('Web: the badge shows 9+ above nine unread', async () => {
  saveUnread(USER, 12)
  const screen = await render(<Sample />)
  await expect.element(screen.getByTestId('notifications.bell.badge')).toHaveTextContent('9+')
  await expect.element(screen.getByRole('button', { name: /^Notificações/ })).toHaveAccessibleName('Notificações, 9+ não lidas')
})

// Opens the bell with nothing kept, and checks the menu says there are no notifications and offers nothing to clear;
// then shows a toast, and checks "Limpar notificações" empties the list again.
test('Web: the bell says when it has nothing, and clears what it has', async () => {
  const screen = await render(<Sample />)
  const bell = screen.getByRole('button', { name: /^Notificações/ })
  await bell.click()
  await expect.element(screen.getByText('Nenhuma notificação')).toBeVisible()
  expect(screen.getByRole('menuitem', { name: 'Limpar notificações' }).query()).toBeNull()
  await bell.click()

  await screen.getByRole('button', { name: 'Sucesso' }).click()
  await bell.click()
  await screen.getByRole('menuitem', { name: 'Limpar notificações' }).click()
  await bell.click()
  await expect.element(screen.getByText('Nenhuma notificação')).toBeVisible()
  expect(JSON.parse(localStorage.getItem(notificationsKey(USER.id))!)).toEqual([])
})

// Saves notifications for another user, logs in as this one and checks the bell shows none of them; switching to that
// user shows theirs.
test("Web: each user sees only their own notifications", async () => {
  saveUnread(ANA, 3)
  const screen = await render(<Sample />)
  await expect.element(screen.getByRole('button', { name: /^Notificações/ })).toHaveAccessibleName('Notificações')
  await screen.getByRole('button', { name: 'Trocar usuário' }).click()
  await expect.element(screen.getByRole('button', { name: /^Notificações/ })).toHaveAccessibleName('Notificações, 3 não lidas')
})

function Sample() {
  const [user, setUser] = useState<SessionUser | null>(USER)
  return (
    <SessionContext.Provider value={{ user, setUser, markInventoryTutorialSeen: () => {} }}>
      <ToastProvider>
        <NotificationsMenu />
        <Triggers onSwitch={() => setUser(ANA)} />
      </ToastProvider>
    </SessionContext.Provider>
  )
}

function Triggers({ onSwitch }: { onSwitch: () => void }) {
  const toast = useToast()
  return (
    <>
      <Button onClick={() => toast.success('Item “Filtro de óleo” cadastrado.')}>Sucesso</Button>
      <Button onClick={() => toast.error('Não foi possível salvar o item. Tente de novo.')}>Erro</Button>
      <Button onClick={onSwitch}>Trocar usuário</Button>
    </>
  )
}
