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

// The panels the tests nest, by their place in render order: the outer one, then the ones inside it.
// The style id of a photo frame.
const FRAME = 'common.image-frame';
const NESTED = 1;
const OUTER = 0;
const PANEL = 'common.panel';
const PHOTO = 'https://fotos.example/opala.jpg';
const RAISED = 2;

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
 * Reads the flattened style of a View drawn with a style id.
 * @param tree Rendered tree.
 * @param testID The style id to look for.
 * @param index Which of the views with it, in render order.
 * @returns The View's style as one object.
 */
function styleOf(tree: ReactTestRenderer.ReactTestRenderer, testID: string, index = 0) {
  return Object.assign({}, ...[viewOf(tree, testID, index).props.style].flat(Infinity).filter(Boolean));
}

/**
 * Finds a View drawn with a style id.
 * @param tree Rendered tree.
 * @param testID The style id to look for.
 * @param index Which of the views with it, in render order.
 * @returns The View's test instance.
 */
function viewOf(tree: ReactTestRenderer.ReactTestRenderer, testID: string, index = 0): ReactTestRenderer.ReactTestInstance {
  return tree.root.findAll((n) => n.props.testID === testID && typeof n.type === 'string')[index];
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
        <Panel>
          <Panel>{null}</Panel>
          <Panel raised>{null}</Panel>
        </Panel>,
      );
      expect(styleOf(tree, PANEL, OUTER)).toMatchObject({
        backgroundColor: theme.colors.panel,
        backgroundImage: sheenGradient(theme.sheen, mode),
        borderWidth: scales.hairline,
        borderColor: theme.colors.hairline + '7A',
        borderRadius: theme.radiusPanel,
      });
      expect(styleOf(tree, PANEL, NESTED).borderRadius).toBe(theme.radiusTile);
      expect(styleOf(tree, PANEL, NESTED).backgroundImage).toBeUndefined();
      expect(styleOf(tree, PANEL, RAISED).backgroundColor).toBe(theme.colors.panelRaised);
    });
  }
}

// Checks every panel pads its content, so a nested panel's border sits inside the parent's padding and
// never touches the parent's border, and that an explicit sheen choice wins over the nesting default.
test('Mobile: nested panels never double the border', async () => {
  const tree = await mount(
    'gt4',
    'night',
    <Panel>
      <Panel sheen>{null}</Panel>
    </Panel>,
  );
  expect(styleOf(tree, PANEL, OUTER).padding).toBe(scales.space.s3);
  expect(styleOf(tree, PANEL, NESTED).backgroundImage).toBe(sheenGradient(themes.gt4.night.sheen, 'night'));
});

// Checks a divider draws one soft hairline.
test('Mobile: dividers draw a soft hairline', async () => {
  const tree = await mount('eighties', 'day', <Divider />);
  expect(styleOf(tree, 'common.divider')).toMatchObject({
    height: scales.hairline,
    backgroundColor: themes.eighties.day.colors.hairline + '7A',
  });
});

// Loads a photo and checks the frame keeps its ratio and fits the photo whole, hidden behind a spinner and
// marked busy until it loads, and shown once it has.
test('Mobile: frames keep their ratio and never stretch the photo', async () => {
  const tree = await mount('eighties', 'night', <ImageFrame src={PHOTO} alt="Opala de frente" />);
  const image = () => tree.root.findByType(Image);
  const opacity = () => Object.assign({}, ...[image().props.style].flat().filter(Boolean)).opacity;
  expect(styleOf(tree, FRAME).aspectRatio).toBeCloseTo(16 / 9);
  expect(image().props).toMatchObject({ resizeMode: 'contain', accessibilityLabel: 'Opala de frente' });
  expect(viewOf(tree, FRAME).props.accessibilityState).toEqual({ busy: true });
  expect(opacity()).toBe(0);
  expect(tree.root.findAllByType(Spinner)).toHaveLength(1);

  await ReactTestRenderer.act(async () => image().props.onLoad());
  expect(viewOf(tree, FRAME).props.accessibilityState).toEqual({ busy: false });
  expect(tree.root.findAllByType(Spinner)).toHaveLength(0);
  expect(opacity()).toBe(1);
});

// Shows the loading state while the photo URL is on its way, and the missing state with no photo or when
// the photo fails to load.
test('Mobile: frames show loading and missing photos', async () => {
  const loading = await mount('gt4', 'day', <ImageFrame loading alt="Opala" />);
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
      <ImageFrame src={null} alt="Opala" />
      <Panel>
        <ImageFrame src={null} alt="Opala" />
      </Panel>
    </>,
  );
  expect(styleOf(tree, FRAME, 0).borderRadius).toBe(themes.eighties.night.radiusPanel);
  expect(styleOf(tree, FRAME, 1).borderRadius).toBe(themes.eighties.night.radiusTile);
});
