/**
 * @format
 */

import React, { useState, type ComponentProps } from 'react';
import { AccessibilityInfo, Animated, Image, StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { pencilIcon, trashIcon } from '@apc/shared/icons';
import { sortRows, type Sort } from '@apc/shared/table';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { DataTable, RowAction, TableThumbnail } from '../src/DataTable';
import { Icon } from '../src/Icon';
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
/** A row of the openable list: an item, or one of its brands under it. */
type Part = { code: string; name: string; brand: boolean };
/** A movement Animated.timing was asked for: its settings and how to end it. */
type Started = { config: Animated.TimingAnimationConfig; end: () => void };

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
 * Reads the boxes the nested rows fade in and out in.
 * @param tree Rendered tree.
 * @returns Each box's opacity as it stands, and whether it is hidden from screen readers and taps.
 */
function fades(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root
    .findAll((node) => node.props.testID === 'common.data-table.table.fade' && typeof node.type === 'string')
    .map((node) => ({ opacity: StyleSheet.flatten(node.props.style).opacity, hidden: node.props.accessibilityElementsHidden === true }));
}

/**
 * Presses the first card, the openable item's.
 * @param tree Rendered tree.
 */
async function pressItem(tree: ReactTestRenderer.ReactTestRenderer) {
  const [card] = tree.root.findAll((node) => node.props.testID === 'common.data-table.table.row' && typeof node.props.onPress === 'function');
  await ReactTestRenderer.act(async () => card.props.onPress());
}

/**
 * Stands in for Animated.timing: each movement waits for the test to end it, which sets its value to its end and calls
 * its callback, as the real one does when it finishes.
 * @returns The movements asked for.
 */
function standInTiming(): Started[] {
  const started: Started[] = [];
  jest.spyOn(Animated, 'timing').mockImplementation((value, config) => {
    const animation = {
      start: (done?: (result: { finished: boolean }) => void) => {
        started.push({
          config,
          end: () => {
            (value as Animated.Value).setValue(config.toValue as number);
            done?.({ finished: true });
          },
        });
      },
      stop: () => {},
      reset: () => {},
    };
    return animation as unknown as Animated.CompositeAnimation;
  });
  return started;
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

afterEach(() => {
  jest.restoreAllMocks();
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

// Shows an edit and a delete action and checks each icon takes its color without a press, the accent and the danger
// color.
test('Mobile: row actions take their colors at rest', async () => {
  const { colors } = themes.eighties.night;
  const tree = await mount(
    'eighties',
    'night',
    <>
      <RowAction icon={pencilIcon} label="Editar Amortecedor" onPress={() => {}} />
      <RowAction icon={trashIcon} label="Excluir Amortecedor" tone="danger" onPress={() => {}} />
    </>,
  );
  expect(tree.root.findAllByType(Icon).map((icon) => icon.props.color)).toEqual([colors.accent, colors.danger]);
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

// Opens an item of two brands with the phone's motion on, and checks its brands fade in from transparent in the motion
// token; closing it keeps them in place, fading out, hidden from screen readers and taps, until their fade ends.
test('Mobile: a row opening and closing fades its nested rows in and out', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const started = standInTiming();
  const tree = await mount('eighties', 'night', <Openable />);
  await pressItem(tree);
  expect(texts(tree)).toEqual(['Cabo de embreagem', 'Cofap', 'Bosch', 'Pastilha de freio']);
  expect(fades(tree)).toEqual([
    { opacity: 0, hidden: false },
    { opacity: 0, hidden: false },
  ]);
  expect(started.map(({ config }) => [config.toValue, config.duration])).toEqual([
    [1, scales.motion.durationMs],
    [1, scales.motion.durationMs],
  ]);
  await ReactTestRenderer.act(async () => started.splice(0).forEach(({ end }) => end()));
  expect(fades(tree).map(({ opacity }) => opacity)).toEqual([1, 1]);

  await pressItem(tree);
  expect(texts(tree)).toHaveLength(4);
  expect(fades(tree).map(({ hidden }) => hidden)).toEqual([true, true]);
  expect(started.map(({ config }) => config.toValue)).toEqual([0, 0]);
  await ReactTestRenderer.act(async () => started.splice(0).forEach(({ end }) => end()));
  expect(texts(tree)).toEqual(['Cabo de embreagem', 'Pastilha de freio']);
});

// Opens and closes the item with reduced motion, as every test starts, and checks its brands go at once.
test('Mobile: with reduced motion nested rows go at once', async () => {
  const tree = await mount('eighties', 'night', <Openable />);
  await pressItem(tree);
  expect(texts(tree)).toHaveLength(4);
  await pressItem(tree);
  expect(texts(tree)).toEqual(['Cabo de embreagem', 'Pastilha de freio']);
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

function Openable() {
  const [open, setOpen] = useState(false);
  const item = { code: 'CB-4500', name: 'Cabo de embreagem', brand: false };
  const brands = [
    { code: 'CB-4500/cofap', name: 'Cofap', brand: true },
    { code: 'CB-4500/bosch', name: 'Bosch', brand: true },
  ];
  return (
    <DataTable<Part>
      label="Itens do estoque"
      rows={[item, ...(open ? brands : []), { code: 'FR-0142', name: 'Pastilha de freio', brand: false }]}
      rowKey={(part) => part.code}
      rowNested={(part) => part.brand}
      rowExpanded={(part) => (part === item ? open : undefined)}
      onRowOpen={(part) => part === item && setOpen(!open)}
      sort={null}
      onSortChange={() => {}}
      unsortedLabel="Ordem de cadastro"
      empty={null}
      columns={[{ key: 'name', header: 'Item', card: 'main', cell: (part) => <Text>{part.name}</Text> }]}
    />
  );
}
