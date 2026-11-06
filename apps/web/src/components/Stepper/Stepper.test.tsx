import { useState } from 'react'
import { MODES, STYLES, themes } from '@apc/tokens/theme'
import { beforeAll, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../../index.css'
import { themeCss } from '../../app/theme.ts'
import { Stepper } from './Stepper.tsx'

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
    // Renders a stepper and one with an error in one style and mode, and checks the buttons and the number sit in the
    // field's frame and panel, and the number with an error in the danger color's frame.
    test(`Web: a stepper follows the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(
        <>
          <Stepper label="Mínimo" value="1" onValueChange={() => {}} max={5} />
          <Stepper label="Com erro" value="9" onValueChange={() => {}} max={5} error="Informe no máximo 5." />
        </>,
      )
      const minus = getComputedStyle(screen.getByRole('button', { name: 'Diminuir' }).first().element())
      expect(minus.borderColor).toBe(rgb(theme.colors.hairline))
      expect(minus.backgroundColor).toBe(rgb(theme.colors.panel))
      expect(minus.color).toBe(rgb(theme.colors.text))
      expect(getComputedStyle(screen.getByRole('textbox', { name: 'Mínimo' }).element()).borderColor).toBe(rgb(theme.colors.hairline))
      expect(getComputedStyle(screen.getByRole('textbox', { name: 'Com erro' }).element()).borderColor).toBe(rgb(theme.colors.danger))
    })
  }
}

// Presses − and + with the mouse, Enter and Space and types a number, checking each press takes one away or adds one,
// the − is locked at 0 and the + at the limit, and the field still takes what is typed.
test('Web: a stepper adds and takes one away, between 0 and its limit', async () => {
  const screen = await render(<Sample start="" />)
  const field = screen.getByRole('textbox', { name: 'Mínimo' })
  const minus = screen.getByRole('button', { name: 'Diminuir' })
  const plus = screen.getByRole('button', { name: 'Aumentar' })
  await expect.element(minus).toBeDisabled()
  await plus.click()
  await expect.element(field).toHaveValue('1')
  await expect.element(minus).toBeEnabled()
  await userEvent.keyboard('{Enter}')
  await userEvent.keyboard(' ')
  await expect.element(field).toHaveValue('3')
  await expect.element(plus).toBeDisabled()
  await minus.click()
  await expect.element(field).toHaveValue('2')
  await field.fill('0')
  await expect.element(minus).toBeDisabled()
  await expect.element(screen.getByRole('group', { name: 'Mínimo' })).toBeVisible()
})

// Tabs through a stepper and checks the focus goes −, number, + in order, each drawing the theme's ring; and checks the
// hint is read with the number, and the error in its place.
test('Web: a stepper is reached in order with the keyboard and reads its hint', async () => {
  const screen = await render(
    <>
      <Stepper label="Mínimo" value="1" onValueChange={() => {}} max={3} helper="Abaixo disso, o estoque fica baixo." />
      <Stepper label="Com erro" value="9" onValueChange={() => {}} max={3} error="Informe no máximo 3." />
    </>,
  )
  await userEvent.tab()
  await expect.element(screen.getByRole('button', { name: 'Diminuir' }).first()).toHaveFocus()
  expect(getComputedStyle(document.activeElement!).boxShadow).not.toBe('none')
  await userEvent.tab()
  await expect.element(screen.getByRole('textbox', { name: 'Mínimo' })).toHaveFocus()
  expect(getComputedStyle(document.activeElement!).boxShadow).not.toBe('none')
  await userEvent.tab()
  await expect.element(screen.getByRole('button', { name: 'Aumentar' }).first()).toHaveFocus()
  await expect.element(screen.getByRole('textbox', { name: 'Mínimo' })).toHaveAccessibleDescription('Abaixo disso, o estoque fica baixo.')
  await expect.element(screen.getByRole('textbox', { name: 'Com erro' })).toHaveAccessibleDescription('Informe no máximo 3.')
  await expect.element(screen.getByRole('textbox', { name: 'Com erro' })).toHaveAttribute('aria-invalid', 'true')
})

// At 360×780 checks the − and + are 48px circles and the number 72px wide and as tall, with 16px text or more, so the
// phone doesn't zoom in on it.
test('Web: a stepper is sized for a finger at 360×780', async () => {
  await page.viewport(360, 780)
  const screen = await render(<Sample start="1" />)
  for (const name of ['Diminuir', 'Aumentar']) {
    const box = screen.getByRole('button', { name }).element().getBoundingClientRect()
    expect([box.width, box.height]).toEqual([48, 48])
  }
  const field = screen.getByRole('textbox', { name: 'Mínimo' }).element()
  expect([field.getBoundingClientRect().width, field.getBoundingClientRect().height]).toEqual([72, 48])
  expect(parseFloat(getComputedStyle(field).fontSize)).toBeGreaterThanOrEqual(16)
})

/** A stepper up to 3 that keeps its own number. */
function Sample({ start }: { start: string }) {
  const [value, setValue] = useState(start)
  return <Stepper label="Mínimo" value={value} onValueChange={setValue} max={3} />
}
