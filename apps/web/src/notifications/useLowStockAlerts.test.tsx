import { useState } from 'react'
import type { SessionUser } from '@apc/shared/auth'
import type { Item } from '@apc/shared/items'
import { lowStockKey, notificationsKey, type Notification } from '@apc/shared/notifications'
import { beforeEach, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import '../index.css'
import { SessionContext } from '../auth/sessionContext.ts'
import { Button } from '../components/Button.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { NotificationsMenu } from './NotificationsMenu.tsx'
import { useLowStockAlerts } from './useLowStockAlerts.ts'

const USER: SessionUser = { id: 'user-christian', username: 'christian.camilo', displayName: 'Christian Camilo', initials: 'CC', inventoryTutorialSeen: true }
const FILTER = item('a', 'Filtro de óleo', 8, 2)
const PADS = item('b', 'Pastilha de freio', 9, 3)
const PUMP = item('c', "Bomba d'água", 4, 1)

/**
 * Builds an item with the fields the warning looks at.
 * @param id Its id.
 * @param name Its name.
 * @param quantity Units in stock.
 * @param minQuantity Its minimum.
 * @returns A complete item.
 */
function item(id: string, name: string, quantity: number, minQuantity: number): Item {
  return {
    id,
    code: id.toUpperCase(),
    name,
    category: 'Motor',
    partBrand: 'Mann',
    vehicleBrand: 'Volkswagen',
    vehicleModel: null,
    position: 'N/A',
    side: 'N/A',
    color: 'N/A',
    location: null,
    quantity,
    minQuantity,
    unitPriceCents: 100,
    photos: [],
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
  }
}

/**
 * Reads the notifications kept for the user, newest first.
 * @returns Each one's kind and message.
 */
function kept(): [string, string][] {
  const list = JSON.parse(localStorage.getItem(notificationsKey(USER.id)) ?? '[]') as Notification[]
  return list.map((notification) => [notification.kind, notification.message])
}

beforeEach(() => {
  localStorage.clear()
})

// Opens the stock with a low item: the bell gets the warning, without a toast. Saving it still low warns nothing more;
// two items reaching their minimum at once (an import) make one warning, shown as a toast; one restocked and low again
// is warned about again.
test('Web: items reaching their minimum stock are warned about once while low', async () => {
  const screen = await render(<Sample initial={[{ ...FILTER, quantity: 2 }, PADS, PUMP]} />)
  await expect.poll(kept).toEqual([['warning', 'Estoque baixo: “Filtro de óleo” (2 de 2)']])
  expect(screen.getByTestId('common.toast.message').query()).toBeNull()
  expect(JSON.parse(localStorage.getItem(lowStockKey(USER.id))!)).toEqual(['a'])

  await screen.getByRole('button', { name: 'Filtro ainda baixo' }).click()
  await screen.getByRole('button', { name: 'Importar baixos' }).click()
  await expect.element(screen.getByRole('alert')).toHaveTextContent('Estoque baixo em 2 itens')
  await expect.poll(kept).toEqual([
    ['warning', 'Estoque baixo em 2 itens'],
    ['warning', 'Estoque baixo: “Filtro de óleo” (2 de 2)'],
  ])

  await screen.getByRole('button', { name: 'Repor filtro' }).click()
  await screen.getByRole('button', { name: 'Filtro ainda baixo' }).click()
  await expect.poll(kept).toHaveLength(3)
  expect(kept()[0]).toEqual(['warning', 'Estoque baixo: “Filtro de óleo” (1 de 2)'])
})

function Sample({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial)
  return (
    <SessionContext.Provider value={{ user: USER, expired: false, setUser: () => {}, markInventoryTutorialSeen: () => {} }}>
      <ToastProvider>
        <NotificationsMenu />
        <Stock items={items} />
        <Button onClick={() => setItems([{ ...FILTER, quantity: 1 }, PADS, PUMP])}>Filtro ainda baixo</Button>
        <Button onClick={() => setItems([{ ...FILTER, quantity: 1 }, { ...PADS, quantity: 3 }, { ...PUMP, quantity: 0 }])}>Importar baixos</Button>
        <Button onClick={() => setItems([FILTER, { ...PADS, quantity: 3 }, { ...PUMP, quantity: 0 }])}>Repor filtro</Button>
      </ToastProvider>
    </SessionContext.Provider>
  )
}

function Stock({ items }: { items: Item[] }) {
  useLowStockAlerts(items, USER.id)
  return null
}
