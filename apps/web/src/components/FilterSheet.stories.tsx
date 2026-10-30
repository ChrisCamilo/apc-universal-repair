import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import { activeFilterCount, type FilterValues } from '@apc/shared/filters'
import { filterIcon, sortIcon } from '@apc/shared/icons'
import { EMPTY_ITEM_FILTERS, ITEM_SORT_OPTIONS, itemFilterRows, matchingCount } from '@apc/shared/item-filters'
import { testItem } from '@apc/shared/test-items'
import { sortValue, type Sort } from '@apc/shared/table'
import { FilterSheet, SortSheet } from './FilterSheet.tsx'
import { ToolButton } from './ToolButton.tsx'

// The Inventory's filters and sort on a phone: the round Filtros opens "Filtrar e ordenar", with a few parts in
// stock to choose from and count, and the round Ordenar the sorts alone; each turns to the accent once something is
// on. The stories open at the phone's design size; switch Style and Mode in the toolbar.

const ITEMS = [
  testItem({ name: 'Filtro de óleo', category: 'Motor', partBrand: 'Mann', vehicleBrand: 'Volkswagen', vehicleModel: 'Gol', location: 'A-2' }),
  testItem({ name: 'Pastilha de freio', category: 'Freios', partBrand: 'Cobreq', vehicleBrand: 'Chevrolet', position: 'D', location: 'B-10' }),
  testItem({ name: 'Bobina', category: 'Elétrica', partBrand: 'Bosch', vehicleBrand: 'Fiat', vehicleModel: 'Uno', color: 'Preto' }),
  testItem({ name: 'Amortecedor', category: 'Suspensão', partBrand: 'Cofap', vehicleBrand: 'Ford', vehicleModel: 'Escort', position: 'T', side: 'LE' }),
]
const meta = {
  title: 'Components/FilterSheet',
  component: FilterSheet,
  args: {
    open: false,
    onClose: () => {},
    rows: () => [],
    values: {},
    sort: null,
    sortOptions: [],
    count: () => 0,
    onApply: () => {},
  },
  globals: { viewport: { value: 'phone' } },
} satisfies Meta<typeof FilterSheet>
export const Filters: Story = {
  render: () => <Toolbar />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Filtros' }))
  },
}
export const Sorts: Story = {
  render: () => <Toolbar />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Ordenar' }))
  },
}

type Story = StoryObj<typeof meta>

export default meta

function Toolbar() {
  const [filters, setFilters] = useState<FilterValues>(EMPTY_ITEM_FILTERS)
  const [sort, setSort] = useState<Sort | null>(null)
  const [open, setOpen] = useState<'filters' | 'sort' | null>(null)
  const count = activeFilterCount(filters)
  const sortLabel = ITEM_SORT_OPTIONS.find((option) => option.value === sortValue(sort))?.label
  return (
    <div className="flex gap-2 p-4">
      <ToolButton
        icon={filterIcon}
        label={count ? `Filtros, ${count} ${count === 1 ? 'ativo' : 'ativos'}` : 'Filtros'}
        active={count > 0}
        onClick={() => setOpen('filters')}
      />
      <ToolButton icon={sortIcon} label={sort ? `Ordenar, ${sortLabel}` : 'Ordenar'} active={sort !== null} onClick={() => setOpen('sort')} />
      <FilterSheet
        open={open === 'filters'}
        onClose={() => setOpen(null)}
        rows={(draft) => itemFilterRows(ITEMS, draft)}
        values={filters}
        sort={sort}
        sortOptions={ITEM_SORT_OPTIONS}
        count={(draft) => matchingCount(ITEMS, draft, null, '')}
        onApply={(values, next) => {
          setFilters(values)
          setSort(next)
          setOpen(null)
        }}
      />
      <SortSheet open={open === 'sort'} onClose={() => setOpen(null)} sort={sort} options={ITEM_SORT_OPTIONS} onSortChange={setSort} />
    </div>
  )
}
