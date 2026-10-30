import { initials } from '@apc/shared/auth'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH, MIN_TOUCH_TARGET } from '@apc/shared/screens'
import { REORDER_TABS_STORAGE_KEY, TAB_ORDER_STORAGE_KEY } from '@apc/shared/tabs'
import { TEST_USERS } from '@apc/shared/test-users'
import { useEffect, useState } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { SessionContext } from '../auth/sessionContext.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { DashboardLayout } from './DashboardLayout.tsx'
import { BOTTOM_BAR_HEIGHT } from './DashboardLayout.styles.ts'
import { useMoreActions } from './moreActionsContext.ts'
import { useTabReorder } from './tabReorderContext.ts'

// The first test user, as the session keeps them.
const SESSION_USER = { ...TEST_USERS[0], initials: initials(TEST_USERS[0].displayName), inventoryTutorialSeen: false }

// Three tabs let the order change; Specs stands in for a tab still being built.
vi.mock('@apc/shared/tabs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apc/shared/tabs')>()),
  DASHBOARD_TABS: [
    { id: 'inventory', label: 'Estoque', icon: 'cube' },
    { id: 'catalog', label: 'Catálogo', icon: 'document' },
    { id: 'specs', label: 'Ficha técnica', icon: 'document', wip: true },
  ],
}))

/**
 * Reads the tab names in the order the tab bar shows them.
 * @returns The tab labels.
 */
function tabOrder(): string[] {
  return [...document.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent ?? '')
}

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

beforeEach(() => {
  localStorage.clear()
})

afterEach(async () => {
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

// Checks the tabs can't be moved while "Arrastar para reordenar" is off, then turns it on and moves the open tab
// one place right with Alt + Right, and checks the new order shows and is saved, and the moved tab stays open.
test('Web: the tabs move only while reordering is on, and the open tab stays open', async () => {
  const screen = await render(<Dashboard />)
  const estoque = screen.getByRole('tab', { name: 'Estoque' })
  await expect.element(estoque).not.toHaveAttribute('draggable')
  await estoque.click()
  await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}')
  expect(tabOrder()).toEqual(['Estoque', 'Catálogo', 'Ficha técnica'])

  await screen.getByRole('button', { name: 'Reordenar' }).click()
  expect(localStorage.getItem(REORDER_TABS_STORAGE_KEY)).toBe('true')
  await expect.element(estoque).toHaveAttribute('draggable', 'true')
  await estoque.click()
  await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}')
  expect(tabOrder()).toEqual(['Catálogo', 'Estoque', 'Ficha técnica'])
  expect(JSON.parse(localStorage.getItem(TAB_ORDER_STORAGE_KEY)!)).toEqual(['catalog', 'inventory', 'specs'])
  await expect.element(estoque).toHaveAttribute('aria-selected', 'true')
  await expect.element(screen.getByText('Rota: /inventory')).toBeVisible()
})

// Saves an order that knows only two of the tabs and the reorder choice on, and checks the Dashboard opens in the
// saved order, with the tab it didn't know at the end, and reorderable.
test('Web: a saved order comes back with new tabs at the end', async () => {
  localStorage.setItem(TAB_ORDER_STORAGE_KEY, JSON.stringify(['specs', 'inventory']))
  localStorage.setItem(REORDER_TABS_STORAGE_KEY, 'true')
  const screen = await render(<Dashboard />)
  expect(tabOrder()).toEqual(['Ficha técnica', 'Estoque', 'Catálogo'])
  await expect.element(screen.getByRole('tab', { name: 'Catálogo' })).toHaveAttribute('draggable', 'true')
})

// Opens a tab still being built and checks its route shows, blurred and out of reach, behind the notice naming the
// tab, while a finished tab opens as it is.
test('Web: a tab still being built opens behind the work-in-progress notice', async () => {
  const screen = await render(<Dashboard />)
  await expect.element(screen.getByText('Rota: /inventory')).toBeVisible()
  await expect.element(screen.getByTestId('common.work-in-progress')).not.toBeInTheDocument()
  await screen.getByRole('tab', { name: 'Ficha técnica, em construção' }).click()
  await expect.element(screen.getByRole('heading', { name: 'A aba Ficha técnica ainda não está pronta' })).toBeVisible()
  expect(screen.getByTestId('common.work-in-progress.content').element().textContent).toBe('Rota: /specs')
  expect((screen.getByTestId('common.work-in-progress.content').element() as HTMLElement).inert).toBe(true)
})

// At 1280×720, checks the Dashboard keeps its header, with the tabs and the user menu slot in it, and no bottom bar.
test('Web: on the desktop the tabs stay in the header', async () => {
  const screen = await render(<Dashboard />)
  const header = screen.getByTestId('common.app-frame.header')
  await expect.element(header.getByRole('tab', { name: 'Estoque' })).toBeVisible()
  await expect.element(header.getByRole('button', { name: 'Reordenar' })).toBeVisible()
  await expect.element(screen.getByTestId('dashboard.bottom-bar')).not.toBeInTheDocument()
})

// At 360×780, with an order saved, checks the Dashboard follows the phone layout: no header with the tabs, but the open
// tab's name heading the page, and a bar fixed at the bottom of the screen, 80px tall, with the tabs in the saved order,
// each at least 44px and the open one in the accent, then the user menu slot. A tab chosen in the bar opens its route
// and heads the page, and the bar's tabs still move while reordering is on.
test('Web: on a phone the tabs move to a bar at the bottom of the screen', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  localStorage.setItem(TAB_ORDER_STORAGE_KEY, JSON.stringify(['catalog', 'inventory', 'specs']))
  const screen = await render(<Dashboard />)
  await expect.element(screen.getByTestId('common.app-frame')).not.toBeInTheDocument()
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Estoque' })).toBeVisible()
  const bar = screen.getByTestId('dashboard.bottom-bar')
  const box = bar.element().getBoundingClientRect()
  expect([box.bottom, box.height]).toEqual([MIN_MOBILE_HEIGHT, BOTTOM_BAR_HEIGHT])
  expect(tabOrder()).toEqual(['Catálogo', 'Estoque', 'Ficha técnica'])
  const tabs = bar.getByRole('tab')
  for (const tab of tabs.elements()) {
    expect(tab.getBoundingClientRect().height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET)
  }
  const estoque = bar.getByRole('tab', { name: 'Estoque' })
  const catalogo = bar.getByRole('tab', { name: 'Catálogo' })
  expect(getComputedStyle(estoque.element()).color).not.toBe(getComputedStyle(catalogo.element()).color)
  await expect.element(bar.getByRole('button', { name: 'Reordenar' })).toBeVisible()

  await catalogo.click()
  await expect.element(screen.getByText('Rota: /catalog')).toBeVisible()
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Catálogo' })).toBeVisible()
  await screen.getByRole('button', { name: 'Reordenar' }).click()
  await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}')
  await catalogo.click()
  await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}')
  expect(tabOrder()).toEqual(['Estoque', 'Catálogo', 'Ficha técnica'])
})

// At 360×780, opens the Inventory, whose route hands the header a "⋯", and checks it sits at the right of the tab's
// name, 44px round, and opens what the tab handed over; on the Catalog, which hands nothing over, there is no "⋯". On
// the desktop there is none either.
test('Web: on a phone the open tab may put a "⋯" in its header', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const screen = await render(<Dashboard />)
  const header = screen.getByTestId('dashboard.phone.header')
  const more = header.getByRole('button', { name: 'Mais ações' })
  await expect.element(more).toBeVisible()
  const box = more.element().getBoundingClientRect()
  expect([box.width, box.height]).toEqual([MIN_TOUCH_TARGET, MIN_TOUCH_TARGET])
  expect(box.left).toBeGreaterThan(screen.getByRole('heading', { level: 1, name: 'Estoque' }).element().getBoundingClientRect().right - 1)
  await more.click()
  await expect.element(screen.getByText('Ações abertas: 1')).toBeVisible()

  await screen.getByRole('tab', { name: 'Catálogo' }).click()
  await expect.element(screen.getByText('Rota: /catalog')).toBeVisible()
  await expect.element(more).not.toBeInTheDocument()

  await screen.getByRole('tab', { name: 'Estoque' }).click()
  await expect.element(more).toBeVisible()
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
  await expect.element(screen.getByRole('button', { name: 'Mais ações' })).not.toBeInTheDocument()
})

function Dashboard() {
  // A logged user who has seen the Inventory tutorial.
  const session = { user: { ...SESSION_USER, inventoryTutorialSeen: true }, expired: false, setUser: () => {}, markInventoryTutorialSeen: () => {} }
  return (
    <SessionContext.Provider value={session}>
      <MemoryRouter initialEntries={['/inventory']}>
        <Routes>
          <Route path="/" element={<DashboardLayout userMenu={<ReorderSwitch />} />}>
            <Route path="inventory" element={<WithMore />} />
            {['catalog', 'specs'].map((id) => (
              <Route key={id} path={id} element={<Where />} />
            ))}
          </Route>
        </Routes>
      </MemoryRouter>
    </SessionContext.Provider>
  )
}

function ReorderSwitch() {
  const { reorderable, setReorderable } = useTabReorder()
  return (
    <button type="button" onClick={() => setReorderable(!reorderable)}>
      Reordenar
    </button>
  )
}

function Where() {
  return <p>Rota: {useLocation().pathname}</p>
}

/** The Inventory's stand-in: it hands the header a "⋯" while it is open, and counts how often it was pressed. */
function WithMore() {
  const handMore = useMoreActions()
  const [opened, setOpened] = useState(0)
  useEffect(() => {
    handMore(() => setOpened((count) => count + 1))
    return () => handMore(null)
  }, [handMore])
  return (
    <>
      <Where />
      <p>Ações abertas: {opened}</p>
    </>
  )
}
