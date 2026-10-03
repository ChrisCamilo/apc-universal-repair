/**
 * @format
 */

import React from 'react';
import { Image } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, scales, sheenGradient, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { ImageFrame } from '../src/ImageFrame';
import { Divider, Panel } from '../src/Panel';
import { Spinner } from '../src/Spinner';
import { themeStorage, ThemeProvider } from '../src/theme';

const PHOTO = 'https://fotos.example/opala.jpg';

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
 * Reads the flattened style of the View drawn for a testID.
 * @param tree Rendered tree.
 * @param testID The testID to look for.
 * @returns The View's style as one object.
 */
function styleOf(tree: ReactTestRenderer.ReactTestRenderer, testID: string) {
  return Object.assign({}, ...[viewOf(tree, testID).props.style].flat(Infinity).filter(Boolean));
}

/**
 * Finds the View drawn for a testID: the first node with it that has a style, past the component that
 * received the testID.
 * @param tree Rendered tree.
 * @param testID The testID to look for.
 * @returns The View's test instance.
 */
function viewOf(tree: ReactTestRenderer.ReactTestRenderer, testID: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.findAll((n) => n.props.testID === testID && n.props.style !== undefined)[0];
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Nests a plain and a raised panel in an outer one in one style and mode, and checks the fills, the soft
    // border, the panel radius outside and the tile radius inside, and the sheen only on the outer panel.
    test(`Mobile: panels follow the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode];
      const tree = await mount(
        style,
        mode,
        <Panel testID="outer">
          <Panel testID="nested">{null}</Panel>
          <Panel testID="raised" raised>
            {null}
          </Panel>
        </Panel>,
      );
      expect(styleOf(tree, 'outer')).toMatchObject({
        backgroundColor: theme.colors.panel,
        backgroundImage: sheenGradient(theme.sheen, mode),
        borderWidth: scales.hairline,
        borderColor: theme.colors.hairline + '7A',
        borderRadius: theme.radiusPanel,
      });
      expect(styleOf(tree, 'nested').borderRadius).toBe(theme.radiusTile);
      expect(styleOf(tree, 'nested').backgroundImage).toBeUndefined();
      expect(styleOf(tree, 'raised').backgroundColor).toBe(theme.colors.panelRaised);
    });
  }
}

// Checks every panel pads its content, so a nested panel's border sits inside the parent's padding and
// never touches the parent's border, and that an explicit sheen choice wins over the nesting default.
test('Mobile: nested panels never double the border', async () => {
  const tree = await mount(
    'gt4',
    'night',
    <Panel testID="outer">
      <Panel testID="nested" sheen>
        {null}
      </Panel>
    </Panel>,
  );
  expect(styleOf(tree, 'outer').padding).toBe(scales.space.s3);
  expect(styleOf(tree, 'nested').backgroundImage).toBe(sheenGradient(themes.gt4.night.sheen, 'night'));
});

// Checks a divider draws one soft hairline.
test('Mobile: dividers draw a soft hairline', async () => {
  const tree = await mount('eighties', 'day', <Divider />);
  expect(styleOf(tree, 'divider')).toMatchObject({
    height: scales.hairline,
    backgroundColor: themes.eighties.day.colors.hairline + '7A',
  });
});

// Loads a photo and checks the frame keeps its ratio and fits the photo whole, hidden behind a spinner and
// marked busy until it loads.
test('Mobile: frames keep their ratio and never stretch the photo', async () => {
  const tree = await mount('eighties', 'night', <ImageFrame testID="frame" src={PHOTO} alt="Opala de frente" />);
  const image = () => tree.root.findByType(Image);
  expect(styleOf(tree, 'frame').aspectRatio).toBeCloseTo(16 / 9);
  expect(image().props).toMatchObject({ resizeMode: 'contain', accessibilityLabel: 'Opala de frente' });
  expect(viewOf(tree, 'frame').props.accessibilityState).toEqual({ busy: true });
  expect(tree.root.findAllByType(Spinner)).toHaveLength(1);

  await ReactTestRenderer.act(async () => image().props.onLoad());
  expect(viewOf(tree, 'frame').props.accessibilityState).toEqual({ busy: false });
  expect(tree.root.findAllByType(Spinner)).toHaveLength(0);
  expect(Object.assign({}, ...[image().props.style].flat().filter(Boolean)).opacity).toBeUndefined();
});

// Shows the loading state while the photo URL is on its way, and the missing state with no photo or when
// the photo fails to load.
test('Mobile: frames show loading and missing photos', async () => {
  const loading = await mount('gt4', 'day', <ImageFrame testID="frame" loading alt="Opala" />);
  expect(loading.root.findAllByType(Spinner)).toHaveLength(1);
  expect(loading.root.findAllByType(Image)).toHaveLength(0);

  const none = await mount('gt4', 'day', <ImageFrame src={null} alt="Opala" />);
  expect(none.root.findAll((n) => n.props.children === 'Sem foto').length).toBeGreaterThan(0);

  const broken = await mount('gt4', 'day', <ImageFrame src={PHOTO} alt="Opala" ratio={1} />);
  await ReactTestRenderer.act(async () => broken.root.findByType(Image).props.onError());
  expect(broken.root.findAllByType(Image)).toHaveLength(0);
  expect(broken.root.findAll((n) => n.props.children === 'Sem foto').length).toBeGreaterThan(0);
});

// Checks a frame inside a panel takes the tile radius, like a nested panel, and the panel radius outside.
test('Mobile: frames inside panels take the tile radius', async () => {
  const tree = await mount(
    'eighties',
    'night',
    <>
      <ImageFrame testID="alone" src={null} alt="Opala" />
      <Panel>
        <ImageFrame testID="nested" src={null} alt="Opala" />
      </Panel>
    </>,
  );
  expect(styleOf(tree, 'alone').borderRadius).toBe(themes.eighties.night.radiusPanel);
  expect(styleOf(tree, 'nested').borderRadius).toBe(themes.eighties.night.radiusTile);
});
