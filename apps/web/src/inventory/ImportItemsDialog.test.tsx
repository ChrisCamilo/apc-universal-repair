import { CSV_COLUMNS } from '@apc/shared/item-csv'
import type { ItemLists } from '@apc/shared/lists'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ToastProvider } from '../components/Toast.tsx'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { ImportItemsDialog } from './ImportItemsDialog.tsx'

// The lists the API keeps: the Motor category, Mann, and Volkswagen with the Gol.
const LISTS: ItemLists = {
  categories: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Motor' }],
  partBrands: [{ id: '00000000-0000-4000-8000-000000000002', name: 'Mann' }],
  vehicleBrands: [{ id: '00000000-0000-4000-8000-000000000003', name: 'Volkswagen' }],
  vehicleModels: [{ id: '00000000-0000-4000-8000-000000000004', name: 'Gol', vehicleBrandId: '00000000-0000-4000-8000-000000000003' }],
}
// A file with a valid row, a row with new names, and a row with errors.
const FILE = [
  CSV_COLUMNS.join(';'),
  'w 712/95;filtro de óleo;MOTOR;mann;volkswagen;gol;8;2;a-2;39,90;;;',
  'ngk-b7;vela;Ignição;NGK;Fiat;Uno;10;3;B-1;34.9;;D;',
  ';sem código;Freios;Cobreq;Ford;;x;;;0;;;',
].join('\n')
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
 * Renders the dialog and picks a file in it.
 * @param text The file's text.
 * @param onImported Called once the items are imported.
 * @returns The rendered screen.
 */
async function pick(text: string, onImported = () => {}) {
  const screen = await render(
    <ToastProvider>
      <ImportItemsDialog open lists={LISTS} onClose={() => {}} onImported={onImported} />
    </ToastProvider>,
  )
  await userEvent.upload(screen.getByLabelText('Arquivo CSV'), new File([text], 'estoque.csv', { type: 'text/csv' }))
  return screen
}

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(1280, 720)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await page.viewport(1280, 720)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Picks a file in one style and mode and checks a row's errors take the danger color, as its stripe does.
    test(`Web: the CSV import follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await pick(FILE)
      const error = screen.getByText('Informe o código da peça.')
      await expect.element(error).toBeVisible()
      expect(getComputedStyle(error.element()).color).toBe(rgb(colors.danger))
      expect(getComputedStyle(error.element().closest('li')!).borderLeftColor).toBe(rgb(colors.danger))
    })
  }
}

// Picks a file and checks the preview: the count of rows, the names to create, each row written by the rule with the
// lists' spelling, and the row with errors marked with its reasons.
test('Web: a CSV file is previewed before importing', async () => {
  const screen = await pick(FILE)
  const preview = screen.getByRole('region', { name: 'Prévia da importação' })
  await expect.element(preview.getByText('estoque.csv · 2 itens prontos para importar · 1 com erro')).toBeVisible()
  await expect.element(preview.getByText('Categorias: Ignição')).toBeVisible()
  await expect.element(preview.getByText('Marcas de peça: NGK')).toBeVisible()
  await expect.element(preview.getByText('Marcas de veículo: Fiat')).toBeVisible()
  await expect.element(preview.getByText('Modelos de veículo: Uno (Fiat)')).toBeVisible()
  const rows = screen.getByRole('list', { name: 'Linhas do arquivo' }).getByRole('listitem')
  expect(rows.nth(0).element().textContent).toMatch(/^Linha 2W 712\/95Filtro de óleoMotor · Mann · Volkswagen Gol · A-2 · R\$\s39,90$/)
  expect(rows.elements().map((row) => row.hasAttribute('data-invalid'))).toEqual([false, false, true])
  expect(rows.nth(2).element().textContent).toContain('Informe o código da peça.')
  expect(rows.nth(2).element().textContent).toContain('Quantidade deve ser um número inteiro, como 4.')
  await expect.element(screen.getByRole('button', { name: 'Importar 2 itens' })).toBeEnabled()
})

// Imports the file and checks only the valid rows are sent, a toast says how many items were created and updated,
// and the import is handed over.
test('Web: the valid rows are imported', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify({ created: 1, updated: 1 }), { status: 200 }))
  const onImported = vi.fn()
  const screen = await pick(FILE, onImported)
  await screen.getByRole('button', { name: 'Importar 2 itens' }).click()
  await expect.element(screen.getByText('Importação concluída: 1 item criado, 1 atualizado.')).toBeVisible()
  expect(onImported).toHaveBeenCalledTimes(1)
  const [url, init] = fetch.mock.calls[0]
  expect(url).toBe('/api/items/import')
  const sent = JSON.parse(String(init?.body)).items
  expect(sent.map((item: { code: string }) => item.code)).toEqual(['W 712/95', 'NGK-B7'])
  expect(sent[0]).toMatchObject({ name: 'Filtro de óleo', category: 'Motor', unitPriceCents: 3990, vehicleModel: 'Gol' })
})

// Picks a file without the required columns and checks it says why, with nothing to import; a failed import says so
// in a toast and keeps the dialog.
test('Web: a file that can not be read or imported says why', async () => {
  const screen = await pick('code,name\nA,B')
  await expect.element(screen.getByRole('alert')).toHaveTextContent(
    'estoque.csv: Faltam colunas no arquivo: category, part_brand, vehicle_brand, unit_price. Use o modelo.',
  )
  await expect.element(screen.getByRole('button', { name: 'Importar 0 itens' })).toBeDisabled()

  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }))
  await userEvent.upload(screen.getByLabelText('Arquivo CSV'), new File([FILE], 'estoque.csv', { type: 'text/csv' }))
  await screen.getByRole('button', { name: 'Importar 2 itens' }).click()
  await expect.element(screen.getByText('Não foi possível importar os itens. Tente de novo.')).toBeVisible()
})

// Downloads the template and checks it is a CSV file with the template's name.
test('Web: the template is downloaded', async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const screen = await pick(FILE)
  await screen.getByRole('button', { name: 'Baixar modelo' }).click()
  const link = click.mock.contexts[0] as HTMLAnchorElement
  expect(link.download).toBe('modelo-estoque.csv')
  expect(link.href).toMatch(/^blob:/)
})

// Opens the preview on a 360×780 phone and checks nothing scrolls sideways and Importar is on screen.
test('Web: the CSV import fits a 360×780 phone', async () => {
  await page.viewport(360, 780)
  const screen = await pick(FILE)
  const button = screen.getByRole('button', { name: 'Importar 2 itens' })
  // The file is read after it is picked: measure once the preview is on screen.
  await expect.element(button).toBeVisible()
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360)
  const action = button.element().getBoundingClientRect()
  expect(action.bottom).toBeLessThanOrEqual(780)
  expect(action.right).toBeLessThanOrEqual(360)
})
