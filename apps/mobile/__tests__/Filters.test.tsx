/**
 * @format
 */

import React, { useState } from 'react';
import { Modal, ScrollView, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { SELECT_VISIBLE_OPTIONS, type FilterValues } from '@apc/shared/filters';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { FilterChip, FilterChipGroup } from '../src/FilterChip';
import { ClearFilters, FilterMenu } from '../src/FilterMenu';
import { Select } from '../src/Select';
import { themeStorage, ThemeProvider } from '../src/theme';

const CATEGORIES = ['Arrefecimento', 'Elétrica', 'Freios', 'Ignição', 'Motor', 'Suspensão', 'Transmissão'].map(
  (label) => ({ value: label, label }),
);
const NO_FILTERS: FilterValues = { cat: [], pos: [] };
const ROWS = [
  { key: 'cat', label: 'Categoria', allLabel: 'Todas', options: CATEGORIES.slice(0, 3) },
  {
    label: 'Posição',
    groups: [{ key: 'pos', label: 'Posição', options: [{ value: 'D', label: 'D' }, { value: 'T', label: 'T' }] }],
  },
];

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
  return typeof style === 'function' ? style({ pressed }) : style;
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
        backgroundColor: colors.accent + '21',
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
  const optionHeight = scales.space.s7;
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
