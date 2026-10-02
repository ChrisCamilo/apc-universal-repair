import { ICON_STROKE, ICONS, searchIcon } from '@apc/shared/icons'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { Icon } from './Icon.tsx'

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
    // Puts an icon inside accent-colored and muted text in one style and mode, and checks it strokes
    // with each surrounding color, since icons carry no color of their own.
    test(`Web: icons take the surrounding ${style}/${mode} text color`, async () => {
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(
        <>
          <span className="text-accent"><Icon icon={searchIcon} data-testid="accent" /></span>
          <span className="text-text-muted"><Icon icon={searchIcon} data-testid="muted" /></span>
        </>,
      )
      const { accent, textMuted } = themes[style][mode].colors
      expect(getComputedStyle(screen.getByTestId('accent').element()).stroke).toBe(rgb(accent))
      expect(getComputedStyle(screen.getByTestId('muted').element()).stroke).toBe(rgb(textMuted))
    })
  }
}

// Draws every icon of the set and checks each one has exactly the shapes of its shared geometry,
// at the shared stroke width.
test('Web: every icon draws its shared shapes', async () => {
  const screen = await render(
    <>
      {Object.entries(ICONS).map(([name, icon]) => (
        <Icon key={name} icon={icon} data-testid={name} />
      ))}
    </>,
  )
  for (const [name, shapes] of Object.entries(ICONS)) {
    const svg = screen.getByTestId(name).element()
    expect(svg.querySelectorAll('path, circle, rect')).toHaveLength(shapes.length)
    expect(svg.getAttribute('stroke-width')).toBe(String(ICON_STROKE))
  }
})

// Checks the size prop sets both sides, and that only labeled icons are exposed to screen readers.
test('Web: icons size by prop and expose a label only when given one', async () => {
  const screen = await render(
    <>
      <Icon icon={searchIcon} size={24} data-testid="decorative" />
      <Icon icon={searchIcon} label="Buscar" />
    </>,
  )
  const decorative = screen.getByTestId('decorative').element().getBoundingClientRect()
  expect([decorative.width, decorative.height]).toEqual([24, 24])
  expect(screen.getByTestId('decorative').element().getAttribute('aria-hidden')).toBe('true')
  await expect.element(screen.getByRole('img', { name: 'Buscar' })).toBeVisible()
})
