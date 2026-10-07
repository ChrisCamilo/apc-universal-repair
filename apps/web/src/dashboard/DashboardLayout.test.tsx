import { REORDER_TABS_STORAGE_KEY, TAB_ORDER_STORAGE_KEY } from '@apc/shared/tabs'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { DashboardLayout } from './DashboardLayout.tsx'
import { useTabReorder } from './tabReorderContext.ts'

// The MVP has one tab; three let the order change. The Catalog and Specs tabs stand in for the ones to come.
vi.mock('@apc/shared/tabs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apc/shared/tabs')>()),
  DASHBOARD_TABS: [
    { id: 'inventory', label: 'Estoque', icon: 'cube' },
    { id: 'catalog', label: 'Catálogo', icon: 'document' },
    { id: 'specs', label: 'Ficha técnica', icon: 'document' },
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
  await page.viewport(1280, 720)
})

beforeEach(() => {
  localStorage.clear()
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

function Dashboard() {
  return (
    <MemoryRouter initialEntries={['/inventory']}>
      <Routes>
        <Route path="/" element={<DashboardLayout userMenu={<ReorderSwitch />} />}>
          {['inventory', 'catalog', 'specs'].map((id) => (
            <Route key={id} path={id} element={<Where />} />
          ))}
        </Route>
      </Routes>
    </MemoryRouter>
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
