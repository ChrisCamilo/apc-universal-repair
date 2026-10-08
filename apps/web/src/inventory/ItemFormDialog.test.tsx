import { useState } from 'react'
import { codeTakenMessage, ITEM_FORM_MESSAGES } from '@apc/shared/item-form'
import type { Item } from '@apc/shared/items'
import { withEntry, type ItemLists } from '@apc/shared/lists'
import { itemListsOf } from '@apc/shared/test-lists'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ToastProvider } from '../components/Toast.tsx'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { ItemFormDialog } from './ItemFormDialog.tsx'
import type { CreateListEntry } from './useItemLists.ts'

// A photo the API saved, as items carry it.
const SAVED_PHOTO = { id: '00000000-0000-4000-8000-0000000000aa', url: '/photos/aa.png', thumbUrl: '/photos/aa-thumb.webp' }
const FILTER = item({ code: 'W 712/95', name: 'Filtro de óleo', vehicleBrand: 'Volkswagen', vehicleModel: 'Gol', color: 'Preto' })
const PADS = item({ code: 'FRA-1000', name: 'Pastilha de freio', vehicleBrand: 'Chevrolet', vehicleModel: 'Opala 4.1' })
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
    photos: [],
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
    ...fields,
  }
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

  answerSave(409, { details: [{ field: 'code', itemName: 'Correia dentada' }] })
  await fill(screen, { code: 'nova-1', name: 'Vela', category: 'Ignição', partBrand: 'NGK', vehicleBrand: 'Fiat', price: '10' })
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(screen.getByText(codeTakenMessage('Correia dentada'))).toBeVisible()
})

// Types a code another item uses, key by key, and checks the field names that item at once, before Save, and drops
// the message once the code changes to a free one; an empty code says nothing until Save, and nothing is sent. Editing
// an item, its own code passes while another item's is named.
test('Web: a code in use is named while it is typed', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  const screen = await render(<Sample />)
  const code = screen.getByLabelText('Código da peça')
  const taken = screen.getByText(codeTakenMessage('Pastilha de freio'))
  await userEvent.type(code, 'fra-1000')
  await expect.element(taken).toBeVisible()
  await userEvent.type(code, '1')
  await expect.element(taken).not.toBeInTheDocument()
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
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
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
  await expect.element(value('Modelo do veículo')).toHaveTextContent('Gol')
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

// Opens the details, presses Editar and checks the fields unlock in place, each where its value was under the photos
// (whose field grows a drop area), with the focus on the first, Cancelar and Salvar alterações; then changes the quantity and checks it is patched like an edit.
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
  const code = screen.getByLabelText('Código da peça')
  await expect.element(code).toHaveFocus()
  await expect.element(code).toHaveValue('W 712/95')
  const after = code.element().parentElement!.getBoundingClientRect()
  expect([below(after), after.left, after.height]).toEqual([beforeGap, before.left, before.height])
  await expect.element(screen.getByRole('button', { name: 'Cancelar' })).toBeVisible()
  await screen.getByLabelText('Quantidade', { exact: true }).fill('7')
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalled())
  expect(sent(fetch)).toMatchObject({ url: `/api/items/${FILTER.id}`, method: 'PATCH', body: { quantity: 7 } })
  await expect.element(screen.getByText('Item “Filtro de óleo” salvo.')).toBeVisible()
})

// Saves a new item with two photos chosen, and checks the item is posted first, then its photos are sent to it in
// order as files, and the item handed over carries the photos the API saved.
test('Web: a new item is saved with its photos', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    if (String(url).endsWith('/photos')) {
      return new Response(JSON.stringify({ ...item({ code: 'NGK-B7', name: 'Vela' }), photos: [SAVED_PHOTO] }), { status: 200 })
    }
    return new Response(JSON.stringify({ ...item({ code: 'NGK-B7', name: 'Vela' }), ...JSON.parse(String(init?.body)) }), { status: 201 })
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
  expect(photosUrl).toMatch(/^\/api\/items\/[0-9a-f-]+\/photos$/)
  const parts = [...(photosInit!.body as FormData).entries()].map(([name, value]) => [name, (value as File).name])
  expect(parts).toEqual([
    ['photo', 'frente.png'],
    ['photo', 'lado.png'],
  ])
  expect(onSaved.mock.calls[0][0].photos).toEqual([SAVED_PHOTO])
  await expect.element(screen.getByText('Item “Vela” cadastrado.')).toBeVisible()
})

// Edits an item whose photos can't be saved, and checks the toast says the item was saved without its photos and
// the item is still handed over; unchanged photos aren't sent at all.
test('Web: photos that fail to save are reported, and unchanged ones are not sent', async () => {
  const withPhoto = { ...FILTER, photos: [SAVED_PHOTO] }
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    String(url).endsWith('/photos') ? new Response(null, { status: 500 }) : new Response(JSON.stringify(withPhoto), { status: 200 }),
  )
  const onSaved = vi.fn()
  const screen = await render(<Sample item={withPhoto} onSaved={onSaved} />)
  await expect.element(screen.getByRole('img', { name: 'Foto 1, capa' })).toHaveAttribute('src', '/api/photos/aa.png')
  await screen.getByRole('button', { name: 'Salvar alterações' }).click()
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
  const screen = await render(<Sample item={{ ...FILTER, photos: [SAVED_PHOTO] }} details />)
  await expect.element(screen.getByRole('img', { name: 'Foto 1, capa' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Remover foto 1' }).elements()).toHaveLength(0)
  expect(document.querySelector('dialog input[type="file"]')).toBeNull()
})

function Sample({
  item: editing,
  details,
  onSaved = () => {},
  onCreateEntry,
}: {
  item?: Item
  details?: boolean
  onSaved?: (item: Item) => void
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
        items={ITEMS}
        lists={lists}
        onCreateEntry={create}
        onClose={() => setOpen(false)}
        onSaved={onSaved}
      />
    </ToastProvider>
  )
}
