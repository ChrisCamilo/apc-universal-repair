import { cubeIcon, documentIcon } from '@apc/shared/icons'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, beforeEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { TabPanel, Tabs } from './Tabs.tsx'
import { useStoredTab } from './useStoredTab.ts'

const IDS = ['stock', 'catalog', 'specs'] as const
const STORAGE_KEY = 'apc-tab-test'
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

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the tabs in one style and mode and checks the selected tab and its count take the accent
    // with an underline that glows only where the style has a glow, while the others stay muted.
    test(`Web: tabs follow the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<DashboardTabs />)
      const selected = screen.getByRole('tab', { name: /Estoque/ }).element()
      const other = screen.getByRole('tab', { name: /Catálogo/ }).element()
      const underline = getComputedStyle(selected, '::after')

      expect(getComputedStyle(selected).color).toBe(rgb(theme.colors.accent))
      expect(getComputedStyle(selected).fontFamily).toMatch(new RegExp(`^"?${theme.displayFont}`))
      expect(getComputedStyle(selected).textTransform).toBe('uppercase')
      expect(underline.backgroundColor).toBe(rgb(theme.colors.accent))
      expect(underline.boxShadow === 'none').toBe(theme.glow === null)
      expect(getComputedStyle(screen.getByText('12').element()).color).toBe(rgb(theme.colors.accent))
      expect(getComputedStyle(other).color).toBe(rgb(theme.colors.textMuted))
      expect(getComputedStyle(other, '::after').backgroundColor).toBe('rgba(0, 0, 0, 0)')
    })
  }
}

// Checks the tab list roles: one selected tab that controls the only visible panel, which is labelled by
// the tab, and the hand cursor on the tabs.
test('Web: tabs control their labelled panels', async () => {
  const screen = await render(<DashboardTabs />)
  await expect.element(screen.getByRole('tablist', { name: 'Seções do Dashboard' })).toBeInTheDocument()
  const stock = screen.getByRole('tab', { name: /Estoque/ })
  await expect.element(stock).toHaveAttribute('aria-selected', 'true')
  await expect.element(screen.getByRole('tab', { name: /Catálogo/ })).toHaveAttribute('aria-selected', 'false')
  expect(getComputedStyle(stock.element()).cursor).toBe('pointer')

  const panel = screen.getByRole('tabpanel')
  await expect.element(panel).toHaveAccessibleName(/Estoque/)
  await expect.element(panel).toHaveTextContent('Itens no estoque')
  expect(panel.element().id).toBe(stock.element().getAttribute('aria-controls'))

  await screen.getByRole('tab', { name: /Catálogo/ }).click()
  await expect.element(screen.getByRole('tabpanel')).toHaveTextContent('Modelos do catálogo')
})

// Walks the tabs with the keyboard: Tab lands on the selected tab, the arrows select the next and previous
// tab and wrap around the ends, Home and End jump to the first and last, and Tab leaves to the panel.
test('Web: arrow keys move between tabs with a roving tabIndex', async () => {
  const screen = await render(<DashboardTabs />)
  const tab = (name: RegExp) => screen.getByRole('tab', { name })

  await userEvent.keyboard('{Tab}')
  await expect.element(tab(/Estoque/)).toHaveFocus()
  await userEvent.keyboard('{ArrowRight}')
  await expect.element(tab(/Catálogo/)).toHaveFocus()
  await expect.element(tab(/Catálogo/)).toHaveAttribute('aria-selected', 'true')
  await expect.element(tab(/Estoque/)).toHaveAttribute('tabindex', '-1')
  await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
  await expect.element(tab(/Ficha técnica/)).toHaveFocus()
  await userEvent.keyboard('{Home}')
  await expect.element(tab(/Estoque/)).toHaveAttribute('aria-selected', 'true')
  await userEvent.keyboard('{End}')
  await expect.element(tab(/Ficha técnica/)).toHaveAttribute('aria-selected', 'true')

  await userEvent.keyboard('{Tab}')
  await expect.element(screen.getByRole('tabpanel')).toHaveFocus()
})

// Picks a tab, unmounts and mounts again and checks it reopens on that tab; a saved tab that no longer
// exists falls back to the first.
test('Web: tabs reopen on the last tab used', async () => {
  const first = await render(<DashboardTabs />)
  await first.getByRole('tab', { name: /Catálogo/ }).click()
  expect(localStorage.getItem(STORAGE_KEY)).toBe('catalog')
  await first.unmount()

  const again = await render(<DashboardTabs />)
  await expect.element(again.getByRole('tab', { name: /Catálogo/ })).toHaveAttribute('aria-selected', 'true')
  await again.unmount()

  localStorage.setItem(STORAGE_KEY, 'removed')
  const stale = await render(<DashboardTabs />)
  await expect.element(stale.getByRole('tab', { name: /Estoque/ })).toHaveAttribute('aria-selected', 'true')
})

function DashboardTabs() {
  const [tab, setTab] = useStoredTab(STORAGE_KEY, IDS)
  return (
    <>
      <Tabs
        label="Seções do Dashboard"
        tabs={[
          { id: 'stock', label: 'Estoque', icon: cubeIcon, count: 12 },
          { id: 'catalog', label: 'Catálogo', icon: documentIcon },
          { id: 'specs', label: 'Ficha técnica' },
        ]}
        selected={tab}
        onSelect={setTab}
      />
      <TabPanel id="stock" selected={tab}>Itens no estoque</TabPanel>
      <TabPanel id="catalog" selected={tab}>Modelos do catálogo</TabPanel>
      <TabPanel id="specs" selected={tab}>Fichas técnicas</TabPanel>
    </>
  )
}

