import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { FieldValue } from './FieldValue.tsx'
import { TextField } from './TextField.tsx'

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

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await document.fonts.ready
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Shows a value in one style and mode and checks it reads as text: the text color on no fill, inside the soft
    // hairline, with the pill corners of the fields.
    test(`Web: field values follow the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<FieldValue label="Nome" value="Filtro de óleo" />)
      const frame = getComputedStyle(screen.getByText('Filtro de óleo').element())
      expect(frame.color).toBe(rgb(colors.text))
      expect(frame.backgroundColor).toBe('rgba(0, 0, 0, 0)')
      expect(frame.borderTopColor).toBe(softHairline(colors.hairline))
      expect(frame.borderTopLeftRadius).toBe('999px')
    })
  }
}

// Shows a value beside a text field and checks the value is named by its label and its frame lines up with the
// field's, the same height, so a details view keeps its form's layout.
test('Web: a field value is labeled and the size of a text field', async () => {
  const screen = await render(
    <div className="grid grid-cols-2 items-start gap-4">
      <TextField label="Código da peça" value="W 712/95" onValueChange={() => {}} />
      <FieldValue label="Nome" value="Filtro de óleo" />
    </div>,
  )
  await expect.element(screen.getByRole('group', { name: 'Nome' })).toHaveTextContent('NomeFiltro de óleo')
  const field = screen.getByLabelText('Código da peça').element().parentElement!.getBoundingClientRect()
  const value = screen.getByText('Filtro de óleo').element().getBoundingClientRect()
  expect(value.height).toBe(field.height)
  expect(value.top).toBe(field.top)
})

// Shows a value longer than its frame on a phone and checks it stays on one line, ending in an ellipsis, with the
// whole value as a tooltip, and the page doesn't scroll sideways.
test('Web: a long field value ends in an ellipsis with the whole value as a tooltip', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const long = 'Jogo de juntas do cabeçote com retentores de válvula e parafusos'
  const screen = await render(<FieldValue label="Nome" value={long} />)
  const frame = screen.getByText(long).element() as HTMLElement
  expect(getComputedStyle(frame).textOverflow).toBe('ellipsis')
  expect(frame.scrollWidth).toBeGreaterThan(frame.clientWidth)
  expect(frame.title).toBe(long)
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(MIN_MOBILE_WIDTH)
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})
