import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { activeFilterCount, type FilterValues } from '@apc/shared/filters'
import { userEvent, within } from 'storybook/test'
import { FilterChipGroup } from './FilterChip.tsx'
import { ClearFilters, FilterMenu } from './FilterMenu.tsx'

// The inventory filter bar: the filter menu, the stock status chips and "Limpar filtros", which shows up
// only while a filter is on. The Open story opens the menu with two filters already applied. Switch Style
// and Mode in the toolbar to see each combination, and the mobile viewport to see the panel at 360px.

const NO_FILTERS: FilterValues = { cat: [], part: [], pos: [], side: [], color: [], loc: [] }
const ROWS = [
  { key: 'cat', label: 'Categoria', allLabel: 'Todas', options: list('Arrefecimento', 'Elétrica', 'Freios', 'Ignição', 'Motor', 'Suspensão', 'Transmissão') },
  { key: 'part', label: 'Marca da peça', allLabel: 'Todas', options: list('Bosch', 'Cofap', 'Nakata', 'Tecfil', 'Varga') },
  {
    label: 'Posição · Lado',
    groups: [
      {
        key: 'pos',
        label: 'Posição',
        options: [
          { value: 'D', label: 'D', title: 'Dianteiro (inclui peças Ambos)' },
          { value: 'T', label: 'T', title: 'Traseiro (inclui peças Ambos)' },
          { value: 'N/A', label: 'N/A', title: 'Posição não se aplica' },
        ],
      },
      {
        key: 'side',
        label: 'Lado',
        options: [
          { value: 'LD', label: 'LD', title: 'Direito (inclui peças Ambos)' },
          { value: 'LE', label: 'LE', title: 'Esquerdo (inclui peças Ambos)' },
          { value: 'N/A', label: 'N/A', title: 'Lado não se aplica' },
        ],
      },
    ],
  },
  { key: 'color', label: 'Cor', allLabel: 'Todas', options: list('Azul', 'Bege', 'Branco', 'Preto', 'Vermelho') },
  { key: 'loc', label: 'Local', allLabel: 'Todos', options: list('Prateleira A1', 'Prateleira A2', 'Gaveta B3') },
]
const meta = {
  title: 'Components/FilterMenu',
  component: FilterMenu,
  args: { label: '', title: '', rows: [], values: {}, onApply: () => {} },
} satisfies Meta<typeof FilterMenu>
export const FilterBar: Story = {
  render: () => <SampleBar initial={NO_FILTERS} />,
}
export const Open: Story = {
  render: () => <SampleBar initial={{ ...NO_FILTERS, cat: ['Freios', 'Motor'], pos: ['D'] }} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Filtros/ }))
  },
}

type Story = StoryObj<typeof meta>

export default meta

/**
 * Builds Select options whose value is their label.
 * @param labels Option labels.
 * @returns One option per label.
 */
function list(...labels: string[]) {
  return labels.map((label) => ({ value: label, label }))
}

function SampleBar({ initial }: { initial: FilterValues }) {
  const [values, setValues] = useState(initial)
  const [status, setStatus] = useState<string | null>(null)
  return (
    <div className="flex min-h-[calc(var(--spacing)*130)] flex-wrap content-start items-center gap-x-3 gap-y-2 p-6">
      <FilterMenu label="Filtros do estoque" title="Filtrar estoque" rows={ROWS} values={values} onApply={setValues} />
      <FilterChipGroup
        label="Situação do estoque"
        options={[
          { value: 'low', label: 'Estoque baixo' },
          { value: 'out', label: 'Esgotado' },
        ]}
        value={status}
        onValueChange={setStatus}
      />
      <ClearFilters
        active={activeFilterCount(values) > 0 || status !== null}
        onClear={() => {
          setValues(NO_FILTERS)
          setStatus(null)
        }}
      />
    </div>
  )
}
