import { useState } from 'react'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { SelectableTileGroup } from './SelectableTile.tsx'

const BRANDS = ['Chevrolet', 'Volkswagen', 'Fiat'].map((name) => ({ value: name.toLowerCase(), label: name }))
const LOGO = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="140" height="28"><rect width="140" height="28"/></svg>')}`
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

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the brand tiles in one style and mode and checks the chosen tile has the accent frame and text,
    // and the others are muted text on the raised fill.
    test(`Web: brand tiles follow the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Sample />)
      const chosen = getComputedStyle(screen.getByRole('radio', { name: 'Chevrolet' }).element())
      expect(chosen.borderColor).toBe(rgb(colors.accent))
      expect(chosen.color).toBe(rgb(colors.accent))
      const other = getComputedStyle(screen.getByRole('radio', { name: 'Fiat' }).element())
      expect(other.color).toBe(rgb(colors.textMuted))
      expect(other.backgroundColor).toBe(rgb(colors.panelRaised))
    })
  }
}

// Checks the tiles are a named radio group with exactly one chosen tile, the only Tab stop; a click chooses
// another tile.
test('Web: brand tiles are a radio group with one choice', async () => {
  const screen = await render(<Sample />)
  await expect.element(screen.getByRole('radiogroup', { name: 'Marcas' })).toBeVisible()
  expect(screen.getByRole('radio').elements().map((tile) => [tile.getAttribute('aria-checked'), tile.tabIndex])).toEqual([
    ['true', 0],
    ['false', -1],
    ['false', -1],
  ])
  await screen.getByRole('radio', { name: 'Fiat' }).click()
  await expect.element(screen.getByRole('radio', { name: 'Fiat' })).toBeChecked()
  await expect.element(screen.getByRole('radio', { name: 'Chevrolet' })).not.toBeChecked()
})

// Tabs into the group and moves with the arrows, and checks Tab lands on the chosen tile, Down and Right move
// the choice forward, Up and Left back, the ends wrap around, and the focus follows the choice.
test('Web: the arrow keys move the choice and wrap around', async () => {
  const screen = await render(
    <>
      <button type="button">Antes</button>
      <Sample />
    </>,
  )
  await screen.getByRole('button', { name: 'Antes' }).click()
  await userEvent.keyboard('{Tab}')
  await expect.element(screen.getByRole('radio', { name: 'Chevrolet' })).toHaveFocus()
  await userEvent.keyboard('{ArrowDown}{ArrowRight}')
  await expect.element(screen.getByRole('radio', { name: 'Fiat' })).toBeChecked()
  await expect.element(screen.getByRole('radio', { name: 'Fiat' })).toHaveFocus()
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByRole('radio', { name: 'Chevrolet' })).toBeChecked()
  await userEvent.keyboard('{ArrowUp}')
  await expect.element(screen.getByRole('radio', { name: 'Fiat' })).toHaveFocus()
  await userEvent.keyboard('{ArrowLeft}')
  await expect.element(screen.getByRole('radio', { name: 'Volkswagen' })).toBeChecked()
})

// Gives one brand a logo and another a logo that fails to load, and checks the first shows its logo named
// after the brand, the second falls back to its name, and a brand with no logo shows its name.
test('Web: tiles show the logo, or the name when there is none or it fails', async () => {
  const screen = await render(
    <Sample
      options={[
        { value: 'chevrolet', label: 'Chevrolet', logo: LOGO },
        { value: 'bmw', label: 'BMW', logo: '/missing-logo.svg' },
        { value: 'fiat', label: 'Fiat' },
      ]}
    />,
  )
  await expect.element(screen.getByRole('img', { name: 'Chevrolet' })).toBeVisible()
  await expect.element(screen.getByRole('radio', { name: 'Chevrolet' })).toBeVisible()
  await expect.poll(() => screen.getByRole('radio', { name: 'BMW' }).element().querySelector('img')).toBeNull()
  await expect.element(screen.getByRole('radio', { name: 'BMW' })).toHaveTextContent('BMW')
  await expect.element(screen.getByRole('radio', { name: 'Fiat' })).toHaveTextContent('Fiat')
})

// Lays the tiles out in two columns in the width a 360px phone leaves, and checks a long name stays inside
// its tile instead of widening the group.
test('Web: tiles fit two columns on a phone', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  try {
    const screen = await render(
      <div style={{ width: 328 }}>
        <Sample className="grid-cols-2" options={[...BRANDS, { value: 'mercedes', label: 'Mercedes-Benz Caminhões' }]} />
      </div>,
    )
    const group = screen.getByRole('radiogroup').element()
    expect(group.scrollWidth).toBeLessThanOrEqual(328)
    const tiles = screen.getByRole('radio').elements()
    expect(tiles[0].getBoundingClientRect().top).toBe(tiles[1].getBoundingClientRect().top)
    expect(tiles[2].getBoundingClientRect().top).toBeGreaterThan(tiles[0].getBoundingClientRect().top)
  } finally {
    await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
  }
})

function Sample({ options = BRANDS, className }: { options?: { value: string; label: string; logo?: string }[]; className?: string }) {
  const [brand, setBrand] = useState(options[0].value)
  return <SelectableTileGroup label="Marcas" options={options} value={brand} onValueChange={setBrand} className={className} />
}
