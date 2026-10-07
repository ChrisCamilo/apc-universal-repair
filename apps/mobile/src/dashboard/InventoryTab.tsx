import { useState, type ComponentProps } from 'react';
import { View, type ViewStyle } from 'react-native';
import { pencilIcon } from '@apc/shared/icons';
import { itemDetails, matchesSearch, resultSummary, STOCK_STATUS_LABELS, stockStatus, type Item } from '@apc/shared/items';
import { scales } from '@apc/shared/theme';
import { Button } from '../Button';
import { DataTable, RowAction, TableThumbnail } from '../DataTable';
import { ItemFormDialog } from '../inventory/ItemFormDialog';
import { useItems } from '../inventory/useItems';
import { Panel } from '../Panel';
import { SearchField } from '../TextField';
import { NumericReadout, Text } from '../Typography';

// The Inventory tab, the same as the web: every item as a card, a search by name or part code, and a counter
// of the items shown, the total and the stock alerts. Low and out-of-stock cards are tinted by the table.
// "Novo item" and each card's pencil open the item form, and the list loads again once an item is saved.

const COLUMNS: ComponentProps<typeof DataTable<Item>>['columns'] = [
  { key: 'photo', header: 'Foto', card: 'thumb', cell: (item) => <TableThumbnail label={`Foto de ${item.name}`} /> },
  {
    key: 'name',
    header: 'Item',
    card: 'main',
    cell: (item) => (
      <View>
        <Text>{item.name}</Text>
        <NumericReadout tone="muted">{item.code}</NumericReadout>
        <Text size="sm" tone="muted">
          {itemDetails(item)}
        </Text>
      </View>
    ),
  },
  { key: 'quantity', header: 'Qtd.', numeric: true, card: 'end', cell: (item) => <NumericReadout>{item.quantity}</NumericReadout> },
];
const TAB_STYLE: ViewStyle = { gap: scales.space.s3 };

/**
 * Builds the column of each card's actions: the pencil that opens the item to edit.
 * @param onEdit Opens an item in the item form.
 * @returns The actions column.
 */
function actionsColumn(onEdit: (item: Item) => void): ComponentProps<typeof DataTable<Item>>['columns'][number] {
  return {
    key: 'actions',
    header: 'Ações',
    card: 'actions',
    cell: (item) => <RowAction icon={pencilIcon} label={`Editar ${item.name}`} onPress={() => onEdit(item)} />,
  };
}

/**
 * Tells a card's status for the table's tint, from the item's quantity and minimum.
 * @param item Inventory item.
 * @returns The tint and the label read out, or undefined when stock is fine.
 */
function rowStatus(item: Item): { tone: 'warn' | 'danger'; label: string } | undefined {
  const status = stockStatus(item.quantity, item.minQuantity);
  return status ? { tone: status === 'out' ? 'danger' : 'warn', label: STOCK_STATUS_LABELS[status] } : undefined;
}

export function InventoryTab() {
  const state = useItems();
  const [search, setSearch] = useState('');
  // The item form: closed, open on a new item, or open on an item to edit. Each opening starts a new form.
  const [form, setForm] = useState<{ open: boolean; item?: Item; session: number }>({ open: false, session: 0 });
  const items = state.status === 'ready' ? state.items : [];
  const shown = items.filter((item) => matchesSearch(item, search));

  /** Opens the item form on a new item, or on an item to edit. */
  const openForm = (item?: Item) => setForm((current) => ({ open: true, item, session: current.session + 1 }));

  return (
    <Panel>
      <View style={TAB_STYLE}>
        <SearchField label="Procure pelo nome ou código da peça" value={search} onValueChange={setSearch} />
        <Button onPress={() => openForm()}>Novo item</Button>
        {state.status === 'ready' && (
          <>
            <NumericReadout tone="muted">{resultSummary(shown.length, items)}</NumericReadout>
            <DataTable
              label="Itens do estoque"
              columns={[...COLUMNS, actionsColumn(openForm)]}
              rows={shown}
              rowKey={(item) => item.id}
              rowStatus={rowStatus}
              sort={null}
              onSortChange={() => {}}
              unsortedLabel="Ordem de cadastro"
              empty={<Text tone="muted">Nenhum item encontrado.</Text>}
            />
          </>
        )}
      </View>
      <ItemFormDialog
        key={form.session}
        open={form.open}
        item={form.item}
        items={items}
        onClose={() => setForm((current) => ({ ...current, open: false }))}
        onSaved={() => {
          setForm((current) => ({ ...current, open: false }));
          state.reload();
        }}
      />
    </Panel>
  );
}
