/**
 * @format
 */

import React, { useState } from 'react';
import { Dimensions, Modal, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { Menu, MenuHeader, MenuItem, MenuLabel, UserBadge } from '../src/Menu';
import { Segmented } from '../src/Segmented';
import { Switch } from '../src/Switch';
import { themeStorage, ThemeProvider } from '../src/theme';

const STYLE_OPTIONS = [
  { value: 'eighties', label: 'Anos 80' },
  { value: 'gt4', label: 'GT4' },
];

/**
 * Finds the pressable with an accessible name or visible text.
 * @param tree Rendered tree.
 * @param name Accessibility label, or the text inside.
 * @returns The Pressable test instance.
 */
function byName(tree: ReactTestRenderer.ReactTestRenderer, name: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find(
    (n) =>
      typeof n.type !== 'string' &&
      typeof n.props.onPress === 'function' &&
      n.props.accessibilityRole !== undefined &&
      (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
  );
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
  const node = byName(tree, name);
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Reads the style of the View with a testID.
 * @param tree Rendered tree.
 * @param testID The testID to look for.
 * @param index Which match to read, in render order.
 * @returns The View's style.
 */
function styleOf(tree: ReactTestRenderer.ReactTestRenderer, testID: string, index = 0) {
  return tree.root.findAll((n) => n.props.testID === testID && typeof n.type === 'string')[index].props.style;
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders a switch off and one on, and a segmented choice, in one style and mode, and checks the accent
    // track and knob of the switch that is on (glowing only where the style has a glow), the muted knob of
    // the one that is off, and the accent fill of the chosen option.
    test(`Mobile: switches and segmented choices follow the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode];
      const tree = await mount(
        style,
        mode,
        <>
          <Switch checked={false} onCheckedChange={() => {}}>Desligado</Switch>
          <Switch checked onCheckedChange={() => {}}>Ligado</Switch>
          <Segmented label="Tema" options={STYLE_OPTIONS} value="gt4" onValueChange={() => {}} />
        </>,
      );
      expect(styleOf(tree, 'switch-track', 1).borderColor).toBe(theme.colors.accent);
      expect(styleOf(tree, 'switch-knob', 1).backgroundColor).toBe(theme.colors.accent);
      expect(styleOf(tree, 'switch-knob', 1).shadowColor).toBe(theme.glow ? theme.colors.accent : undefined);
      expect(styleOf(tree, 'switch-knob', 0).backgroundColor).toBe(theme.colors.textMuted);
      expect(byName(tree, 'GT4').props.style.backgroundColor).toBe(theme.colors.accent);
      expect(byName(tree, 'Anos 80').props.style.backgroundColor).toBe('transparent');
    });
  }
}

// Toggles a switch and a segmented choice on their own and checks the roles and states screen readers hear,
// and that a disabled switch stays put.
test('Mobile: switches and segmented choices toggle on their own', async () => {
  const tree = await mount('eighties', 'night', <Controls />);
  expect(byName(tree, 'Modo escuro').props.accessibilityRole).toBe('switch');
  await press(tree, 'Modo escuro');
  expect(byName(tree, 'Modo escuro').props.accessibilityState).toMatchObject({ checked: true });
  expect(styleOf(tree, 'switch-knob').transform[0].translateX).toBeGreaterThan(0);

  expect(byName(tree, 'GT4').props.accessibilityRole).toBe('radio');
  await press(tree, 'GT4');
  expect(byName(tree, 'GT4').props.accessibilityState).toEqual({ checked: true });
  expect(byName(tree, 'Anos 80').props.accessibilityState).toEqual({ checked: false });

  expect(byName(tree, 'Desativado').props.accessibilityState).toMatchObject({ disabled: true });
});

// Opens the menu and changes a switch and the theme inside it, checking they become menu items and keep the
// menu open; then runs the plain action, which closes it.
test('Mobile: choices keep the menu open and actions close it', async () => {
  const onTutorial = jest.fn();
  const tree = await mount('gt4', 'night', <UserMenu onTutorial={onTutorial} />);
  const modal = () => tree.root.findByType(Modal);
  await press(tree, 'Menu do usuário');
  expect(modal().props.visible).toBe(true);
  expect(byName(tree, 'Menu do usuário').props.accessibilityState).toEqual({ expanded: true });

  expect(byName(tree, 'Modo escuro').props.accessibilityRole).toBe('checkbox');
  await press(tree, 'Modo escuro');
  expect(byName(tree, 'Modo escuro').props.accessibilityState).toMatchObject({ checked: false });
  await press(tree, 'GT4');
  expect(byName(tree, 'GT4').props.accessibilityState).toEqual({ checked: true });
  expect(modal().props.visible).toBe(true);

  await press(tree, 'Tutorial do estoque');
  expect(onTutorial).toHaveBeenCalledTimes(1);
  expect(modal().props.visible).toBe(false);
});

// Closes the menu with the back button, with a tap outside and with the trigger.
test('Mobile: back, a tap outside and the trigger close the menu', async () => {
  const tree = await mount('eighties', 'day', <UserMenu onTutorial={() => {}} />);
  const modal = () => tree.root.findByType(Modal);
  await press(tree, 'Menu do usuário');
  await ReactTestRenderer.act(async () => modal().props.onRequestClose());
  expect(modal().props.visible).toBe(false);

  await press(tree, 'Menu do usuário');
  await press(tree, 'Fechar menu');
  expect(modal().props.visible).toBe(false);

  await press(tree, 'Menu do usuário');
  await press(tree, 'Menu do usuário');
  expect(modal().props.visible).toBe(false);
});

// Puts the user badge in a trigger on a 390dp phone, then widens the screen to a 768dp tablet, and checks the
// initials sit on the accent in its contrast color, hidden from screen readers since the trigger is named, and the
// username shows only once the screen is wide.
test('Mobile: the user badge shows the initials, and the username only on wider screens', async () => {
  const { colors } = themes.eighties.night;
  const screen = (width: number, height: number) =>
    ReactTestRenderer.act(() => Dimensions.set({ window: { width, height, scale: 2, fontScale: 1 }, screen: { width, height, scale: 2, fontScale: 1 } }));
  const before = Dimensions.get('window');
  const badge = (
    <Menu label="Menu do usuário" trigger={<UserBadge initials="CC" name="christian.camilo" />}>
      <MenuLabel>Aparência</MenuLabel>
    </Menu>
  );
  const shown = (tree: ReactTestRenderer.ReactTestRenderer, text: string) =>
    tree.root.findAll((n) => n.type === Text && n.props.children === text);

  await screen(390, 844);
  const phone = await mount('eighties', 'night', badge);
  const [initials] = shown(phone, 'CC');
  expect(initials.props.style.color).toBe(colors.onAccent);
  const circle = phone.root.find((n) => typeof n.type === 'string' && n.props.style?.backgroundColor === colors.accent && n.props.accessibilityElementsHidden);
  expect(circle.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(shown(phone, 'christian.camilo')).toHaveLength(0);

  await screen(768, 1024);
  expect(shown(phone, 'christian.camilo')).toHaveLength(1);
  await screen(before.width, before.height);
});

function Controls() {
  const [dark, setDark] = useState(false);
  const [style, setStyle] = useState('eighties');
  return (
    <>
      <Switch checked={dark} onCheckedChange={setDark}>
        Modo escuro
      </Switch>
      <Segmented label="Tema" options={STYLE_OPTIONS} value={style} onValueChange={setStyle} />
      <Switch checked={false} onCheckedChange={() => {}} disabled>
        Desativado
      </Switch>
    </>
  );
}

function UserMenu({ onTutorial }: { onTutorial: () => void }) {
  const [dark, setDark] = useState(true);
  const [style, setStyle] = useState('eighties');
  return (
    <Menu label="Menu do usuário" trigger={<Text>christian.camilo</Text>}>
      <MenuHeader title="christian.camilo" subtitle="Oficina APC" />
      <MenuLabel>Aparência</MenuLabel>
      <Switch checked={dark} onCheckedChange={setDark}>
        Modo escuro
      </Switch>
      <Segmented label="Tema" options={STYLE_OPTIONS} value={style} onValueChange={setStyle} />
      <MenuItem description="Criar, procurar, editar e excluir um item de teste" onSelect={onTutorial}>
        Tutorial do estoque
      </MenuItem>
    </Menu>
  );
}
