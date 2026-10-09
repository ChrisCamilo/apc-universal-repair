/**
 * @format
 */

import React, { useState, type ComponentProps } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { pencilIcon, trashIcon } from '@apc/shared/icons';
import { sortRows, type Sort } from '@apc/shared/table';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { DataTable, RowAction, TableThumbnail } from '../src/DataTable';
import { themeStorage, ThemeProvider, withAlpha } from '../src/theme';

const COLUMNS: ComponentProps<typeof DataTable<Item>>['columns'] = [
  { key: 'name', header: 'Item', sortable: true, card: 'main', cell: (item) => <Text>{item.name}</Text> },
  { key: 'loc', header: 'Local', sortable: true, cell: (item) => <Text>{item.loc}</Text> },
  { key: 'qty', header: 'Qtd.', sortLabel: 'Quantidade', numeric: true, sortable: true, card: 'end', cell: (item) => <Text>{item.qty}</Text> },
];
const ITEMS: Item[] = [
  { code: 'FR-0142', name: 'Pastilha de freio', loc: 'A-10', qty: 12 },
  { code: 'MO-0031', name: 'Junta do cabeçote', loc: 'a-2', qty: 2 },
  { code: 'SU-0007', name: 'Amortecedor', loc: 'B-1', qty: 0 },
];

type Item = { code: string; name: string; loc: string; qty: number };

/**
 * Lists the cards, in order.
 * @param tree Rendered tree.
 * @returns The card test instances.
 */
function cards(tree: ReactTestRenderer.ReactTestRenderer): ReactTestRenderer.ReactTestInstance[] {
  return tree.root.findAll((node) => node.props.testID === 'common.data-table.table.row' && typeof node.type === 'string');
}

/**
 * Saves a style and mode, renders the element inside a ThemeProvider and waits for it to load them.
 * @param style Style to start on.
 * @param mode Mode to start on.
 * @param element Element to render.
 * @returns The rendered tree.
 */
async function mount(style: Style, mode: Mode, element: React.ReactElement) {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  return tree!;
}

/**
 * Presses the pressable with an accessible name or visible text.
 * @param tree Rendered tree.
 * @param name Accessibility label, or the text inside.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  const node = tree.root.find(
    (n) =>
      typeof n.type !== 'string' &&
      typeof n.props.onPress === 'function' &&
      n.props.accessibilityRole !== undefined &&
      (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
  );
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Reads the visible texts of each card, to check the order and the status read out.
 * @param tree Rendered tree.
 * @returns One string per card.
 */
function texts(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return cards(tree).map((card) =>
    card
      .findAllByType(Text)
      .map((t) => [t.props.children].flat().join(''))
      .join('|'),
  );
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders an in-stock, a low and an out-of-stock row in one style and mode and checks the low card takes
    // the soft warn tint and a warn stripe, the out card the danger ones, and the in-stock card neither.
    test(`Mobile: table rows follow the ${style}/${mode} status colors`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode, <Inventory />);
      const [ok, low, out] = cards(tree).map((card) => StyleSheet.flatten(card.props.style));
      expect(ok).toMatchObject({ backgroundColor: 'transparent', borderLeftWidth: 0 });
      expect(low).toMatchObject({ backgroundColor: colors.warn + '26', borderLeftColor: colors.warn, borderLeftWidth: 3 });
      expect(out).toMatchObject({ backgroundColor: colors.danger + '21', borderLeftColor: colors.danger, borderLeftWidth: 3 });
    });
  }
}

// Checks each card shows only its card cells, and the status is read out before the row, in-stock rows
// saying nothing extra.
test('Mobile: cards show their cells and read out the status', async () => {
  const tree = await mount('eighties', 'night', <Inventory />);
  const [ok, low, out] = texts(tree);
  expect(ok).toBe('Pastilha de freio|12');
  expect(low).toBe('Estoque baixo: |Junta do cabeçote|2');
  expect(out).toBe('Esgotado: |Amortecedor|0');
});

// Sorts with the "Ordenar" select, ascending then descending, and checks the cards follow.
test('Mobile: the sort select orders the cards', async () => {
  const tree = await mount('gt4', 'day', <Inventory />);
  await press(tree, 'Ordenar');
  await press(tree, 'Quantidade (menor → maior)');
  expect(texts(tree).map((t) => t.split('|').pop())).toEqual(['0', '2', '12']);
  await press(tree, 'Ordenar');
  await press(tree, 'Local (A → Z)');
  expect(texts(tree).map((t) => t.split('|').pop())).toEqual(['2', '12', '0']);
});

// Shows the empty slot instead of the cards when there are no rows.
test('Mobile: the empty state replaces the cards with no rows', async () => {
  const tree = await mount('eighties', 'day', <Inventory items={[]} />);
  expect(cards(tree)).toHaveLength(0);
  expect(tree.root.findAll((n) => n.props.children === 'Nenhum item encontrado').length).toBeGreaterThan(0);
});

// Runs the thumbnail and row actions by their accessible names, and checks the thumbnail shows the photo
// when there is one and the placeholder otherwise.
test('Mobile: thumbnails and row actions are named buttons', async () => {
  const onOpen = jest.fn();
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  const tree = await mount(
    'eighties',
    'night',
    <>
      <TableThumbnail src="https://fotos.example/amortecedor.jpg" label="Ver foto de Amortecedor" onOpen={onOpen} />
      <TableThumbnail label="Ver foto de Junta" onOpen={() => {}} />
      <RowAction icon={pencilIcon} label="Editar Amortecedor" onPress={onEdit} />
      <RowAction icon={trashIcon} label="Excluir Amortecedor" tone="danger" onPress={onDelete} />
    </>,
  );
  expect(tree.root.findAllByType(Image)).toHaveLength(1);
  await press(tree, 'Ver foto de Amortecedor');
  await press(tree, 'Editar Amortecedor');
  await press(tree, 'Excluir Amortecedor');
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(onEdit).toHaveBeenCalledTimes(1);
  expect(onDelete).toHaveBeenCalledTimes(1);
});

// Opens cards by a tap and checks the tapped row is handed over, a card being pressed takes the raised fill (or the
// stronger tint of its status), and cards aren't pressable when they don't open.
test('Mobile: cards open on a tap, lit while pressed', async () => {
  const { colors } = themes.eighties.night;
  const onRowOpen = jest.fn();
  const tree = await mount('eighties', 'night', <Inventory onRowOpen={onRowOpen} />);
  const pressables = tree.root.findAll(
    (n) => typeof n.type !== 'string' && n.props.testID === 'common.data-table.table.row' && typeof n.props.onPress === 'function',
  );
  expect(pressables).toHaveLength(3);
  await ReactTestRenderer.act(async () => pressables[1].props.onPress());
  expect(onRowOpen).toHaveBeenCalledWith(ITEMS[1]);
  expect(StyleSheet.flatten(pressables[0].props.style({ pressed: true })).backgroundColor).toBe(colors.panelRaised);
  expect(StyleSheet.flatten(pressables[0].props.style({ pressed: false })).backgroundColor).toBe('transparent');
  expect(StyleSheet.flatten(pressables[1].props.style({ pressed: true })).backgroundColor).toBe(withAlpha(colors.warn, scales.statusTint.warnHover));

  const still = await mount('eighties', 'night', <Inventory />);
  expect(still.root.findAll((n) => n.props.testID === 'common.data-table.table.row' && typeof n.props.onPress === 'function')).toHaveLength(0);
});

function Inventory({ items = ITEMS, onRowOpen }: { items?: Item[]; onRowOpen?: (item: Item) => void }) {
  const [sort, setSort] = useState<Sort | null>(null);
  const sorted = sort ? sortRows(items, (item) => item[sort.key as keyof Item], sort.dir) : items;
  return (
    <DataTable
      label="Itens do estoque"
      rows={sorted}
      rowKey={(item) => item.code}
      rowStatus={(item) =>
        item.qty === 0 ? { tone: 'danger', label: 'Esgotado' } : item.qty <= 2 ? { tone: 'warn', label: 'Estoque baixo' } : undefined
      }
      sort={sort}
      onSortChange={setSort}
      unsortedLabel="Ordem de cadastro"
      empty={<Text>Nenhum item encontrado</Text>}
      columns={COLUMNS}
      onRowOpen={onRowOpen}
    />
  );
}
