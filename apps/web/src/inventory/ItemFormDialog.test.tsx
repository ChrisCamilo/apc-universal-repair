import { useState } from 'react'
import { codeTakenMessage, ITEM_FORM_MESSAGES } from '@apc/shared/item-form'
import type { Item } from '@apc/shared/items'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ToastProvider } from '../components/Toast.tsx'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { ItemFormDialog } from './ItemFormDialog.tsx'

const FILTER = item({ code: 'W 712/95', name: 'Filtro de óleo', vehicleBrand: 'Volkswagen', vehicleModel: 'Gol', color: 'Preto' })
const PADS = item({ code: 'FRA-1000', name: 'Pastilha de freio', vehicleBrand: 'Chevrolet', vehicleModel: 'Opala 4.1' })
const ITEMS = [FILTER, PADS, item({ code: 'J-1', name: 'Junta', vehicleBrand: 'Volkswagen', vehicleModel: 'Santana' })]
const root = document.documentElement

/**
 * Answers the next save with the item the API would send back, and returns the mocked fetch.
 * @param status The response status.
 * @param body The response body; by default the sent item with an id.
 * @returns The fetch mock, to read what was sent.
 */
function answerSave(status = 201, body?: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
    const sent = JSON.parse(String(init?.body))
    const saved = body ?? { ...item({ code: sent.code, name: sent.name }), ...sent, vehicleModel: sent.vehicleModel || null, location: sent.location || null }
    return new Response(JSON.stringify(saved), { status })
  })
}

/**
 * Types the fields of a new item.
 * @param screen The rendered screen.
 * @param values The values to type, by field.
 */
async function fill(
  screen: Awaited<ReturnType<typeof render>>,
  values: { code: string; name: string; category: string; partBrand: string; vehicleBrand: string; price: string },
) {
  await screen.getByLabelText('Código da peça').fill(values.code)
  await screen.getByLabelText('Nome').fill(values.name)
  await screen.getByRole('combobox', { name: 'Categoria' }).fill(values.category)
  await screen.getByRole('combobox', { name: 'Marca da peça' }).fill(values.partBrand)
  await screen.getByRole('combobox', { name: 'Marca do veículo' }).fill(values.vehicleBrand)
  await screen.getByLabelText('Valor unitário (R$)').fill(values.price)
}

/**
 * Fills in an item with the fields a test doesn't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function item(fields: Partial<Item> & Pick<Item, 'code' | 'name'>): Item {
  return {
    id: crypto.randomUUID(),
    category: 'Motor',
    partBrand: 'Bosch',
    vehicleBrand: 'Volkswagen',
    vehicleModel: null,
    position: 'N/A',
    side: 'N/A',
    color: 'N/A',
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 3990,
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
    ...fields,
  }
}

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
 * Reads what a mocked save sent.
 * @param fetch The fetch mock.
 * @returns The request's URL, method and parsed body.
 */
function sent(fetch: ReturnType<typeof answerSave>) {
  const [url, init] = fetch.mock.calls[0]
  return { url, method: init?.method, body: JSON.parse(String(init?.body)) }
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
    // Saves the blank form in one style and mode and checks Save is filled with the accent and the required fields'
    // messages take the danger color.
    test(`Web: the item form follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Sample />)
      expect(getComputedStyle(screen.getByRole('button', { name: 'Salvar' }).element()).backgroundColor).toBe(rgb(colors.accent))
      await screen.getByRole('button', { name: 'Salvar' }).click()
      expect(getComputedStyle(screen.getByText(ITEM_FORM_MESSAGES.name).element()).color).toBe(rgb(colors.danger))
    })
  }
}

// Saves the blank form and checks every required field says what is missing and nothing is sent; typing in a field
// drops its message.
test('Web: the required fields say what is missing and nothing is sent', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  const screen = await render(<Sample />)
  await screen.getByRole('button', { name: 'Salvar' }).click()
  for (const message of Object.values(ITEM_FORM_MESSAGES).filter((m) => m !== ITEM_FORM_MESSAGES.priceInvalid)) {
    await expect.element(screen.getByText(message)).toBeVisible()
  }
  expect(fetch).not.toHaveBeenCalled()
  await screen.getByLabelText('Nome').fill('Vela')
  await expect.element(screen.getByText(ITEM_FORM_MESSAGES.name)).not.toBeInTheDocument()
})

// Types a code another item uses, in lowercase, and checks it turns uppercase while typing and is refused naming that
// item; then a code the API refuses is shown the same way.
test('Web: the code turns uppercase and a code in use names its item', async () => {
  const screen = await render(<Sample />)
  await screen.getByLabelText('Código da peça').fill('fra-1000')
  await expect.element(screen.getByLabelText('Código da peça')).toHaveValue('FRA-1000')
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(screen.getByText(codeTakenMessage('Pastilha de freio'))).toBeVisible()

  answerSave(409, { details: [{ field: 'code', itemName: 'Correia dentada' }] })
  await fill(screen, { code: 'nova-1', name: 'Vela', category: 'Ignição', partBrand: 'NGK', vehicleBrand: 'Fiat', price: '10' })
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(screen.getByText(codeTakenMessage('Correia dentada'))).toBeVisible()
})

// Checks the vehicle model is locked until a vehicle brand is chosen, then lists only that brand's models, and clears
// when the brand changes to one without the chosen model.
test('Web: the vehicle model follows the vehicle brand', async () => {
  const screen = await render(<Sample />)
  const model = screen.getByRole('combobox', { name: 'Modelo do veículo' })
  await expect.element(model).toBeDisabled()
  await screen.getByRole('combobox', { name: 'Marca do veículo' }).fill('Volkswagen')
  await expect.element(model).toBeEnabled()
  await model.click()
  expect(screen.getByRole('option').elements().map((option) => option.textContent)).toEqual(['Gol', 'Santana'])
  await screen.getByRole('option', { name: 'Gol' }).click()
  await screen.getByRole('combobox', { name: 'Marca do veículo' }).fill('Chevrolet')
  await expect.element(model).toHaveValue('')
})

// Leaves the name, the color, the location and the price after typing them loosely, and checks each is written
// back: capitals, an existing color in its own spelling, and the price in reais.
test('Web: leaving a field writes it back by the rules', async () => {
  const screen = await render(<Sample />)
  await screen.getByLabelText('Nome').fill('vela de ignição')
  await screen.getByLabelText('Cor').fill('preto')
  await screen.getByLabelText('Local').fill('a-2')
  await screen.getByLabelText('Valor unitário (R$)').fill('1234,5')
  await userEvent.click(screen.getByRole('heading', { name: 'Novo item' }))
  await expect.element(screen.getByLabelText('Nome')).toHaveValue('Vela de ignição')
  await expect.element(screen.getByLabelText('Cor')).toHaveValue('Preto')
  await expect.element(screen.getByLabelText('Local')).toHaveValue('A-2')
  await expect.element(screen.getByLabelText('Valor unitário (R$)')).toHaveValue('1.234,50')
})

// Fills in a new item and saves it, and checks it is posted with the writing rule applied and the price in cents, a
// toast says it was added and the saved item is handed over.
test('Web: a new item is posted, announced and handed over', async () => {
  const fetch = answerSave()
  const onSaved = vi.fn()
  const screen = await render(<Sample onSaved={onSaved} />)
  await fill(screen, { code: 'ngk-b7', name: 'vela', category: 'ignição', partBrand: 'NGK', vehicleBrand: 'chevrolet', price: '34,9' })
  await screen.getByRole('radio', { name: 'D' }).click()
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalled())
  expect(sent(fetch)).toEqual({
    url: '/api/items',
    method: 'POST',
    body: expect.objectContaining({
      code: 'NGK-B7',
      name: 'Vela',
      category: 'Ignição',
      vehicleBrand: 'Chevrolet',
      position: 'D',
      color: 'N/A',
      unitPriceCents: 3490,
    }),
  })
  await expect.element(screen.getByText('Item “Vela” cadastrado.')).toBeVisible()
})

// Opens the form on an item and checks every field shows its value, then changes the quantity and saves, and checks
// the item is patched by its id and the toast says it was saved.
test('Web: an item opens filled in and is patched on save', async () => {
  const fetch = answerSave(200)
  const screen = await render(<Sample item={FILTER} />)
  await expect.element(screen.getByRole('heading', { name: 'Editar item' })).toBeVisible()
  await expect.element(screen.getByLabelText('Código da peça')).toHaveValue('W 712/95')
  await expect.element(screen.getByRole('combobox', { name: 'Modelo do veículo' })).toHaveValue('Gol')
  await expect.element(screen.getByLabelText('Cor')).toHaveValue('Preto')
  await expect.element(screen.getByLabelText('Valor unitário (R$)')).toHaveValue('39,90')
  await screen.getByLabelText('Quantidade', { exact: true }).fill('7')
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(screen.getByText('Item “Filtro de óleo” salvo.')).toBeVisible()
  expect(sent(fetch)).toMatchObject({ url: `/api/items/${FILTER.id}`, method: 'PATCH', body: { quantity: 7, code: 'W 712/95' } })
})

// Opens the form at 1280×720 and on a 360×780 phone and checks Save is on screen without scrolling and the form
// scrolls inside the dialog.
test('Web: Save is on screen without scrolling at both minimum sizes', async () => {
  for (const [width, height] of [
    [1280, 720],
    [360, 780],
  ]) {
    await page.viewport(width, height)
    const screen = await render(<Sample />)
    const save = screen.getByRole('button', { name: 'Salvar' }).element().getBoundingClientRect()
    expect(save.bottom).toBeLessThanOrEqual(height)
    expect(save.right).toBeLessThanOrEqual(width)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width)
    await screen.getByRole('button', { name: 'Cancelar' }).click()
  }
})

function Sample({ item: editing, onSaved = () => {} }: { item?: Item; onSaved?: (item: Item) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <ToastProvider>
      <ItemFormDialog open={open} item={editing} items={ITEMS} onClose={() => setOpen(false)} onSaved={onSaved} />
    </ToastProvider>
  )
}
