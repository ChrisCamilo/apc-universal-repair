/**
 * @format
 */

import React from 'react';
import { AppState, Linking, NativeModules, PermissionsAndroid, Platform, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/ui-spec/screens';
import { Button } from '../../components/Button';
import { NotificationsMenu } from './NotificationsMenu';
import { NOTIFICATIONS_ASKED_KEY, OPEN_NOTIFICATIONS_URL } from './systemNotifications';
import { themeStorage, ThemeProvider } from '../../app/theme';
import { ToastProvider, useToast } from '../../components/Toast';

// The app's notifications in the Android shade, as the screen handles them: the permission asked once, the first time an
// error or a warning shows in the foreground, on Android 13 and later, a refusal raising no error; nothing asked or
// shown from the background, where the copy's sync shows them (see BackgroundSync.test.ts); and a tap opening the bell's
// notifications. The native side and Android's permission are stand-ins.

const SAFE_AREA = { frame: { x: 0, y: 0, width: MIN_MOBILE_WIDTH, height: MIN_MOBILE_HEIGHT }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
/** The native side that shows the notifications (SystemNotificationsModule.kt), as the setup stands in for it. */
const native = NativeModules.SystemNotifications as { show: jest.Mock };
/** The AppState stand-in's own currentState, put back after each test. */
const presetState = AppState.currentState;
/** The trees the test rendered, unmounted after it. */
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

/**
 * Puts the app in the foreground or the background, as AppState reads it.
 * @param state The state.
 */
function setAppState(state: 'active' | 'background') {
  (AppState as { currentState: unknown }).currentState = state;
}

/** Buttons that show a toast of each kind the tests need. */
function Triggers() {
  const toast = useToast();
  return (
    <>
      <Button onPress={() => toast.warning('Estoque baixo: Filtro de óleo.')}>Aviso</Button>
      <Button onPress={() => toast.error('Não foi possível sincronizar.')}>Erro</Button>
      <Button onPress={() => toast.success('Item salvo.')}>Sucesso</Button>
    </>
  );
}

/**
 * Renders the bell with the buttons, on Android 14, the app in the foreground or the background.
 * @param state The app's state.
 * @returns The rendered tree.
 */
async function mount(state: 'active' | 'background') {
  setAppState(state);
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <ToastProvider>
            <NotificationsMenu userId="user-christian" />
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
 * Presses a button by its text.
 * @param tree Rendered tree.
 * @param name The text.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  const node = tree.root.find((n) => typeof n.props.onPress === 'function' && n.findAll((c) => c.type === Text && c.props.children === name).length > 0);
  await ReactTestRenderer.act(async () => node.props.onPress());
}

beforeEach(async () => {
  await themeStorage.clear();
  native.show.mockClear();
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(34);
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
  jest.restoreAllMocks();
  (AppState as { currentState: unknown }).currentState = presetState;
});

// Raises a warning and an error with the app in the background, and checks the screen neither shows them in the shade
// (the copy's sync in the background does, see BackgroundSync.test.ts) nor asks for the permission, which needs the app
// in sight.
test('Mobile: a toast raised in the background asks nothing, the background sync being what reaches the shade', async () => {
  const ask = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  const tree = await mount('background');
  await press(tree, 'Aviso');
  await press(tree, 'Erro');
  expect(native.show).not.toHaveBeenCalled();
  expect(ask).not.toHaveBeenCalled();
});

// Raises a success and two warnings with the app in the foreground and checks the permission is asked once, at the
// first warning, and not for the success; refused, nothing fails, and it isn't asked again.
test('Mobile: the permission is asked once, the first time a warning or an error shows in the foreground', async () => {
  const ask = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
  const tree = await mount('active');
  await press(tree, 'Sucesso');
  expect(ask).not.toHaveBeenCalled();
  await press(tree, 'Aviso');
  await press(tree, 'Erro');
  expect(ask.mock.calls).toEqual([[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS]]);
  expect(await themeStorage.getItem(NOTIFICATIONS_ASKED_KEY)).toBe('1');
  expect(native.show).not.toHaveBeenCalled();
});

// Raises a warning in the foreground on Android 12, which has no permission to ask for, and checks nothing is asked.
test('Mobile: Android 12 and earlier ask for nothing', async () => {
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(31);
  const ask = jest.spyOn(PermissionsAndroid, 'request');
  const tree = await mount('active');
  await press(tree, 'Aviso');
  expect(ask).not.toHaveBeenCalled();
});

// Taps a notification, as Android hands the app its link, and checks the bell's notifications open with the warning
// raised before; another link opens nothing.
test('Mobile: a tap on a notification opens the bell\'s notifications', async () => {
  const listeners: ((event: { url: string }) => void)[] = [];
  jest.spyOn(Linking, 'addEventListener').mockImplementation(((_event: string, listener: (event: { url: string }) => void) => {
    listeners.push(listener);
    return { remove: () => {} };
  }) as unknown as typeof Linking.addEventListener);
  const tree = await mount('background');
  await press(tree, 'Aviso');
  const open = () => tree.root.findAll((n) => n.type === Text && n.props.children === 'Notificações').length > 0;
  await ReactTestRenderer.act(async () => listeners.forEach((listener) => listener({ url: 'apcuniversalrepair://other' })));
  expect(open()).toBe(false);
  await ReactTestRenderer.act(async () => listeners.forEach((listener) => listener({ url: OPEN_NOTIFICATIONS_URL })));
  expect(open()).toBe(true);
  expect(tree.root.findAll((n) => n.type === Text && n.props.children === 'Estoque baixo: Filtro de óleo.')).not.toHaveLength(0);
});
