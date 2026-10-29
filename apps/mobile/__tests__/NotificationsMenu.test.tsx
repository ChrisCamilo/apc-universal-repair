/**
 * @format
 */

import React from 'react';
import { Modal, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { addNotification, notificationsKey, type Notification } from '@apc/shared/notifications';
import { MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens';
import { scales, THEME_STORAGE_KEYS, themes } from '@apc/shared/theme';
import { TOAST_DURATION, TOAST_DURATION_STORAGE_KEY, TOAST_KIND_LOOKS } from '@apc/shared/toast';
import { Button } from '../src/Button';
import { Icon } from '../src/Icon';
import { NotificationsMenu } from '../src/notifications/NotificationsMenu';
import { themeStorage, ThemeProvider, withAlpha } from '../src/theme';
import { ToastProvider, useToast } from '../src/Toast';

const SAFE_AREA = { frame: { x: 0, y: 0, width: MIN_MOBILE_WIDTH, height: MIN_MOBILE_HEIGHT }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const USER_ID = 'user-christian';
// The trees rendered by the test running, unmounted after it so no toast timer outlives it.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

/**
 * Finds Alertas, in the bottom bar, by the start of its accessible name.
 * @param tree Rendered tree.
 * @returns The bar entry.
 */
function bell(tree: ReactTestRenderer.ReactTestRenderer): ReactTestRenderer.ReactTestInstance {
  return tree.root.find((n) => typeof n.type !== 'string' && typeof n.props.onPress === 'function' && /^Alertas/.test(n.props.accessibilityLabel ?? ''));
}

/**
 * Reads the unread badge on Alertas' pill.
 * @param tree Rendered tree.
 * @returns The texts it shows.
 */
function badge(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return texts(tree.root.find((n) => n.props.testID === 'dashboard.bottom-bar.item.pill.badge' && typeof n.type === 'string'));
}

/**
 * Finds a pressable of the full screen by its accessible name or its text, e.g. a button of "Tempo do aviso".
 * @param tree Rendered tree.
 * @param name Its accessible name.
 * @returns The pressable.
 */
function button(tree: ReactTestRenderer.ReactTestRenderer, name: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find(
    (n) =>
      typeof n.type !== 'string' &&
      n.props.accessibilityState &&
      (n.props.accessibilityLabel === name || (n.props.accessibilityRole === 'button' && n.findAll((c) => c.type === Text && c.props.children === name).length > 0)),
  );
}

/**
 * Renders Alertas for a user, with buttons that show toasts, in the app's providers, and waits for its saved list.
 * @param userId The logged user's id.
 * @returns The rendered tree.
 */
async function mount(userId = USER_ID): Promise<ReactTestRenderer.ReactTestRenderer> {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: 'eighties', [THEME_STORAGE_KEYS.mode]: 'night' });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <ToastProvider>
            <NotificationsMenu userId={userId} />
            <Triggers />
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  return tree!;
}

/**
 * Presses the pressable with a visible text or accessible name.
 * @param tree Rendered tree.
 * @param name The text or name.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  const node = tree.root.find(
    (n) =>
      typeof n.type !== 'string' &&
      typeof n.props.onPress === 'function' &&
      (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
  );
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Reads the texts shown, in order.
 * @param node Where to read them.
 * @returns Each Text's content.
 */
function texts(node: ReactTestRenderer.ReactTestInstance): string[] {
  return node.findAll((n) => n.type === Text).map((n) => [n.props.children].flat().join(''));
}

/**
 * Saves notifications for a user, as earlier visits would have.
 * @param userId The user's id.
 * @param count How many, all unread.
 */
async function saveUnread(userId: string, count: number) {
  let list: Notification[] = [];
  for (let index = 1; index <= count; index++) {
    list = addNotification(list, 'info', `Aviso ${index}`, new Date());
  }
  await themeStorage.setItem(notificationsKey(userId), JSON.stringify(list));
}

beforeEach(async () => {
  await themeStorage.clear();
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
});

// Shows a success and an error toast and checks Alertas counts 2 unread on its name and badge; it opens the full screen
// titled "Notificações", listing the error first, then the success, each with its kind's icon in its color, the ones
// that were unread lit, and "agora". Opening it clears the count, and the list is saved under the user's key, read.
test('Mobile: Alertas counts the unread toasts and lists them, newest first, in a full screen', async () => {
  const tree = await mount();
  expect(bell(tree).props.accessibilityLabel).toBe('Alertas');
  await press(tree, 'Sucesso');
  await press(tree, 'Erro');
  expect(bell(tree).props.accessibilityLabel).toBe('Alertas, 2 não lidas');
  expect(badge(tree)).toEqual(['2']);

  await ReactTestRenderer.act(async () => bell(tree).props.onPress());
  const menu = tree.root.findByType(Modal);
  expect(menu.props.visible).toBe(true);
  expect(texts(menu)).toContain('Notificações');
  const entries = menu.findAll((n) => n.props.testID === 'notifications.menu.list.item' && typeof n.type === 'string');
  expect(entries.map(texts)).toEqual([
    ['Não foi possível salvar o item. Tente de novo.', 'agora'],
    ['Item “Filtro de óleo” cadastrado.', 'agora'],
  ]);
  const { colors } = themes.eighties.night;
  expect(entries.map((entry) => entry.findByType(Icon).props.color)).toEqual([colors[TOAST_KIND_LOOKS.error.color], colors[TOAST_KIND_LOOKS.success.color]]);
  expect(entries.map((entry) => StyleSheet.flatten(entry.props.style).backgroundColor)).toEqual([
    withAlpha(colors.accent, scales.accentSoft.night),
    withAlpha(colors.accent, scales.accentSoft.night),
  ]);
  expect(bell(tree).props.accessibilityLabel).toBe('Alertas');
  const saved = JSON.parse((await themeStorage.getItem(notificationsKey(USER_ID)))!) as Notification[];
  expect(saved.map((notification) => [notification.kind, notification.read])).toEqual([
    ['error', true],
    ['success', true],
  ]);
});

// Starts with 12 unread notifications saved, and checks the badge says "9+".
test('Mobile: the badge shows 9+ above nine unread', async () => {
  await saveUnread(USER_ID, 12);
  const tree = await mount();
  expect(bell(tree).props.accessibilityLabel).toBe('Alertas, 9+ não lidas');
  expect(badge(tree)).toEqual(['9+']);
});

// Opens Alertas with nothing kept, and checks the screen says there are no notifications and "Limpar notificações" is
// off; the × closes it. Then shows a toast, and checks "Limpar notificações" empties the list again.
test('Mobile: Alertas says when it has nothing, and clears what it has', async () => {
  const tree = await mount();
  await ReactTestRenderer.act(async () => bell(tree).props.onPress());
  expect(texts(tree.root.findByType(Modal))).toContain('Nenhuma notificação');
  expect(button(tree, 'Limpar notificações').props.accessibilityState).toMatchObject({ disabled: true });
  await press(tree, 'Fechar');
  expect(bell(tree).props.accessibilityState).toMatchObject({ expanded: false });

  await press(tree, 'Sucesso');
  await ReactTestRenderer.act(async () => bell(tree).props.onPress());
  expect(button(tree, 'Limpar notificações').props.accessibilityState).toMatchObject({ disabled: false });
  await press(tree, 'Limpar notificações');
  expect(texts(tree.root.findByType(Modal))).toContain('Nenhuma notificação');
  expect(JSON.parse((await themeStorage.getItem(notificationsKey(USER_ID)))!)).toEqual([]);
});

// Saves notifications for another user, and checks this user's Alertas shows none of them, and that user's shows theirs.
test('Mobile: each user sees only their own notifications', async () => {
  await saveUnread('user-oficina', 3);
  expect(bell(await mount()).props.accessibilityLabel).toBe('Alertas');
  expect(bell(await mount('user-oficina')).props.accessibilityLabel).toBe('Alertas, 3 não lidas');
});

// Opens Alertas and checks "Tempo do aviso" sits on top of the full screen, with no gear, starting at 5 s, its − and +
// 44px for a finger; each press applies at once, is saved and keeps the screen open; − stops at 2 s and + at 15 s.
test('Mobile: Tempo do aviso sets how long a toast stays, from 2 s to 15 s', async () => {
  const tree = await mount();
  await ReactTestRenderer.act(async () => bell(tree).props.onPress());
  expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Configurações das notificações')).toHaveLength(0);
  const value = () => [tree.root.find((n) => n.props.testID === 'notifications.settings.stepper.value' && typeof n.type === 'string').props.children];
  expect(value()).toEqual(['5 s']);
  for (const name of ['Diminuir o tempo do aviso', 'Aumentar o tempo do aviso']) {
    const style = StyleSheet.flatten([button(tree, name).props.style].flat());
    expect([style.width, style.height]).toEqual([scales.touch.icon, scales.touch.icon]);
  }

  await press(tree, 'Aumentar o tempo do aviso');
  expect(value()).toEqual(['6 s']);
  expect(await themeStorage.getItem(TOAST_DURATION_STORAGE_KEY)).toBe('6000');
  expect(tree.root.findByType(Modal).props.visible).toBe(true);
  for (let step = 0; step < 4; step++) await press(tree, 'Diminuir o tempo do aviso');
  expect(value()).toEqual(['2 s']);
  expect(button(tree, 'Diminuir o tempo do aviso').props.accessibilityState).toEqual({ disabled: true });
  for (let step = 0; step < 13; step++) await press(tree, 'Aumentar o tempo do aviso');
  expect(value()).toEqual(['15 s']);
  expect(button(tree, 'Aumentar o tempo do aviso').props.accessibilityState).toEqual({ disabled: true });
  expect(await themeStorage.getItem(TOAST_DURATION_STORAGE_KEY)).toBe(String(TOAST_DURATION.maxMs));
});

// Starts with 3 s saved and checks a toast stays 3 s, then starts to leave.
test('Mobile: the time picked applies to the next toast', async () => {
  await themeStorage.setItem(TOAST_DURATION_STORAGE_KEY, '3000');
  const tree = await mount();
  jest.useFakeTimers();
  try {
    await press(tree, 'Sucesso');
    const leaving = () => tree.root.find((n) => n.props.testID === 'common.toast.message' && typeof n.type === 'string').props.accessibilityElementsHidden;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(2999);
    });
    expect(leaving()).toBe(false);
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(leaving()).toBe(true);
  } finally {
    jest.useRealTimers();
  }
});

function Triggers() {
  const toast = useToast();
  return (
    <>
      <Button onPress={() => toast.success('Item “Filtro de óleo” cadastrado.')}>Sucesso</Button>
      <Button onPress={() => toast.error('Não foi possível salvar o item. Tente de novo.')}>Erro</Button>
    </>
  );
}
