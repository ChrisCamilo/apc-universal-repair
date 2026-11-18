import { MODES, STYLES, themes } from '@apc/tokens/theme'
import { PHOTO_PICKER } from '@apc/domain/item-form'
import type { Item, ItemPhoto } from '@apc/domain/items'
import { testItem } from '@apc/domain/test-items'
import { beforeAll, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../../app/fonts.ts'
import '../../index.css'
import { themeCss } from '../../app/theme.ts'
import { PhotoPickerDialog } from './PhotoPickerDialog.tsx'

const root = document.documentElement
/** A photo the API saved, by its id. */
const photo = (id: string): ItemPhoto => ({ id: `00000000-0000-4000-8000-0000000000${id}`, url: `/photos/${id}.png`, thumbUrl: `/photos/${id}-t.webp` })
// A brake disc of two photos, a pad of one under its second brand, and a filter without photos.
const DISC = testItem({ name: 'Disco de freio', code: 'BD-3377', partBrand: 'Fremax', photos: [photo('d1'), photo('d2')] })
const PADS = testItem({
  name: 'Pastilha',
  originalCodes: ['BD 33'],
  brands: [
    { id: crypto.randomUUID(), partBrand: 'Cobreq', code: 'N-1', color: 'N/A', location: null, quantity: 1, unitPriceCents: 100, photos: [] },
    { id: crypto.randomUUID(), partBrand: 'Fras-le', code: 'N-2', color: 'N/A', location: null, quantity: 1, unitPriceCents: 100, photos: [photo('p1')] },
  ],
})
const FILTER = testItem({ name: 'Filtro', code: 'BD-9000' })
const ITEMS: Item[] = [DISC, PADS, FILTER]

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
  await document.fonts.ready
})

// Opens the picker and checks it asks for a code, then lists only the items with photos whose code holds the search,
// the exact original code first, and says when nothing is found.
test('Web: the picker finds the items with photos by code', async () => {
  const screen = await render(<PhotoPickerDialog open onClose={() => {}} items={ITEMS} room={3} onPick={() => {}} />)
  await expect.element(screen.getByText(PHOTO_PICKER.hint)).toBeVisible()
  await screen.getByRole('searchbox', { name: PHOTO_PICKER.search }).fill('bd33')
  const heads = () => screen.getByRole('button', { expanded: false }).elements().map((head) => head.textContent)
  expect(heads()).toEqual(['PastilhaN-1 · 2 marcas · 1 foto', 'Disco de freioBD-3377 · Fremax · 2 fotos'])
  await screen.getByRole('searchbox', { name: PHOTO_PICKER.search }).fill('bd-9000')
  await expect.element(screen.getByText(PHOTO_PICKER.none)).toBeVisible()
})

// Opens the picker while the brake disc is edited and checks its photos aren't offered.
test('Web: the picker leaves out the item being edited', async () => {
  const editing = await render(<PhotoPickerDialog open onClose={() => {}} items={ITEMS} editingId={DISC.id} room={3} onPick={() => {}} />)
  await editing.getByRole('searchbox', { name: PHOTO_PICKER.search }).fill('bd')
  await expect.element(editing.getByRole('button', { name: /Pastilha/ })).toBeVisible()
  await expect.element(editing.getByRole('button', { name: /Disco de freio/ })).not.toBeInTheDocument()
})

// Opens two items, checks one photo of each up to the brand's room of two, and checks the other photos are disabled
// and the count says it is full; unchecking one frees the room again. "Usar 2 fotos" hands them over in the order
// they were checked, and a second press on an item closes it.
test('Web: photos are checked from several items up to the room, and handed over in order', async () => {
  const onPick = vi.fn()
  const screen = await render(<PhotoPickerDialog open onClose={() => {}} items={ITEMS} room={2} onPick={onPick} />)
  await screen.getByRole('searchbox', { name: PHOTO_PICKER.search }).fill('bd')
  await screen.getByRole('button', { name: /Pastilha/ }).click()
  await screen.getByRole('button', { name: /Disco de freio/ }).click()
  await screen.getByRole('checkbox', { name: 'Foto 1 de Pastilha · Fras-le' }).click()
  await screen.getByRole('checkbox', { name: 'Foto 2 de Disco de freio · Fremax' }).click()
  await expect.element(screen.getByRole('checkbox', { name: 'Foto 1 de Disco de freio · Fremax' })).toBeDisabled()
  await expect.element(screen.getByRole('status')).toHaveTextContent('2 de 2 fotos escolhidas: desmarque uma para trocar.')
  await screen.getByRole('checkbox', { name: 'Foto 1 de Pastilha · Fras-le' }).click()
  await expect.element(screen.getByRole('checkbox', { name: 'Foto 1 de Disco de freio · Fremax' })).toBeEnabled()
  await screen.getByRole('checkbox', { name: 'Foto 1 de Pastilha · Fras-le' }).click()
  await screen.getByRole('button', { name: 'Usar 2 fotos' }).click()
  expect(onPick).toHaveBeenCalledWith([photo('d2'), photo('p1')])
  await screen.getByRole('button', { name: /Disco de freio/ }).click()
  await expect.element(screen.getByRole('group', { name: 'Fotos de Disco de freio' })).not.toBeInTheDocument()
})

// Checks "Usar fotos" stays off until a photo is checked, and Cancelar asks to close with nothing handed over.
test('Web: Cancelar closes the picker with nothing added', async () => {
  const onClose = vi.fn()
  const onPick = vi.fn()
  const screen = await render(<PhotoPickerDialog open onClose={onClose} items={ITEMS} room={3} onPick={onPick} />)
  await expect.element(screen.getByRole('button', { name: 'Usar fotos' })).toBeDisabled()
  await screen.getByRole('button', { name: PHOTO_PICKER.cancel }).click()
  expect(onClose).toHaveBeenCalled()
  expect(onPick).not.toHaveBeenCalled()
})

// Searches, then with the keyboard opens an item with Enter and checks its first photo with Space.
test('Web: the picker works from the keyboard', async () => {
  const onPick = vi.fn()
  const screen = await render(<PhotoPickerDialog open onClose={() => {}} items={ITEMS} room={3} onPick={onPick} />)
  await screen.getByRole('searchbox', { name: PHOTO_PICKER.search }).fill('3377')
  screen.getByRole('button', { name: /Disco de freio/ }).element().focus()
  await userEvent.keyboard('{Enter}')
  await userEvent.tab()
  await expect.element(screen.getByRole('checkbox', { name: 'Foto 1 de Disco de freio · Fremax' })).toHaveFocus()
  await userEvent.keyboard(' ')
  await expect.element(screen.getByRole('checkbox', { name: 'Foto 1 de Disco de freio · Fremax' })).toHaveAttribute('aria-checked', 'true')
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Checks a photo in one style and mode and checks its frame and its check take the accent, and the count turns to
    // the warn color once the brand is full.
    test(`Web: a checked photo takes the accent in ${style}/${mode}`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<PhotoPickerDialog open onClose={() => {}} items={ITEMS} room={1} onPick={() => {}} />)
      await screen.getByRole('searchbox', { name: PHOTO_PICKER.search }).fill('3377')
      await screen.getByRole('button', { name: /Disco de freio/ }).click()
      const tile = screen.getByRole('checkbox', { name: 'Foto 1 de Disco de freio · Fremax' })
      await tile.click()
      await expect.poll(() => getComputedStyle(tile.element()).borderTopColor).toBe(rgb(colors.accent))
      const check = tile.element().querySelector('[data-testid="inventory.photo-picker.list.source.photos.photo.check"]')!
      expect(getComputedStyle(check).backgroundColor).toBe(rgb(colors.accent))
      expect(getComputedStyle(screen.getByRole('status').element()).color).toBe(rgb(colors.warn))
    })
  }
}
