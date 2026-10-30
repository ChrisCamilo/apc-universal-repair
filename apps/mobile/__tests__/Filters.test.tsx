/**
 * @format
 */

import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { SELECT_VISIBLE_OPTIONS, type FilterValues } from '@apc/shared/filters';
import { filterIcon, sortIcon } from '@apc/shared/icons';
import { MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens';
import { sortValue, type Sort } from '@apc/shared/table';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { FilterChip, FilterChipGroup } from '../src/FilterChip';
import { ClearFilters, FilterMenu } from '../src/FilterMenu';
import { FilterSheet, SortSheet } from '../src/FilterSheet';
import { Select } from '../src/Select';
import { withAlpha } from '../src/theme';
import { themeStorage, ThemeProvider } from '../src/theme';
import { ToolButton } from '../src/ToolButton';

const CATEGORIES = ['Arrefecimento', 'Elétrica', 'Freios', 'Ignição', 'Motor', 'Suspensão', 'Transmissão'].map(
  (label) => ({ value: label, label }),
);
// Vehicle models by brand, for rows that depend on the choice.
const MODELS: Record<string, string[]> = { Chevrolet: ['Chevette', 'Opala'], Fiat: ['Uno'] };
const NO_FILTERS: FilterValues = { cat: [], pos: [] };
const ROWS = [
  { key: 'cat', label: 'Categoria', allLabel: 'Todas', options: CATEGORIES.slice(0, 3) },
  {
    label: 'Posição',
    groups: [{ key: 'pos', label: 'Posição', options: [{ value: 'D', label: 'D' }, { value: 'T', label: 'T' }] }],
  },
];
const SHEET_FILTERS: FilterValues = { cat: [], brand: [], model: [], pos: [] };
const SORTS = [
  { value: '', label: 'Ordem de cadastro' },
  { value: 'location:asc', label: 'Local (A → Z)' },
  { value: 'location:desc', label: 'Local (Z → A)' },
];
// A phone's screen with no notch, for the sheets' footers.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MIN_MOBILE_WIDTH, height: MIN_MOBILE_HEIGHT }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

/**
 * Lays out the filter sheet's rows for what is chosen: a category, the vehicle brands, their models, and the position
 * as segments.
 * @param draft Values chosen so far.
 * @returns The rows.
 */
function sheetRows(draft: FilterValues) {
  const options = (values: string[]) => values.map((value) => ({ value, label: value }));
  const brands = draft.brand?.length ? draft.brand : Object.keys(MODELS);
  return [
    { key: 'cat', label: 'Categoria', allLabel: 'Todas', options: CATEGORIES.slice(2, 5) },
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
  ];
}

/**
 * Renders a bottom sheet's owner on a phone's screen in the eighties night theme.
 * @param element Element to render.
 * @returns The rendered tree.
 */
async function mountSheet(element: React.ReactElement) {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: 'eighties', [THEME_STORAGE_KEYS.mode]: 'night' });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>{element}</ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  return tree!;
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
 * Presses a node through its onPress handler.
 * @param node Pressable test instance.
 */
async function press(node: ReactTestRenderer.ReactTestInstance) {
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Finds the pressable whose accessible name or visible text matches.
 * @param tree Rendered tree.
 * @param name Accessibility label, or the text inside.
 * @returns The Pressable test instance.
 */
function pressable(tree: ReactTestRenderer.ReactTestRenderer, name: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find(
    (node) =>
      typeof node.type !== 'string' &&
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityRole !== undefined &&
      (node.props.accessibilityLabel === name ||
        node.findAll((child) => child.type === Text && child.props.children === name).length > 0),
  );
}

/**
 * Resolves a Pressable's style, which may be a function of the press state.
 * @param node Pressable test instance.
 * @param pressed Whether it is being pressed.
 * @returns The style object.
 */
function styleOf(node: ReactTestRenderer.ReactTestInstance, pressed = false) {
  const { style } = node.props;
  return StyleSheet.flatten(typeof style === 'function' ? style({ pressed }) : style);
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders a select with a choice and a chip on in one style and mode, and checks the accent frame of the
    // select, and the accent border and soft accent fill of the chip next to a muted one.
    test(`Mobile: filters follow the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(
        style,
        mode,
        <>
          <Select label="Categoria" multiple allLabel="Todas" options={CATEGORIES} value={['Freios']} onValueChange={() => {}} />
          <FilterChip pressed onPressedChange={() => {}}>Estoque baixo</FilterChip>
          <FilterChip pressed={false} onPressedChange={() => {}}>Esgotado</FilterChip>
        </>,
      );
      expect(styleOf(pressable(tree, 'Categoria')).borderColor).toBe(colors.accent);
      expect(styleOf(pressable(tree, 'Estoque baixo'))).toMatchObject({
        borderColor: colors.accent,
        backgroundColor: withAlpha(colors.accent, scales.accentSoft[mode]),
      });
      expect(styleOf(pressable(tree, 'Esgotado')).backgroundColor).toBe('transparent');
    });
  }
}

// Opens a multiple choice, picks two options and checks the list stays open with at most five rows of room,
// the button shows "Freios +1" and reads out the full list, and "Todas" clears it.
test('Mobile: multiple selects summarize the choice and "All" clears it', async () => {
  const tree = await mount('eighties', 'night', <Multiple />);
  const button = () => pressable(tree, 'Categoria');
  await press(button());
  expect(button().props.accessibilityState).toMatchObject({ expanded: true });
  const list = tree.root.findByType(ScrollView);
  const optionHeight = scales.touch.row;
  expect(Math.floor(list.props.style.maxHeight / optionHeight)).toBe(SELECT_VISIBLE_OPTIONS);

  await press(pressable(tree, 'Motor'));
  await press(pressable(tree, 'Freios'));
  expect(button().props.accessibilityState).toMatchObject({ expanded: true });
  expect(pressable(tree, 'Freios').props.accessibilityState).toEqual({ checked: true });
  expect(button().findAllByType(Text)[0].props.children).toBe('Freios +1');
  expect(button().props.accessibilityValue).toEqual({ text: 'Freios, Motor' });

  await press(pressable(tree, 'Todas'));
  expect(button().findAllByType(Text)[0].props.children).toBe('Todas');
});

// Picks in a single choice and checks it takes the value and closes.
test('Mobile: single selects take one value and close', async () => {
  const tree = await mount('gt4', 'day', <Single />);
  await press(pressable(tree, 'Ordenar'));
  await press(pressable(tree, 'Preço'));
  expect(pressable(tree, 'Ordenar').props.accessibilityValue).toEqual({ text: 'Preço' });
  expect(tree.root.findAllByType(ScrollView)).toHaveLength(0);
});

// Turns a status chip on, switches to the other, then presses the one that is on and checks the group ends
// with none selected; in a multiple group both chips stay on.
test('Mobile: chips switch in single groups and add up in multiple ones', async () => {
  const tree = await mount('eighties', 'day', <Chips />);
  await press(pressable(tree, 'Estoque baixo'));
  await press(pressable(tree, 'Esgotado'));
  expect(pressable(tree, 'Estoque baixo').props.accessibilityState).toEqual({ checked: false });
  expect(pressable(tree, 'Esgotado').props.accessibilityState).toEqual({ checked: true });
  await press(pressable(tree, 'Esgotado'));
  expect(pressable(tree, 'Esgotado').props.accessibilityState).toEqual({ checked: false });

  await press(pressable(tree, 'Dianteiro'));
  await press(pressable(tree, 'Traseiro'));
  expect(pressable(tree, 'Dianteiro').props.accessibilityState).toEqual({ checked: true });
  expect(pressable(tree, 'Traseiro').props.accessibilityState).toEqual({ checked: true });
});

// Makes changes in the panel and checks nothing applies until Apply, which applies them, closes the panel
// and makes the button count the filters on.
test('Mobile: filter changes apply only on Apply', async () => {
  const onApply = jest.fn();
  const tree = await mount('eighties', 'night', <Menu onApplied={onApply} />);
  await press(pressable(tree, 'Filtros'));
  expect(tree.root.findByType(Modal).props.visible).toBe(true);

  await press(pressable(tree, 'Categoria'));
  await press(pressable(tree, 'Freios'));
  await press(pressable(tree, 'D'));
  expect(onApply).not.toHaveBeenCalled();

  await press(pressable(tree, 'Aplicar'));
  expect(onApply).toHaveBeenCalledWith({ cat: ['Freios'], pos: ['D'] });
  expect(tree.root.findByType(Modal).props.visible).toBe(false);
  expect(pressable(tree, 'Filtros, 2 ativos')).toBeTruthy();
});

// Makes a change, then closes with the back button and with a tap outside, and checks neither applies it;
// Clear resets every row and applies right away.
test('Mobile: back and a tap outside close without applying; Clear applies', async () => {
  const onApply = jest.fn();
  const tree = await mount('gt4', 'night', <Menu onApplied={onApply} initial={{ cat: ['Freios'], pos: [] }} />);
  await press(pressable(tree, 'Filtros, 1 ativo'));
  await press(pressable(tree, 'T'));
  await ReactTestRenderer.act(async () => tree.root.findByType(Modal).props.onRequestClose());
  expect(tree.root.findByType(Modal).props.visible).toBe(false);

  await press(pressable(tree, 'Filtros, 1 ativo'));
  expect(pressable(tree, 'T').props.accessibilityState).toEqual({ checked: false });
  await press(pressable(tree, 'Fechar filtros'));
  expect(onApply).not.toHaveBeenCalled();

  await press(pressable(tree, 'Filtros, 1 ativo'));
  await press(pressable(tree, 'Limpar'));
  expect(onApply).toHaveBeenCalledWith(NO_FILTERS);
  expect(pressable(tree, 'Filtros')).toBeTruthy();
});

// Picks two brands and a model of each with rows that list only the chosen brands' models, then unchecks one brand,
// and checks its model leaves the choice and the list, and Apply sends what is left.
test('Mobile: rows that depend on the choice drop what they stop offering', async () => {
  const onApply = jest.fn();
  const brandRows = (draft: FilterValues) => {
    const brands = draft.brand?.length ? draft.brand : Object.keys(MODELS);
    const options = (values: string[]) => values.map((value) => ({ value, label: value }));
    return [
      { key: 'brand', label: 'Marca', allLabel: 'Todas', options: options(Object.keys(MODELS)) },
      { key: 'model', label: 'Modelo', allLabel: 'Todos', options: options(brands.flatMap((brand) => MODELS[brand])) },
    ];
  };
  const tree = await mount(
    'fiat90',
    'night',
    <FilterMenu label="Filtros" title="Filtrar" rows={brandRows} values={{ brand: [], model: [] }} onApply={onApply} />,
  );
  // Each list opens and closes on its own button.
  const pick = async (list: string, options: string[]) => {
    await press(pressable(tree, list));
    for (const option of options) {
      await press(pressable(tree, option));
    }
    await press(pressable(tree, list));
  };
  await press(pressable(tree, 'Filtros'));
  await pick('Marca', ['Chevrolet', 'Fiat']);
  await pick('Modelo', ['Opala', 'Uno']);
  await pick('Marca', ['Fiat']);
  await press(pressable(tree, 'Modelo'));
  expect(tree.root.findAll((node) => node.type === Text && node.props.children === 'Uno')).toHaveLength(0);
  await press(pressable(tree, 'Aplicar'));
  expect(onApply).toHaveBeenCalledWith({ brand: ['Chevrolet'], model: ['Opala'] });
});

// Opens the filter sheet and checks its rows name what each has chosen, "Ordenar por" first; a row opens its options
// inside the sheet, "Todas" first and checked, and picks add up while "Ver n itens" counts them. The back button goes
// back to the rows, where the row names its choice in the accent, then closes the sheet without applying; "Ver n
// itens" applies the filters, a segment and a sort chosen in the sheet together.
test('Mobile: the filter sheet opens each filter as a list and applies on "Ver n itens"', async () => {
  const onApply = jest.fn();
  const tree = await mountSheet(<Sheet onApplied={onApply} />);
  const modal = () => tree.root.findAllByType(Modal).find((each) => each.props.visible);
  const back = async () => ReactTestRenderer.act(async () => modal()!.props.onRequestClose());
  await press(pressable(tree, 'Filtros'));
  expect(pressable(tree, 'Ordenar por, Ordem de cadastro')).toBeTruthy();
  await press(pressable(tree, 'Categoria, Todas'));
  expect(pressable(tree, 'Todas').props.accessibilityState).toEqual({ checked: true });
  await press(pressable(tree, 'Freios'));
  await press(pressable(tree, 'Motor'));
  expect(pressable(tree, 'Todas').props.accessibilityState).toEqual({ checked: false });
  expect(pressable(tree, 'Ver 5 itens')).toBeTruthy();
  await back();
  const category = pressable(tree, 'Categoria, Freios +1');
  const value = category.findAll((node) => node.props.testID === 'common.filter-sheet.row.value' && typeof node.type === 'string')[0];
  expect(StyleSheet.flatten(value.props.style).color).toBe(themes.eighties.night.colors.accent);

  await press(pressable(tree, 'Dianteira'));
  await press(pressable(tree, 'Ordenar por, Ordem de cadastro'));
  await press(pressable(tree, 'Local (Z → A)'));
  expect(pressable(tree, 'Ordenar por, Local (Z → A)')).toBeTruthy();
  expect(onApply).not.toHaveBeenCalled();
  await press(pressable(tree, 'Ver 3 itens'));
  expect(onApply).toHaveBeenCalledWith({ ...SHEET_FILTERS, cat: ['Freios', 'Motor'], pos: ['D'] }, { key: 'location', dir: 'desc' });
  expect(modal()).toBeUndefined();
  expect(pressable(tree, 'Filtros, 2 ativos')).toBeTruthy();

  await press(pressable(tree, 'Filtros, 2 ativos'));
  await press(pressable(tree, 'Limpar'));
  expect(pressable(tree, 'Ordenar por, Ordem de cadastro')).toBeTruthy();
  expect(pressable(tree, 'Ver 9 itens')).toBeTruthy();
  await back();
  expect(modal()).toBeUndefined();
  expect(onApply).toHaveBeenCalledTimes(1);
});

// Chooses two vehicle brands and a model of each, then takes one brand off: its model leaves the choice, and the
// models' list offers only the brand left.
test('Mobile: filter sheet rows that depend on the choice drop what they stop offering', async () => {
  const onApply = jest.fn();
  const tree = await mountSheet(<Sheet onApplied={onApply} />);
  const back = async () => ReactTestRenderer.act(async () => tree.root.findAllByType(Modal).find((each) => each.props.visible)!.props.onRequestClose());
  const pick = async (row: string, options: string[]) => {
    await press(pressable(tree, row));
    for (const option of options) {
      await press(pressable(tree, option));
    }
    await back();
  };
  await press(pressable(tree, 'Filtros'));
  await pick('Marca do veículo, Todas', ['Chevrolet', 'Fiat']);
  await pick('Modelo do veículo, Todos', ['Opala', 'Uno']);
  await pick('Marca do veículo, Chevrolet +1', ['Fiat']);
  await press(pressable(tree, 'Modelo do veículo, Opala'));
  expect(tree.root.findAll((node) => node.type === Text && node.props.children === 'Uno')).toHaveLength(0);
  await press(pressable(tree, 'Ver 5 itens'));
  expect(onApply).toHaveBeenCalledWith({ ...SHEET_FILTERS, brand: ['Chevrolet'], model: ['Opala'] }, null);
});

// Picks a sort in the sort sheet, which sorts at once and closes; the round Ordenar then names the sort in the accent,
// with its dot, and the sheet opens on it.
test('Mobile: the sort sheet sorts on a pick and closes', async () => {
  const { colors } = themes.eighties.night;
  const tree = await mountSheet(<Sorter />);
  await press(pressable(tree, 'Ordenar'));
  expect(pressable(tree, 'Ordem de cadastro').props.accessibilityState).toEqual({ checked: true });
  await press(pressable(tree, 'Local (A → Z)'));
  expect(tree.root.findAllByType(Modal).some((each) => each.props.visible)).toBe(false);
  const sorted = pressable(tree, 'Ordenar, Local (A → Z)');
  expect(styleOf(sorted)).toMatchObject({ borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, scales.accentSoft.night) });
  expect(sorted.findAll((node) => node.props.testID === 'common.tool-button.dot' && typeof node.type === 'string')).toHaveLength(1);
  await press(sorted);
  expect(pressable(tree, 'Local (A → Z)').props.accessibilityState).toEqual({ checked: true });
});

// Checks "Limpar filtros" shows only while a filter is on.
test('Mobile: the clear filters link shows only with a filter on', async () => {
  const off = await mount('eighties', 'night', <ClearFilters active={false} onClear={() => {}} />);
  expect(off.root.findAll((node) => node.props.children === 'Limpar filtros')).toHaveLength(0);
  const onClear = jest.fn();
  const on = await mount('eighties', 'night', <ClearFilters active onClear={onClear} />);
  await press(pressable(on, 'Limpar filtros'));
  expect(onClear).toHaveBeenCalledTimes(1);
});

function Chips() {
  const [status, setStatus] = useState<string | null>(null);
  const [positions, setPositions] = useState<string[]>([]);
  return (
    <>
      <FilterChipGroup
        label="Situação do estoque"
        options={[
          { value: 'low', label: 'Estoque baixo' },
          { value: 'out', label: 'Esgotado' },
        ]}
        value={status}
        onValueChange={setStatus}
      />
      <FilterChipGroup
        multiple
        size="sm"
        label="Posição"
        options={[
          { value: 'D', label: 'D', title: 'Dianteiro' },
          { value: 'T', label: 'T', title: 'Traseiro' },
        ]}
        value={positions}
        onValueChange={setPositions}
      />
    </>
  );
}

function Menu({ initial = NO_FILTERS, onApplied }: { initial?: FilterValues; onApplied: (values: FilterValues) => void }) {
  const [values, setValues] = useState(initial);
  return (
    <FilterMenu
      label="Filtros do estoque"
      title="Filtrar estoque"
      rows={ROWS}
      values={values}
      onApply={(next) => {
        setValues(next);
        onApplied(next);
      }}
    />
  );
}

function Sheet({ onApplied }: { onApplied: (values: FilterValues, sort: Sort | null) => void }) {
  const [values, setValues] = useState(SHEET_FILTERS);
  const [sort, setSort] = useState<Sort | null>(null);
  const [open, setOpen] = useState(false);
  const on = Object.values(values).filter((chosen) => chosen.length > 0).length;
  return (
    <>
      <ToolButton
        icon={filterIcon}
        label={on ? `Filtros, ${on} ${on === 1 ? 'ativo' : 'ativos'}` : 'Filtros'}
        active={on > 0}
        onPress={() => setOpen(true)}
      />
      <FilterSheet
        open={open}
        onClose={() => setOpen(false)}
        rows={sheetRows}
        values={values}
        sort={sort}
        sortOptions={SORTS}
        // 9 items, 2 fewer for each value chosen.
        count={(draft) => 9 - 2 * Object.values(draft).reduce((sum, chosen) => sum + chosen.length, 0)}
        onApply={(next, nextSort) => {
          setValues(next);
          setSort(nextSort);
          setOpen(false);
          onApplied(next, nextSort);
        }}
      />
    </>
  );
}

function Sorter() {
  const [sort, setSort] = useState<Sort | null>(null);
  const [open, setOpen] = useState(false);
  const label = SORTS.find((option) => option.value === sortValue(sort))?.label;
  return (
    <>
      <ToolButton icon={sortIcon} label={sort ? `Ordenar, ${label}` : 'Ordenar'} active={sort !== null} onPress={() => setOpen(true)} />
      <SortSheet open={open} onClose={() => setOpen(false)} sort={sort} options={SORTS} onSortChange={setSort} />
    </>
  );
}

function Multiple() {
  const [value, setValue] = useState<string[]>([]);
  return <Select label="Categoria" multiple allLabel="Todas" options={CATEGORIES} value={value} onValueChange={setValue} />;
}

function Single() {
  const [value, setValue] = useState('name');
  return (
    <Select
      label="Ordenar"
      options={[
        { value: 'name', label: 'Nome (A–Z)' },
        { value: 'price', label: 'Preço' },
      ]}
      value={value}
      onValueChange={setValue}
    />
  );
}
