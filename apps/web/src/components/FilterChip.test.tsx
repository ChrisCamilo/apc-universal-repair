import { useState } from 'react'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { FilterChip, FilterChipGroup } from './FilterChip.tsx'

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
 * Lets the browser compute a theme color at 13%, the soft accent, in the form it reports it.
 * @param hex Accent color as `#RRGGBB`.
 * @returns The computed color.
 */
function softAccent(hex: string): string {
  const probe = document.createElement('span')
  probe.style.color = `color-mix(in srgb, ${hex} 13%, transparent)`
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
    // Renders a chip off and one on in one style and mode and checks the muted chip and the accent one, with
    // its accent border and soft accent fill, in the display face.
    test(`Web: filter chips follow the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(
        <>
          <FilterChip pressed={false} onPressedChange={() => {}}>Esgotado</FilterChip>
          <FilterChip pressed onPressedChange={() => {}}>Estoque baixo</FilterChip>
        </>,
      )
      const off = getComputedStyle(screen.getByRole('button', { name: 'Esgotado' }).element())
      const on = getComputedStyle(screen.getByRole('button', { name: 'Estoque baixo' }).element())
      expect(off.color).toBe(rgb(theme.colors.textMuted))
      expect(off.backgroundColor).toBe('rgba(0, 0, 0, 0)')
      expect(off.fontFamily).toMatch(new RegExp(`^"?${theme.displayFont}`))
      expect(on.color).toBe(rgb(theme.colors.accent))
      expect(on.borderColor).toBe(rgb(theme.colors.accent))
      expect(on.backgroundColor).toBe(softAccent(theme.colors.accent))
    })
  }
}

// Turns a status chip on, switches to the other, then presses the one that is on and checks the group
// ends with none selected, with aria-pressed following each step.
test('Web: single-choice chips switch and can all be off', async () => {
  const screen = await render(<Status />)
  await expect.element(screen.getByRole('group', { name: 'Situação do estoque' })).toBeInTheDocument()
  const low = screen.getByRole('button', { name: 'Estoque baixo' })
  const out = screen.getByRole('button', { name: 'Esgotado' })

  await low.click()
  await expect.element(low).toHaveAttribute('aria-pressed', 'true')
  await out.click()
  await expect.element(out).toHaveAttribute('aria-pressed', 'true')
  await expect.element(low).toHaveAttribute('aria-pressed', 'false')
  await out.click()
  await expect.element(out).toHaveAttribute('aria-pressed', 'false')
  await expect.element(low).toHaveAttribute('aria-pressed', 'false')
})

// Turns on two chips of a multiple group and checks both stay on, with the full name in each tooltip.
test('Web: multiple chips turn on independently with tooltips', async () => {
  const screen = await render(<Positions />)
  const front = screen.getByRole('button', { name: 'D' })
  await front.click()
  await screen.getByRole('button', { name: 'T' }).click()
  await expect.element(front).toHaveAttribute('aria-pressed', 'true')
  await expect.element(screen.getByRole('button', { name: 'T' })).toHaveAttribute('aria-pressed', 'true')
  await expect.element(front).toHaveAttribute('title', 'Dianteiro')
  expect(getComputedStyle(front.element()).cursor).toBe('pointer')
})

function Positions() {
  const [value, setValue] = useState<string[]>([])
  return (
    <FilterChipGroup
      multiple
      size="sm"
      label="Posição"
      options={[
        { value: 'D', label: 'D', title: 'Dianteiro' },
        { value: 'T', label: 'T', title: 'Traseiro' },
      ]}
      value={value}
      onValueChange={setValue}
    />
  )
}

function Status() {
  const [value, setValue] = useState<string | null>(null)
  return (
    <FilterChipGroup
      label="Situação do estoque"
      options={[
        { value: 'low', label: 'Estoque baixo' },
        { value: 'out', label: 'Esgotado' },
      ]}
      value={value}
      onValueChange={setValue}
    />
  )
}
