import { useState, type ComponentProps } from 'react'
import {
  formatPrice,
  itemDetails,
  matchesSearch,
  NOT_APPLICABLE,
  POSITION_NAMES,
  resultSummary,
  SIDE_NAMES,
  STOCK_STATUS_LABELS,
  stockStatus,
  type Item,
} from '@apc/shared/items'
import { DataTable, TableThumbnail } from '../components/DataTable.tsx'
import { Panel } from '../components/Panel.tsx'
import { SearchField } from '../components/TextField.tsx'
import { Text } from '../components/Typography.tsx'
import { useItems } from '../inventory/useItems.ts'

// The Inventory tab (/inventory), the default and, in the MVP, the only tab: every item in the DataTable, a
// search by name or part code, and a counter of the items shown, the total and the stock alerts. Low and
// out-of-stock rows are tinted by the table. At phone width the row becomes a card and the columns that
// leave it show as one line under the name.

const COLUMNS: ComponentProps<typeof DataTable<Item>>['columns'] = [
  {
    key: 'photo',
    header: 'Foto',
    headerHidden: true,
    card: 'thumb',
    cell: (item) => <TableThumbnail label={`Foto de ${item.name}`} />,
  },
  {
    key: 'name',
    header: 'Item',
    card: 'main',
    cell: (item) => (
      <span className="grid min-w-0">
        <b className="font-semibold">{item.name}</b>
        <code className="font-mono text-xs text-text-muted">{item.code}</code>
        <span className="hidden text-xs text-text-muted max-[720px]:block">{itemDetails(item)}</span>
      </span>
    ),
  },
  { key: 'category', header: 'Categoria', cell: (item) => item.category },
  { key: 'partBrand', header: 'Marca', cell: (item) => item.partBrand },
  {
    key: 'vehicle',
    header: 'Veículo',
    cell: (item) => (
      <span className="grid">
        <span>{item.vehicleBrand}</span>
        <span className="text-text-muted">{item.vehicleModel ?? 'qualquer modelo'}</span>
      </span>
    ),
  },
  { key: 'position', header: 'Posição', cell: (item) => <Coded value={item.position} name={POSITION_NAMES[item.position]} /> },
  { key: 'side', header: 'Lado', cell: (item) => <Coded value={item.side} name={SIDE_NAMES[item.side]} /> },
  { key: 'color', header: 'Cor', cell: (item) => <Coded value={item.color} name={item.color === NOT_APPLICABLE ? 'Cor não se aplica' : item.color} /> },
  { key: 'location', header: 'Local', cell: (item) => <span className="font-mono text-xs">{item.location}</span> },
  { key: 'price', header: 'Valor unit.', numeric: true, cell: (item) => <span className="whitespace-nowrap">{formatPrice(item.unitPriceCents)}</span> },
  { key: 'quantity', header: 'Qtd.', numeric: true, card: 'end', cell: (item) => item.quantity },
]

/**
 * Tells a row's status for the table's tint, from the item's quantity and minimum.
 * @param item Inventory item.
 * @returns The tint and the label read out, or undefined when stock is fine.
 */
function rowStatus(item: Item): { tone: 'warn' | 'danger'; label: string } | undefined {
  const status = stockStatus(item.quantity, item.minQuantity)
  return status ? { tone: status === 'out' ? 'danger' : 'warn', label: STOCK_STATUS_LABELS[status] } : undefined
}

export function InventoryTab() {
  const state = useItems()
  const [search, setSearch] = useState('')
  const items = state.status === 'ready' ? state.items : []
  const shown = items.filter((item) => matchesSearch(item, search))

  return (
    <Panel className="grid min-w-0 gap-3">
      <div className="max-w-xl">
        <SearchField label="Procure pelo nome ou código da peça" value={search} onValueChange={setSearch} />
      </div>
      {state.status === 'ready' && (
        <>
          <p data-testid="inventory-count" className="m-0 font-mono text-xs tabular-nums text-text-muted">
            {resultSummary(shown.length, items)}
          </p>
          <DataTable
            label="Itens do estoque"
            columns={COLUMNS}
            rows={shown}
            rowKey={(item) => item.id}
            rowStatus={rowStatus}
            sort={null}
            onSortChange={() => {}}
            unsortedLabel="Ordem de cadastro"
            empty={
              <Text tone="muted" className="py-6 text-center">
                Nenhum item encontrado.
              </Text>
            }
          />
        </>
      )}
    </Panel>
  )
}

function Coded({ value, name }: { value: string; name: string }) {
  return (
    <span title={name} className={value === NOT_APPLICABLE ? 'text-text-muted' : undefined}>
      {value}
    </span>
  )
}
