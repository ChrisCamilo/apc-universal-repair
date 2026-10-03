import { useState, type ComponentProps } from 'react'
import { SELECT_VISIBLE_OPTIONS } from '@apc/shared/filters'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { Select } from './Select.tsx'

const CATEGORIES = ['Arrefecimento', 'Elétrica', 'Freios', 'Ignição', 'Motor', 'Suspensão', 'Transmissão'].map(
  (label) => ({ value: label, label }),
)
const SORTS = [
  { value: 'name', label: 'Nome (A–Z)' },
  { value: 'qty', label: 'Quantidade' },
  { value: 'price', label: 'Preço' },
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
    // Opens a multiple choice with one value in one style and mode and checks the frame lights up in the
    // accent, the chosen option and its checkbox take the accent, and the others stay in the text color.
    test(`Web: selects follow the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Multiple initial={['Freios']} />)
      const select = screen.getByRole('combobox', { name: 'Categoria' })
      expect(getComputedStyle(select.element()).borderColor).toBe(rgb(colors.accent))

      await select.click()
      const chosen = screen.getByRole('option', { name: 'Freios' }).element()
      expect(getComputedStyle(chosen).color).toBe(rgb(colors.accent))
      expect(getComputedStyle(chosen.querySelector('[data-testid="option-box"]')!).backgroundColor).toBe(rgb(colors.accent))
      expect(getComputedStyle(screen.getByRole('option', { name: 'Motor' }).element()).color).toBe(rgb(colors.text))
    })
  }
}

// Opens a list longer than the limit and checks it shows only five options and scrolls to the rest.
test('Web: select lists show at most five options and scroll', async () => {
  const screen = await render(<Multiple initial={[]} />)
  await screen.getByRole('combobox').click()
  const list = screen.getByRole('listbox').element()
  const option = screen.getByRole('option', { name: 'Todas' }).element().getBoundingClientRect().height
  expect(Math.floor(list.clientHeight / option)).toBe(SELECT_VISIBLE_OPTIONS)
  expect(list.scrollHeight).toBeGreaterThan(list.clientHeight)
})

// Picks several options with the mouse and checks the list stays open, the button shows the first choice
// plus a count with the full list in its tooltip, and "Todas" clears the choice.
test('Web: multiple selects summarize the choice and "All" clears it', async () => {
  const screen = await render(<Multiple initial={[]} />)
  const select = screen.getByRole('combobox', { name: 'Categoria' })
  await expect.element(select).toHaveTextContent('Todas')

  await select.click()
  await expect.element(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true')
  await screen.getByRole('option', { name: 'Motor' }).click()
  await screen.getByRole('option', { name: 'Freios' }).click()
  await screen.getByRole('option', { name: 'Suspensão' }).click()
  await expect.element(screen.getByRole('listbox')).toBeVisible()
  await expect.element(screen.getByRole('option', { name: 'Motor' })).toHaveAttribute('aria-selected', 'true')
  await expect.element(select).toHaveTextContent('Freios +2')
  await expect.element(select).toHaveAttribute('title', 'Freios, Motor, Suspensão')

  await screen.getByRole('option', { name: 'Todas' }).click()
  await expect.element(select).toHaveTextContent('Todas')
  await expect.element(screen.getByRole('option', { name: 'Todas' })).toHaveAttribute('aria-selected', 'true')
})

// Drives a multiple choice with the keyboard: the arrows open the list and move through it, Space toggles,
// End jumps to the last option, and Escape closes only the list, leaving a menu around it open.
test('Web: selects work from the keyboard and Escape closes only the list', async () => {
  const onOuterKey = vi.fn()
  const screen = await render(
    <div onKeyDown={(event) => event.key === 'Escape' && onOuterKey()}>
      <Multiple initial={[]} />
    </div>,
  )
  const select = screen.getByRole('combobox')
  await userEvent.keyboard('{Tab}')
  await expect.element(select).toHaveFocus()
  expect(getComputedStyle(select.element()).cursor).toBe('pointer')

  await userEvent.keyboard('{ArrowDown}')
  await expect.element(select).toHaveAttribute('aria-expanded', 'true')
  await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
  const activeId = select.element().getAttribute('aria-activedescendant')!
  expect(document.getElementById(activeId)).toHaveTextContent('Freios')
  await userEvent.keyboard(' ')
  await userEvent.keyboard('{End}')
  await userEvent.keyboard('{Enter}')
  await expect.element(select).toHaveTextContent('Freios +1')
  await expect.element(screen.getByRole('option', { name: 'Transmissão' })).toHaveAttribute('aria-selected', 'true')

  await userEvent.keyboard('{Escape}')
  await expect.element(select).toHaveAttribute('aria-expanded', 'false')
  expect(onOuterKey).not.toHaveBeenCalled()
})

// Picks in a single choice and checks it takes the value and closes, marking the chosen option when reopened.
test('Web: single selects take one value and close', async () => {
  const screen = await render(<Single />)
  const select = screen.getByRole('combobox', { name: 'Ordenar' })
  await expect.element(select).toHaveTextContent('Nome (A–Z)')
  await select.click()
  await screen.getByRole('option', { name: 'Preço' }).click()
  await expect.element(select).toHaveTextContent('Preço')
  await expect.element(select).toHaveAttribute('aria-expanded', 'false')

  await select.click()
  await expect.element(screen.getByRole('option', { name: 'Preço' })).toHaveAttribute('aria-selected', 'true')
  await expect.element(screen.getByRole('listbox')).not.toHaveAttribute('aria-multiselectable')
})

// Leaves an open list with Tab and checks it closes, and that a disabled select does not open.
test('Web: selects close on blur and stay shut while disabled', async () => {
  const screen = await render(
    <>
      <Multiple initial={[]} />
      <Select aria-label="Desligado" options={SORTS} value="name" onValueChange={() => {}} disabled />
    </>,
  )
  const select = screen.getByRole('combobox', { name: 'Categoria' })
  await select.click()
  await expect.element(screen.getByRole('listbox')).toBeVisible()
  await userEvent.keyboard('{Tab}')
  await expect.element(select).toHaveAttribute('aria-expanded', 'false')

  const off = screen.getByRole('combobox', { name: 'Desligado' })
  await off.click({ force: true })
  await expect.element(off).toHaveAttribute('aria-expanded', 'false')
  expect(getComputedStyle(off.element()).cursor).toBe('not-allowed')
})

function Multiple({ initial }: { initial: string[] }) {
  const [value, setValue] = useState(initial)
  const props: ComponentProps<typeof Select> = {
    'aria-label': 'Categoria',
    multiple: true,
    allLabel: 'Todas',
    options: CATEGORIES,
    value,
    onValueChange: setValue,
  }
  return <Select {...props} />
}

function Single() {
  const [value, setValue] = useState('name')
  return <Select aria-label="Ordenar" options={SORTS} value={value} onValueChange={setValue} />
}
