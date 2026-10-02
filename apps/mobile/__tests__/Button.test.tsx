/**
 * @format
 */

import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { Button } from '../src/Button';
import { fontFamily, themeStorage, ThemeProvider } from '../src/theme';

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
 * Finds the buttons' Pressables: the only nodes whose style is a function of the press state.
 * @param tree Rendered tree.
 * @returns The Pressable test instances, in render order.
 */
function pressables(tree: ReactTestRenderer.ReactTestRenderer): ReactTestRenderer.ReactTestInstance[] {
  return tree.root.findAll((node) => typeof node.props.style === 'function');
}

/**
 * Reads the frame style a Pressable would get, pressed or not.
 * @param pressable The Pressable test instance.
 * @param pressed Whether it is being pressed.
 * @returns The resolved style object.
 */
function frame(pressable: ReactTestRenderer.ReactTestInstance, pressed: boolean) {
  return pressable.props.style({ pressed });
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders a primary button in one style and mode and checks the accent fill, the label in the display
    // face, uppercase, and the glow only where the style has one.
    test(`Mobile: primary buttons follow the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode];
      const tree = await mount(style, mode, <Button>Entrar</Button>);
      const [pressable] = pressables(tree);
      const label = tree.root.findByType(Text).props.style;

      expect(frame(pressable, false)).toMatchObject({
        backgroundColor: theme.colors.accent,
        borderRadius: scales.radiusPill,
      });
      expect(frame(pressable, false).shadowColor).toBe(theme.glow ? theme.colors.accent : undefined);
      expect(label).toMatchObject({
        fontFamily: fontFamily(theme.displayFont, 600),
        textTransform: 'uppercase',
        color: theme.colors.onAccent,
      });
    });
  }
}

// Checks pressing a secondary button shows what hover shows on the web, the accent outline, and that
// the link variant reads as inline body text.
test('Mobile: secondary buttons turn accent when pressed and links read as text', async () => {
  const colors = themes.eighties.night.colors;
  const tree = await mount(
    'eighties',
    'night',
    <>
      <Button variant="secondary">Ver em 3D</Button>
      <Button variant="link">Esqueceu a senha?</Button>
    </>,
  );
  const [secondary, link] = pressables(tree);
  expect(frame(secondary, false).borderColor).toBe(colors.hairline);
  expect(frame(secondary, true).borderColor).toBe(colors.accent);
  expect(frame(secondary, true).transform).toEqual([{ translateY: 1 }]);

  const linkLabel = tree.root.findAllByType(Text)[1].props.style;
  expect(linkLabel).toMatchObject({
    fontFamily: fontFamily(scales.bodyFont),
    textDecorationLine: 'underline',
    color: colors.textMuted,
  });
  expect(frame(link, false).paddingHorizontal).toBe(0);
});

// Focuses the button as a keyboard or switch control would and checks the accent ring appears, then
// goes away on blur; pressing runs the action.
test('Mobile: buttons show a focus ring and run their action', async () => {
  const onPress = jest.fn();
  const tree = await mount('gt4', 'day', <Button onPress={onPress}>Entrar</Button>);
  const [pressable] = pressables(tree);
  const ring = () => tree.root.findByProps({ testID: 'button-ring' }).props.style.borderColor;

  expect(ring()).toBe('transparent');
  await ReactTestRenderer.act(async () => pressable.props.onFocus());
  expect(ring()).toBe(themes.gt4.day.colors.accent + '61');
  await ReactTestRenderer.act(async () => pressable.props.onBlur());
  expect(ring()).toBe('transparent');

  await ReactTestRenderer.act(async () => pressable.props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);
});

// Checks disabled and loading buttons are blocked and announced as such, and that loading shows a
// spinner in place of the icon.
test('Mobile: disabled and loading buttons are blocked and announced', async () => {
  const tree = await mount(
    'eighties',
    'day',
    <>
      <Button disabled>Desligado</Button>
      <Button loading>Entrando</Button>
    </>,
  );
  const [disabled, loading] = pressables(tree);
  expect(disabled.props.disabled).toBe(true);
  expect(disabled.props.accessibilityState).toEqual({ disabled: true, busy: false });
  expect(frame(disabled, false).opacity).toBe(0.5);
  expect(loading.props.disabled).toBe(true);
  expect(loading.props.accessibilityState).toEqual({ disabled: true, busy: true });
  expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(1);
});
