import { useState } from 'react'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { Segmented } from './Segmented.tsx'
import { Switch } from './Switch.tsx'

const STYLE_OPTIONS = [
  { value: 'eighties', label: 'Anos 80' },
  { value: 'gt4', label: 'GT4' },
  { value: 'bmw90', label: 'BMW 90' },
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

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders a switch off and one on, and a segmented choice, in one style and mode, and checks the accent
    // track and knob of the switch that is on (glowing only where the style has a glow), the muted knob of the
    // one that is off, and the accent fill of the chosen option.
    test(`Web: switches and segmented choices follow the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(
        <>
          <Switch checked={false} onCheckedChange={() => {}}>Desligado</Switch>
          <Switch checked onCheckedChange={() => {}}>Ligado</Switch>
          <Segmented label="Tema" options={STYLE_OPTIONS} value="gt4" onValueChange={() => {}} />
        </>,
      )
      const [offTrack, onTrack] = screen.container.querySelectorAll('[data-testid="common.switch.track"]')
      const [offKnob, onKnob] = screen.container.querySelectorAll('[data-testid="common.switch.track.knob"]')
      expect(getComputedStyle(onTrack).borderColor).toBe(rgb(theme.colors.accent))
      expect(getComputedStyle(onKnob).backgroundColor).toBe(rgb(theme.colors.accent))
      expect(getComputedStyle(onKnob).boxShadow === 'none').toBe(theme.glow === null)
      expect(getComputedStyle(offTrack).borderColor).toBe(rgb(theme.colors.hairline))
      expect(getComputedStyle(offKnob).backgroundColor).toBe(rgb(theme.colors.textMuted))

      const chosen = getComputedStyle(screen.getByRole('radio', { name: 'GT4' }).element())
      expect(chosen.backgroundColor).toBe(rgb(theme.colors.accent))
      expect(chosen.color).toBe(rgb(theme.colors.onAccent))
    })
  }
}

// Toggles a switch with the mouse, Space and Enter and checks aria-checked follows, the knob slides over,
// and a disabled switch stays put.
test('Web: switches toggle and say whether they are on', async () => {
  const screen = await render(
    <>
      <Toggle />
      <Switch checked={false} onCheckedChange={() => {}} disabled>
        Desativado
      </Switch>
    </>,
  )
  const toggle = screen.getByRole('switch', { name: 'Modo escuro' })
  await expect.element(toggle).toHaveAttribute('aria-checked', 'false')
  await toggle.click()
  await expect.element(toggle).toHaveAttribute('aria-checked', 'true')
  await expect.poll(() => getComputedStyle(toggle.element().querySelector('[data-testid="common.switch.track.knob"]')!).translate).toBe('14px')

  await userEvent.keyboard(' ')
  await expect.element(toggle).toHaveAttribute('aria-checked', 'false')
  await userEvent.keyboard('{Enter}')
  await expect.element(toggle).toHaveAttribute('aria-checked', 'true')

  const off = screen.getByRole('switch', { name: 'Desativado' })
  await off.click({ force: true })
  await expect.element(off).toHaveAttribute('aria-checked', 'false')
})

// Reaches a segmented choice with Tab, which lands on the chosen option only, and moves the choice with the
// arrows, wrapping around the ends.
test('Web: segmented choices are a radio group moved by the arrows', async () => {
  const screen = await render(<Choice />)
  await expect.element(screen.getByRole('radiogroup', { name: 'Tema' })).toBeInTheDocument()
  await userEvent.keyboard('{Tab}')
  await expect.element(screen.getByRole('radio', { name: 'Anos 80' })).toHaveFocus()
  await expect.element(screen.getByRole('radio', { name: 'GT4' })).toHaveAttribute('tabindex', '-1')

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(screen.getByRole('radio', { name: 'GT4' })).toHaveFocus()
  await expect.element(screen.getByRole('radio', { name: 'GT4' })).toHaveAttribute('aria-checked', 'true')
  await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
  await expect.element(screen.getByRole('radio', { name: 'BMW 90' })).toHaveAttribute('aria-checked', 'true')

  await screen.getByRole('radio', { name: 'Anos 80' }).click()
  await expect.element(screen.getByRole('radio', { name: 'Anos 80' })).toHaveAttribute('aria-checked', 'true')
})

function Choice() {
  const [value, setValue] = useState('eighties')
  return <Segmented label="Tema" options={STYLE_OPTIONS} value={value} onValueChange={setValue} />
}

function Toggle() {
  const [checked, setChecked] = useState(false)
  return (
    <Switch checked={checked} onCheckedChange={setChecked}>
      Modo escuro
    </Switch>
  )
}
