import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH, MIN_TOUCH_TARGET } from '@apc/shared/screens';
import { scales, THEME_STORAGE_KEYS } from '@apc/shared/theme';
import { Button } from '../src/Button';
import { BackButton } from '../src/BackButton';
import { CloseButton } from '../src/CloseButton';
import { Combobox } from '../src/Combobox';
import { FilterChip } from '../src/FilterChip';
import { Menu, MenuItem } from '../src/Menu';
import { Segmented } from '../src/Segmented';
import { Select } from '../src/Select';
import { TextField } from '../src/TextField';
import { themeStorage, ThemeProvider } from '../src/theme';

/** The trees each test renders, unmounted after it. */
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
/** The options of the select and the segmented choice under test. */
const OPTIONS = [
  { value: 'freios', label: 'Freios' },
  { value: 'motor', label: 'Motor' },
];
/** A 360×780 phone with no notch. */
const SAFE_AREA = { frame: { x: 0, y: 0, width: MIN_MOBILE_WIDTH, height: MIN_MOBILE_HEIGHT }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
});

/**
 * Renders one of each control inside the app's providers and waits for the theme to load.
 * @returns The rendered tree.
 */
async function mount() {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: 'eighties', [THEME_STORAGE_KEYS.mode]: 'night' });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <Button onPress={() => {}}>Salvar</Button>
          <Button size="sm" variant="secondary" onPress={() => {}}>
            Cancelar
          </Button>
          <Button variant="link" onPress={() => {}}>
            Esqueceu a senha?
          </Button>
          <BackButton label="Voltar" onPress={() => {}} />
          <CloseButton onPress={() => {}} />
          <FilterChip pressed={false} onPressedChange={() => {}}>
            Esgotado
          </FilterChip>
          <Segmented label="Posição" options={OPTIONS} value="freios" onValueChange={() => {}} />
          <TextField label="Senha" kind="password" value="" onValueChange={() => {}} />
          <Combobox
            label="Categoria"
            value=""
            onValueChange={() => {}}
            options={['Freios']}
            onCreate={() => {}}
            noun="categoria"
            toggleLabel="Mostrar categorias"
            emptyLabel="Nenhuma"
          />
          <Select label="Ordenar" options={OPTIONS} value="freios" onValueChange={() => {}} />
          <Menu label="Menu do usuário" trigger={<Text>CC</Text>}>
            <MenuItem onSelect={() => {}}>Sair</MenuItem>
          </Menu>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  return tree!;
}

/**
 * Presses the control with an accessible name.
 * @param tree The rendered tree.
 * @param label The control's accessible name.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  const control = tree.root.find((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
  await ReactTestRenderer.act(async () => control.props.onPress());
}

/**
 * Reads the flattened style of an element with a style id.
 * @param tree The rendered tree.
 * @param id The element's style id.
 * @param index Which of the elements with that id, in the order they render; the first by default.
 * @returns Its style.
 */
function styleOf(tree: ReactTestRenderer.ReactTestRenderer, id: string, index = 0) {
  const nodes = tree.root.findAll((node) => node.props.testID === id && typeof node.type === 'string');
  return StyleSheet.flatten(nodes[index].props.style);
}

// Renders every control a finger reaches and checks each is as tall as a phone asks: 52px for a button, a field and a
// select, 44px for a small button, the back arrow, the ×, a chip, a field's end button and the menu's trigger, 40px
// for a segmented option in its 48px track, and 56px for a list's or a menu's row. A link stays at its text's height.
test('Mobile: every control is tall enough for a finger', async () => {
  const tree = await mount();
  expect(styleOf(tree, 'common.button', 0).minHeight).toBe(scales.touch.button);
  expect(styleOf(tree, 'common.button', 1).minHeight).toBe(scales.touch.buttonSm);
  expect(styleOf(tree, 'common.button', 2).minHeight).toBe(0);
  expect(styleOf(tree, 'common.back-button')).toMatchObject({ width: scales.touch.icon, height: scales.touch.icon });
  expect(styleOf(tree, 'common.close-button')).toMatchObject({ width: scales.touch.icon, height: scales.touch.icon });
  expect(styleOf(tree, 'common.filter-chip').minHeight).toBe(scales.touch.icon);
  expect(styleOf(tree, 'common.segmented.option').minHeight).toBe(scales.touch.segment);
  expect(styleOf(tree, 'common.segmented').padding).toBe(scales.space.s1);
  expect(styleOf(tree, 'common.text-field.frame').minHeight).toBe(scales.touch.field);
  expect(styleOf(tree, 'common.text-field.frame.toggle')).toMatchObject({ width: scales.touch.icon, height: scales.touch.icon });
  expect(styleOf(tree, 'common.combobox.frame').minHeight).toBe(scales.touch.field);
  expect(styleOf(tree, 'common.combobox.frame.toggle')).toMatchObject({ width: scales.touch.icon, height: scales.touch.icon });
  expect(styleOf(tree, 'common.select.button').minHeight).toBe(scales.touch.field);
  expect(styleOf(tree, 'common.menu.trigger').minHeight).toBe(MIN_TOUCH_TARGET);

  await press(tree, 'Ordenar');
  expect(styleOf(tree, 'common.select.list.option').height).toBe(scales.touch.row);
  expect(styleOf(tree, 'common.select.button.text').fontSize).toBe(scales.fontSize.base);
  await press(tree, 'Ordenar');
  await press(tree, 'Menu do usuário');
  expect(styleOf(tree, 'common.menu-item').minHeight).toBe(scales.touch.row);
});

// Checks a field's end button reaches into the frame's padding, so the frame stays 52px around a 44px button.
test('Mobile: a field keeps its height around its 44px end button', async () => {
  const tree = await mount();
  const frame = styleOf(tree, 'common.text-field.frame');
  const toggle = styleOf(tree, 'common.text-field.frame.toggle');
  const reach = scales.touch.icon + 2 * (toggle.marginVertical as number);
  expect(reach).toBeLessThanOrEqual(scales.touch.field - 2 * (frame.paddingVertical as number) - 2 * scales.hairline);
});
