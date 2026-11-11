import { useState } from 'react'
import { codeTakenMessage, duplicateForm, ITEM_FORM_MESSAGES, ITEM_UNCHANGED_MESSAGE, type ItemForm } from '@apc/domain/item-form'
import type { Item, ItemBrand, ItemCreate } from '@apc/domain/items'
import { withEntry, type ItemLists } from '@apc/domain/lists'
import { copiedPhotos } from '@apc/domain/photos'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/ui-spec/screens'
import { itemListsOf } from '@apc/domain/test-lists'
import { MODES, STYLES, themes } from '@apc/tokens/theme'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import type { UploadPhoto } from '../../components/ImageUpload'
import { ToastProvider } from '../../components/Toast'
import '../../app/fonts.ts'
import '../../index.css'
import { themeCss } from '../../app/theme.ts'
import { ItemFormDialog } from './ItemFormDialog.tsx'
import type { CreateListEntry } from './useItemLists.ts'
import { testItem, type FlatItem } from '@apc/domain/test-items'

// A photo the API saved, as items carry it.
const SAVED_PHOTO = { id: '00000000-0000-4000-8000-0000000000aa', url: '/photos/aa.png', thumbUrl: '/photos/aa-thumb.webp' }
const FILTER = item({ code: 'W 712/95', name: 'Filtro de óleo', vehicleBrand: 'Volkswagen', vehicleModel: 'Gol', color: 'Preto' })
const PADS = item({ code: 'FRA-1000', name: 'Pastilha de freio', vehicleBrand: 'Chevrolet', vehicleModel: 'Opala 4.1' })
// A part that fits one generation and version of a model.
const DISC = item({ code: 'M-1', name: 'Disco', vehicleBrand: 'Volkswagen', vehicleModel: 'Gol', firstYear: 2008, lastYear: 2012, version: '1.0 G5' })
const ITEMS = [FILTER, PADS, item({ code: 'J-1', name: 'Junta', vehicleBrand: 'Volkswagen', vehicleModel: 'Santana' })]
// The lists the form picks from: what the items use, plus the category and brands of a new spark plug.
const LISTS = itemListsOf([...ITEMS, item({ code: 'B7', name: 'Vela', category: 'Ignição', partBrand: 'NGK', vehicleBrand: 'Fiat' })])
const root = document.documentElement

/**
 * Answers the next save with the item the API would send back, and returns the mocked fetch.
 * @param status The response status.
 * @param body The response body; by default the sent item with an id.
 * @returns The fetch mock, to read what was sent.
 */
function answerSave(status = 201, body?: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => new Response(JSON.stringify(body ?? savedOf(JSON.parse(String(init?.body)))), { status }))
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
function item(fields: FlatItem & Required<Pick<FlatItem, 'code' | 'name'>>): Item {
  return testItem({
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
    photos: [],
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
    ...fields,
  })
}

/**
 * Makes a small PNG file, as the file picker would hand over.
 * @param name File name.
 * @returns The file.
 */
function png(name: string): File {
  const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))
  return new File([bytes], name, { type: 'image/png' })
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
 * Builds the item the API would send back for a body sent: its vehicles, and its brands with ids and no photos.
 * @param sent The body sent.
 * @param photos The first brand's photos, as the API saved them.
 * @returns The saved item.
 */
function savedOf(sent: ItemCreate, photos: ItemBrand['photos'] = []): Item {
  return testItem({
    ...sent,
    vehicles: sent.vehicles.map((vehicle) => ({ ...vehicle, vehicleModel: vehicle.vehicleModel || null })),
    brands: sent.brands.map((brand, index) => ({
      color: 'N/A',
      quantity: 0,
      ...brand,
      id: brand.id ?? `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      location: brand.location || null,
      photos: index === 0 ? photos : [],
    })),
  })
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
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
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
  const required = [
    ITEM_FORM_MESSAGES.code,
    ITEM_FORM_MESSAGES.name,
    ITEM_FORM_MESSAGES.category,
    ITEM_FORM_MESSAGES.partBrand,
    ITEM_FORM_MESSAGES.vehicleBrand,
    ITEM_FORM_MESSAGES.price,
  ]
  for (const message of required) {
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

  answerSave(409, { details: [{ field: 'brands/0/code', code: 'NOVA-1', itemName: 'Correia dentada' }] })
  await fill(screen, { code: 'nova-1', name: 'Vela', category: 'Ignição', partBrand: 'NGK', vehicleBrand: 'Fiat', price: '10' })
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(screen.getByText(codeTakenMessage('Correia dentada'))).toBeVisible()
})

// Types a code another item uses, key by key, and checks the field names that item at once, before Save, and drops
// the message once the code changes to a free one; the same code with other separators is named too, as the search
// finds it. An empty code says nothing until Save, and nothing is sent. Editing an item, its own code passes while
// another item's is named.
test('Web: a code in use is named while it is typed', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  const screen = await render(<Sample />)
  const code = screen.getByLabelText('Código da peça')
  const taken = screen.getByText(codeTakenMessage('Pastilha de freio'))
  await userEvent.type(code, 'fra-1000')
  await expect.element(taken).toBeVisible()
  await userEvent.type(code, '1')
  await expect.element(taken).not.toBeInTheDocument()
  await code.fill('fra 1000')
  await expect.element(taken).toBeVisible()
  await code.fill('')
  await expect.element(screen.getByText(ITEM_FORM_MESSAGES.code)).not.toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
  await screen.unmount()

  const editing = await render(<Sample item={PADS} />)
  await editing.getByLabelText('Código da peça').fill('fra-1000')
  await expect.element(editing.getByText(codeTakenMessage('Pastilha de freio'))).not.toBeInTheDocument()
  await editing.getByLabelText('Código da peça').fill('w 712/95')
  await expect.element(editing.getByText(codeTakenMessage('Filtro de óleo'))).toBeVisible()
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

// Types a new category and picks "+ Criar", and checks the option already shows the name with a capital letter,
// the name is created in the categories, picked in the field and announced; then a new vehicle model is created under
// the chosen brand.
test('Web: "+ Criar" creates the name in its list and picks it', async () => {
  const create = vi.fn<CreateListEntry>()
  const screen = await render(<Sample onCreateEntry={create} />)
  const category = screen.getByRole('combobox', { name: 'Categoria' })
  await category.fill('motor  diesel')
  await screen.getByRole('option', { name: '+ Criar categoria “Motor diesel”' }).click()
  await expect.element(screen.getByText('Categoria “Motor diesel” criada.')).toBeVisible()
  await expect.element(category).toHaveValue('Motor diesel')
  expect(create).toHaveBeenCalledWith('categories', 'Motor diesel', undefined)
  await screen.getByRole('button', { name: 'Mostrar categorias' }).click()
  await expect.element(screen.getByRole('option', { name: 'Motor diesel' })).toBeVisible()

  await screen.getByRole('combobox', { name: 'Marca do veículo' }).fill('Volkswagen')
  await screen.getByRole('combobox', { name: 'Modelo do veículo' }).fill('xR3')
  await screen.getByRole('option', { name: '+ Criar modelo “XR3”' }).click()
  await expect.element(screen.getByText('Modelo “XR3” criado.')).toBeVisible()
  const volkswagen = LISTS.vehicleBrands.find((brand) => brand.name === 'Volkswagen')!
  expect(create).toHaveBeenLastCalledWith('vehicleModels', 'XR3', volkswagen.id)
})

// Creates a part brand the API can't create, and checks a toast says so and the field keeps the typed name, which
// saving then refuses, pointing to "+ Criar".
test('Web: a name that couldn\'t be created is reported and not saved', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  const screen = await render(<Sample onCreateEntry={async () => null} />)
  await fill(screen, { code: 'c-1', name: 'Amortecedor', category: 'Motor', partBrand: 'Bosch', vehicleBrand: 'Fiat', price: '10' })
  await screen.getByRole('combobox', { name: 'Marca da peça' }).fill('cofap')
  await screen.getByRole('option', { name: '+ Criar marca “Cofap”' }).click()
  await expect.element(screen.getByText('Não foi possível criar a marca de peça. Tente de novo.')).toBeVisible()
  await expect.element(screen.getByRole('combobox', { name: 'Marca da peça' })).toHaveValue('Cofap')
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(screen.getByText(ITEM_FORM_MESSAGES.partBrandNotListed)).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
})

// Types a category, brands and a model the lists don't hold, without picking "+ Criar", and checks saving shows each
// field's error pointing to it and sends nothing; the model stays locked while its brand isn't one of the list.
test('Web: names not in their lists are refused on save', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  const screen = await render(<Sample />)
  await fill(screen, { code: 'c-1', name: 'Amortecedor', category: 'Suspensão', partBrand: 'Cofap', vehicleBrand: 'Renault', price: '10' })
  await expect.element(screen.getByRole('combobox', { name: 'Modelo do veículo' })).toBeDisabled()
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(screen.getByText(ITEM_FORM_MESSAGES.categoryNotListed)).toBeVisible()
  await expect.element(screen.getByText(ITEM_FORM_MESSAGES.partBrandNotListed)).toBeVisible()
  await expect.element(screen.getByText(ITEM_FORM_MESSAGES.vehicleBrandNotListed)).toBeVisible()

  await screen.getByRole('combobox', { name: 'Marca do veículo' }).fill('Fiat')
  await screen.getByRole('combobox', { name: 'Modelo do veículo' }).fill('Uno')
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(screen.getByText(ITEM_FORM_MESSAGES.vehicleModelNotListed)).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
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
  await expect.element(screen.getByLabelText('Valor unitário (R$)')).toHaveValue('R$ 1.234,50')
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
      name: 'Vela',
      category: 'Ignição',
      vehicles: [{ vehicleBrand: 'Chevrolet', vehicleModel: '' }],
      position: 'D',
      brands: [expect.objectContaining({ partBrand: 'NGK', code: 'NGK-B7', color: 'N/A', unitPriceCents: 3490 })],
    }),
  })
  await expect.element(screen.getByText('Item “Vela” cadastrado.')).toBeVisible()
})

// Gives a vehicle a generation and a version, picking the generation the stock already has for that model, and checks
// a generation that isn't years is refused on its field; then that the item is posted with the years and the version.
test('Web: a vehicle takes an optional generation and version, sent as years', async () => {
  const fetch = answerSave()
  const onSaved = vi.fn()
  const screen = await render(<Sample items={[...ITEMS, DISC]} onSaved={onSaved} />)
  await fill(screen, { code: 'ngk-b7', name: 'vela', category: 'ignição', partBrand: 'NGK', vehicleBrand: 'volkswagen', price: '34,9' })
  await screen.getByRole('combobox', { name: 'Modelo do veículo' }).fill('gol')
  await screen.getByRole('combobox', { name: 'Geração' }).fill('12/08')
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(screen.getByText(ITEM_FORM_MESSAGES.generationInvalid)).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
  // Clearing the field lists every generation it offers.
  await screen.getByRole('combobox', { name: 'Geração' }).clear()
  await screen.getByRole('option', { name: '08/12' }).click()
  await screen.getByRole('combobox', { name: 'Versão' }).fill('1.0 G5')
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalled())
  expect(sent(fetch).body).toMatchObject({
    name: 'Vela',
    vehicles: [{ vehicleBrand: 'Volkswagen', vehicleModel: 'Gol', firstYear: 2008, lastYear: 2012, version: '1.0 G5' }],
  })
})

// Opens the details of an item whose vehicle has a generation and a version, and checks they are listed with the
// vehicle, apart from the item's name.
test('Web: the details list a vehicle with its generation and version', async () => {
  const screen = await render(<Sample item={DISC} details />)
  await expect.element(screen.getByText('Volkswagen Gol 08/12 1.0 G5')).toBeVisible()
  await expect.element(screen.getByText('Disco', { exact: true })).toBeVisible()
})

// Types a material and a description past 30 characters, and checks the description is cut at 30 with its counter,
// then that both are posted with a capital letter.
test('Web: an item takes an optional material and a description of up to 30 characters', async () => {
  const fetch = answerSave()
  const onSaved = vi.fn()
  const screen = await render(<Sample onSaved={onSaved} />)
  await fill(screen, { code: 'ngk-b7', name: 'vela', category: 'ignição', partBrand: 'NGK', vehicleBrand: 'chevrolet', price: '34,9' })
  await screen.getByLabelText('Material').fill('níquel')
  await screen.getByLabelText('Descrição curta').fill('eletrodo de níquel, rosca longa 19 mm')
  await expect.element(screen.getByLabelText('Descrição curta')).toHaveValue('eletrodo de níquel, rosca long')
  await expect.element(screen.getByText('30/30')).toBeVisible()
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalled())
  expect(sent(fetch).body).toMatchObject({ material: 'Níquel', description: 'Eletrodo de níquel, rosca long' })
})

// Opens the details of an item with a material and a description, and checks both are listed, the description right
// after the name and category.
test('Web: the details list an item\'s description and material', async () => {
  const noted = item({ code: 'N-1', name: 'Junta', material: 'Cortiça', description: 'Com furo extra' })
  const screen = await render(<Sample item={noted} details />)
  await expect.element(screen.getByText('Com furo extra')).toBeVisible()
  await expect.element(screen.getByText('Cortiça')).toBeVisible()
  const fields = screen.getByTestId('inventory.item-form-dialog.fields').element()
  const labels = [...fields.querySelectorAll('[role="group"]')].map((group) => group.firstElementChild?.textContent)
  expect(labels.slice(0, 4)).toEqual(['Nome', 'Categoria', 'Descrição curta', 'Material'])
})

// Opens the details of an item without a material or a description, and checks neither is listed.
test('Web: the details of an item without notes list neither', async () => {
  const plain = await render(<Sample item={FILTER} details />)
  await expect.element(plain.getByText('Filtro de óleo')).toBeVisible()
  expect(plain.getByText('Descrição curta').query()).toBeNull()
  expect(plain.getByText('Material', { exact: true }).query()).toBeNull()
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
  await expect.element(screen.getByLabelText('Valor unitário (R$)')).toHaveValue('R$ 39,90')
  await screen.getByLabelText('Quantidade', { exact: true }).fill('7')
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect.element(screen.getByText('Item “Filtro de óleo” salvo.')).toBeVisible()
  expect(sent(fetch)).toMatchObject({
    url: `/api/items/${FILTER.id}`,
    method: 'PATCH',
    body: { brands: [{ id: FILTER.brands[0].id, quantity: 7, code: 'W 712/95' }] },
  })
})

// Types a quantity with a comma and pastes a fraction, and checks the comma is left out, the fraction is refused with
// its message and the field keeps its value; then a minimum past a million is refused on save and nothing is sent.
test('Web: the quantities take whole numbers only, up to a million', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  const screen = await render(<Sample item={FILTER} />)
  const quantity = screen.getByLabelText('Quantidade', { exact: true })
  await quantity.fill('12')
  await userEvent.keyboard(',')
  await expect.element(quantity).toHaveValue('12')
  await expect.element(screen.getByText(ITEM_FORM_MESSAGES.quantityInvalid)).not.toBeInTheDocument()
  await quantity.fill('1,5')
  await expect.element(quantity).toHaveValue('12')
  await expect.element(screen.getByText(ITEM_FORM_MESSAGES.quantityInvalid)).toBeVisible()
  await quantity.fill('1.000')
  await expect.element(quantity).toHaveValue('1000')
  await expect.element(screen.getByText(ITEM_FORM_MESSAGES.quantityInvalid)).not.toBeInTheDocument()
  await screen.getByLabelText('Quantidade mínima').fill('2000000')
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect.element(screen.getByText(ITEM_FORM_MESSAGES.quantityTooHigh)).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
})

// Types digits into the empty price and checks it shows the placeholder, then fills from the cents as each one is
// typed, a comma typed is left out, and a pasted "7.50" reads as R$ 7,50; then saves and checks 750 cents are sent.
test('Web: the price always shows in reais, a dot and a comma alike', async () => {
  const fetch = answerSave(200)
  const screen = await render(<Sample item={FILTER} />)
  const price = screen.getByLabelText('Valor unitário (R$)')
  await price.fill('')
  await expect.element(price).toHaveAttribute('placeholder', 'R$ 0,00')
  await userEvent.type(price, '7,50')
  await expect.element(price).toHaveValue('R$ 7,50')
  await price.fill('1234')
  await expect.element(price).toHaveValue('R$ 1.234,00')
  await price.fill('7.50')
  await expect.element(price).toHaveValue('R$ 7,50')
  await price.fill('abc')
  await expect.element(price).toHaveValue('R$ 7,50')
  await expect.element(screen.getByText(ITEM_FORM_MESSAGES.priceInvalid)).toBeVisible()
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
  await vi.waitFor(() => expect(sent(fetch)).toMatchObject({ method: 'PATCH', body: { brands: [{ unitPriceCents: 750 }] } }))
})

// Opens the form at 1280×720 and on a 360×780 phone and checks Save, "Salvar item" on the phone, is on screen without
// scrolling and the form scrolls inside the dialog.
test('Web: Save is on screen without scrolling at both minimum sizes', async () => {
  for (const [width, height] of [
    [MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT],
    [MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT],
  ]) {
    await page.viewport(width, height)
    const screen = await render(<Sample />)
    const save = screen.getByRole('button', { name: /^Salvar/ }).element().getBoundingClientRect()
    expect(save.bottom).toBeLessThanOrEqual(height)
    expect(save.right).toBeLessThanOrEqual(width)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width)
    await screen.unmount()
  }
})

// Opens an item's details and checks every field shows as text by its label, with what doesn't apply or wasn't
// filled in said in words and the price in reais; nothing in it can be typed in or chosen, Enter sends nothing, and
// Fechar, where the focus starts, closes it.
test('Web: the details show the item as text and change nothing', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  const screen = await render(<Sample item={FILTER} details />)
  const dialog = screen.getByRole('dialog', { name: 'Detalhes do item' })
  await expect.element(dialog).toBeVisible()
  const value = (label: string) => screen.getByRole('group', { name: label, exact: true }).getByRole('paragraph')
  await expect.element(value('Código da peça')).toHaveTextContent('W 712/95')
  await expect.element(value('Veículos')).toHaveTextContent('Volkswagen Gol')
  await expect.element(value('Posição')).toHaveTextContent('Não se aplica')
  await expect.element(value('Cor')).toHaveTextContent('Preto')
  await expect.element(value('Local')).toHaveTextContent('Não informado')
  expect(value('Valor unitário (R$)').element().textContent).toMatch(/^R\$\s39,90$/)
  expect(dialog.element().querySelectorAll('input, [role="radio"]')).toHaveLength(0)
  await expect.element(screen.getByRole('button', { name: 'Fechar' }).filter({ hasText: 'Fechar' })).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  await expect.element(dialog).not.toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
})

// Opens the details, presses Editar and checks the fields unlock in place, the brand's each where its value was under
// its photos (whose field grows a drop area), with the focus on the first field, the name, Cancelar and Salvar
// alterações; then changes the quantity and checks it is patched like an edit.
test('Web: Editar unlocks the details in place and saves like an edit', async () => {
  const fetch = answerSave(200)
  const onSaved = vi.fn()
  const screen = await render(<Sample item={FILTER} details onSaved={onSaved} />)
  const photos = () => screen.getByRole('group', { name: 'Fotos do item' }).element().getBoundingClientRect().bottom
  const below = (rect: DOMRect) => rect.top - photos()
  const before = screen.getByText('W 712/95').element().getBoundingClientRect()
  const beforeGap = below(before)
  await screen.getByRole('button', { name: 'Editar' }).click()
  await expect.element(screen.getByRole('heading', { name: 'Editar item' })).toBeVisible()
  await expect.element(screen.getByLabelText('Nome')).toHaveFocus()
  const code = screen.getByLabelText('Código da peça')
  await expect.element(code).toHaveValue('W 712/95')
  const after = code.element().parentElement!.getBoundingClientRect()
  expect([below(after), after.left, after.height]).toEqual([beforeGap, before.left, before.height])
  await expect.element(screen.getByRole('button', { name: 'Cancelar' })).toBeVisible()
  await screen.getByLabelText('Quantidade', { exact: true }).fill('7')
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalled())
  expect(sent(fetch)).toMatchObject({ url: `/api/items/${FILTER.id}`, method: 'PATCH', body: { brands: [{ quantity: 7 }] } })
  await expect.element(screen.getByText('Item “Filtro de óleo” salvo.')).toBeVisible()
})

// Saves a new item with two photos chosen, and checks the item is posted first, then its brand's photos are sent to
// the brand in order as files, and the item handed over carries the photos the API saved.
test('Web: a new item is saved with its photos', async () => {
  let posted: ItemCreate | undefined
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    if (String(url).endsWith('/photos')) {
      return new Response(JSON.stringify(savedOf(posted!, [SAVED_PHOTO])), { status: 200 })
    }
    posted = JSON.parse(String(init?.body))
    return new Response(JSON.stringify(savedOf(posted!)), { status: 201 })
  })
  const onSaved = vi.fn()
  const screen = await render(<Sample onSaved={onSaved} />)
  await fill(screen, { code: 'ngk-b7', name: 'vela', category: 'Ignição', partBrand: 'NGK', vehicleBrand: 'Fiat', price: '10' })
  await userEvent.upload(screen.getByLabelText(/Arraste até 3 fotos/), [png('frente.png'), png('lado.png')])
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalled())
  const [[firstUrl], [photosUrl, photosInit]] = fetch.mock.calls
  expect(firstUrl).toBe('/api/items')
  expect(photosInit?.method).toBe('PUT')
  expect(photosUrl).toMatch(/^\/api\/items\/[0-9a-f-]+\/brands\/00000000-0000-4000-8000-000000000001\/photos$/)
  const parts = [...(photosInit!.body as FormData).entries()].map(([name, value]) => [name, (value as File).name])
  expect(parts).toEqual([
    ['photo', 'frente.png'],
    ['photo', 'lado.png'],
  ])
  expect(onSaved.mock.calls[0][0].brands[0].photos).toEqual([SAVED_PHOTO])
  await expect.element(screen.getByText('Item “Vela” cadastrado.')).toBeVisible()
})

// Edits an item whose photos can't be saved. Saved as it is, nothing is sent and an info toast says there is nothing
// to save; with a quantity changed, only the item is sent, not its unchanged photos; with a photo removed, a warning
// toast says the item was saved without its photos and the item is still handed over.
test('Web: an unchanged edit is not sent, and photos that fail to save are reported', async () => {
  const withPhoto = { ...FILTER, brands: [{ ...FILTER.brands[0], photos: [SAVED_PHOTO] }] }
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    String(url).endsWith('/photos') ? new Response(null, { status: 500 }) : new Response(JSON.stringify(withPhoto), { status: 200 }),
  )
  const onSaved = vi.fn()
  const unchanged = await render(<Sample item={withPhoto} onSaved={onSaved} />)
  await expect.element(unchanged.getByRole('img', { name: 'Foto 1, capa' })).toHaveAttribute('src', '/api/photos/aa.png')
  await unchanged.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect.element(unchanged.getByRole('status')).toHaveTextContent(ITEM_UNCHANGED_MESSAGE)
  expect(fetch).not.toHaveBeenCalled()
  expect(onSaved).not.toHaveBeenCalled()

  const screen = await render(<Sample item={withPhoto} onSaved={onSaved} />)
  await screen.getByLabelText('Quantidade', { exact: true }).last().fill('7')
  await screen.getByRole('button', { name: 'Salvar alterações' }).last().click()
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  expect(fetch).toHaveBeenCalledTimes(1)

  const again = await render(<Sample item={withPhoto} onSaved={onSaved} />)
  await again.getByRole('button', { name: 'Remover foto 1' }).last().click()
  await again.getByRole('button', { name: 'Salvar alterações' }).last().click()
  await expect.element(again.getByText('Item “Filtro de óleo” salvo, mas as fotos não foram salvas. Tente de novo.')).toBeVisible()
  expect(onSaved).toHaveBeenLastCalledWith(withPhoto)
})

// Opens the details of an item with a photo and checks it shows read-only, with no way to remove it or add more.
test('Web: the details show the photos read-only', async () => {
  const screen = await render(<Sample item={{ ...FILTER, brands: [{ ...FILTER.brands[0], photos: [SAVED_PHOTO] }] }} details />)
  await expect.element(screen.getByRole('img', { name: 'Foto 1, capa' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Remover foto 1' }).elements()).toHaveLength(0)
  expect(document.querySelector('dialog input[type="file"]')).toBeNull()
})

// Adds a second brand to an item, fills it in its own section, and checks it is sent after the first with its own
// code, price and part brand, and that Remover takes a brand out, the form back to one brand without Remover.
test('Web: a second brand is added, sent with the item, and removed', async () => {
  const fetch = answerSave(200)
  const screen = await render(<Sample item={FILTER} />)
  expect(screen.getByRole('button', { name: /^Remover marca/ }).elements()).toHaveLength(0)
  await screen.getByRole('button', { name: 'Adicionar marca' }).click()
  const second = screen.getByRole('group', { name: 'Marca 2' })
  await second.getByRole('combobox', { name: 'Marca da peça' }).fill('NGK')
  await second.getByLabelText('Código da peça').fill('w 712-b')
  await second.getByLabelText('Quantidade', { exact: true }).fill('4')
  await second.getByLabelText('Valor unitário (R$)').fill('29,90')
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
  expect(sent(fetch).body.brands).toEqual([
    expect.objectContaining({ id: FILTER.brands[0].id, code: 'W 712/95' }),
    expect.objectContaining({ partBrand: 'NGK', code: 'W 712-B', quantity: 4, unitPriceCents: 2990 }),
  ])
  await screen.unmount()

  const again = await render(<Sample item={FILTER} />)
  await again.getByRole('button', { name: 'Adicionar marca' }).click()
  await again.getByRole('button', { name: 'Remover marca 1' }).click()
  await expect.element(again.getByRole('group', { name: 'Marca 2' })).not.toBeInTheDocument()
  await expect.element(again.getByLabelText('Código da peça')).toHaveValue('')
  expect(again.getByRole('button', { name: /^Remover marca/ }).elements()).toHaveLength(0)
})

// Gives a second brand the first one's part brand and code, and checks each is refused under its field, on the second
// brand, and nothing is sent.
test('Web: a part brand and a code appear once in an item', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  const screen = await render(<Sample item={FILTER} />)
  await screen.getByRole('button', { name: 'Adicionar marca' }).click()
  const second = screen.getByRole('group', { name: 'Marca 2' })
  await second.getByRole('combobox', { name: 'Marca da peça' }).fill('bosch')
  await second.getByLabelText('Código da peça').fill('W712-95')
  await second.getByLabelText('Valor unitário (R$)').fill('10')
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect.element(second.getByText(ITEM_FORM_MESSAGES.partBrandRepeated)).toBeVisible()
  await expect.element(second.getByText(ITEM_FORM_MESSAGES.codeRepeated)).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
})

// Opens the details of an item of two brands and checks each brand shows in its own section, with its code, price
// and quantity.
test('Web: the details show each brand of an item', async () => {
  const both = {
    ...PADS,
    quantity: 5,
    brands: [
      PADS.brands[0],
      { ...PADS.brands[0], id: '00000000-0000-4000-8000-0000000000b2', partBrand: 'Cobreq', code: 'N-1210', quantity: 4, unitPriceCents: 7990 },
    ],
  }
  const screen = await render(<Sample item={both} details />)
  const second = screen.getByRole('group', { name: 'Marca 2' })
  const value = (label: string) => second.getByRole('group', { name: label, exact: true }).getByRole('paragraph')
  await expect.element(value('Marca da peça')).toHaveTextContent('Cobreq')
  await expect.element(value('Código da peça')).toHaveTextContent('N-1210')
  await expect.element(value('Quantidade')).toHaveTextContent('4')
  expect(value('Valor unitário (R$)').element().textContent).toMatch(/^R\$\s79,90$/)
  await expect.element(screen.getByRole('group', { name: 'Fotos da marca 2' })).toBeVisible()
})

// Opens the details of an item of three brands on its third, as a brand's row in the list does, and checks the form
// scrolls down to that brand's section: its top in view, the first brand's above the dialog's body.
test('Web: the details open scrolled to the brand they were opened on', async () => {
  const third = { ...PADS.brands[0], id: '00000000-0000-4000-8000-0000000000b3', partBrand: 'Fras-le', code: 'PD-580' }
  const three = {
    ...PADS,
    brands: [PADS.brands[0], { ...PADS.brands[0], id: '00000000-0000-4000-8000-0000000000b2', partBrand: 'Cobreq', code: 'N-1210' }, third],
  }
  const screen = await render(<Sample item={three} details scrollToBrand={third.id} />)
  const body = screen.getByTestId('common.dialog.body').element().getBoundingClientRect()
  const section = screen.getByRole('group', { name: 'Marca 3' }).element().getBoundingClientRect()
  expect(section.top).toBeGreaterThanOrEqual(body.top - 1)
  expect(section.top).toBeLessThan(body.bottom)
  expect(screen.getByRole('group', { name: 'Marca 1' }).element().getBoundingClientRect().top).toBeLessThan(body.top)
})

// At 360×780, opens an item's details and checks they follow the Detalhes mockup: the ← in place of the × and Fechar,
// the red round Excluir at the top right, the title for screen readers only; "Sem fotos", the category over the name,
// the stock and the minimum, the list of details and a card per brand; Duplicar and Editar sharing the bottom, each
// with its icon. Excluir and Duplicar call the owner, and Editar unlocks the fields, under the item's name and with no
// field started on, so the keyboard doesn't rise.
test('Web: on a phone the details fill the screen, as in the Detalhes mockup', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
  const { colors } = themes.eighties.night
  const onDelete = vi.fn()
  const onDuplicate = vi.fn()
  const both = {
    ...FILTER,
    quantity: 7,
    minQuantity: 2,
    position: 'D' as const,
    originalCodes: ['5U0 698 151'],
    brands: [FILTER.brands[0], { ...FILTER.brands[0], id: '00000000-0000-4000-8000-0000000000b2', partBrand: 'Mann', code: 'W-2', color: 'N/A', location: null }],
  }
  const screen = await render(<Sample item={both} details onDelete={onDelete} onDuplicate={onDuplicate} />)
  const dialog = screen.getByRole('dialog', { name: 'Detalhes do item' })
  const box = dialog.element().getBoundingClientRect()
  expect([box.left, box.top, box.width, box.height]).toEqual([0, 0, MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT])
  await expect.element(dialog.getByRole('button', { name: 'Fechar' })).not.toBeInTheDocument()
  // The title names the dialog for screen readers only.
  expect(dialog.getByRole('heading', { name: 'Detalhes do item' }).element().getBoundingClientRect().width).toBeLessThanOrEqual(1)
  const remove = dialog.getByRole('button', { name: 'Excluir item' })
  const look = getComputedStyle(remove.element())
  expect([remove.element().getBoundingClientRect().width, look.backgroundColor]).toEqual([44, rgb(colors.danger)])
  expect(remove.element().getBoundingClientRect().right).toBeGreaterThan(MIN_MOBILE_WIDTH - 20)

  await expect.element(dialog.getByText('Sem fotos')).toBeVisible()
  await expect.element(dialog.getByRole('heading', { name: 'Filtro de óleo' })).toBeVisible()
  await expect.element(dialog.getByText('Motor', { exact: true })).toBeVisible()
  const text = dialog.element().textContent ?? ''
  expect(text).toMatch(/Em estoque\s*7\s*un\./)
  expect(text).toMatch(/Mínimo\s*2\s*un\./)
  expect(text).toMatch(/Posição · Lado\s*Dianteiro/)
  expect(text).toMatch(/Códigos originais\s*5U0 698 151/)
  expect(text).toContain('Marcas · 2')
  expect(dialog.getByRole('group', { name: 'Bosch' }).element().textContent).toMatch(/W 712\/95.*Sem local · Preto$/)
  expect(dialog.getByRole('group', { name: 'Mann' }).element().textContent).toMatch(/W-2.*Sem local$/)

  const duplicate = dialog.getByRole('button', { name: 'Duplicar' })
  const edit = dialog.getByRole('button', { name: 'Editar' })
  const [left, right] = [duplicate, edit].map((button) => button.element().getBoundingClientRect())
  expect(Math.abs(left.width - right.width)).toBeLessThanOrEqual(1)
  expect(right.bottom).toBeLessThanOrEqual(MIN_MOBILE_HEIGHT)
  expect([duplicate, edit].map((button) => button.element().querySelector('svg') !== null)).toEqual([true, true])

  await remove.click()
  expect(onDelete).toHaveBeenCalledWith(both)
  await edit.click()
  await expect.element(screen.getByRole('dialog', { name: 'Filtro de óleo' })).toBeVisible()
  await expect.element(screen.getByLabelText('Nome')).toHaveValue('Filtro de óleo')
  await expect.element(screen.getByLabelText('Nome')).not.toHaveFocus()
})

// At 360×780, in every style and mode, opens a new item's form and checks it follows the Novo item mockup: the × and
// "Novo item" on top, where the focus starts, so no keyboard rises; the fields in one column; a dashed "Adicionar
// veículo" across the width with its hint; Posição and Lado in full words with N/A, sharing the width; the minimum as a
// 48px − and + around the number; the brand a raised card with Tirar foto and Galeria, its part brand and code across
// it, then its quantity and price side by side, and its color and location; a dashed "Adicionar marca"; and only
// "Salvar item" across the bottom.
test('Web: on a phone the form fills the screen, as in the Novo item mockup', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  for (const style of STYLES) {
    for (const mode of MODES) {
      root.dataset.style = style
      root.dataset.mode = mode
      const { colors } = themes[style][mode]
      const screen = await render(<Sample />)
      const dialog = screen.getByRole('dialog', { name: 'Novo item' })
      const box = dialog.element().getBoundingClientRect()
      expect([box.left, box.top, box.width, box.height]).toEqual([0, 0, MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT])
      await expect.element(dialog.getByRole('button', { name: 'Fechar' })).toHaveFocus()
      await expect.element(dialog.getByLabelText('Nome')).toHaveAttribute('placeholder', 'Ex.: Pastilha de freio')
      const name = dialog.getByLabelText('Nome').element().getBoundingClientRect()
      const category = dialog.getByRole('combobox', { name: 'Categoria' }).element().getBoundingClientRect()
      expect(category.top).toBeGreaterThan(name.bottom)

      const addVehicle = dialog.getByRole('button', { name: 'Adicionar veículo' }).element()
      expect(getComputedStyle(addVehicle).borderStyle).toBe('dashed')
      expect(addVehicle.getBoundingClientRect().width).toBe(MIN_MOBILE_WIDTH - 32)
      await expect.element(dialog.getByText('Sem modelo, a peça serve em qualquer modelo da marca. A geração e a versão são opcionais.')).toBeVisible()
      expect(dialog.getByRole('combobox', { name: 'Marca do veículo' }).query()).toBeNull()

      for (const [group, labels] of [
        ['Posição', ['N/A', 'Dianteira', 'Traseira', 'Ambas']],
        ['Lado', ['N/A', 'Esquerdo', 'Direito', 'Ambos']],
      ] as const) {
        const radios = dialog.getByRole('radiogroup', { name: group }).getByRole('radio')
        expect(radios.elements().map((radio) => radio.textContent)).toEqual(labels)
        const widths = radios.elements().map((radio) => radio.getBoundingClientRect().width)
        expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1)
        await expect.element(dialog.getByRole('radiogroup', { name: group }).getByRole('radio', { name: 'N/A' })).toBeChecked()
      }

      for (const button of ['Diminuir', 'Aumentar']) {
        const rect = dialog.getByRole('button', { name: button }).element().getBoundingClientRect()
        expect([rect.width, rect.height]).toEqual([48, 48])
      }
      await expect.element(dialog.getByText('Abaixo disso, somando as marcas, o item fica com estoque baixo.')).toBeVisible()
      await expect.element(dialog.getByText('Os da montadora. Separe com vírgula.')).toBeVisible()

      const brand = dialog.getByRole('group', { name: 'Marca 1' })
      expect(getComputedStyle(brand.element()).backgroundColor).toBe(rgb(colors.panelRaised))
      await expect.element(brand.getByLabelText('Tirar foto')).toBeInTheDocument()
      await expect.element(brand.getByLabelText('Galeria')).toBeInTheDocument()
      const rect = (label: string) => brand.getByLabelText(label, { exact: true }).element().getBoundingClientRect()
      const card = brand.element().getBoundingClientRect()
      expect(rect('Código da peça').width).toBeGreaterThan(card.width / 2)
      expect(rect('Quantidade').top).toBe(rect('Valor unitário (R$)').top)
      expect(rect('Quantidade').right).toBeLessThan(rect('Valor unitário (R$)').left)
      expect(rect('Cor').top).toBe(rect('Local').top)
      await expect.element(brand.getByLabelText('Cor')).toHaveAttribute('placeholder', 'Se houver')
      await expect.element(brand.getByLabelText('Local')).toHaveAttribute('placeholder', 'Ex.: E-1')

      expect(getComputedStyle(dialog.getByRole('button', { name: 'Adicionar marca' }).element()).borderStyle).toBe('dashed')
      expect(dialog.getByRole('button', { name: 'Cancelar' }).query()).toBeNull()
      const save = dialog.getByRole('button', { name: 'Salvar item' }).element().getBoundingClientRect()
      expect([save.width, save.bottom <= MIN_MOBILE_HEIGHT]).toEqual([MIN_MOBILE_WIDTH - 32, true])
      expect(screen.getByTestId('common.dialog.body').element().scrollWidth).toBeLessThanOrEqual(MIN_MOBILE_WIDTH)
      await screen.unmount()
    }
  }
})

// At 360×780, adds a vehicle as a chip from "Adicionar veículo", the focus going to its brand and back; checks a vehicle
// the item has and one not in the list are refused before they join, and Cancelar leaves the chips as they were; then
// removes the only chip and checks saving says a vehicle is missing, and adds two, which are sent in order.
test('Web: on a phone vehicles are chips, checked before they join', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const fetch = answerSave(200)
  const screen = await render(<Sample item={FILTER} />)
  const vehicles = screen.getByRole('group', { name: 'Veículos', exact: true })
  const chips = () => vehicles.getByRole('listitem').elements().map((chip) => chip.textContent)
  expect(chips()).toEqual(['Volkswagen Gol'])
  const add = vehicles.getByRole('button', { name: 'Adicionar veículo' })
  const draft = vehicles.getByRole('group', { name: 'Novo veículo' })

  await add.click()
  await expect.element(draft.getByRole('combobox', { name: 'Marca do veículo' })).toHaveFocus()
  await draft.getByRole('combobox', { name: 'Marca do veículo' }).fill('volkswagen')
  await draft.getByRole('combobox', { name: 'Modelo do veículo' }).fill(' gol ')
  await userEvent.keyboard('{Escape}')
  await draft.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await expect.element(draft.getByText(ITEM_FORM_MESSAGES.vehicleRepeated)).toBeVisible()
  await draft.getByRole('combobox', { name: 'Marca do veículo' }).fill('Renault')
  await userEvent.keyboard('{Escape}')
  await draft.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await expect.element(draft.getByText(ITEM_FORM_MESSAGES.vehicleBrandNotListed)).toBeVisible()
  await draft.getByRole('button', { name: 'Cancelar' }).click()
  await expect.element(add).toHaveFocus()
  expect(chips()).toEqual(['Volkswagen Gol'])

  await vehicles.getByRole('button', { name: 'Remover Volkswagen Gol' }).click()
  expect(chips()).toEqual([])
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect.element(vehicles.getByText(ITEM_FORM_MESSAGES.vehicleBrand)).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()

  for (const [brand, model] of [
    ['chevrolet', 'opala 4.1'],
    ['Fiat', ''],
  ]) {
    await add.click()
    await draft.getByRole('combobox', { name: 'Marca do veículo' }).fill(brand)
    if (model) {
      await draft.getByRole('combobox', { name: 'Modelo do veículo' }).fill(model)
    }
    await userEvent.keyboard('{Escape}')
    await draft.getByRole('button', { name: 'Adicionar', exact: true }).click()
  }
  expect(chips()).toEqual(['Chevrolet Opala 4.1', 'Fiat (qualquer modelo)'])
  await expect.element(vehicles.getByText(ITEM_FORM_MESSAGES.vehicleBrand)).not.toBeInTheDocument()
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
  expect(sent(fetch).body.vehicles).toEqual([
    { vehicleBrand: 'Chevrolet', vehicleModel: 'Opala 4.1' },
    { vehicleBrand: 'Fiat', vehicleModel: '' },
  ])
})

// At 360×780, fills a new item, chooses the position and side by their full words and the minimum with the stepper,
// and checks "Salvar item" posts them as the desktop's form does; and an item's edit is titled with its name.
test('Web: on a phone the position, side and minimum are chosen in full words and with the stepper', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const fetch = answerSave()
  const onSaved = vi.fn()
  const screen = await render(<Sample onSaved={onSaved} />)
  await screen.getByLabelText('Código da peça').fill('ngk-b7')
  await screen.getByLabelText('Nome').fill('vela')
  await screen.getByRole('combobox', { name: 'Categoria' }).fill('Ignição')
  await screen.getByRole('combobox', { name: 'Marca da peça' }).fill('NGK')
  await screen.getByRole('button', { name: 'Adicionar veículo' }).click()
  await screen.getByRole('combobox', { name: 'Marca do veículo' }).fill('Fiat')
  await screen.getByRole('option', { name: 'Fiat' }).click()
  await screen.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await screen.getByLabelText('Valor unitário (R$)').fill('10')
  await screen.getByRole('radio', { name: 'Dianteira' }).click()
  await screen.getByRole('radio', { name: 'Esquerdo' }).click()
  await screen.getByRole('button', { name: 'Aumentar' }).click()
  await screen.getByRole('button', { name: 'Aumentar' }).click()
  await screen.getByRole('button', { name: 'Diminuir' }).click()
  await screen.getByRole('button', { name: 'Aumentar' }).click()
  await expect.element(screen.getByRole('textbox', { name: 'Quantidade mínima' })).toHaveValue('2')
  await screen.getByRole('button', { name: 'Salvar item' }).click()
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalled())
  expect(sent(fetch).body).toMatchObject({ name: 'Vela', position: 'D', side: 'LE', minQuantity: 2, vehicles: [{ vehicleBrand: 'Fiat' }] })
  await screen.unmount()

  const edit = await render(<Sample item={FILTER} />)
  await expect.element(edit.getByRole('dialog', { name: 'Filtro de óleo' })).toBeVisible()
  await expect.element(edit.getByRole('button', { name: 'Salvar alterações' })).toBeVisible()
})

// At 360×780, closes an item's details with the ← at the top left.
test('Web: on a phone the ← closes the details', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const screen = await render(<Sample item={FILTER} details />)
  await screen.getByRole('button', { name: 'Voltar ao estoque' }).click()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
})

// Types an item's original codes as chips, one with Enter and two pasted at once, and checks they are sent with the
// item in uppercase, in order.
test('Web: original codes are typed as chips and sent with the item', async () => {
  const fetch = answerSave(200)
  const screen = await render(<Sample item={FILTER} />)
  const codes = screen.getByLabelText('Códigos originais')
  await userEvent.type(codes, '030 115 561 an{Enter}')
  await codes.fill('030-115-561-ap; 06a 115 561')
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
  expect(sent(fetch).body.originalCodes).toEqual(['030 115 561 AN', '030-115-561-AP', '06A 115 561'])
})

// Types an original code another item uses and one a brand of the item has, and checks each chip says so under the
// field at once, and the item isn't sent.
test('Web: an original code another item or a brand of the item has is refused, saying so', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  const screen = await render(<Sample item={FILTER} />)
  await userEvent.type(screen.getByLabelText('Códigos originais'), 'fra 1000,w712/95,')
  const alert = screen.getByRole('alert')
  await expect.element(alert.getByText(`FRA 1000: ${codeTakenMessage('Pastilha de freio')}`)).toBeVisible()
  await expect.element(alert.getByText(`W712/95: ${ITEM_FORM_MESSAGES.originalCodeInBrand}`)).toBeVisible()
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
  expect(fetch).not.toHaveBeenCalled()
})

// Adds a second vehicle to an item, a model of the list, and a third that repeats the first written otherwise, and
// checks the repeated one is refused on its line and nothing is sent; then removes it and checks the item is sent with
// its two vehicles in order, and that Remover leaves the last line without one.
test('Web: vehicles are added, refused when repeated, and removed', async () => {
  const fetch = answerSave(200)
  const screen = await render(<Sample item={FILTER} />)
  const vehicles = screen.getByRole('group', { name: 'Veículos', exact: true })
  expect(vehicles.getByRole('button', { name: /^Remover veículo/ }).elements()).toHaveLength(0)
  await screen.getByRole('button', { name: 'Adicionar veículo' }).click()
  const second = screen.getByRole('group', { name: 'Veículo 2' })
  await second.getByRole('combobox', { name: 'Marca do veículo' }).fill('volkswagen')
  await second.getByRole('combobox', { name: 'Modelo do veículo' }).fill('santana')
  await screen.getByRole('button', { name: 'Adicionar veículo' }).click()
  const third = screen.getByRole('group', { name: 'Veículo 3' })
  await third.getByRole('combobox', { name: 'Marca do veículo' }).fill('VOLKSWAGEN')
  await third.getByRole('combobox', { name: 'Modelo do veículo' }).fill(' gol ')
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect.element(third.getByText(ITEM_FORM_MESSAGES.vehicleRepeated)).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()

  await screen.getByRole('button', { name: 'Remover veículo 3' }).click()
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
  expect(sent(fetch).body.vehicles).toEqual([
    { vehicleBrand: 'Volkswagen', vehicleModel: 'Gol' },
    { vehicleBrand: 'Volkswagen', vehicleModel: 'Santana' },
  ])
  await screen.getByRole('button', { name: 'Remover veículo 1' }).click()
  expect(vehicles.getByRole('button', { name: /^Remover veículo/ }).elements()).toHaveLength(0)
})

// Adds a second vehicle at the minimum desktop size and checks the form doesn't scroll sideways and each line's
// trash stays inside the dialog, in the danger color, centered on the line's fields.
test('Web: the vehicle lines fit the dialog at the minimum desktop size', async () => {
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
  const screen = await render(<Sample item={FILTER} />)
  await screen.getByRole('button', { name: 'Adicionar veículo' }).click()
  const body = screen.getByTestId('common.dialog.body').element()
  expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth)
  const dialog = screen.getByRole('dialog').element().getBoundingClientRect()
  for (const line of ['Veículo 1', 'Veículo 2']) {
    const group = screen.getByRole('group', { name: line })
    const remove = group.getByRole('button', { name: `Remover ${line.toLowerCase()}` }).element()
    const trash = remove.getBoundingClientRect()
    const field = group.getByRole('combobox', { name: 'Marca do veículo' }).element().getBoundingClientRect()
    expect(trash.right).toBeLessThanOrEqual(dialog.right)
    expect(Math.abs(trash.top + trash.height / 2 - (field.top + field.height / 2))).toBeLessThanOrEqual(1)
    expect(getComputedStyle(remove).color).toBe(rgb(themes.eighties.night.colors.danger))
  }
})

// Opens the details of an item with original codes and checks they show apart, under Códigos originais.
test("Web: the details list an item's original codes", async () => {
  const screen = await render(<Sample item={{ ...FILTER, originalCodes: ['030 115 561 AN', '030 115 561 AP'] }} details />)
  const value = screen.getByRole('group', { name: 'Códigos originais', exact: true }).getByRole('paragraph')
  await expect.element(value).toHaveTextContent('030 115 561 AN, 030 115 561 AP')
})

// Opens the details of an item with Duplicar, and checks it asks what to copy, each choice closes the question and
// hands the item over with whether its photos go too, and Cancelar hands nothing over, leaving the details open.
test('Web: Duplicar asks whether the copy takes the photos', async () => {
  const onDuplicate = vi.fn()
  const screen = await render(<Sample item={FILTER} details onDuplicate={onDuplicate} />)
  const question = screen.getByRole('dialog', { name: 'Duplicar item?' })
  for (const [choice, withPhotos] of [
    ['Copiar dados e fotos', true],
    ['Copiar só os dados', false],
  ] as const) {
    await screen.getByRole('button', { name: 'Duplicar' }).click()
    await expect.element(question).toBeVisible()
    await question.getByRole('button', { name: choice }).click()
    expect(onDuplicate).toHaveBeenLastCalledWith(FILTER, withPhotos)
    await expect.element(question).not.toBeInTheDocument()
  }
  await screen.getByRole('button', { name: 'Duplicar' }).click()
  await question.getByRole('button', { name: 'Cancelar' }).click()
  await expect.element(question).not.toBeInTheDocument()
  expect(onDuplicate).toHaveBeenCalledTimes(2)
  await expect.element(screen.getByRole('heading', { name: 'Detalhes do item' })).toBeVisible()
})

// Opens a new item's form as a copy of an item with a photo, and checks it opens filled in without the code and with
// the quantity at 0, showing the photo, and that saving it with a new code posts the item, then sends the photo as a
// copy of the item's.
test("Web: a duplicated item opens without codes or stock and saves copies of the item's photos", async () => {
  const withPhoto = { ...FILTER, brands: [{ ...FILTER.brands[0], photos: [SAVED_PHOTO] }] }
  let posted: ItemCreate | undefined
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    if (String(url).endsWith('/photos')) {
      return new Response(JSON.stringify(savedOf(posted!, [SAVED_PHOTO])), { status: 200 })
    }
    posted = JSON.parse(String(init?.body))
    return new Response(JSON.stringify(savedOf(posted!)), { status: 201 })
  })
  const onSaved = vi.fn()
  const screen = await render(
    <Sample onSaved={onSaved} initialForm={duplicateForm(withPhoto)} initialPhotos={[copiedPhotos(withPhoto.brands[0].photos, '/api')]} />,
  )
  await expect.element(screen.getByRole('heading', { name: 'Novo item' })).toBeVisible()
  await expect.element(screen.getByLabelText('Nome')).toHaveValue('Filtro de óleo')
  await expect.element(screen.getByLabelText('Código da peça')).toHaveValue('')
  await expect.element(screen.getByLabelText('Quantidade', { exact: true })).toHaveValue('0')
  await expect.element(screen.getByRole('img', { name: 'Foto 1, capa' })).toHaveAttribute('src', '/api/photos/aa.png')

  await screen.getByLabelText('Código da peça').fill('w 712/96')
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalled())
  const [[firstUrl, firstInit], [, photosInit]] = fetch.mock.calls
  expect([firstUrl, firstInit?.method]).toEqual(['/api/items', 'POST'])
  expect(posted!.brands.map((brand) => [brand.code, brand.quantity])).toEqual([['W 712/96', 0]])
  expect([...(photosInit!.body as FormData).entries()]).toEqual([['copy', SAVED_PHOTO.id]])
})

function Sample({
  item: editing,
  details,
  scrollToBrand,
  items = ITEMS,
  onSaved = () => {},
  onCreateEntry,
  initialForm,
  initialPhotos,
  onDuplicate,
  onDelete,
}: {
  item?: Item
  details?: boolean
  scrollToBrand?: string
  /** Every item in stock; ITEMS when left out. */
  items?: Item[]
  onSaved?: (item: Item) => void
  initialForm?: ItemForm
  initialPhotos?: UploadPhoto[][]
  onDuplicate?: (item: Item, withPhotos: boolean) => void
  onDelete?: (item: Item) => void
  /** Called with each name to create; the name is created as asked unless it returns null. */
  onCreateEntry?: CreateListEntry
}) {
  const [open, setOpen] = useState(true)
  const [lists, setLists] = useState<ItemLists>(LISTS)

  /** Creates a name in a list as the API would, adding it to the list unless onCreateEntry says it failed. */
  const create: CreateListEntry = async (kind, name, vehicleBrandId) => {
    if ((await onCreateEntry?.(kind, name, vehicleBrandId)) === null) {
      return null
    }
    const entry = { id: crypto.randomUUID(), name, ...(vehicleBrandId && { vehicleBrandId }) }
    setLists((held) => withEntry(held, kind, entry))
    return entry
  }

  return (
    <ToastProvider>
      <ItemFormDialog
        open={open}
        item={editing}
        details={details}
        scrollToBrand={scrollToBrand}
        items={items}
        lists={lists}
        onCreateEntry={create}
        onClose={() => setOpen(false)}
        onSaved={onSaved}
        initialForm={initialForm}
        initialPhotos={initialPhotos}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    </ToastProvider>
  )
}
