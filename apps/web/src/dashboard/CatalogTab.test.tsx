import { ENGINE_SHEETS } from '@apc/shared/catalog'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterEach, beforeAll, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { AppFrame } from '../components/AppFrame.tsx'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { CatalogTab } from './CatalogTab.tsx'

const OPALA_25 = ENGINE_SHEETS['chevrolet-opala-diplomata-1986-2.5']
const OPALA_41 = ENGINE_SHEETS['chevrolet-opala-diplomata-1986-4.1']
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
  await page.viewport(1280, 720)
})

afterEach(async () => {
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
