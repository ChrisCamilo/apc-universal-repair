import { useState } from 'react'
import { applyCatalogChange, catalogChangeOf, TEST_CATALOG, TEST_CATALOG_DATA, TEST_ENGINES } from '@apc/domain/test-catalog'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/ui-spec/screens'
import { TABLE_CARD_BREAKPOINT } from '@apc/ui-spec/table'
import { MODES, STYLES, themes } from '@apc/tokens/theme'
import type { Item } from '@apc/domain/items'
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render, type RenderResult } from 'vitest-browser-react'
import { AppFrame } from '../../components/AppFrame'
import { ToastProvider } from '../../components/Toast'
import '../../app/fonts.ts'
import '../../index.css'
import { themeCss } from '../../app/theme.ts'
import { CatalogTab } from './CatalogTab.tsx'
import { PhoneHeaderContext, type PhoneHeader } from '../dashboard/phoneHeaderContext.ts'
import { testItem, type FlatItem } from '@apc/domain/test-items'

const OPALA_25 = TEST_CATALOG.sheets[TEST_ENGINES.opala25]
const OPALA_41 = TEST_CATALOG.sheets[TEST_ENGINES.opala41]
// Parts in the inventory, for the code search: an engine the catalog has, an engine it lacks, a model it has no
// sheet for, a part for any Volkswagen and a universal one.
const PARTS: Item[] = [
  part({ code: 'FRA-10002', name: 'Pastilha de freio traseira', vehicleBrand: 'Chevrolet', vehicleModel: 'Opala 3.8' }),
  part({ code: 'FRA-1000', name: 'Pastilha de freio dianteira', vehicleBrand: 'Chevrolet', vehicleModel: 'Opala 4.1' }),
  part({ code: 'ESC-200', name: 'Amortecedor', vehicleBrand: 'Ford', vehicleModel: 'Escort' }),
  part({ code: 'GOL-300', name: 'Filtro de ar', vehicleBrand: 'Volkswagen', vehicleModel: null }),
  part({ code: 'LAMP-100', name: 'Lâmpada H4', vehicleBrand: 'Universal', vehicleModel: null }),
]
// A catalog with many brands and models, as one may grow to: the test catalog, 30 more models for Chevrolet and 12
// more brands.
const LARGE_CATALOG = {
  brands: [
    {
      ...TEST_CATALOG_DATA.brands[0],
      models: [
        ...TEST_CATALOG_DATA.brands[0].models,
        ...Array.from({ length: 30 }, (_, index) => ({ id: crypto.randomUUID(), name: `Modelo ${index + 1}`, generations: [] })),
      ],
    },
    ...TEST_CATALOG_DATA.brands.slice(1),
    ...Array.from({ length: 12 }, (_, index) => ({ id: crypto.randomUUID(), name: `Marca ${index + 1}`, mark: 'MA', models: [] })),
  ],
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
 * Fills in an inventory item with the fields the Catalog doesn't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function part(fields: Required<Pick<FlatItem, 'code' | 'name' | 'vehicleBrand' | 'vehicleModel'>>): Item {
  return testItem({
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
  })
}

/**
 * Answers the API's requests as a server would: the catalog with the test catalog, and the inventory with some items.
 * @param items The inventory's items.
 * @param catalog The catalog's answer, the test catalog unless a test gives its own.
 */
function answer(items: Item[], catalog: () => Response = () => new Response(JSON.stringify(TEST_CATALOG_DATA))) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = input instanceof Request ? input.url : String(input)
    return url.includes('/catalog') ? catalog() : new Response(JSON.stringify({ items, total: items.length }))
  })
}

/**
 * Answers the API's requests as a server would, keeping the changes made to the catalog: the inventory with no parts,
 * the catalog with the test catalog at first, and each change made on it under the API's rules, answering the whole
 * catalog, or 404 or 409.
 */
function answerChanges() {
  let catalog = structuredClone(TEST_CATALOG_DATA)
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href)
    if (!url.pathname.startsWith('/api/catalog')) {
      return new Response(JSON.stringify({ items: [], total: 0 }))
    }
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {}
    const made = catalogChangeOf(init?.method ?? 'GET', url.pathname.slice('/api/catalog'.length), body, crypto.randomUUID())
    if (!made) {
      return new Response(JSON.stringify(catalog))
    }
    const result = applyCatalogChange(catalog, made.change)
    if (result === 'missing' || result === 'taken') {
      return new Response(null, { status: result === 'missing' ? 404 : 409 })
    }
    catalog = result
    return new Response(JSON.stringify(catalog), { status: made.status })
  })
}

/**
 * Finds the name of a node of the tree in its row, to point at the row.
 * @param screen The rendered screen.
 * @param label The node's name, which only that node has.
 * @returns The name in its row.
 */
function rowOf(screen: RenderResult, label: string) {
  return screen.getByText(label, { exact: true })
}

/**
 * Reads the names of the Opala's third generation's versions, in order.
 * @param screen The rendered screen.
 * @returns The names.
 */
function versionsOf(screen: RenderResult): string[] {
  const generation = screen.getByText('Terceira geração', { exact: true }).element().closest('[role="treeitem"]')!
  return [...generation.querySelectorAll(':scope > [role="none"] > [role="none"] > [role="group"] > [role="treeitem"]')].map(
    (item) => item.querySelector('[data-testid="common.tree-view.item.row.label"]')!.textContent!,
  )
}

/**
 * Renders the Catalog, with its toasts, and waits for the catalog to load.
 * @param phone Whether to render it as a phone's Dashboard would, under its header.
 * @returns The rendered screen.
 */
async function renderCatalog(phone = false) {
  const screen = await render(<ToastProvider>{phone ? <PhoneDashboard /> : <CatalogTab />}</ToastProvider>)
  await expect.element(screen.getByRole('status', { name: 'Carregando o catálogo' })).not.toBeInTheDocument()
  return screen
}

/**
 * Answers the inventory request with the test parts and renders the Catalog once they are in.
 * @param phone Whether to render it as a phone's Dashboard would, under its header.
 * @returns The rendered screen.
 */
async function renderWithParts(phone = false) {
  answer(PARTS)
  const screen = await renderCatalog(phone)
  await new Promise((resolve) => setTimeout(resolve, 0))
  return screen
}

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

// No API runs during these tests: the catalog request answers with the test catalog, and the inventory request with no
// parts unless a test gives its own.
beforeEach(() => {
  answer([])
})

afterEach(async () => {
  vi.restoreAllMocks()
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the Catalog in one style and mode and checks the chosen brand tile, the chosen engine and the sheet's
    // readouts take that combination's accent.
    test(`Web: the Catalog follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await renderCatalog()
      expect(getComputedStyle(screen.getByRole('radio', { name: 'Chevrolet' }).element()).borderColor).toBe(rgb(colors.accent))
      const engine = screen.getByRole('treeitem', { name: '2.5 L 4 cilindros' }).element().firstElementChild!
      expect(getComputedStyle(engine).color).toBe(rgb(colors.accent))
      expect(getComputedStyle(screen.getByText(OPALA_25.specs[1], { exact: true }).element()).color).toBe(rgb(colors.accent))
    })
  }
}

// Opens the Catalog while the catalog loads and checks the spinner shows, then has the catalog fail and checks the tab
// says so with a button to try again, which loads it.
test('Web: the Catalog loads, says when it fails and tries again', async () => {
  let failing = true
  answer([], () => (failing ? new Response(null, { status: 500 }) : new Response(JSON.stringify(TEST_CATALOG_DATA))))
  const screen = await render(<CatalogTab />)
  await expect.element(screen.getByRole('alert')).toMatchTextContent(/Não foi possível carregar o catálogo/)
  failing = false
  await screen.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect.element(screen.getByRole('radio', { name: 'Chevrolet' })).toBeChecked()
})

// Opens the Catalog and checks it starts on the first brand with its first engine chosen and its sheet shown, then
// picks another engine, a brand with sheets and a brand without, and checks the tree and the detail column follow.
test('Web: brands and engines drive the tree and the sheet', async () => {
  const screen = await renderCatalog()
  await expect.element(screen.getByRole('radio', { name: 'Chevrolet' })).toBeChecked()
  await expect.element(screen.getByRole('treeitem', { name: '2.5 L 4 cilindros' })).toHaveAttribute('aria-selected', 'true')
  await expect.element(screen.getByRole('heading', { name: OPALA_25.title })).toBeVisible()
  await expect.element(screen.getByText(OPALA_25.summary)).toBeVisible()

  await screen.getByRole('treeitem', { name: '4.1 L 6 cilindros' }).click()
  await expect.element(screen.getByRole('heading', { name: OPALA_41.title })).toBeVisible()

  await screen.getByRole('radio', { name: 'Volkswagen' }).click()
  await expect.element(screen.getByRole('tree', { name: 'Modelos Volkswagen' })).toBeVisible()
  await expect.element(screen.getByRole('treeitem', { name: '1.8 L 4 cilindros' })).toHaveAttribute('aria-selected', 'true')
  await expect.element(screen.getByRole('heading', { name: TEST_CATALOG.sheets[TEST_ENGINES.golGts].title })).toBeVisible()

  await screen.getByRole('radio', { name: 'Ford' }).click()
  await expect.element(screen.getByRole('tree', { name: 'Modelos Ford' })).toBeVisible()
  await expect.element(screen.getByText('Nenhuma ficha cadastrada')).toBeVisible()
  await expect.element(screen.getByText(/Os veículos da Ford ainda não têm ficha técnica/)).toBeVisible()
})

// Lays the Catalog out in the app frame at 1280×720 and at 720px, the narrowest width before a phone's, and checks the
// rail, the tree and the sheet sit side by side on desktop, and at 720px the tiles sit above the tree in a row of four
// with the sheet below, nothing wider than the screen and the deepest engine name shown whole.
test('Web: the Catalog lays out in columns on desktop and stacks on a narrow screen', async () => {
  const screen = await render(
    <AppFrame navLabel="Seções do Dashboard" nav={null}>
      <CatalogTab />
    </AppFrame>,
  )
  await expect.element(screen.getByRole('tree')).toBeVisible()
  const box = (element: Element) => element.getBoundingClientRect()
  const rail = () => box(screen.getByRole('radiogroup').element())
  const tree = () => box(screen.getByRole('tree').element())
  const sheet = () => box(screen.getByRole('heading', { name: OPALA_25.title }).element())
  expect(tree().left).toBeGreaterThan(rail().right)
  expect(sheet().left).toBeGreaterThan(tree().right)

  await page.viewport(TABLE_CARD_BREAKPOINT, MIN_MOBILE_HEIGHT)
  expect(tree().top).toBeGreaterThan(rail().bottom)
  expect(sheet().top).toBeGreaterThan(tree().bottom)
  const tiles = screen.getByRole('radio').elements().map(box)
  expect(tiles[3].top).toBe(tiles[0].top)
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(TABLE_CARD_BREAKPOINT)
  const engine = screen.getByRole('treeitem', { name: '4.1 L 6 cilindros' }).element().querySelector('.truncate')!
  expect(engine.scrollWidth).toBeLessThanOrEqual(engine.clientWidth)
})

// Fills the Catalog with 16 brands and a brand of 33 models at 1280×720 in the app frame, and checks the page doesn't
// scroll: the tiles scroll between the brand search and "Nova marca", the tree inside its panel and the detail column
// on its own, each column ending at the bottom of the window, and scrolling the tiles to their end keeps the brand
// search in view.
test('Web: on desktop the Catalog fills the window and scrolls in its columns', async () => {
  answer([], () => new Response(JSON.stringify(LARGE_CATALOG)))
  const screen = await render(
    <AppFrame navLabel="Seções do Dashboard" nav={null}>
      <CatalogTab />
    </AppFrame>,
  )
  await expect.element(screen.getByRole('tree')).toBeVisible()
  const page = screen.getByTestId('common.app-frame.main').element()
  expect(page.scrollHeight).toBeLessThanOrEqual(page.clientHeight)
  const tiles = screen.getByRole('radiogroup', { name: 'Marcas' }).element()
  const tree = screen.getByRole('tree').element()
  const detail = screen.getByTestId('catalog.catalog-tab.detail').element()
  for (const column of [tiles, tree]) {
    expect(column.scrollHeight).toBeGreaterThan(column.clientHeight)
  }
  expect(getComputedStyle(detail).overflowY).toBe('auto')
  const bottom = page.getBoundingClientRect().bottom
  const newBrand = screen.getByRole('button', { name: 'Nova marca' }).element()
  expect(tiles.getBoundingClientRect().bottom).toBeLessThanOrEqual(newBrand.getBoundingClientRect().top)
  for (const column of [newBrand, tree, detail]) {
    expect(column.getBoundingClientRect().bottom).toBeLessThanOrEqual(bottom)
    expect(column.getBoundingClientRect().bottom).toBeGreaterThan(bottom - 40)
  }
  tiles.scrollTop = tiles.scrollHeight
  await expect.element(screen.getByRole('radio', { name: 'Marca 12' })).toBeInViewport()
  await expect.element(screen.getByRole('searchbox', { name: 'Procure marca' })).toBeInViewport()
})

// Adds a brand from the rail and checks it ends the tiles chosen, with no models, then adds a model over the tree and
// checks it shows with a button to add its first generation; adding the brand again says it is in the catalog.
test('Web: a brand and a model are added from the rail and over the tree', async () => {
  answerChanges()
  const screen = await renderCatalog()
  await screen.getByRole('button', { name: 'Nova marca' }).click()
  await screen.getByRole('form', { name: 'Nova marca' }).getByLabelText('Nome').fill('renault')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByRole('radio', { name: 'Renault' })).toBeChecked()
  await expect.element(screen.getByRole('heading', { name: 'Modelos · 0' })).toBeVisible()

  await screen.getByRole('button', { name: 'Novo modelo' }).click()
  await screen.getByRole('form', { name: 'Novo modelo em Renault' }).getByLabelText('Nome').fill('Clio')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByRole('treeitem', { name: 'Clio' })).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Nova geração em Clio' })).toBeVisible()

  await screen.getByRole('button', { name: 'Nova marca' }).click()
  await screen.getByRole('form', { name: 'Nova marca' }).getByLabelText('Nome').fill('RENAULT')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByText('Essa marca já está no catálogo.')).toBeVisible()
})

// Adds a generation to an empty model, first with its last year before the first, which the row says, then right;
// reaches the new generation's "+" with Tab from its row and adds a version with the keyboard; and adds a year a
// version has already, which the row says, and Escape gives up on.
test('Web: the levels under a model are added, by keyboard too, and their fields are checked', async () => {
  answerChanges()
  const screen = await renderCatalog()
  await screen.getByRole('button', { name: 'Nova geração em Monza' }).click()
  const generation = screen.getByRole('form', { name: 'Nova geração em Monza' })
  await generation.getByLabelText('Nome').fill('primeira geração')
  await generation.getByLabelText('De').fill('1982')
  await generation.getByLabelText('Até').fill('1980')
  await generation.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(generation.getByText('O último ano não pode vir antes do primeiro.')).toBeVisible()
  await generation.getByLabelText('Até').fill('1996')
  await userEvent.keyboard('{Enter}')
  const monza = screen.getByRole('treeitem', { name: /^Monza/ })
  await expect.element(monza.getByText('1982–1996')).toBeVisible()

  ;(monza.getByRole('treeitem').first().element() as HTMLElement).focus()
  await userEvent.keyboard('{Tab}')
  await expect.element(monza.getByRole('button', { name: 'Nova versão em Primeira geração' }).first()).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  await userEvent.keyboard('SL/E{Enter}')
  await expect.element(monza.getByText('SL/E', { exact: true })).toBeVisible()

  await rowOf(screen, 'Diplomata').hover()
  await screen.getByRole('button', { name: 'Novo ano em Diplomata' }).click()
  await screen.getByRole('form', { name: 'Novo ano em Diplomata' }).getByLabelText('Ano').fill('1986')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByText('Essa versão já tem esse ano.')).toBeVisible()
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByRole('form', { name: 'Novo ano em Diplomata' })).not.toBeInTheDocument()
})

// Renames a version from its row, moves another up and checks the order, the first's "up" turned off, and deletes a
// generation after the dialog says what goes with it, which then leaves the tree.
test('Web: branches are renamed, moved and deleted after confirming', async () => {
  answerChanges()
  const screen = await renderCatalog()
  await rowOf(screen, 'Comodoro').hover()
  await screen.getByRole('button', { name: 'Renomear Comodoro' }).click()
  const rename = screen.getByRole('form', { name: 'Renomear Comodoro' }).getByLabelText('Nome')
  await expect.element(rename).toHaveValue('Comodoro')
  await rename.fill('Comodoro SL')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByText('Comodoro SL', { exact: true })).toBeVisible()

  await rowOf(screen, 'SS').hover()
  await screen.getByRole('button', { name: 'Mover SS para cima' }).click()
  await expect.poll(() => versionsOf(screen)).toEqual(['Comodoro SL', 'SS', 'Diplomata'])
  await rowOf(screen, 'Comodoro SL').hover()
  await expect.element(screen.getByRole('button', { name: 'Mover Comodoro SL para cima' })).toBeDisabled()

  await rowOf(screen, 'Terceira geração').hover()
  await screen.getByRole('button', { name: 'Excluir Terceira geração' }).click()
  const confirm = screen.getByRole('dialog', { name: 'Excluir “Terceira geração”?' })
  await expect.element(confirm).toMatchTextContent(/Vão junto 3 versões, 2 anos, 2 motores com ficha\./)
  await confirm.getByRole('button', { name: 'Excluir' }).click()
  await expect.element(screen.getByText('Terceira geração', { exact: true })).not.toBeInTheDocument()
  await expect.element(screen.getByText('“Terceira geração” saiu do catálogo.')).toBeVisible()
})

// Adds an engine to an empty year: its sheet opens empty in the detail column with the year from the tree, says what
// each field needs when saved empty, then shows the title, the engine's name and the readouts as they will be, and once
// saved the engine joins the tree under the year, chosen, its sheet shown with "Editar ficha".
test('Web: an engine is added to a year from an empty sheet and chosen in the tree', async () => {
  answerChanges()
  const screen = await renderCatalog()
  await screen.getByRole('button', { name: 'Novo motor em 1985' }).click()
  const sheet = screen.getByRole('form', { name: 'Novo motor em 1985' })
  await expect.element(sheet.getByText('Ano 1985, do galho de cima')).toBeVisible()
  await sheet.getByRole('button', { name: 'Salvar ficha' }).click()
  await expect.element(sheet.getByText('Use uma cilindrada de 0,1 a 15,0 L.')).toBeVisible()
  await expect.element(sheet.getByText('Use de 1 a 16 cilindros.')).toBeVisible()
  await expect.element(sheet.getByText('Escolha a tração.')).toBeVisible()

  await sheet.getByLabelText('Cilindrada (L)').fill('2,5')
  await sheet.getByLabelText('Cilindros').fill('4')
  await sheet.getByRole('radio', { name: 'Traseira' }).click()
  await sheet.getByLabelText('Resumo').fill('O quatro-cilindros de entrada.')
  await expect.element(sheet.getByRole('heading', { name: '1985 · Chevrolet Opala Diplomata 2.5' })).toBeVisible()
  await expect.element(sheet.getByText('Na árvore: 2.5 L 4 cilindros')).toBeVisible()
  await sheet.getByRole('button', { name: 'Salvar ficha' }).click()

  await expect.element(screen.getByRole('form', { name: 'Novo motor em 1985' })).not.toBeInTheDocument()
  const chosen = screen.getByRole('treeitem', { selected: true })
  await expect.element(chosen).toMatchTextContent(/^2\.5 L 4 cilindros/)
  expect(chosen.element().parentElement!.closest('[role="treeitem"]')!.querySelector('[data-testid="common.tree-view.item.row.label"]')!.textContent).toBe('1985')
  await expect.element(screen.getByRole('heading', { name: '1985 · Chevrolet Opala Diplomata 2.5' })).toBeVisible()
  await expect.element(screen.getByText('O quatro-cilindros de entrada.')).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Editar ficha' })).toBeVisible()
})

// Opens the chosen engine's sheet as a form, filled with its sheet, gives up with Cancelar, then opens it again and
// saves a new displacement and cylinders, and checks the engine's name in the tree and the sheet's title follow.
test("Web: an engine's sheet is edited, its name and title following", async () => {
  answerChanges()
  const screen = await renderCatalog()
  await screen.getByRole('button', { name: 'Editar ficha' }).click()
  const sheet = screen.getByRole('form', { name: 'Ficha do 2.5 L 4 cilindros' })
  await expect.element(sheet.getByLabelText('Cilindrada (L)')).toHaveValue('2,5')
  await expect.element(sheet.getByRole('radio', { name: 'Traseira' })).toBeChecked()
  await sheet.getByRole('button', { name: 'Cancelar' }).click()
  await expect.element(screen.getByRole('heading', { name: OPALA_25.title })).toBeVisible()

  await screen.getByRole('button', { name: 'Editar ficha' }).click()
  await sheet.getByLabelText('Cilindrada (L)').fill('2.8')
  await sheet.getByLabelText('Cilindros').fill('6')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByRole('treeitem', { name: /^2\.8 L 6 cilindros/ })).toHaveAttribute('aria-selected', 'true')
  await expect.element(screen.getByRole('heading', { name: '1986 · Chevrolet Opala Diplomata 2.8' })).toBeVisible()
})

// Types a brand search in another case and checks only the matching tile is left, then clears it and checks every
// brand is back.
test('Web: the brand search narrows the tiles', async () => {
  const screen = await renderCatalog()
  await screen.getByRole('searchbox', { name: 'Procure marca' }).fill('VOLKS')
  expect(screen.getByRole('radio').elements().map((tile) => tile.textContent)).toEqual(['Volkswagen'])
  await screen.getByRole('searchbox', { name: 'Procure marca' }).fill('')
  expect(screen.getByRole('radio').elements()).toHaveLength(4)
})

// Searches a model only another brand has, one no brand has, and clears the search, and checks the Catalog moves to
// the brand with the model and narrows its tree, says when no brand has it, and shows the whole tree again.
test('Web: the model search narrows the tree and moves to the brand that has the model', async () => {
  const screen = await renderCatalog()
  const search = screen.getByRole('searchbox', { name: 'Procure modelo ou código da peça' })
  const models = () => screen.getByRole('tree', { name: 'Modelos Fiat' }).element().querySelectorAll(':scope > [role="treeitem"]')
  await search.fill('uno')
  await expect.element(screen.getByRole('radio', { name: 'Fiat' })).toBeChecked()
  expect(models()).toHaveLength(1)
  await expect.element(screen.getByRole('heading', { name: TEST_CATALOG.sheets[TEST_ENGINES.unoMille].title })).toBeVisible()
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
  const codes = screen.getByTestId('catalog.part-results.list.part.line.code')
  expect(codes.elements().map((code) => code.textContent)).toEqual(['FRA-1000', 'FRA-10002'])
  expect(screen.getByTestId('catalog.part-results.list.part').elements()).toEqual(parts.elements())
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

// On a 360×780 phone, checks the Catalog opens on the brand lines, each with its letters and its models and sheets,
// with no brand search, then taps Chevrolet and checks the header turns to the brand with a ← and the models' tree,
// opens the tree down to the 4.1 engine and taps it, and checks its sheet shows under the path to it with each readout
// named. ← goes back to the models, open on the engine just seen, and ← again to the brands, the header back to the
// tab's name. Nothing gets wider than the screen.
test('Web: on a phone the Catalog goes from a brand to an engine sheet and back', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const screen = await renderCatalog(true)
  const lines = screen.getByTestId('catalog.catalog-tab.screen.brands.brand')
  expect(lines.elements().map((line) => line.textContent)).toEqual([
    'CHChevrolet3 modelos · 2 fichas técnicas',
    'VWVolkswagen3 modelos · 1 ficha técnica',
    'FIFiat3 modelos · 1 ficha técnica',
    'FOFord3 modelos · sem ficha técnica ainda',
  ])
  await expect.element(screen.getByRole('heading', { name: 'Marcas · 4' })).toBeVisible()
  await expect.element(screen.getByRole('searchbox', { name: 'Procure marca' })).not.toBeInTheDocument()

  await screen.getByRole('button', { name: /^Chevrolet/ }).click()
  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chevrolet')
  await expect.element(screen.getByRole('heading', { name: 'Modelos · 3' })).toBeVisible()
  for (const name of ['Opala', 'Terceira geração', 'Diplomata', '1986']) {
    await screen.getByRole('treeitem', { name, exact: name === 'Opala' }).getByText(name, { exact: true }).click()
  }
  await screen.getByRole('treeitem', { name: '4.1 L 6 cilindros' }).click()
  await expect.element(screen.getByRole('heading', { name: OPALA_41.title })).toBeVisible()
  await expect.element(screen.getByText('Opala › Terceira geração › Diplomata › 1986')).toBeVisible()
  const readouts = screen.getByTestId('catalog.catalog-tab.screen.readouts.readout')
  expect(readouts.elements().map((readout) => readout.textContent)).toEqual(['Ano1986', 'Motor4.1 L', 'Cilindros6 CIL', 'TraçãoTRASEIRA'])
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(MIN_MOBILE_WIDTH)

  await screen.getByRole('button', { name: 'Voltar aos modelos' }).click()
  await expect.element(screen.getByRole('treeitem', { name: '4.1 L 6 cilindros' })).toHaveAttribute('aria-selected', 'true')
  await screen.getByRole('button', { name: 'Voltar às marcas' }).click()
  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Catálogo')
  await expect.element(screen.getByRole('button', { name: /^Voltar/ })).not.toBeInTheDocument()
  expect(lines.elements()).toHaveLength(4)
})

// On a phone, searches a model only Fiat has and checks the brands narrow to Fiat and its tree to the model, then types
// part codes and checks the parts show as the Inventory's cards under a heading, and a tap on one clears the search and
// opens its engine's sheet, or, for a model without a sheet, its brand's models with the model pointed out and the
// note.
test('Web: on a phone the Catalog search narrows the brands and opens a part found by code', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const screen = await renderWithParts(true)
  const search = screen.getByRole('searchbox', { name: 'Procure modelo ou código da peça' })
  await search.fill('uno')
  await expect.element(screen.getByRole('heading', { name: 'Marcas · 1' })).toBeVisible()
  await screen.getByRole('button', { name: /^Fiat/ }).click()
  await expect.element(screen.getByRole('heading', { name: 'Modelos · 1' })).toBeVisible()
  await screen.getByRole('button', { name: 'Voltar às marcas' }).click()

  await search.fill('fra1000')
  await expect.element(screen.getByRole('heading', { name: 'Peças do estoque com esse código' })).toBeVisible()
  const cards = screen.getByRole('table', { name: 'Peças do estoque com esse código' }).getByRole('row')
  expect(cards.elements().map((card) => card.querySelector('code')!.textContent)).toEqual(['FRA-1000 · Cobreq', 'FRA-10002 · Cobreq'])
  await cards.first().click()
  await expect.element(screen.getByRole('heading', { name: OPALA_41.title })).toBeVisible()
  await screen.getByRole('button', { name: 'Voltar aos modelos' }).click()
  await expect.element(search).toHaveValue('')

  await search.fill('esc-200')
  await screen.getByRole('table', { name: 'Peças do estoque com esse código' }).getByRole('row').click()
  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ford')
  await expect.element(screen.getByRole('treeitem', { name: 'Escort' })).toHaveAttribute('aria-current', 'true')
  await expect.element(screen.getByText('Ford Escort', { exact: true })).toBeVisible()
  await expect.element(screen.getByText(/ainda não tem ficha técnica no catálogo/)).toBeVisible()
})

/** The Catalog under a phone Dashboard's header: the tab's name, or a deeper screen's title with its ←. */
function PhoneDashboard() {
  const [header, setHeader] = useState<PhoneHeader | null>(null)
  return (
    <PhoneHeaderContext.Provider value={setHeader}>
      {header && (
        <button type="button" onClick={header.back.onClick}>
          {header.back.label}
        </button>
      )}
      <h1>{header?.title ?? 'Catálogo'}</h1>
      <CatalogTab />
    </PhoneHeaderContext.Provider>
  )
}
