/**
 * @format
 */

import React from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, type ViewStyle } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/tokens/theme';
import { themeStorage, ThemeProvider, withAlpha } from '../../app/theme';
import { Accordion } from './index';

const SECTIONS = [
  { id: 'inventory', title: 'Estoque', detail: '3 tutoriais', content: <Text>Cadastrar um item</Text> },
  { id: 'catalog', title: 'Catálogo', detail: '1 tutorial', content: <Text>Montar uma ficha</Text> },
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
 * Finds a section's header by its title.
 * @param tree Rendered tree.
 * @param title The section's title.
 * @returns The header's Pressable.
 */
function header(tree: ReactTestRenderer.ReactTestRenderer, title: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find(
    (n) => typeof n.props.style === 'function' && n.props.accessibilityRole === 'button' && String(n.props.accessibilityLabel).startsWith(title),
  );
}

/**
 * Lists the texts drawn, in order.
 * @param tree Rendered tree.
 * @returns The texts.
 */
function texts(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAll((n) => n.type === Text).map((n) => String(n.props.children));
}

/**
 * Presses a section's header.
 * @param tree Rendered tree.
 * @param title The section's title.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, title: string) {
  await ReactTestRenderer.act(async () => header(tree, title).props.onPress());
}

beforeEach(async () => {
  await themeStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the accordion in one style and mode, and checks the titles take the text color, the notes the muted one,
    // a pressed header the raised panel, and a soft hairline parts the sections.
    test(`Mobile: the accordion follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(style, mode, <Accordion sections={SECTIONS} defaultOpen={['inventory']} />);
      const [title, detail] = header(tree, 'Estoque').findAllByType(Text);
      expect(StyleSheet.flatten(title.props.style).color).toBe(colors.text);
      expect(StyleSheet.flatten(detail.props.style).color).toBe(colors.textMuted);
      expect(StyleSheet.flatten(header(tree, 'Estoque').props.style({ pressed: true })).backgroundColor).toBe(colors.panelRaised);
      const sections = tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'common.accordion.section');
      expect(StyleSheet.flatten(sections[1].props.style)).toMatchObject({ borderTopWidth: scales.hairline, borderTopColor: withAlpha(colors.hairline, scales.hairlineSoft) });
      expect(StyleSheet.flatten(sections[0].props.style).borderTopWidth).toBeUndefined();
    });
  }
}

// Checks each header is a button named by its title and note that says whether its section is open, and only the open
// section's content is drawn.
test('Mobile: the accordion has button semantics, and draws only the open content', async () => {
  const tree = await mount('eighties', 'night', <Accordion sections={SECTIONS} defaultOpen={['inventory']} />);
  expect(header(tree, 'Estoque').props).toMatchObject({ accessibilityLabel: 'Estoque, 3 tutoriais', accessibilityState: { expanded: true } });
  expect(header(tree, 'Catálogo').props.accessibilityState).toEqual({ expanded: false });
  expect(texts(tree)).toContain('Cadastrar um item');
  expect(texts(tree)).not.toContain('Montar uma ficha');
});

// Presses a closed header, then the open one, and checks each opens and closes its own section, two open at once.
test('Mobile: a press opens and closes its own section', async () => {
  const tree = await mount('gt4', 'day', <Accordion sections={SECTIONS} defaultOpen={['inventory']} />);
  await press(tree, 'Catálogo');
  expect(texts(tree)).toEqual(expect.arrayContaining(['Cadastrar um item', 'Montar uma ficha']));
  await press(tree, 'Estoque');
  expect(header(tree, 'Estoque').props.accessibilityState).toEqual({ expanded: false });
  expect(texts(tree)).not.toContain('Cadastrar um item');
});

// Opens a section with motion on and checks its chevron turns over the motion's duration; then, with reduced motion,
// that it turns at once.
test('Mobile: the chevron turns as a section opens, at once with reduced motion', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const timing = jest.spyOn(Animated, 'timing');
  const tree = await mount('bmw90', 'night', <Accordion sections={SECTIONS} />);
  await press(tree, 'Estoque');
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: scales.motion.durationMs }));

  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  timing.mockClear();
  const calm = await mount('bmw90', 'night', <Accordion sections={SECTIONS} />);
  await press(calm, 'Estoque');
  expect(texts(calm)).toContain('Cadastrar um item');
  expect(timing).not.toHaveBeenCalled();
});

// Checks every header is at least 48px tall, a finger's reach, and a long title stays on one line.
test('Mobile: the headers are a finger tall, their titles on one line', async () => {
  const tree = await mount('fiat90', 'day', <Accordion sections={SECTIONS} />);
  const headers = tree.root.findAll((n) => typeof n.props.style === 'function' && n.props.accessibilityRole === 'button');
  expect(headers.map((node) => (StyleSheet.flatten(node.props.style({ pressed: false })) as ViewStyle).minHeight)).toEqual([48, 48]);
  expect(header(tree, 'Estoque').findAllByType(Text)[0].props.numberOfLines).toBe(1);
});
