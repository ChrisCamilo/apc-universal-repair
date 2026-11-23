import { strFromU8, unzipSync } from 'fflate'
import { CSV_COLUMNS, CSV_PHOTOS_COLUMN } from '@apc/domain/item-csv'
import type { Item } from '@apc/domain/items'
import { MERCADO_LIVRE_COLUMNS } from '@apc/domain/mercado-livre-csv'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH } from '@apc/ui-spec/screens'
import { MODES, STYLES, themes } from '@apc/tokens/theme'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ToastProvider } from '../../components/Toast'
import '../../app/fonts.ts'
import '../../index.css'
import { themeCss } from '../../app/theme.ts'
import { ExportItemsDialog } from './ExportItemsDialog.tsx'
import { testItem } from '@apc/domain/test-items'

// An item as the API sends it, with a photo.
const ITEM: Item = testItem({
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
})
// The bytes the stand-in answers the item's photo with.
const PHOTO_BYTES = new Uint8Array([255, 216, 255, 224, 1, 2, 3])
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
 * @returns The file's name, text and bytes, once the download starts.
 */
function catchDownload(): Promise<{ name: string; text: string; bytes: Uint8Array }> {
  return new Promise((resolve) => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      const name = this.download
      void fetch(this.href)
        .then((response) => response.arrayBuffer())
        .then((buffer) => resolve({ name, text: new TextDecoder().decode(buffer), bytes: new Uint8Array(buffer) }))
    })
  })
}

/**
 * Stands in for the API: the list answers with the item, and its photo with a few bytes, or fails when asked. Any
 * other request, such as the test's own reading of the download, goes through.
 * @param photo Whether the photo comes, or fails.
 * @returns The stand-in for fetch, to read its calls to the API.
 */
function serveItemAndPhoto(photo: 'ok' | 'fail' = 'ok') {
  const passThrough = globalThis.fetch.bind(globalThis)
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    if (url.startsWith('/api/items')) {
      return new Response(JSON.stringify({ items: [ITEM], total: 1 }), { status: 200 })
    }
    if (url.startsWith('/api/photos/')) {
      return new Response(photo === 'ok' ? PHOTO_BYTES : null, { status: photo === 'ok' ? 200 : 404 })
    }
    return passThrough(input, init)
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
      await expect.element(screen.getByRole('switch', { name: 'Exportar para o Mercado Livre' })).toHaveAttribute('aria-checked', 'false')
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

// Turns on Exportar para o Mercado Livre and checks the photo paths' switch hides, then exports: the download is a zip
// named after the day, with the listings' CSV in Mercado Livre's columns and the item's photo, fetched from the API and
// named after its code; the toast counts the listings, and the dialog closes.
test('Web: Exportar para o Mercado Livre downloads a zip with the listings and their photos', async () => {
  const fetch = serveItemAndPhoto()
  const onClose = vi.fn()
  const screen = await open({ count: 1, onClose })
  await expect.element(screen.getByText(/Para copiar na planilha baixada do Anunciador em massa/)).toBeVisible()
  await screen.getByRole('switch', { name: 'Exportar para o Mercado Livre' }).click()
  await expect.element(screen.getByRole('switch', { name: 'Incluir o caminho das fotos' })).not.toBeInTheDocument()
  await expect.element(screen.getByText('Todas as páginas vão no arquivo, um anúncio por marca, nas palavras do Mercado Livre.')).toBeVisible()
  const downloaded = catchDownload()
  await screen.getByRole('button', { name: 'Exportar' }).click()
  const { name, bytes } = await downloaded
  expect(fetch.mock.calls.map(([input]) => String(input)).filter((url) => url.startsWith('/api/'))).toEqual(['/api/items?status=low&sort=price&order=desc', '/api/photos/a1.jpg'])
  expect(name).toMatch(/^mercado-livre-\d{4}-\d{2}-\d{2}\.zip$/)
  const files = unzipSync(bytes)
  expect(Object.keys(files).filter((file) => !file.endsWith('/'))).toEqual(['anuncios.csv', 'fotos/BKR6E-1.jpg'])
  const [header, row] = strFromU8(files['anuncios.csv']).replace(/^﻿/, '').split('\r\n')
  expect(header).toBe(MERCADO_LIVRE_COLUMNS.join(';'))
  expect(row.startsWith('Vela de ignição NGK BKR6E Volkswagen;Novo;NGK;BKR6E;BKR6E;;24;24,90;')).toBe(true)
  expect(files['fotos/BKR6E-1.jpg']).toEqual(PHOTO_BYTES)
  await expect.element(screen.getByText('1 anúncio exportado.')).toBeVisible()
  expect(onClose).toHaveBeenCalledTimes(1)
})

// Makes the item's photo fail to come, and checks a toast says so, nothing downloads and the dialog stays open.
test('Web: a Mercado Livre export whose photo fails says so and keeps the dialog open', async () => {
  serveItemAndPhoto('fail')
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const onClose = vi.fn()
  const screen = await open({ count: 1, onClose })
  await screen.getByRole('switch', { name: 'Exportar para o Mercado Livre' }).click()
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
