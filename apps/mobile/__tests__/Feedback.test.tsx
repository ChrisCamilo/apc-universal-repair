/**
 * @format
 */

import React from 'react';
import { AccessibilityInfo, StyleSheet, Text, type ViewStyle } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { EmptyState, ErrorState } from '../src/EmptyState';
import { Icon } from '../src/Icon';
import { Skeleton } from '../src/Skeleton';
import { Spinner } from '../src/Spinner';
import { themeStorage, ThemeProvider, withAlpha } from '../src/theme';

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
 * Flattens the style of the host View with a testID.
 * @param tree Rendered tree.
 * @param testID The testID to look for.
 * @returns Every match's style, as one object each.
 */
function stylesOf(tree: ReactTestRenderer.ReactTestRenderer, testID: string): ViewStyle[] {
  return tree.root
    .findAll((n) => n.props.testID === testID && typeof n.type === 'string')
    .map((n) => StyleSheet.flatten(n.props.style) as ViewStyle);
}

beforeEach(async () => {
  await themeStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders an empty state, an error state and a spinner in one style and mode, and checks the empty icon
    // is muted, the error icon is danger, the titles are the text color and the spinner ring is muted.
    test(`Mobile: feedback follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(
        style,
        mode,
        <>
          <EmptyState title="Nenhum item cadastrado" message="Cadastre a primeira peça." />
          <ErrorState title="Não foi possível carregar o estoque" message="Verifique a conexão e tente de novo." />
          <Spinner />
        </>,
      );
      expect(tree.root.findAllByType(Icon).map((icon) => icon.props.color)).toEqual([colors.textMuted, colors.danger]);
      const title = tree.root.findAll((n) => n.type === Text && n.props.children === 'Nenhum item cadastrado')[0];
      expect(StyleSheet.flatten(title.props.style).color).toBe(colors.text);
      expect(stylesOf(tree, 'common.spinner')[0].borderColor).toBe(colors.textMuted);
    });
  }
}

// Renders a spinner with a label and one without, and checks the first is announced as loading and the
// second is hidden; both turn, and with reduced motion they fade instead.
test('Mobile: spinners are announced only with a label and fade with reduced motion', async () => {
  const tree = await mount(
    'eighties',
    'night',
    <>
      <Spinner label="Carregando estoque" />
      <Spinner size="sm" />
    </>,
  );
  const [loud, quiet] = tree.root.findAll((n) => n.props.testID === 'common.spinner' && typeof n.type === 'string');
  expect(loud.props).toMatchObject({ accessibilityRole: 'progressbar', accessibilityLabel: 'Carregando estoque' });
  expect(quiet.props.accessibilityElementsHidden).toBe(true);
  expect(stylesOf(tree, 'common.spinner')[0].transform).toBeDefined();

  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const reduced = await mount('eighties', 'night', <Spinner />);
  const [calm] = stylesOf(reduced, 'common.spinner');
  expect(calm.transform).toBeUndefined();
  expect(calm.opacity).toBeDefined();
});

// Renders a line, a block and a circle and checks each is hidden from screen readers in its shape and the
// soft hairline fill: a full-width 12px line, the block's size, a circle as tall as it is wide.
test('Mobile: skeletons take their shape', async () => {
  const tree = await mount(
    'gt4',
    'day',
    <>
      <Skeleton />
      <Skeleton shape="block" width={120} height={80} />
      <Skeleton shape="circle" width={24} />
    </>,
  );
  const [line, block, circle] = stylesOf(tree, 'common.skeleton');
  const fill = withAlpha(themes.gt4.day.colors.hairline, scales.hairlineSoft);
  expect(line).toMatchObject({ width: '100%', height: 12, backgroundColor: fill });
  expect(block).toMatchObject({ width: 120, height: 80, borderRadius: themes.gt4.day.radiusTile });
  expect(circle).toMatchObject({ width: 24, height: 24 });
  const hidden = tree.root.findAll((n) => n.props.testID === 'common.skeleton' && typeof n.type === 'string' && n.props.accessibilityElementsHidden);
  expect(hidden).toHaveLength(3);
});

// Renders an empty state with an action and an error state with one, and checks only the error is an alert
// and both actions run.
test('Mobile: empty and error states say what happened and offer an action', async () => {
  const onAdd = jest.fn();
  const onRetry = jest.fn();
  const tree = await mount(
    'fiat90',
    'night',
    <>
      <EmptyState title="Nenhum item cadastrado" message="Cadastre a primeira peça." action={{ label: 'Adicionar item', onPress: onAdd }} />
      <ErrorState
        title="Não foi possível carregar o estoque"
        message="Verifique a conexão e tente de novo."
        action={{ label: 'Tentar de novo', onPress: onRetry }}
      />
    </>,
  );
  const alerts = tree.root.findAll((n) => n.props.accessibilityRole === 'alert' && typeof n.type === 'string');
  expect(alerts).toHaveLength(1);
  expect(alerts[0].findAllByType(Text).map((t) => t.props.children)).toEqual(
    expect.arrayContaining(['Não foi possível carregar o estoque', 'Verifique a conexão e tente de novo.']),
  );
  for (const label of ['Adicionar item', 'Tentar de novo']) {
    const button = tree.root.find(
      (n) => typeof n.props.style === 'function' && n.findAll((c) => c.type === Text && c.props.children === label).length > 0,
    );
    await ReactTestRenderer.act(async () => button.props.onPress());
  }
  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(onRetry).toHaveBeenCalledTimes(1);
});
