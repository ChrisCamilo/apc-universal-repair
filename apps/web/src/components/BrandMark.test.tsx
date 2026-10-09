import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import favicon from '../../public/favicon.svg?raw'
import '../index.css'
import { themeCss } from '../theme.ts'
import { BrandMark } from './BrandMark.tsx'

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
    // Renders the badge in one style and mode and checks the needle takes the accent and "APC"
    // the text color, so the mark follows the active theme.
    test(`Web: brand badge follows the ${style}/${mode} accent and text colors`, async () => {
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<BrandMark variant="badge" />)
      const badge = screen.getByRole('img', { name: 'APC Universal Repair' })
      await expect.element(badge).toBeVisible()

      const svg = badge.element()
      const needle = svg.querySelector('[data-testid="common.brand-mark.needle"]')!
      const word = svg.querySelector('text')!
      expect(getComputedStyle(needle).stroke).toBe(rgb(themes[style][mode].colors.accent))
      expect(getComputedStyle(word).fill).toBe(rgb(themes[style][mode].colors.text))
    })
  }
}

// Checks both variants render at the sizes they are used at: the compact mark square at 24px
// (header, icons) and the badge at 240px wide keeping its 11:9 ratio (login).
test('Web: brand mark renders at 24px and 240px', async () => {
  const screen = await render(
    <>
      <BrandMark variant="compact" size={24} data-testid="compact" />
      <BrandMark variant="badge" size={240} data-testid="badge" />
    </>,
  )
  const compact = screen.getByTestId('compact').element().getBoundingClientRect()
  const badge = screen.getByTestId('badge').element().getBoundingClientRect()
  expect([compact.width, compact.height]).toEqual([24, 24])
  expect(badge.width).toBe(240)
  expect(Math.round(badge.height)).toBe(Math.round((240 * 180) / 220))
})

// Reads the favicon the app ships in public/ and checks it was replaced by the APC mark in the
// eighties/night colors, so it stays in step with the tokens.
test('Web: favicon is the APC mark in the eighties night colors', () => {
  const { canvas, text, accent } = themes.eighties.night.colors
  for (const color of [canvas, text, accent]) {
    expect(favicon).toContain(color)
  }
  expect(favicon).toContain('M10 30 A14 14 0 0 1 38 30')
})
