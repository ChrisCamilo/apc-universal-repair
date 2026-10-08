import { ENGINE_SHEETS } from '@apc/shared/catalog'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import type { Item } from '@apc/shared/items'
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { AppFrame } from '../components/AppFrame.tsx'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { CatalogTab } from './CatalogTab.tsx'

const OPALA_25 = ENGINE_SHEETS['chevrolet-opala-diplomata-1986-2.5']
const OPALA_41 = ENGINE_SHEETS['chevrolet-opala-diplomata-1986-4.1']
// Parts in the inventory, for the code search: an engine the catalog has, an engine it lacks, a model it has no
// sheet for, a part for any Volkswagen and a universal one.
const PARTS: Item[] = [
  part({ code: 'FRA-10002', name: 'Pastilha de freio traseira', vehicleBrand: 'Chevrolet', vehicleModel: 'Opala 3.8' }),
  part({ code: 'FRA-1000', name: 'Pastilha de freio dianteira', vehicleBrand: 'Chevrolet', vehicleModel: 'Opala 4.1' }),
  part({ code: 'ESC-200', name: 'Amortecedor', vehicleBrand: 'Ford', vehicleModel: 'Escort' }),
  part({ code: 'GOL-300', name: 'Filtro de ar', vehicleBrand: 'Volkswagen', vehicleModel: null }),
  part({ code: 'LAMP-100', name: 'Lâmpada H4', vehicleBrand: 'Universal', vehicleModel: null }),
]
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
 * Fills in an inventory item with the fields the Catalog doesn't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function part(fields: Pick<Item, 'code' | 'name' | 'vehicleBrand' | 'vehicleModel'>): Item {
  return {
    id: crypto.randomUUID(),
    category: 'Freios',
    partBrand: 'Cobreq',
    position: 'N/A',
    side: 'N/A',
    color: 'N/A',
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 100,
    photos: [],
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
    ...fields,
  }
}

/**
 * Answers the inventory request with the test parts and renders the Catalog once they are in.
 * @returns The rendered screen.
 */
async function renderWithParts() {
  vi.mocked(globalThis.fetch).mockResolvedValue(new Response(JSON.stringify({ items: PARTS, total: PARTS.length })))
  const screen = await render(<CatalogTab />)
  await vi.waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
  await new Promise((resolve) => setTimeout(resolve, 0))
  return screen
}

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(1280, 720)
})

// No API runs during these tests: the inventory request answers with no parts unless a test gives its own.
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0 })))
})

afterEach(async () => {
  vi.restoreAllMocks()
  await page.viewport(1280, 720)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the Catalog in one style and mode and checks the chosen brand tile, the chosen engine and the sheet's
    // readouts take that combination's accent.
    test(`Web: the Catalog follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<CatalogTab />)
      expect(getComputedStyle(screen.getByRole('radio', { name: 'Chevrolet' }).element()).borderColor).toBe(rgb(colors.accent))
      const engine = screen.getByRole('treeitem', { name: '2.5 L 4 cilindros' }).element().firstElementChild!
      expect(getComputedStyle(engine).color).toBe(rgb(colors.accent))
      expect(getComputedStyle(screen.getByText(OPALA_25.specs[1], { exact: true }).element()).color).toBe(rgb(colors.accent))
    })
  }
}

// Opens the Catalog and checks it starts on the first brand with its first engine chosen and its sheet shown, then
// picks another engine, a brand with sheets and a brand without, and checks the tree and the detail column follow.
test('Web: brands and engines drive the tree and the sheet', async () => {
  const screen = await render(<CatalogTab />)
  await expect.element(screen.getByRole('radio', { name: 'Chevrolet' })).toBeChecked()
  await expect.element(screen.getByRole('treeitem', { name: '2.5 L 4 cilindros' })).toHaveAttribute('aria-selected', 'true')
  await expect.element(screen.getByRole('heading', { name: OPALA_25.title })).toBeVisible()
  await expect.element(screen.getByText(OPALA_25.summary)).toBeVisible()

  await screen.getByRole('treeitem', { name: '4.1 L 6 cilindros' }).click()
  await expect.element(screen.getByRole('heading', { name: OPALA_41.title })).toBeVisible()

  await screen.getByRole('radio', { name: 'Volkswagen' }).click()
  await expect.element(screen.getByRole('tree', { name: 'Modelos Volkswagen' })).toBeVisible()
  await expect.element(screen.getByRole('treeitem', { name: '1.8 L 4 cilindros' })).toHaveAttribute('aria-selected', 'true')
  await expect.element(screen.getByRole('heading', { name: ENGINE_SHEETS['volkswagen-gol-gts-1989-1.8'].title })).toBeVisible()

  await screen.getByRole('radio', { name: 'Ford' }).click()
  await expect.element(screen.getByRole('tree', { name: 'Modelos Ford' })).toBeVisible()
  await expect.element(screen.getByText('Nenhuma ficha cadastrada')).toBeVisible()
  await expect.element(screen.getByText(/Os veículos da Ford ainda não têm ficha técnica/)).toBeVisible()
})

// Lays the Catalog out in the app frame at 1280×720 and on a 360×780 phone, and checks the rail, the tree and the
// sheet sit side by side on desktop, and on the phone the tiles sit above the tree two to a row with the sheet below,
// nothing wider than the screen and the deepest engine name shown whole.
test('Web: the Catalog lays out in columns on desktop and stacks on a phone', async () => {
  const screen = await render(
    <AppFrame navLabel="Seções do Dashboard" nav={null}>
      <CatalogTab />
    </AppFrame>,
  )
  const box = (element: Element) => element.getBoundingClientRect()
  const rail = () => box(screen.getByRole('radiogroup').element())
  const tree = () => box(screen.getByRole('tree').element())
  const sheet = () => box(screen.getByRole('heading', { name: OPALA_25.title }).element())
  expect(tree().left).toBeGreaterThan(rail().right)
  expect(sheet().left).toBeGreaterThan(tree().right)

  await page.viewport(360, 780)
  expect(tree().top).toBeGreaterThan(rail().bottom)
  expect(sheet().top).toBeGreaterThan(tree().bottom)
  const tiles = screen.getByRole('radio').elements().map(box)
  expect(tiles[0].top).toBe(tiles[1].top)
  expect(tiles[2].top).toBeGreaterThan(tiles[0].top)
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360)
  const engine = screen.getByRole('treeitem', { name: '4.1 L 6 cilindros' }).element().querySelector('.truncate')!
  expect(engine.scrollWidth).toBeLessThanOrEqual(engine.clientWidth)
})

// Types a brand search in another case and checks only the matching tile is left, then clears it and checks every
// brand is back.
test('Web: the brand search narrows the tiles', async () => {
  const screen = await render(<CatalogTab />)
  await screen.getByRole('searchbox', { name: 'Procure marca' }).fill('VOLKS')
  expect(screen.getByRole('radio').elements().map((tile) => tile.textContent)).toEqual(['Volkswagen'])
  await screen.getByRole('searchbox', { name: 'Procure marca' }).fill('')
  expect(screen.getByRole('radio').elements()).toHaveLength(4)
})

// Searches a model only another brand has, one no brand has, and clears the search, and checks the Catalog moves to
// the brand with the model and narrows its tree, says when no brand has it, and shows the whole tree again.
test('Web: the model search narrows the tree and moves to the brand that has the model', async () => {
  const screen = await render(<CatalogTab />)
  const search = screen.getByRole('searchbox', { name: 'Procure modelo ou código da peça' })
  const models = () => screen.getByRole('tree', { name: 'Modelos Fiat' }).element().querySelectorAll(':scope > [role="treeitem"]')
  await search.fill('uno')
  await expect.element(screen.getByRole('radio', { name: 'Fiat' })).toBeChecked()
  expect(models()).toHaveLength(1)
  await expect.element(screen.getByRole('heading', { name: ENGINE_SHEETS['fiat-uno-mille-1991-1.0'].title })).toBeVisible()
  await search.fill('kombi')
  await expect.element(screen.getByText('Nenhum modelo com esse nome')).toBeVisible()
  await search.fill('')
  expect(models()).toHaveLength(3)
})

// Types part codes without their separators and checks the matching parts are listed with the exact code first and
// the vehicle each fits, and that the chosen part reveals its vehicle: the brand, the model pointed out, the path
// open on the engine and its sheet, or a note when the catalog has no sheet for it. Clearing drops the list and the
// pointed-out model.
test('Web: a part code search lists the parts and reveals their vehicles', async () => {
  const screen = await renderWithParts()
  const search = screen.getByRole('searchbox', { name: 'Procure modelo ou código da peça' })
  await search.fill('fra1000')
  const parts = screen.getByRole('radiogroup', { name: 'Peças do estoque com esse código' }).getByRole('radio')
  expect(parts.elements().map((p) => p.querySelector('code')!.textContent)).toEqual(['FRA-1000', 'FRA-10002'])
  await expect.element(parts.first()).toBeChecked()
  await expect.element(parts.first()).toMatchTextContent(/Serve no Chevrolet Opala 4\.1/)
  await expect.element(screen.getByRole('treeitem', { name: 'Opala', exact: true })).toHaveAttribute('aria-current', 'true')
  await expect.element(screen.getByRole('treeitem', { name: '4.1 L 6 cilindros' })).toHaveAttribute('aria-selected', 'true')
  await expect.element(screen.getByRole('heading', { name: OPALA_41.title })).toBeVisible()

  await parts.last().click()
  await expect.element(screen.getByText('Chevrolet Opala 3.8', { exact: true })).toBeVisible()
  await expect.element(screen.getByText(/ainda não tem ficha técnica no catálogo/)).toBeVisible()

  await search.fill('esc-200')
  await expect.element(screen.getByRole('radio', { name: 'Ford' })).toBeChecked()
  await expect.element(screen.getByRole('treeitem', { name: 'Escort' })).toHaveAttribute('aria-current', 'true')
  await expect.element(screen.getByText('Ford Escort', { exact: true })).toBeVisible()

  await search.fill('lamp')
  await expect.element(screen.getByText('Serve em qualquer veículo')).toBeVisible()
  await search.fill('')
  await expect.element(screen.getByRole('radiogroup', { name: 'Peças do estoque com esse código' })).not.toBeInTheDocument()
  expect(document.querySelector('[aria-current]')).toBeNull()
})

// Lists two parts and moves the choice with the arrow keys, and checks the focus and the revealed vehicle follow.
test('Web: the arrow keys move between the listed parts', async () => {
  const screen = await renderWithParts()
  await screen.getByRole('searchbox', { name: 'Procure modelo ou código da peça' }).fill('fra1000')
  const parts = screen.getByRole('radiogroup', { name: 'Peças do estoque com esse código' }).getByRole('radio')
  await parts.first().click()
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(parts.last()).toBeChecked()
  await expect.element(parts.last()).toHaveFocus()
  await expect.element(screen.getByText('Chevrolet Opala 3.8', { exact: true })).toBeVisible()
})
