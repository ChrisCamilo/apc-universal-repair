import { useState, type ComponentProps } from 'react'
import { pencilIcon, trashIcon } from '@apc/shared/icons'
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
import { Button } from '../components/Button.tsx'
import { DataTable, RowAction, TableThumbnail, TableTitle } from '../components/DataTable.tsx'
import { Panel } from '../components/Panel.tsx'
import { SearchField } from '../components/TextField.tsx'
import { Text } from '../components/Typography.tsx'
import { DeleteItemDialog } from '../inventory/DeleteItemDialog.tsx'
import { ItemFormDialog } from '../inventory/ItemFormDialog.tsx'
import { useItems } from '../inventory/useItems.ts'

// The Inventory tab (/inventory), the default tab: every item in the DataTable, a search by name or part code, and
// a counter of the items shown, the total and the stock alerts. "Novo item" and each row's pencil open the item
// form, each row's trash asks to confirm deleting the item, and the list loads again once an item is saved or
// deleted. Low and out-of-stock rows are tinted by the table. At phone width the row becomes a card and the
// columns that leave it show as one line under the name.

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
    cell: (item) => <TableTitle title={item.name} code={item.code} details={itemDetails(item)} />,
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
  // The item form: closed, open on a new item, or open on an item to edit. Each opening starts a new form.
  const [form, setForm] = useState<{ open: boolean; item?: Item; session: number }>({ open: false, session: 0 })
  // The item the delete confirmation asks about, while it is open.
  const [removing, setRemoving] = useState<Item>()
  const items = state.status === 'ready' ? state.items : []
  const shown = items.filter((item) => matchesSearch(item, search))

  /** Opens the item form on a new item, or on an item to edit. */
  const openForm = (item?: Item) => setForm((current) => ({ open: true, item, session: current.session + 1 }))

  return (
    <Panel className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-[1_1_calc(var(--spacing)*64)] sm:max-w-xl">
          <SearchField label="Procure pelo nome ou código da peça" value={search} onValueChange={setSearch} />
        </div>
        <Button onClick={() => openForm()}>Novo item</Button>
      </div>
      {state.status === 'ready' && (
        <>
          <p data-testid="inventory-count" className="m-0 font-mono text-xs tabular-nums text-text-muted">
            {resultSummary(shown.length, items)}
          </p>
          <DataTable
            label="Itens do estoque"
            columns={[
              ...COLUMNS,
              {
                key: 'actions',
                header: 'Ações',
                headerHidden: true,
                numeric: true,
                card: 'actions',
                cell: (item) => (
                  <span className="inline-flex gap-0.5">
                    <RowAction icon={pencilIcon} label={`Editar ${item.name}`} onClick={() => openForm(item)} />
                    <RowAction
                      icon={trashIcon}
                      label={`Excluir ${item.name}`}
                      tone="danger"
                      onClick={() => setRemoving(item)}
                    />
                  </span>
                ),
              },
            ]}
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
      <ItemFormDialog
        key={form.session}
        open={form.open}
        item={form.item}
        items={items}
        onClose={() => setForm((current) => ({ ...current, open: false }))}
        onSaved={() => {
          setForm((current) => ({ ...current, open: false }))
          state.reload()
        }}
      />
      <DeleteItemDialog
        open={removing !== undefined}
        item={removing}
        onClose={() => setRemoving(undefined)}
        onDeleted={() => {
          setRemoving(undefined)
          state.reload()
        }}
      />
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
