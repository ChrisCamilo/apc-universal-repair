import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterEach, beforeAll, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { LoginScreen } from '../auth/LoginScreen.tsx'
import loginSource from '../auth/LoginScreen.tsx?raw'
import '../index.css'
import { themeCss } from '../theme.ts'
import { DashboardScreen } from './Screens.tsx'
import screensSource from './Screens.tsx?raw'
import storiesSource from './Screens.stories.tsx?raw'

// The minimum supported sizes from AGENTS.md.
const SIZES = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'phone', width: 360, height: 780 },
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
 * Tells whether the page scrolls sideways, which no screen should do.
 * @returns True when the page is wider than the window.
 */
function scrollsSideways(): boolean {
  return document.documentElement.scrollWidth > window.innerWidth
}

/**
 * Tells whether the open tab's content is wider than its panel. The Dashboard clips its content sideways, so
 * this, and not the page's scroll, shows content cut off at the edge.
 * @returns True when something in the open tab panel reaches past it.
 */
function tabOverflows(): boolean {
  const panel = document.querySelector<HTMLElement>('[role=tabpanel]:not([hidden])')!
  return panel.scrollWidth > panel.clientWidth
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

afterEach(async () => {
  await page.viewport(1280, 720)
})

// Reads the screens, their stories and the login screen they show as written, and checks they set no inline
// style and no raw color, so every color, face, border and radius comes from the design-system components.
test('Web: the screens use no local styles or raw colors', () => {
  for (const source of [screensSource, storiesSource, loginSource]) {
    expect(source).not.toMatch(/style=\{/)
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i)
    expect(source).not.toMatch(/\b(?:bg|text|border|shadow|rounded|font)-(?:\[|canvas|panel|accent|hairline|danger|warn|on-|display|mono|body)/)
  }
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the three screens in one style and mode at desktop size, and checks each shows its main parts on
    // the canvas color, with the selected tab and the primary buttons in that combination's accent.
    test(`Web: the screens render in the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      await page.viewport(1280, 720)
      const screen = await render(
        <>
          <LoginScreen onSubmit={() => {}} />
          <DashboardScreen initialTab="inventory" />
        </>,
      )
      await expect.element(screen.getByRole('img', { name: 'APC Universal Repair' }).first()).toBeVisible()
      await expect.element(screen.getByLabelText('Usuário')).toBeVisible()
      await expect.element(screen.getByLabelText('Senha', { exact: true })).toBeVisible()
      expect(getComputedStyle(screen.getByRole('button', { name: 'Entrar' }).element()).backgroundColor).toBe(rgb(colors.accent))
      await expect.element(screen.getByRole('button', { name: 'Esqueceu a senha?' })).toBeVisible()
      expect(getComputedStyle(screen.getByRole('banner').element()).backgroundColor).toBe(rgb(colors.canvas))
      expect(getComputedStyle(screen.getByRole('tab', { name: /Estoque/ }).element()).color).toBe(rgb(colors.accent))
      await expect.element(screen.getByRole('table', { name: 'Itens do estoque' })).toBeVisible()
      await expect.element(screen.getByRole('button', { name: /Filtros/ })).toBeVisible()
      await expect.element(screen.getByRole('navigation', { name: 'Páginas do estoque' })).toBeVisible()
      await screen.getByRole('tab', { name: 'Catálogo' }).click()
      await expect.element(screen.getByRole('radiogroup', { name: 'Marcas' })).toBeVisible()
      await expect.element(screen.getByRole('tree', { name: 'Modelos Chevrolet' })).toBeVisible()
      await expect.element(screen.getByRole('heading', { name: '1986 · Chevrolet Opala Diplomata 2.5' })).toBeVisible()
      expect(scrollsSideways()).toBe(false)
    })
  }
}

for (const size of SIZES) {
  // Lays the Login out at one minimum size, and checks it fits without sideways scroll: the mark beside the form
  // on desktop and above it on the phone.
  test(`Web: the Login fits the ${size.name} size`, async () => {
    await page.viewport(size.width, size.height)
    const screen = await render(<LoginScreen onSubmit={() => {}} />)
    const mark = screen.getByRole('img', { name: 'APC Universal Repair' }).element().getBoundingClientRect()
    const field = screen.getByLabelText('Usuário').element().getBoundingClientRect()
    if (size.name === 'desktop') {
      expect(field.left).toBeGreaterThan(mark.right)
    } else {
      expect(field.top).toBeGreaterThan(mark.bottom)
    }
    expect(screen.getByRole('button', { name: 'Entrar' }).element().getBoundingClientRect().bottom).toBeLessThanOrEqual(size.height)
    expect(scrollsSideways()).toBe(false)
  })

  // Opens the Dashboard on both tabs and the user menu at one minimum size, and checks nothing scrolls sideways
  // and the menu stays on screen.
  test(`Web: the Dashboard fits the ${size.name} size`, async () => {
    await page.viewport(size.width, size.height)
    const screen = await render(<DashboardScreen initialTab="catalog" />)
    expect(scrollsSideways()).toBe(false)
    expect(tabOverflows()).toBe(false)
    await screen.getByRole('tab', { name: /Estoque/ }).click()
    await expect.element(screen.getByRole('table', { name: 'Itens do estoque' })).toBeVisible()
    expect(scrollsSideways()).toBe(false)
    expect(tabOverflows()).toBe(false)
    await screen.getByRole('button', { name: 'Menu do usuário' }).click()
    const menu = screen.getByRole('menu').element().getBoundingClientRect()
    expect(menu.left).toBeGreaterThanOrEqual(0)
    expect(menu.right).toBeLessThanOrEqual(size.width)
  })
}

// Uses the Catalog and Inventory on desktop and checks they respond: a brand opens its tree on its first engine
// or on the empty detail, the tree selects another engine, and the inventory search and stock chips narrow the
// list and its counter.
test('Web: the Catalog and Inventory mockups respond', async () => {
  const screen = await render(<DashboardScreen initialTab="catalog" />)
  await screen.getByRole('treeitem', { name: '4.1 L 6 cilindros' }).click()
  await expect.element(screen.getByRole('heading', { name: '1986 · Chevrolet Opala Diplomata 4.1' })).toBeVisible()
  await screen.getByRole('radio', { name: 'Volkswagen' }).click()
  await expect.element(screen.getByRole('tree', { name: 'Modelos Volkswagen' })).toBeVisible()
  await expect.element(screen.getByText('Nenhum motor escolhido')).toBeVisible()

  await screen.getByRole('tab', { name: /Estoque/ }).click()
  await screen.getByRole('searchbox').fill('freio')
  await expect.poll(() => screen.getByRole('table').getByRole('row').elements().length).toBe(3)
  await userEvent.clear(screen.getByRole('searchbox'))
  await screen.getByRole('button', { name: 'Esgotado' }).click()
  await expect.element(screen.getByText(/^1 de 8 itens/)).toBeVisible()
})
