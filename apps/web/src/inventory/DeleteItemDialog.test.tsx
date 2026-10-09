import { useState } from 'react'
import type { Item } from '@apc/shared/items'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ToastProvider } from '../components/Toast.tsx'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { DeleteItemDialog } from './DeleteItemDialog.tsx'

const FILTER: Item = {
  id: '00000000-0000-4000-8000-000000000001',
  code: 'W 712/95',
  name: 'Filtro de óleo',
  category: 'Motor',
  partBrand: 'Mann',
  vehicleBrand: 'Volkswagen',
  vehicleModel: 'Gol',
  position: 'N/A',
  side: 'N/A',
  color: 'N/A',
  location: null,
  quantity: 4,
  minQuantity: 1,
  unitPriceCents: 3990,
  photos: [],
  createdAt: '2026-10-03T12:00:00.000Z',
  updatedAt: '2026-10-03T12:00:00.000Z',
}
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
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the confirmation in one style and mode and checks Excluir is filled with the danger color and its
    // label takes the color made to sit on it.
    test(`Web: the delete confirmation follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Sample />)
      const confirm = getComputedStyle(screen.getByRole('button', { name: 'Excluir' }).element())
      expect(confirm.backgroundColor).toBe(rgb(colors.danger))
      expect(confirm.color).toBe(rgb(colors.onDanger))
    })
  }
}

// Opens the confirmation and checks it names the item and its code and starts on Cancel, then closes it with
// Cancel and, opened again, with Escape, and checks nothing was sent either time.
test('Web: Cancel and Escape close the confirmation without deleting', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  const screen = await render(<Sample />)
  await expect.element(screen.getByRole('heading', { name: 'Excluir item?' })).toBeVisible()
  await expect.element(screen.getByText('Filtro de óleo (W 712/95) sai do estoque. Essa ação não pode ser desfeita.')).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  await screen.getByRole('button', { name: 'Cancelar' }).click()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  await screen.getByRole('button', { name: 'Abrir' }).click()
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
})

// Confirms and checks the item is deleted by its id, a toast names it and the removal is handed over.
test('Web: confirming deletes the item, announces it and hands it over', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
  const onDeleted = vi.fn()
  const screen = await render(<Sample onDeleted={onDeleted} />)
  await screen.getByRole('button', { name: 'Excluir' }).click()
  await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledWith(FILTER))
  expect(fetch).toHaveBeenCalledWith(`/api/items/${FILTER.id}`, { method: 'DELETE' })
  await expect.element(screen.getByText('Item “Filtro de óleo” excluído.')).toBeVisible()
})

// Confirms while the API fails and checks a toast says so, nothing is handed over and the confirmation stays open
// to try again.
test('Web: a failed delete says so and keeps the confirmation open', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }))
  const onDeleted = vi.fn()
  const screen = await render(<Sample onDeleted={onDeleted} />)
  await screen.getByRole('button', { name: 'Excluir' }).click()
  await expect.element(screen.getByText('Não foi possível excluir o item. Tente de novo.')).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Excluir' })).toBeEnabled()
  expect(onDeleted).not.toHaveBeenCalled()
})

// Opens the confirmation at 1280×720 and on a 360×780 phone and checks Excluir is on screen without scrolling and
// the page doesn't scroll sideways.
test('Web: Excluir is on screen at both minimum sizes', async () => {
  for (const [width, height] of [
    [MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT],
    [MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT],
  ]) {
    await page.viewport(width, height)
    const screen = await render(<Sample />)
    const confirm = screen.getByRole('button', { name: 'Excluir' }).element().getBoundingClientRect()
    expect(confirm.bottom).toBeLessThanOrEqual(height)
    expect(confirm.right).toBeLessThanOrEqual(width)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width)
    await screen.getByRole('button', { name: 'Cancelar' }).click()
  }
})

function Sample({ onDeleted = () => {} }: { onDeleted?: (item: Item) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <ToastProvider>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <DeleteItemDialog open={open} item={FILTER} onClose={() => setOpen(false)} onDeleted={onDeleted} />
    </ToastProvider>
  )
}
