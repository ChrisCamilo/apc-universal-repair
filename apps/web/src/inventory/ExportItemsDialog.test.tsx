import { CSV_COLUMNS, CSV_PHOTOS_COLUMN } from '@apc/shared/item-csv'
import type { Item } from '@apc/shared/items'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH } from '@apc/shared/screens'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ToastProvider } from '../components/Toast.tsx'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { ExportItemsDialog } from './ExportItemsDialog.tsx'

// An item as the API sends it, with a photo.
const ITEM: Item = {
  id: '00000000-0000-4000-8000-000000000001',
  code: 'BKR6E',
  name: 'Vela de ignição',
  category: 'Motor',
  partBrand: 'NGK',
  vehicleBrand: 'Volkswagen',
  vehicleModel: null,
  position: 'N/A',
  side: 'N/A',
  color: 'N/A',
  location: 'A-3',
  quantity: 24,
  minQuantity: 8,
  unitPriceCents: 2490,
  photos: [{ id: '00000000-0000-4000-8000-0000000000a1', url: '/photos/a1.jpg', thumbUrl: '/photos/a1-thumb.webp' }],
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

/**
 * Renders the dialog open, with a toast to confirm the export.
 * @param props What the list holds, and what the dialog does on close.
 * @returns The rendered screen.
 */
async function open(props: { count?: number; narrowed?: boolean; onClose?: () => void } = {}) {
  return render(
    <ToastProvider>
      <ExportItemsDialog open query="status=low&sort=price&order=desc" count={props.count ?? 12} narrowed={props.narrowed ?? true} onClose={props.onClose ?? (() => {})} />
    </ToastProvider>,
  )
}

/**
 * Catches the download the export starts, reading the file it would save.
 * @returns The file's name and text, once the download starts.
 */
function catchDownload(): Promise<{ name: string; text: string }> {
  return new Promise((resolve) => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      const name = this.download
      void fetch(this.href)
        .then((response) => response.text())
        .then((text) => resolve({ name, text }))
    })
  })
}

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

afterEach(() => {
  vi.restoreAllMocks()
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the export in one style and mode and checks it says which items go, offers the photo paths switched off,
    // and "Exportar" is filled with the accent.
    test(`Web: the CSV export follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await open()
      await expect.element(screen.getByText('12 itens, com a busca e os filtros atuais.')).toBeVisible()
      await expect.element(screen.getByRole('switch', { name: 'Incluir o caminho das fotos' })).toHaveAttribute('aria-checked', 'false')
      expect(getComputedStyle(screen.getByRole('button', { name: 'Exportar' }).element()).backgroundColor).toBe(rgb(colors.accent))
    })
  }
}

// Turns the photo paths on and exports, and checks every item of the list is fetched with the list query and no
// page, the file is named after the day and has the photos column, a toast confirms it and the dialog closes.
test('Web: Exportar fetches the whole list and downloads it with the photo paths', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ items: [ITEM], total: 1 }), { status: 200 }))
  const onClose = vi.fn()
  const screen = await open({ count: 1, onClose })
  const downloaded = catchDownload()
  await screen.getByRole('switch', { name: 'Incluir o caminho das fotos' }).click()
  await screen.getByRole('button', { name: 'Exportar' }).click()
  const { name, text } = await downloaded
  expect(fetch.mock.calls[0][0]).toBe('/api/items?status=low&sort=price&order=desc')
  expect(name).toMatch(/^estoque-\d{4}-\d{2}-\d{2}\.csv$/)
  const [header, row] = text.split('\r\n')
  expect(header).toBe(`${CSV_COLUMNS.join(',')},${CSV_PHOTOS_COLUMN}`)
  expect(row.endsWith(',/photos/a1.jpg')).toBe(true)
  await expect.element(screen.getByText('1 item exportado.')).toBeVisible()
  expect(onClose).toHaveBeenCalledTimes(1)
})

// Exports with the photo paths left off, and checks the file has only the template's columns.
test('Web: without the switch the file has no photos column', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ items: [ITEM], total: 1 }), { status: 200 }))
  const screen = await open({ count: 1 })
  const downloaded = catchDownload()
  await screen.getByRole('button', { name: 'Exportar' }).click()
  expect((await downloaded).text.split('\r\n')[0]).toBe(CSV_COLUMNS.join(','))
})

// Makes the items fail to come, and checks a toast says so, nothing downloads and the dialog stays open.
test('Web: a failed export says so and keeps the dialog open', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 500 }))
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const onClose = vi.fn()
  const screen = await open({ onClose })
  await screen.getByRole('button', { name: 'Exportar' }).click()
  await expect.element(screen.getByText('Não foi possível exportar os itens. Tente de novo.')).toBeVisible()
  expect(click).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
})

// Opens the export with the whole inventory and then with an empty list, and checks it says which items go and,
// with none, can't export.
test('Web: the export says which items go, and has nothing to export from an empty list', async () => {
  const whole = await open({ count: 40, narrowed: false })
  await expect.element(whole.getByText('Todos os 40 itens do estoque.')).toBeVisible()
  whole.unmount()
  const empty = await open({ count: 0 })
  await expect.element(empty.getByText('Nenhum item na lista para exportar.')).toBeVisible()
  await expect.element(empty.getByRole('button', { name: 'Exportar' })).toBeDisabled()
})
