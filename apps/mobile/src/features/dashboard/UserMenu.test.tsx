/**
 * @format
 */

import React from 'react';
import { NativeModules, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import type { SessionUser } from '@apc/domain/auth';
import { LOCALE_STORAGE_KEY } from '@apc/domain/locale';
import { playIcon } from '@apc/tokens/icons';
import { REORDER_TABS_STORAGE_KEY } from '@apc/ui-spec/tabs';
import { MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH, MIN_TOUCH_TARGET } from '@apc/ui-spec/screens';
import { THEME_STORAGE_KEYS } from '@apc/tokens/theme';
import { InventoryTutorialContext, useInventoryTutorialChoice } from '../inventory/tutorial/inventoryTutorialContext';
import { TabReorderContext, useReorderChoice } from './tabReorderContext';
import { NO_LOCK_TEXT, UserMenu } from './UserMenu';
import { loadLocale, LocaleProvider } from '../../app/locale';
import { themeStorage, ThemeProvider, useTheme } from '../../app/theme';
import { ToastProvider } from '../../components/Toast';
import { InventoryCopyProvider } from '../sync/useInventoryCopy';

// A phone's screen with no notch, for the bottom sheet.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MIN_MOBILE_WIDTH, height: MIN_MOBILE_HEIGHT }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const USER: SessionUser = { id: 'user-christian', username: 'christian.camilo', displayName: 'Christian Camilo', initials: 'CC', inventoryTutorialSeen: true };

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
 * Renders the user menu inside a ThemeProvider, with a readout of the active theme.
 * @param onLogout Called when "Sair" is picked.
 * @param onConnect Called when "Conectar ao servidor" is picked.
 * @returns The rendered tree.
 */
/** Trees the tests rendered, unmounted after each so the copy's syncs and the toasts don't outlive it. */
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

async function mount(onLogout: () => void = () => {}, onConnect: () => void = () => {}) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <LocaleProvider>
            <ToastProvider>
              <Preferences>
                <InventoryCopyProvider>
                  <UserMenu user={USER} onLogout={onLogout} onConnect={onConnect} />
                </InventoryCopyProvider>
              </Preferences>
            </ToastProvider>
            <ActiveTheme />
          </LocaleProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  return tree!;
}

/**
 * Renders the user menu and opens it from Conta.
 * @param onLogout Called when "Sair" is picked.
 * @param onConnect Called when "Conectar ao servidor" is picked.
 * @returns The rendered tree.
 */
async function openMenu(onLogout: () => void = () => {}, onConnect: () => void = () => {}) {
  const tree = await mount(onLogout, onConnect);
  await press(tree, 'Conta');
  return tree;
}

/**
 * Tells whether the bottom sheet titled "Conta" is open.
 * @param tree Rendered tree.
 * @returns True while it shows.
 */
function sheetOpen(tree: ReactTestRenderer.ReactTestRenderer): boolean {
  return tree.root.findAll((n) => n.props.testID === 'common.bottom-sheet' && typeof n.type === 'string').length > 0;
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
 * Reads the active theme from the readout.
 * @param tree Rendered tree.
 * @returns E.g. "eighties/night".
 */
function readout(tree: ReactTestRenderer.ReactTestRenderer): string {
  return tree.root.find((n) => n.props.testID === 'active-theme' && typeof n.type === 'string').props.children;
}

beforeEach(async () => {
  await themeStorage.clear();
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: 'eighties', [THEME_STORAGE_KEYS.mode]: 'night' });
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
});

// Checks the user menu is Conta, at least 44px tall, with the user's initials in its pill, hidden from screen readers,
// which hear "Conta". It opens the bottom sheet titled "Conta", holding the menu, named "Menu do usuário"; an action,
// such as "Tutorial do estoque", closes it, as it closes a menu.
test('Mobile: Conta opens the user menu in a bottom sheet', async () => {
  const tree = await mount();
  const conta = byName(tree, 'Conta');
  expect(conta.props.accessibilityState).toMatchObject({ expanded: false });
  const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
  expect(flat(tree.root.find((n) => n.props.testID === 'dashboard.bottom-bar.item' && typeof n.type === 'string').props.style).minHeight).toBe(MIN_TOUCH_TARGET);
  const initials = tree.root.find((n) => n.props.testID === 'dashboard.bottom-bar.item.pill.initials' && typeof n.type === 'string');
  expect(initials.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(initials.findAll((n) => n.type === Text && n.props.children === 'CC')).toHaveLength(1);
  expect(sheetOpen(tree)).toBe(false);

  await press(tree, 'Conta');
  expect(sheetOpen(tree)).toBe(true);
  expect(byName(tree, 'Conta').props.accessibilityState).toMatchObject({ expanded: true });
  expect(tree.root.findAll((n) => n.type === Text && n.props.children === 'Conta').length).toBeGreaterThan(1);
  const menu = tree.root.find((n) => n.props.accessibilityRole === 'menu' && typeof n.type === 'string');
  expect(menu.props.accessibilityLabel).toBe('Menu do usuário');
  await press(tree, 'Tutorial do estoque');
  expect(byName(tree, 'Conta').props.accessibilityState).toMatchObject({ expanded: false });
});

// Opens the menu and checks the header shows the logged user, dark mode is on at night, the theme sits on the
// active style, the tab reorder choice is off until turned on, and the Inventory's section has no choice of opening
// an item on a card's tap, which the list always does.
test('Mobile: the user menu shows the logged user and the display preferences', async () => {
  const tree = await openMenu();
  expect(tree.root.findAll((n) => n.type === Text && n.props.children === 'Christian Camilo')).not.toHaveLength(0);
  expect(byName(tree, 'Modo escuro').props.accessibilityState).toMatchObject({ checked: true });
  expect(byName(tree, 'Anos 80').props.accessibilityState).toMatchObject({ checked: true });
  expect(byName(tree, 'Arrastar para reordenar').props.accessibilityState).toMatchObject({ checked: false });
  expect(tree.root.findAll((n) => n.type === Text && n.props.children === 'Estoque')).not.toHaveLength(0);
  expect(tree.root.findAll((n) => n.type === Text && n.props.children === 'Abrir item ao clicar na linha')).toHaveLength(0);
});

// Opens the menu and checks "Tutorial do estoque" shows the play icon, its ring and triangle.
test('Mobile: Tutorial do estoque shows the play icon', async () => {
  const tree = await openMenu();
  const item = byName(tree, 'Tutorial do estoque');
  expect(item.findAll((n) => n.props.r === (playIcon[0] as { r: number }).r && typeof n.type !== 'string')).not.toHaveLength(0);
  expect(item.findAll((n) => n.props.d === (playIcon[1] as { d: string }).d && typeof n.type !== 'string')).not.toHaveLength(0);
});

// Turns dark mode off and picks GT4, and checks each applies to the theme and is saved at once, with the menu still
// open between the two.
test('Mobile: dark mode and the theme apply and are saved at once, keeping the menu open', async () => {
  const tree = await openMenu();
  await press(tree, 'Modo escuro');
  expect(readout(tree)).toBe('eighties/day');
  await press(tree, 'GT4');
  expect(readout(tree)).toBe('gt4/day');
  expect(byName(tree, 'GT4').props.accessibilityState).toMatchObject({ checked: true });
  expect(await themeStorage.getMany([THEME_STORAGE_KEYS.style, THEME_STORAGE_KEYS.mode])).toEqual({
    [THEME_STORAGE_KEYS.style]: 'gt4',
    [THEME_STORAGE_KEYS.mode]: 'day',
  });
});

// Picks English under "Idioma", Português chosen until then, and checks it is saved on the phone, where the background
// sync reads it too, keeping the menu open, and comes back chosen when the app starts again.
test('Mobile: the language is saved at once and comes back after a restart', async () => {
  const tree = await openMenu();
  expect(tree.root.findAll((n) => n.type === Text && n.props.children === 'Idioma').length).toBeGreaterThan(0);
  expect(byName(tree, 'Português').props.accessibilityState).toMatchObject({ checked: true });
  await press(tree, 'English');
  expect(byName(tree, 'English').props.accessibilityState).toMatchObject({ checked: true });
  expect(sheetOpen(tree)).toBe(true);
  expect(await themeStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en-US');
  expect(await loadLocale()).toBe('en-US');
  const again = await openMenu();
  expect(byName(again, 'English').props.accessibilityState).toMatchObject({ checked: true });
});

// Turns tab reordering on and checks it is saved on the device and comes back on when the menu is drawn again.
test('Mobile: the tab reorder choice is saved and comes back', async () => {
  const tree = await openMenu();
  await press(tree, 'Arrastar para reordenar');
  expect(await themeStorage.getItem(REORDER_TABS_STORAGE_KEY)).toBe('true');
  const again = await openMenu();
  expect(byName(again, 'Arrastar para reordenar').props.accessibilityState).toMatchObject({ checked: true });
});

// Opens the menu and checks the Inventory's section has its tutorial and no "Itens por página", since the list loads
// more as it scrolls.
test('Mobile: the user menu has no items per page choice', async () => {
  const tree = await openMenu();
  expect(byName(tree, 'Tutorial do estoque')).toBeDefined();
  expect(tree.root.findAll((n) => n.type === Text && n.props.children === 'Itens por página')).toHaveLength(0);
});

// Picks "Conectar ao servidor", under Servidor, and checks it opens the pairing and closes the menu.
test('Mobile: Conectar ao servidor opens the pairing from the user menu', async () => {
  const onConnect = jest.fn();
  const tree = await openMenu(undefined, onConnect);
  expect(tree.root.findAll((n) => n.type === Text && n.props.children === 'Servidor')).not.toHaveLength(0);
  await press(tree, 'Conectar ao servidor');
  expect(onConnect).toHaveBeenCalledTimes(1);
  expect(sheetOpen(tree)).toBe(false);
});

// Opens the menu after the copy caught up and checks "Sincronizar agora" says when, under Sincronização; then picks it
// while the server can't be reached and checks a toast says why, and again with the server back and checks it says
// the copy caught up.
test('Mobile: Sincronizar agora syncs and says how it went', async () => {
  // The setup's stand-in for the API, put back once the server is back.
  const setupFetch = (fetch as jest.Mock).getMockImplementation()!;
  const tree = await openMenu();
  const texts = () => tree.root.findAll((n) => n.type === Text).map((n) => n.props.children);
  expect(texts()).toContain('Sincronização');
  expect(byName(tree, 'Sincronizar agora').props.accessibilityHint).toMatch(/^Última sincronização hoje às \d{2}:\d{2}$/);

  (fetch as jest.Mock).mockImplementation(() => Promise.reject(new TypeError('Network request failed')));
  await press(tree, 'Sincronizar agora');
  expect(texts()).toContain(
    'Não foi possível sincronizar: o servidor não respondeu. Confira se o celular está no Wi-Fi de casa e se o computador está ligado.',
  );

  (fetch as jest.Mock).mockImplementation(setupFetch);
  await press(tree, 'Conta');
  await press(tree, 'Sincronizar agora');
  expect(texts()).toContain('Estoque sincronizado com o servidor.');
});

// Picks "Sair" and checks it is the last item, set apart from the preferences by a divider, and hands the logout
// to the owner.
test('Mobile: Sair comes last, apart from the preferences, and logs out', async () => {
  const onLogout = jest.fn();
  const tree = await openMenu(onLogout);
  const menu = tree.root.find((n) => n.props.accessibilityRole === 'menu' && typeof n.type === 'string');
  const items = menu.findAll((n) => typeof n.type === 'string' && /^menuitem/.test(n.props.accessibilityRole ?? ''));
  expect(items[items.length - 1].props.accessibilityLabel).toBe('Sair');
  expect(menu.findAll((n) => n.props.testID === 'common.divider' && typeof n.type === 'string')).toHaveLength(1);
  await press(tree, 'Sair');
  expect(onLogout).toHaveBeenCalledTimes(1);
});

function ActiveTheme() {
  const { style, mode } = useTheme();
  return <Text testID="active-theme">{`${style}/${mode}`}</Text>;
}

function Preferences({ children }: { children: React.ReactNode }) {
  return (
    <TabReorderContext.Provider value={useReorderChoice()}>
      <InventoryTutorialContext.Provider value={useInventoryTutorialChoice(true, () => {})}>{children}</InventoryTutorialContext.Provider>
    </TabReorderContext.Provider>
  );
}

// Opens the menu on a phone with a screen lock and checks it says nothing of one; then on a phone without, and checks
// "Definir bloqueio de tela" says a lock would protect the inventory, under Segurança, and opens Android's settings.
test('Mobile: a phone with no screen lock is told one would protect the inventory', async () => {
  const native = NativeModules.InventoryCopy as { hasLock: jest.Mock; openLockSettings: jest.Mock };
  let tree = await openMenu();
  expect(tree.root.findAll((n) => n.type === Text && n.props.children === 'Segurança')).toHaveLength(0);
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((each) => each.unmount()));

  native.hasLock.mockResolvedValueOnce(false);
  tree = await openMenu();
  expect(tree.root.findAll((n) => n.type === Text && n.props.children === 'Segurança')).not.toHaveLength(0);
  expect(byName(tree, 'Definir bloqueio de tela').props.accessibilityHint).toBe(NO_LOCK_TEXT);
  await press(tree, 'Definir bloqueio de tela');
  expect(native.openLockSettings).toHaveBeenCalledTimes(1);
});
