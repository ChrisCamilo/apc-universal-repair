import { useState } from 'react'
import type { FilterValues } from '@apc/shared/filters'
import { filterIcon, sortIcon } from '@apc/shared/icons'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import type { Sort } from '@apc/shared/table'
import { themes } from '@apc/shared/theme'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { FilterSheet, SortSheet } from './FilterSheet.tsx'
import { ToolButton } from './ToolButton.tsx'

// Vehicle models by brand, for rows that depend on the choice.
const MODELS: Record<string, string[]> = { Chevrolet: ['Chevette', 'Opala'], Fiat: ['Uno'] }
const NO_FILTERS: FilterValues = { cat: [], brand: [], model: [], pos: [] }
const SORTS = [
  { value: '', label: 'Ordem de cadastro' },
  { value: 'location:asc', label: 'Local (A → Z)' },
  { value: 'location:desc', label: 'Local (Z → A)' },
]
const root = document.documentElement

/**
 * Lays out the rows for what is chosen: a category, the vehicle brands, their models, and the position as segments.
 * @param draft Values chosen so far.
 * @returns The rows.
 */
function rows(draft: FilterValues) {
  const options = (values: string[]) => values.map((value) => ({ value, label: value }))
  const brands = draft.brand?.length ? draft.brand : Object.keys(MODELS)
  return [
    { key: 'cat', label: 'Categoria', allLabel: 'Todas', options: options(['Freios', 'Motor', 'Suspensão']) },
    { key: 'brand', label: 'Marca do veículo', allLabel: 'Todas', options: options(Object.keys(MODELS)) },
    { key: 'model', label: 'Modelo do veículo', allLabel: 'Todos', options: options(brands.flatMap((brand) => MODELS[brand])) },
    {
      label: 'Posição',
      groups: [
        {
          key: 'pos',
          label: 'Posição',
          segments: [
            { value: '', label: 'Todas' },
            { value: 'D', label: 'Dianteira' },
            { value: 'T', label: 'Traseira' },
          ],
        },
      ],
    },
  ]
}

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
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
})

afterAll(async () => {
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

// Opens the sheet and checks its rows: "Ordenar por" with the sort, each filter with "Todas", and the position as
// segments. A row opens its options inside the sheet, "Todas" first and checked, and picks add up; Escape goes back to
// the rows with the focus on the row, now naming its choice in the accent, and "Ver n itens" counts as the choice
// changes. Nothing is applied until it is pressed, which applies the filters and the sort together.
test('Web: the filter sheet opens each filter as a list and applies on "Ver n itens"', async () => {
  const onApply = vi.fn()
  const screen = await render(<Sheet onApplied={onApply} />)
  await screen.getByRole('button', { name: 'Filtros' }).click()
  const sheet = screen.getByRole('dialog', { name: 'Filtrar e ordenar' })
  await expect.element(sheet.getByRole('button', { name: 'Ordenar por Ordem de cadastro' })).toBeVisible()
  await expect.element(sheet.getByRole('button', { name: 'Categoria Todas' })).toBeVisible()
  await expect.element(sheet.getByRole('radio', { name: 'Todas' })).toHaveAttribute('aria-checked', 'true')
  await expect.element(sheet.getByRole('button', { name: 'Ver 9 itens' })).toBeVisible()

  await sheet.getByRole('button', { name: 'Categoria Todas' }).click()
  const list = sheet.getByRole('listbox', { name: 'Categoria' })
  await expect.element(screen.getByRole('button', { name: 'Voltar aos filtros' })).toHaveFocus()
  expect(list.getByRole('option').elements().map((option) => option.textContent)).toEqual(['Todas', 'Freios', 'Motor', 'Suspensão'])
  await expect.element(list.getByRole('option', { name: 'Todas' })).toHaveAttribute('aria-selected', 'true')
  await list.getByRole('option', { name: 'Freios' }).click()
  await list.getByRole('option', { name: 'Motor' }).click()
  await expect.element(list.getByRole('option', { name: 'Todas' })).toHaveAttribute('aria-selected', 'false')
  await expect.element(sheet.getByRole('button', { name: 'Ver 5 itens' })).toBeVisible()
  await userEvent.keyboard('{Escape}')
  const category = sheet.getByRole('button', { name: 'Categoria Freios +1' })
  await expect.element(category).toHaveFocus()
  expect(getComputedStyle(category.getByText('Freios +1').element()).color).toBe(rgb(themes.eighties.night.colors.accent))
  await expect.element(sheet).toBeVisible()

  await sheet.getByRole('radio', { name: 'Dianteira' }).click()
  await sheet.getByRole('button', { name: 'Ordenar por Ordem de cadastro' }).click()
  await sheet.getByRole('option', { name: 'Local (Z → A)' }).click()
  await expect.element(sheet.getByRole('button', { name: 'Ordenar por Local (Z → A)' })).toHaveFocus()
  expect(onApply).not.toHaveBeenCalled()
  await sheet.getByRole('button', { name: 'Ver 3 itens' }).click()
  expect(onApply).toHaveBeenCalledWith({ ...NO_FILTERS, cat: ['Freios', 'Motor'], pos: ['D'] }, { key: 'location', dir: 'desc' })
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  await expect.element(screen.getByRole('button', { name: 'Filtros, 2 ativos' })).toBeVisible()
})

// Chooses a filter and a sort, then closes the sheet with Escape and with a click above it: nothing is applied, and
// the sheet opens again on what is applied. "Limpar" turns the filters and the sort off in the sheet, still unapplied.
test('Web: the filter sheet drops what was not applied and Limpar clears it', async () => {
  const onApply = vi.fn()
  const screen = await render(
    <Sheet initial={{ ...NO_FILTERS, cat: ['Motor'] }} initialSort={{ key: 'location', dir: 'asc' }} onApplied={onApply} />,
  )
  const filters = screen.getByRole('button', { name: 'Filtros, 1 ativo' })
  await filters.click()
  const sheet = screen.getByRole('dialog', { name: 'Filtrar e ordenar' })
  await sheet.getByRole('radio', { name: 'Traseira' }).click()
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()

  await filters.click()
  await expect.element(sheet.getByRole('radio', { name: 'Todas' })).toHaveAttribute('aria-checked', 'true')
  await sheet.getByRole('button', { name: 'Limpar' }).click()
  await expect.element(sheet.getByRole('button', { name: 'Ordenar por Ordem de cadastro' })).toBeVisible()
  await expect.element(sheet.getByRole('button', { name: 'Categoria Todas' })).toBeVisible()
  await expect.element(sheet.getByRole('button', { name: 'Ver 9 itens' })).toBeVisible()
  ;(sheet.element() as HTMLDialogElement).click()
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  expect(onApply).not.toHaveBeenCalled()

  await filters.click()
  await sheet.getByRole('button', { name: 'Limpar' }).click()
  await sheet.getByRole('button', { name: 'Ver 9 itens' }).click()
  expect(onApply).toHaveBeenCalledWith(NO_FILTERS, null)
})

// Chooses two vehicle brands and a model of each, then takes one brand off: its model leaves the choice, and the
// models' list offers only the brand left.
test('Web: filter sheet rows that depend on the choice drop what they stop offering', async () => {
  const onApply = vi.fn()
  const screen = await render(<Sheet onApplied={onApply} />)
  await screen.getByRole('button', { name: 'Filtros' }).click()
  const sheet = screen.getByRole('dialog', { name: 'Filtrar e ordenar' })
  await sheet.getByRole('button', { name: /^Marca do veículo/ }).click()
  await sheet.getByRole('option', { name: 'Chevrolet' }).click()
  await sheet.getByRole('option', { name: 'Fiat' }).click()
  await userEvent.keyboard('{Escape}')
  await sheet.getByRole('button', { name: /^Modelo do veículo/ }).click()
  await sheet.getByRole('option', { name: 'Opala' }).click()
  await sheet.getByRole('option', { name: 'Uno' }).click()
  await sheet.getByRole('button', { name: 'Voltar aos filtros' }).click()
  await sheet.getByRole('button', { name: /^Marca do veículo/ }).click()
  await sheet.getByRole('option', { name: 'Fiat' }).click()
  await userEvent.keyboard('{Escape}')
  await expect.element(sheet.getByRole('button', { name: 'Modelo do veículo Opala' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Modelo do veículo Opala' }).click()
  expect(sheet.getByRole('option').elements().map((option) => option.textContent)).toEqual(['Todos', 'Chevette', 'Opala'])
  await sheet.getByRole('button', { name: /^Ver/ }).click()
  expect(onApply).toHaveBeenCalledWith({ ...NO_FILTERS, brand: ['Chevrolet'], model: ['Opala'] }, null)
})

// Picks a sort in the sort sheet, which sorts at once and closes, with the chosen sort checked when it opens again.
test('Web: the sort sheet sorts on a pick and closes', async () => {
  const onSortChange = vi.fn()
  const screen = await render(<Sorter onSorted={onSortChange} />)
  await screen.getByRole('button', { name: 'Ordenar' }).click()
  const list = screen.getByRole('listbox', { name: 'Ordenar' })
  await expect.element(list.getByRole('option', { name: 'Ordem de cadastro' })).toHaveAttribute('aria-selected', 'true')
  await list.getByRole('option', { name: 'Local (A → Z)' }).click()
  expect(onSortChange).toHaveBeenCalledWith({ key: 'location', dir: 'asc' })
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  await screen.getByRole('button', { name: 'Ordenar' }).click()
  await expect.element(list.getByRole('option', { name: 'Local (A → Z)' })).toHaveAttribute('aria-selected', 'true')
})

// Draws a toolbar button at rest and on: 44px round with a hairline, then in the accent with its soft fill and a dot.
test('Web: a toolbar button turns to the accent with a dot while on', async () => {
  const colors = themes.eighties.night.colors
  const screen = await render(
    <>
      <ToolButton icon={filterIcon} label="Filtros" />
      <ToolButton icon={filterIcon} label="Filtros, 1 ativo" active />
    </>,
  )
  const rest = screen.getByRole('button', { name: 'Filtros', exact: true }).element()
  const on = screen.getByRole('button', { name: 'Filtros, 1 ativo' }).element()
  expect([rest.getBoundingClientRect().width, rest.getBoundingClientRect().height]).toEqual([44, 44])
  expect(getComputedStyle(rest).color).toBe(rgb(colors.text))
  expect(getComputedStyle(on).color).toBe(rgb(colors.accent))
  expect(getComputedStyle(on).borderTopColor).toBe(rgb(colors.accent))
  expect(rest.querySelector('[data-testid="common.tool-button.dot"]')).toBeNull()
  expect(on.querySelector('[data-testid="common.tool-button.dot"]')).not.toBeNull()
})

type SheetProps = {
  initial?: FilterValues
  initialSort?: Sort | null
  onApplied: (values: FilterValues, sort: Sort | null) => void
}

function Sheet({ initial = NO_FILTERS, initialSort = null, onApplied }: SheetProps) {
  const [values, setValues] = useState(initial)
  const [sort, setSort] = useState(initialSort)
  const [open, setOpen] = useState(false)
  const on = Object.values(values).filter((chosen) => chosen.length > 0).length
  return (
    <>
      <ToolButton
        icon={filterIcon}
        label={on ? `Filtros, ${on} ${on === 1 ? 'ativo' : 'ativos'}` : 'Filtros'}
        active={on > 0}
        onClick={() => setOpen(true)}
      />
      <FilterSheet
        open={open}
        onClose={() => setOpen(false)}
        rows={rows}
        values={values}
        sort={sort}
        sortOptions={SORTS}
        // 9 items, 2 fewer for each value chosen.
        count={(draft) => 9 - 2 * Object.values(draft).reduce((sum, chosen) => sum + chosen.length, 0)}
        onApply={(next, nextSort) => {
          setValues(next)
          setSort(nextSort)
          setOpen(false)
          onApplied(next, nextSort)
        }}
      />
    </>
  )
}

function Sorter({ onSorted }: { onSorted: (sort: Sort | null) => void }) {
  const [sort, setSort] = useState<Sort | null>(null)
  const [open, setOpen] = useState(false)
  return (
    <>
      <ToolButton icon={sortIcon} label="Ordenar" onClick={() => setOpen(true)} />
      <SortSheet
        open={open}
        onClose={() => setOpen(false)}
        sort={sort}
        options={SORTS}
        onSortChange={(next) => {
          setSort(next)
          onSorted(next)
        }}
      />
    </>
  )
}
