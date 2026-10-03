import { useState, type ComponentProps } from 'react';
import { View, type ViewStyle } from 'react-native';
import { itemDetails, matchesSearch, resultSummary, STOCK_STATUS_LABELS, stockStatus, type Item } from '@apc/shared/items';
import { scales } from '@apc/shared/theme';
import { DataTable, TableThumbnail } from '../DataTable';
import { useItems } from '../inventory/useItems';
import { Panel } from '../Panel';
import { SearchField } from '../TextField';
import { NumericReadout, Text } from '../Typography';

// The Inventory tab, the same as the web: every item as a card, a search by name or part code, and a counter
// of the items shown, the total and the stock alerts. Low and out-of-stock cards are tinted by the table.

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
  const items = state.status === 'ready' ? state.items : [];
  const shown = items.filter((item) => matchesSearch(item, search));

  return (
    <Panel>
      <View style={TAB_STYLE}>
        <SearchField label="Procure pelo nome ou código da peça" value={search} onValueChange={setSearch} />
        {state.status === 'ready' && (
          <>
            <NumericReadout tone="muted">{resultSummary(shown.length, items)}</NumericReadout>
            <DataTable
              label="Itens do estoque"
              columns={COLUMNS}
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
    </Panel>
  );
}
