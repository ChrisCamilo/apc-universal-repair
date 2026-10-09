import { useState } from 'react'
import { FILTER_PANEL_SPACING, type FilterValues } from '@apc/shared/filters'
import { scales, themes } from '@apc/shared/theme'
import { beforeAll, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { ClearFilters, FilterMenu } from './FilterMenu.tsx'

// Vehicle models by brand, for rows that depend on the choice.
const MODELS: Record<string, string[]> = { Chevrolet: ['Chevette', 'Opala'], Fiat: ['Uno'] }
const NO_FILTERS: FilterValues = { cat: [], pos: [], side: [] }
const ROWS = [
  {
    key: 'cat',
    label: 'Categoria',
    allLabel: 'Todas',
    options: ['Freios', 'Motor', 'Suspensão'].map((label) => ({ value: label, label })),
  },
  {
    label: 'Posição · Lado',
    groups: [
      { key: 'pos', label: 'Posição', options: [{ value: 'D', label: 'D' }, { value: 'T', label: 'T' }] },
      { key: 'side', label: 'Lado', options: [{ value: 'LD', label: 'LD' }, { value: 'LE', label: 'LE' }] },
    ],
  },
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
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
})

// Picks a category and a chip in the panel and checks nothing is applied until Apply, which applies both,
// closes the panel, puts the focus back on the button and makes it count two filters in the accent.
test('Web: filter changes apply only on Apply', async () => {
  const onApply = vi.fn()
  const screen = await render(<Menu initial={NO_FILTERS} onApplied={onApply} />)
  const button = screen.getByRole('button', { name: 'Filtros' })
  await button.click()
  await expect.element(screen.getByRole('dialog', { name: 'Filtros do estoque' })).toBeVisible()
  await expect.element(screen.getByRole('combobox', { name: 'Categoria' })).toHaveFocus()

  await screen.getByRole('combobox', { name: 'Categoria' }).click()
  await screen.getByRole('option', { name: 'Motor' }).click()
  // The list stays open while picking and covers the rows below; Escape closes just the list.
  await userEvent.keyboard('{Escape}')
  await screen.getByRole('button', { name: 'D' }).click()
  expect(onApply).not.toHaveBeenCalled()

  await screen.getByRole('button', { name: 'Aplicar' }).click()
  expect(onApply).toHaveBeenCalledWith({ cat: ['Motor'], pos: ['D'], side: [] })
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  const counted = screen.getByRole('button', { name: 'Filtros, 2 ativos' })
  await expect.element(counted).toHaveFocus()
  expect(counted.element().textContent).toBe('Filtros2')
  // the button fades to the accent with the theme's motion
  await expect.poll(() => getComputedStyle(counted.element()).color).toBe(rgb(themes.eighties.night.colors.accent))
})

// Makes changes, then leaves with Escape and with a click outside, and checks neither applies them: the
// panel reopens on the applied values.
test('Web: Escape and a click outside close the panel without applying', async () => {
  const onApply = vi.fn()
  const screen = await render(
    <>
      <Menu initial={NO_FILTERS} onApplied={onApply} />
      <p style={{ marginTop: 480 }}>Fora do menu</p>
    </>,
  )
  const button = screen.getByRole('button', { name: 'Filtros' })
  await button.click()
  await screen.getByRole('button', { name: 'T' }).click()
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  await expect.element(button).toHaveFocus()

  await button.click()
  await expect.element(screen.getByRole('button', { name: 'T' })).toHaveAttribute('aria-pressed', 'false')
  await screen.getByRole('button', { name: 'LE' }).click()
  await screen.getByText('Fora do menu').click()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  expect(onApply).not.toHaveBeenCalled()
})

// Opens a Select inside the panel and presses Escape: only the list closes, and the panel stays open.
test('Web: Escape in an open list closes only the list', async () => {
  const screen = await render(<Menu initial={NO_FILTERS} onApplied={() => {}} />)
  await screen.getByRole('button', { name: 'Filtros' }).click()
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByRole('listbox')).toBeVisible()
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByRole('listbox')).not.toBeInTheDocument()
  await expect.element(screen.getByRole('dialog')).toBeVisible()
})

// Opens the panel with filters applied and checks their rows light up, then Clear empties every row and
// applies right away.
test('Web: rows with a choice light up and Clear applies right away', async () => {
  const onApply = vi.fn()
  const screen = await render(<Menu initial={{ cat: ['Freios', 'Motor'], pos: [], side: ['LD'] }} onApplied={onApply} />)
  await screen.getByRole('button', { name: 'Filtros, 2 ativos' }).click()
  const accent = rgb(themes.eighties.night.colors.accent)
  expect(getComputedStyle(screen.getByText('Categoria').element()).color).toBe(accent)
  expect(getComputedStyle(screen.getByText('Posição · Lado').element()).color).toBe(accent)
  await expect.element(screen.getByRole('combobox', { name: 'Categoria' })).toHaveTextContent('Freios +1')

  await screen.getByRole('button', { name: 'Limpar', exact: true }).click()
  expect(onApply).toHaveBeenCalledWith(NO_FILTERS)
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  await expect.element(screen.getByRole('button', { name: 'Filtros' })).toBeInTheDocument()
})

// Checks the panel never gets wider than FILTER_PANEL_SPACING allows, 360px or the screen minus 80px, so it fits on a
// phone.
test('Web: the filter panel fits the screen', async () => {
  const screen = await render(<Menu initial={NO_FILTERS} onApplied={() => {}} />)
  await screen.getByRole('button', { name: 'Filtros' }).click()
  const width = screen.getByRole('dialog').element().getBoundingClientRect().width
  const unit = scales.space.s1
  expect(width).toBeCloseTo(Math.min(FILTER_PANEL_SPACING.width * unit, window.innerWidth - FILTER_PANEL_SPACING.inset * unit), 0)
})

// Checks "Limpar filtros" shows only while a filter is on.
test('Web: the clear filters link shows only with a filter on', async () => {
  const onClear = vi.fn()
  const off = await render(<ClearFilters active={false} onClear={onClear} />)
  expect(off.getByRole('button').query()).toBeNull()
  await off.unmount()

  const on = await render(<ClearFilters active onClear={onClear} />)
  await on.getByRole('button', { name: 'Limpar filtros' }).click()
  expect(onClear).toHaveBeenCalledOnce()
})

// Picks two brands and a model of each with rows that list only the chosen brands' models, then unchecks one brand,
// and checks its model leaves the choice and the list, and Apply sends what is left.
test('Web: rows that depend on the choice drop what they stop offering', async () => {
  const onApply = vi.fn()
  const brandRows = (draft: FilterValues) => {
    const brands = draft.brand?.length ? draft.brand : Object.keys(MODELS)
    const options = (values: string[]) => values.map((value) => ({ value, label: value }))
    return [
      { key: 'brand', label: 'Marca', allLabel: 'Todas', options: options(Object.keys(MODELS)) },
      { key: 'model', label: 'Modelo', allLabel: 'Todos', options: options(brands.flatMap((brand) => MODELS[brand])) },
    ]
  }
  const screen = await render(
    <FilterMenu label="Filtros" title="Filtrar" rows={brandRows} values={{ brand: [], model: [] }} onApply={onApply} />,
  )
  await screen.getByRole('button', { name: 'Filtros' }).click()
  await screen.getByRole('combobox', { name: 'Marca' }).click()
  await screen.getByRole('option', { name: 'Chevrolet' }).click()
  await screen.getByRole('option', { name: 'Fiat' }).click()
  await userEvent.keyboard('{Escape}')
  await screen.getByRole('combobox', { name: 'Modelo' }).click()
  await screen.getByRole('option', { name: 'Opala' }).click()
  await screen.getByRole('option', { name: 'Uno' }).click()
  await userEvent.keyboard('{Escape}')

  await screen.getByRole('combobox', { name: 'Marca' }).click()
  await screen.getByRole('option', { name: 'Fiat' }).click()
  await userEvent.keyboard('{Escape}')
  await screen.getByRole('combobox', { name: 'Modelo' }).click()
  expect(screen.getByRole('option').elements().map((option) => option.textContent)).toEqual(['Todos', 'Chevette', 'Opala'])
  await userEvent.keyboard('{Escape}')
  await screen.getByRole('button', { name: 'Aplicar' }).click()
  expect(onApply).toHaveBeenCalledWith({ brand: ['Chevrolet'], model: ['Opala'] })
})

function Menu({ initial, onApplied }: { initial: FilterValues; onApplied: (values: FilterValues) => void }) {
  const [values, setValues] = useState(initial)
  return (
    <FilterMenu
      label="Filtros do estoque"
      title="Filtrar estoque"
      rows={ROWS}
      values={values}
      onApply={(next) => {
        setValues(next)
        onApplied(next)
      }}
    />
  )
}
