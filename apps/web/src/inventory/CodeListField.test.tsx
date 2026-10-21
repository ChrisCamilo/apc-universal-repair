import { useState } from 'react'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { CodeListField } from './CodeListField.tsx'

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

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await document.fonts.ready
})

// Types codes and checks Enter and a comma end one, each joining the list in uppercase, a code the list has written
// otherwise is left out, a paste of several adds them all, a line each too, and leaving the field keeps what was typed.
test('Web: codes join the list as chips with Enter, a comma, a paste or on leaving the field', async () => {
  const screen = await render(<Sample />)
  const input = screen.getByLabelText('Códigos originais')
  const chips = () => screen.container.querySelectorAll('[data-testid="inventory.code-list-field.frame.chip.code"]')
  await userEvent.type(input, '5u0 698 151{Enter}')
  await userEvent.type(input, 'x1,')
  await userEvent.type(input, 'X-1{Enter}')
  expect([...chips()].map((chip) => chip.textContent)).toEqual(['5U0 698 151', 'X1'])
  await expect.element(input).toHaveValue('')
  await input.fill('a; b')
  expect([...chips()].map((chip) => chip.textContent)).toEqual(['5U0 698 151', 'X1', 'A', 'B'])
  // Codes a line each, as copied from a spreadsheet's column.
  const clipboardData = new DataTransfer()
  clipboardData.setData('text', 'c\r\nd\ne')
  input.element().dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }))
  await expect.element(screen.getByText('E', { exact: true })).toBeVisible()
  expect([...chips()].map((chip) => chip.textContent)).toEqual(['5U0 698 151', 'X1', 'A', 'B', 'C', 'D', 'E'])
  await userEvent.type(input, 'f')
  await userEvent.click(screen.getByText('Fora do campo'))
  expect([...chips()].map((chip) => chip.textContent)).toContain('F')
})

// Takes codes out with a chip's × and with Backspace in the empty field, the last one first.
test("Web: a chip's × and Backspace take a code out", async () => {
  const screen = await render(<Sample initial={['A-1', 'B-2', 'C-3']} />)
  await screen.getByRole('button', { name: 'Remover B-2' }).click()
  await expect.element(screen.getByText('B-2')).not.toBeInTheDocument()
  await userEvent.type(screen.getByLabelText('Códigos originais'), '{Backspace}')
  await expect.element(screen.getByText('C-3')).not.toBeInTheDocument()
  await expect.element(screen.getByText('A-1')).toBeVisible()
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Gives a code a message in one style and mode and checks its chip turns to the danger color, the message shows
    // under the field with its code and is read out with the chip, and a code without one keeps the text color.
    test(`Web: a code with a message shows it in the danger color in ${style}/${mode}`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Sample initial={['FRA-1000', 'NEW-1']} messages={['Código já usado em “Pastilha”.']} />)
      const taken = screen.getByText('FRA-1000')
      expect(getComputedStyle(taken.element()).color).toBe(rgb(colors.danger))
      expect(getComputedStyle(taken.element().parentElement!).borderTopColor).toBe(rgb(colors.danger))
      expect(getComputedStyle(screen.getByText('NEW-1').element()).color).toBe(rgb(colors.text))
      const message = screen.getByRole('alert').getByText('FRA-1000: Código já usado em “Pastilha”.')
      await expect.element(message).toBeVisible()
      expect(taken.element().parentElement!.getAttribute('aria-describedby')).toBe(message.element().id)
      await expect.element(screen.getByText('Os códigos da montadora.')).not.toBeInTheDocument()
    })
  }
}

function Sample({ initial = [], messages }: { initial?: string[]; messages?: (string | undefined)[] }) {
  const [codes, setCodes] = useState(initial)
  return (
    <>
      <CodeListField label="Códigos originais" codes={codes} onCodesChange={setCodes} messages={messages} helper="Os códigos da montadora." />
      <p>Fora do campo</p>
    </>
  )
}
