import { MODES, STYLES, themes } from '@apc/tokens/theme'
import { ITEM_HIDDEN_COLUMNS_KEY } from '@apc/domain/item-filters'
import { beforeAll, beforeEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../../app/fonts.ts'
import '../../index.css'
import { themeCss } from '../../app/theme.ts'
import { ColumnsMenu } from './ColumnsMenu.tsx'
import { useHiddenColumns } from './useHiddenColumns.ts'

const root = document.documentElement
/** The menu's columns, in the table's order. */
const COLUMNS = ['Categoria', 'Marca', 'Veículo', 'Posição', 'Lado', 'Cor', 'Material', 'Local', 'Valor unitário', 'Quantidade']

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

beforeEach(() => {
  localStorage.removeItem(ITEM_HIDDEN_COLUMNS_KEY)
})

// Opens the menu on a device that kept nothing and checks a switch for each column after the name, in the table's
// order, every one on but Local.
test('Web: the menu lists every column, Local off by default', async () => {
  const screen = await render(<Sample />)
  await screen.getByRole('button', { name: 'Colunas da tabela' }).click()
  const switches = screen.getByRole('menuitemcheckbox').elements()
  expect(switches.map((each) => each.textContent)).toEqual(COLUMNS)
  expect(switches.map((each) => each.getAttribute('aria-checked'))).toEqual(COLUMNS.map((name) => String(name !== 'Local')))
  await expect.element(screen.getByText('Ocultas: location')).toBeInTheDocument()
})

// Turns Material off and Local on, checks the menu stays open and the choice is kept, then opens a new menu, as after
// the app opens again, and checks it comes back.
test('Web: a column turned on or off stays so on the device', async () => {
  const first = await render(<Sample />)
  await first.getByRole('button', { name: 'Colunas da tabela' }).click()
  await first.getByRole('menuitemcheckbox', { name: 'Material' }).click()
  await first.getByRole('menuitemcheckbox', { name: 'Local' }).click()
  await expect.element(first.getByRole('menu')).toBeVisible()
  await expect.element(first.getByText('Ocultas: material')).toBeInTheDocument()
  await first.unmount()

  const again = await render(<Sample />)
  await expect.element(again.getByText('Ocultas: material')).toBeInTheDocument()
  await again.getByRole('button', { name: 'Colunas da tabela' }).click()
  await expect.element(again.getByRole('menuitemcheckbox', { name: 'Material' })).toHaveAttribute('aria-checked', 'false')
  await expect.element(again.getByRole('menuitemcheckbox', { name: 'Local' })).toHaveAttribute('aria-checked', 'true')
})

// Hides two columns, then chooses "Restaurar padrão" and checks only Local is hidden again and the menu closes.
test('Web: "Restaurar padrão" brings the default columns back', async () => {
  const screen = await render(<Sample />)
  await screen.getByRole('button', { name: 'Colunas da tabela' }).click()
  await screen.getByRole('menuitemcheckbox', { name: 'Cor' }).click()
  await screen.getByRole('menuitemcheckbox', { name: 'Marca' }).click()
  await expect.element(screen.getByText('Ocultas: partBrand, color, location')).toBeInTheDocument()
  await screen.getByRole('menuitem', { name: 'Restaurar padrão' }).click()
  await expect.element(screen.getByText('Ocultas: location')).toBeInTheDocument()
  await expect.element(screen.getByRole('menu')).not.toBeInTheDocument()
})

// Opens the menu with the keyboard, moves down to Marca with the arrows and turns it off with Enter, then closes the
// menu with Escape and checks the focus is back on the trigger.
test('Web: the menu works from the keyboard', async () => {
  const screen = await render(<Sample />)
  const trigger = screen.getByRole('button', { name: 'Colunas da tabela' })
  trigger.element().focus()
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByRole('menuitemcheckbox', { name: 'Categoria' })).toHaveFocus()
  await userEvent.keyboard('{ArrowDown}{Enter}')
  await expect.element(screen.getByText('Ocultas: partBrand, location')).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  await expect.element(trigger).toHaveFocus()
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the menu in one style and mode and checks the trigger's name is in the display face's uppercase, in the
    // text color, and the trigger and the knobs of the columns shown light up in the accent.
    test(`Web: the "Colunas" menu follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Sample />)
      const name = screen.getByText('Colunas', { exact: true })
      expect(getComputedStyle(name.element()).textTransform).toBe('uppercase')
      expect(getComputedStyle(name.element()).color).toBe(rgb(colors.text))
      const trigger = screen.getByRole('button', { name: 'Colunas da tabela' })
      await trigger.click()
      await expect.poll(() => getComputedStyle(trigger.element()).borderColor).toBe(rgb(colors.accent))
      const knob = screen.getByRole('menuitemcheckbox', { name: 'Material' }).element().querySelector('[data-testid="common.switch.track.knob"]')!
      await expect.poll(() => getComputedStyle(knob).backgroundColor).toBe(rgb(colors.accent))
    })
  }
}

/** The menu with the columns the device hides, kept as the Inventory tab keeps them, and written out under it. */
function Sample() {
  const [hidden, setHidden] = useHiddenColumns()
  return (
    <>
      <ColumnsMenu hidden={hidden} onHiddenChange={setHidden} />
      <p>Ocultas: {hidden.join(', ')}</p>
    </>
  )
}
