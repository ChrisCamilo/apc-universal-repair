import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { pencilIcon, trashIcon } from '@apc/shared/icons'
import { sortRows, type Sort } from '@apc/shared/table'
import { DataTable, RowAction, TableThumbnail } from './DataTable.tsx'
import { Text } from './Typography.tsx'

// The inventory table with rows in every status (in stock, low, out), with and without a photo, sortable by
// the headers or, in the mobile viewport, by the "Ordenar" select, and the empty state. Switch Style and
// Mode in the toolbar to see each combination.

// Stand-in photo: a plain shape in fixed grays, since it plays the part of a real photo.
const PHOTO = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88"><rect width="88" height="88" fill="#6E7B86"/><rect x="14" y="40" width="60" height="18" rx="6" fill="#1C2024"/></svg>',
)}`
const ITEMS: Item[] = [
  { code: 'FR-0142', name: 'Pastilha de freio dianteira', cat: 'Freios', part: 'Cobreq', loc: 'A-2', price: 89.9, qty: 12, min: 4, photo: PHOTO },
  { code: 'MO-0031', name: 'Junta do cabeçote', cat: 'Motor', part: 'Sabó', loc: 'B-10', price: 189.9, qty: 2, min: 3, photo: null },
  { code: 'SU-0007', name: 'Amortecedor traseiro', cat: 'Suspensão', part: 'Cofap', loc: 'A-10', price: 249, qty: 0, min: 2, photo: PHOTO },
  { code: 'IG-0210', name: 'Cabo de vela', cat: 'Ignição', part: 'NGK', loc: 'C-1', price: 64.5, qty: 7, min: 2, photo: null },
  { code: 'AR-0098', name: 'Bomba d’água', cat: 'Arrefecimento', part: 'Urba', loc: 'B-3', price: 132.4, qty: 1, min: 2, photo: null },
]
const meta = {
  title: 'Components/DataTable',
  component: DataTable,
  args: { label: '', columns: [], rows: [], rowKey: () => '', sort: null, onSortChange: () => {}, unsortedLabel: '', empty: null },
} satisfies Meta<typeof DataTable>
export const Empty: Story = {
  render: () => <SampleInventory items={[]} />,
}
export const Inventory: Story = {
  render: () => <SampleInventory items={ITEMS} />,
}

type Item = {
  code: string
  name: string
  cat: string
  part: string
  loc: string
  price: number
  qty: number
  min: number
  photo: string | null
}
type Story = StoryObj<typeof meta>

export default meta

/**
 * Formats a price in reais.
 * @param value Price.
 * @returns E.g. "R$ 89,90".
 */
function money(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function SampleInventory({ items }: { items: Item[] }) {
  const [sort, setSort] = useState<Sort | null>(null)
  const sorted = sort ? sortRows(items, (item) => item[sort.key as keyof Item] ?? '', sort.dir) : items
  return (
    <div className="max-w-5xl p-6">
      <DataTable
        label="Itens do estoque"
        rows={sorted}
        rowKey={(item) => item.code}
        rowStatus={(item) =>
          item.qty === 0
            ? { tone: 'danger', label: 'Esgotado' }
            : item.qty <= item.min
              ? { tone: 'warn', label: 'Estoque baixo' }
              : undefined
        }
        sort={sort}
        onSortChange={setSort}
        unsortedLabel="Ordem de cadastro"
        columns={[
          {
            key: 'photo',
            header: 'Foto',
            headerHidden: true,
            card: 'thumb',
            cell: (item) => <TableThumbnail src={item.photo} label={`Ver foto de ${item.name}`} onOpen={() => {}} />,
          },
          {
            key: 'name',
            header: 'Item',
            sortable: true,
            card: 'main',
            cell: (item) => (
              <span className="grid min-w-0">
                <b className="font-semibold">{item.name}</b>
                <code className="font-mono text-xs text-text-muted">{item.code}</code>
                <span className="hidden text-xs text-text-muted max-[720px]:block">
                  {[item.cat, item.part, item.loc, money(item.price)].join(' · ')}
                </span>
              </span>
            ),
          },
          { key: 'cat', header: 'Categoria', sortable: true, cell: (item) => item.cat },
          { key: 'part', header: 'Marca', sortable: true, cell: (item) => item.part },
          { key: 'loc', header: 'Local', sortable: true, cell: (item) => <span className="font-mono text-xs">{item.loc}</span> },
          { key: 'price', header: 'Valor unit.', sortLabel: 'Valor unitário', numeric: true, sortable: true, cell: (item) => money(item.price) },
          { key: 'qty', header: 'Qtd.', sortLabel: 'Quantidade', numeric: true, sortable: true, card: 'end', cell: (item) => item.qty },
          {
            key: 'actions',
            header: 'Ações',
            headerHidden: true,
            numeric: true,
            card: 'actions',
            cell: (item) => (
              <span className="inline-flex gap-0.5">
                <RowAction icon={pencilIcon} label={`Editar ${item.name}`} onClick={() => {}} />
                <RowAction icon={trashIcon} label={`Excluir ${item.name}`} tone="danger" onClick={() => {}} />
              </span>
            ),
          },
        ]}
        empty={
          <div className="grid justify-items-center gap-2 px-4 py-8 text-center">
            <b className="font-display font-semibold uppercase tracking-display text-text">Nenhum item encontrado</b>
            <Text size="sm" tone="muted">
              Ajuste a busca ou limpe os filtros para ver o estoque inteiro.
            </Text>
          </div>
        }
      />
    </div>
  )
}
