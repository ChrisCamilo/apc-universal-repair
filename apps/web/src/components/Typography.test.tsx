import { MODES, scales, STYLES, themes } from '@apc/shared/theme'
import { HEADING_LEVELS, HEADING_TRACKING, LABEL_TYPE } from '@apc/shared/typography'
import { beforeAll, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { Heading, Label, NumericReadout, Text } from './Typography.tsx'

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
 * Formats a letter spacing the way the browser reports it.
 * @param em Letter spacing in em.
 * @param fontSize Font size in px.
 * @returns Letter spacing in px, e.g. "2.1px".
 */
function trackingPx(em: number, fontSize: number): string {
  return `${+(em * fontSize).toFixed(3)}px`
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders a heading and a label in one style and mode and checks they use that style's display
    // face and tracking, uppercase, in the text and muted colors.
    test(`Web: headings and labels follow the ${style}/${mode} display face and colors`, async () => {
      const theme = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(
        <>
          <Heading level={1}>Opala Diplomata</Heading>
          <Label data-testid="label">Cilindrada</Label>
        </>,
      )
      const heading = getComputedStyle(screen.getByRole('heading', { level: 1 }).element())
      const label = getComputedStyle(screen.getByTestId('label').element())

      expect(heading.fontFamily).toMatch(new RegExp(`^"?${theme.displayFont}`))
      expect(heading.textTransform).toBe('uppercase')
      expect(heading.letterSpacing).toBe(
        trackingPx(theme.displayTracking * HEADING_TRACKING, scales.fontSize[HEADING_LEVELS[1].size]),
      )
      expect(heading.color).toBe(rgb(theme.colors.text))
      expect(label.fontFamily).toMatch(new RegExp(`^"?${theme.displayFont}`))
      expect(label.letterSpacing).toBe(trackingPx(theme.displayTracking, scales.fontSize[LABEL_TYPE.size]))
      expect(label.color).toBe(rgb(theme.colors.textMuted))
    })
  }
}

// Checks each heading level renders its own tag (h1–h4) and the sizes step down from level 1.
test('Web: heading levels render h1 to h4 and step down in size', async () => {
  const screen = await render(
    <>
      {([1, 2, 3, 4] as const).map((level) => (
        <Heading key={level} level={level}>Nível {level}</Heading>
      ))}
    </>,
  )
  const sizes = ([1, 2, 3, 4] as const).map((level) =>
    parseFloat(getComputedStyle(screen.getByRole('heading', { level }).element()).fontSize),
  )
  expect(sizes).toEqual(([1, 2, 3, 4] as const).map((level) => scales.fontSize[HEADING_LEVELS[level].size]))
})

// Fills a narrow paragraph with long text clamped to two lines and checks it is cut: the visible
// height holds two lines and the rest overflows, as the Dashboard's five-line summary needs.
test('Web: body text cuts after the given number of lines', async () => {
  const screen = await render(
    <div style={{ width: 200 }}>
      <Text lines={2} data-testid="clamped">
        {'Torque farto desde a marcha lenta, com resposta longa e sem pressa. '.repeat(6)}
      </Text>
    </div>,
  )
  const el = screen.getByTestId('clamped').element() as HTMLElement
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight)
  expect(el.clientHeight).toBeLessThanOrEqual(Math.ceil(lineHeight * 2) + 1)
  expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
})

// Checks a label tied to a field renders a real <label>, so clicking it focuses the field.
test('Web: labels with htmlFor render a label element', async () => {
  const screen = await render(
    <>
      <Label htmlFor="user">Usuário</Label>
      <input id="user" />
    </>,
  )
  await expect.element(screen.getByLabelText('Usuário')).toBeVisible()
})

// Checks numeric readouts use the mono face with tabular figures, so digits line up in columns.
test('Web: numeric readouts use mono tabular figures', async () => {
  const screen = await render(<NumericReadout data-testid="readout">4.1 L · 1986</NumericReadout>)
  const style = getComputedStyle(screen.getByTestId('readout').element())
  expect(style.fontFamily).toMatch(new RegExp(`^"?${scales.monoFont}`))
  expect(style.fontVariantNumeric).toBe('tabular-nums')
})
