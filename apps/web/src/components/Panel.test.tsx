import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { Divider, Panel } from './Panel.tsx'

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
 * Lets the browser compute a theme's soft hairline, the hairline color at 48%, in the form it reports it.
 * @param hex Hairline color as `#RRGGBB`.
 * @returns The computed color, e.g. "color(srgb 0.227 0.247 0.271 / 0.48)".
 */
function softHairline(hex: string): string {
  const probe = document.createElement('span')
  probe.style.color = `color-mix(in srgb, ${hex} 48%, transparent)`
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Nests a plain and a raised panel in an outer one in one style and mode, and checks the fills, the soft
    // border, the panel radius outside and the tile radius inside, and the sheen only on the outer panel.
    test(`Web: panels follow the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(
        <Panel data-testid="outer">
          <Panel data-testid="nested">Árvore</Panel>
          <Panel data-testid="raised" raised>
            Detalhe
          </Panel>
        </Panel>,
      )
      const outer = getComputedStyle(screen.getByTestId('outer').element())
      const nested = getComputedStyle(screen.getByTestId('nested').element())
      const raised = getComputedStyle(screen.getByTestId('raised').element())

      expect(outer.backgroundColor).toBe(rgb(theme.colors.panel))
      expect(outer.borderTopColor).toBe(softHairline(theme.colors.hairline))
      expect(outer.borderTopWidth).toBe('1px')
      expect(outer.borderTopLeftRadius).toBe(`${theme.radiusPanel}px`)
      expect(outer.backgroundImage).toContain('linear-gradient')
      expect(nested.backgroundColor).toBe(rgb(theme.colors.panel))
      expect(nested.borderTopLeftRadius).toBe(`${theme.radiusTile}px`)
      expect(nested.backgroundImage).toBe('none')
      expect(raised.backgroundColor).toBe(rgb(theme.colors.panelRaised))
    })
  }
}

// Places a panel in another and checks the inner border sits inside the outer padding, so the two borders
// never touch, and that an explicit sheen choice wins over the nesting default.
test('Web: nested panels never double the border', async () => {
  const screen = await render(
    <Panel data-testid="outer">
      <Panel data-testid="nested" sheen>
        Árvore
      </Panel>
    </Panel>,
  )
  const outer = screen.getByTestId('outer').element().getBoundingClientRect()
  const nested = screen.getByTestId('nested').element()
  const box = nested.getBoundingClientRect()
  expect(box.left - outer.left).toBeGreaterThanOrEqual(12 + 1)
  expect(box.top - outer.top).toBeGreaterThanOrEqual(12 + 1)
  expect(outer.right - box.right).toBeGreaterThanOrEqual(12 + 1)
  expect(getComputedStyle(nested).backgroundImage).toContain('linear-gradient')
})

// Checks a divider is announced as a separator and draws one soft hairline.
test('Web: dividers draw a soft hairline separator', async () => {
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
  const screen = await render(<Divider />)
  const style = getComputedStyle(screen.getByRole('separator').element())
  expect(style.height).toBe('1px')
  expect(style.backgroundColor).toBe(softHairline(themes.eighties.night.colors.hairline))
  expect(style.borderTopWidth).toBe('0px')
})
