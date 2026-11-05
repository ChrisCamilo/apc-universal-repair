/**
 * @format
 */

import React from 'react';
import { BackHandler, NativeModules, StyleSheet, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { CodeScanner } from 'react-native-vision-camera-barcode-scanner';
import { fingerprintGroups, pairingLink } from '@apc/shared/pairing';
import { isStyleId } from '@apc/shared/style-ids';
import { MODES, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { apiUrl, applyServer, SERVER_STORAGE_KEY } from '../src/api';
import { ConnectScreen } from '../src/auth/ConnectScreen';
import { themeStorage, ThemeProvider } from '../src/theme';

/** The home server, as the Servidor dialog's QR code carries it. */
const SERVER = { url: 'https://192.168.0.10:3000', fingerprint: 'q1Wn7ZbX-0_aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV' };
/** The server the phone was paired with before. */
const BEFORE = { url: 'https://192.168.0.20:3000', fingerprint: 'Zz9y8X7w6V5u4T3s2R1q0P9o8N7m6L5k4J3i2H1g0Fe' };
const UNREACHABLE =
  'O servidor não respondeu. Confira se o celular está no Wi-Fi de casa, se o Acesso pelo celular está ligado no computador e se o código é o que aparece lá agora.';

/**
 * Finds a button by the label it shows.
 * @param tree Rendered tree.
 * @param label The button's label.
 * @returns The button's Pressable, or undefined when there is none.
 */
function button(tree: ReactTestRenderer.ReactTestRenderer, label: string): ReactTestRenderer.ReactTestInstance | undefined {
  return tree.root.findAll(
    (n) => typeof n.props.style === 'function' && n.findAll((t) => typeof t.type === 'string' && t.props.children === label).length > 0,
  )[0];
}

/**
 * Finds the view with a style id.
 * @param tree Rendered tree.
 * @param id The style id, e.g. "auth.connect-screen.camera".
 * @returns The native view that carries it.
 */
function byId(tree: ReactTestRenderer.ReactTestRenderer, id: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find((n) => typeof n.type === 'string' && n.props.testID === id);
}

/**
 * Saves a style and mode, renders the screen inside a ThemeProvider and waits for it to load them.
 * @param props The screen's props.
 * @param style Style to start on.
 * @param mode Mode to start on.
 * @returns The rendered tree.
 */
async function mount(props: Partial<React.ComponentProps<typeof ConnectScreen>> = {}, style: Style = 'eighties', mode: Mode = 'night') {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <ConnectScreen onConnected={() => {}} {...props} />
      </ThemeProvider>,
    );
  });
  return tree!;
}

/**
 * Presses a button by the label it shows.
 * @param tree Rendered tree.
 * @param label The button's label.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  await ReactTestRenderer.act(async () => button(tree, label)!.props.onPress?.());
}

/**
 * Hands the camera's scanner a code it read.
 * @param text What the code holds.
 */
async function scan(text: string) {
  const { onBarcodeScanned } = (CodeScanner as unknown as jest.Mock).mock.calls.at(-1)[0];
  await ReactTestRenderer.act(async () => onBarcodeScanned([{ rawValue: text }]));
}

/**
 * Tells whether a text shows anywhere in the tree.
 * @param tree Rendered tree.
 * @param text Text to look for.
 * @returns True when a host Text holds it.
 */
function shows(tree: ReactTestRenderer.ReactTestRenderer, text: string): boolean {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.props.children === text).length > 0;
}

/**
 * Types into a field.
 * @param tree Rendered tree.
 * @param label The field's label.
 * @param text Text to type.
 */
async function type(tree: ReactTestRenderer.ReactTestRenderer, label: string, text: string) {
  const input = tree.root.find((n) => n.type === TextInput && n.props.accessibilityLabel === label);
  await ReactTestRenderer.act(async () => input.props.onChangeText(text));
}

/**
 * Answers the server's /health.
 * @param ok Whether it answers with a success, or undefined for no answer at all.
 */
function answer(ok?: boolean) {
  (fetch as jest.Mock).mockImplementationOnce(() => (ok === undefined ? Promise.reject(new TypeError('Network request failed')) : Promise.resolve({ ok })));
}

beforeEach(async () => {
  await themeStorage.clear();
  applyServer(null);
  (fetch as jest.Mock).mockClear();
  (CodeScanner as unknown as jest.Mock).mockClear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Draws the screen in each style and mode and checks the camera's square is framed and filled with the theme's
    // hairline and panel, and the scanner fills it.
    test(`Mobile: Conectar ao servidor draws in ${style} ${mode}`, async () => {
      const tree = await mount({}, style, mode);
      const camera = StyleSheet.flatten(byId(tree, 'auth.connect-screen.camera').props.style);
      expect(camera).toMatchObject({ aspectRatio: 1, borderColor: themes[style][mode].colors.hairline, backgroundColor: themes[style][mode].colors.panel });
      expect((CodeScanner as unknown as jest.Mock).mock.calls.at(-1)[0]).toMatchObject({ isActive: true, barcodeFormats: ['qr-code'] });
    });
  }
}

// Reads the Servidor dialog's QR code with the camera, and checks the phone asks the server's /health through the
// pinned certificate, then keeps the server, uses it as its API and hands it to the owner.
test('Mobile: the camera reads the QR code and the phone pairs with the server', async () => {
  const onConnected = jest.fn();
  const tree = await mount({ onConnected });
  answer(true);
  await scan(pairingLink(SERVER));
  expect((fetch as jest.Mock).mock.calls[0][0]).toBe(`${SERVER.url}/health`);
  expect(NativeModules.ServerPin.pin).toHaveBeenLastCalledWith('192.168.0.10', SERVER.fingerprint);
  expect(apiUrl()).toBe(SERVER.url);
  expect(JSON.parse((await themeStorage.getItem(SERVER_STORAGE_KEY))!)).toEqual(SERVER);
  expect(onConnected).toHaveBeenCalledWith(SERVER);
  expect(shows(tree, UNREACHABLE)).toBe(false);
});

// Reads a QR code that isn't the APC's, and checks the screen says so and asks no server.
test('Mobile: a code that isn’t the APC’s is refused', async () => {
  const tree = await mount();
  await scan('https://example.com/menu');
  expect(shows(tree, 'Esse código não é o do APC. Use o que aparece em Servidor e banco de dados, no computador.')).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

// Scans a server that doesn't answer, with another one paired before, and checks the screen says what to check, the
// server of before stays the API's and pinned, nothing new is kept, and the owner isn't told.
test('Mobile: a server that doesn’t answer leaves the one of before', async () => {
  applyServer(BEFORE);
  const onConnected = jest.fn();
  const tree = await mount({ onConnected });
  answer();
  await scan(pairingLink(SERVER));
  expect(shows(tree, UNREACHABLE)).toBe(true);
  expect(apiUrl()).toBe(BEFORE.url);
  expect(NativeModules.ServerPin.pin).toHaveBeenLastCalledWith('192.168.0.20', BEFORE.fingerprint);
  expect(await themeStorage.getItem(SERVER_STORAGE_KEY)).toBeNull();
  expect(onConnected).not.toHaveBeenCalled();
});

// Checks the screen opens on the camera alone, with no field; "Digitar manualmente" puts the camera away for the
// address and the code, saying to type them, and "Ler QR Code" brings the camera back without the fields.
test('Mobile: Digitar manualmente swaps the camera for the fields, and Ler QR Code swaps them back', async () => {
  const tree = await mount();
  const fields = () => tree.root.findAll((n) => n.type === TextInput);
  const camera = () => tree.root.findAll((n) => n.props.testID === 'auth.connect-screen.camera');
  expect(camera()).not.toHaveLength(0);
  expect(fields()).toHaveLength(0);
  expect(button(tree, 'Conectar')).toBeUndefined();
  expect(button(tree, 'Ler QR Code')).toBeUndefined();

  await press(tree, 'Digitar manualmente');
  expect(camera()).toHaveLength(0);
  expect(fields().map((field) => field.props.accessibilityLabel)).toEqual(['Endereço', 'Código']);
  expect(shows(tree, 'No computador, abra Servidor e banco de dados e ligue o Acesso pelo celular. Depois, digite o endereço e o código que aparecem lá.')).toBe(true);
  expect(button(tree, 'Conectar')).toBeDefined();
  expect(button(tree, 'Digitar manualmente')).toBeUndefined();

  await press(tree, 'Ler QR Code');
  expect(camera()).not.toHaveLength(0);
  expect(fields()).toHaveLength(0);
  expect((CodeScanner as unknown as jest.Mock).mock.calls.at(-1)[0]).toMatchObject({ isActive: true });
});

// Types an http:// address and a short code, and checks each field says what it expects; then types the address and
// the code as the dialog shows them, the code in groups, and checks the phone pairs.
test('Mobile: the address and the code typed in pair the same way', async () => {
  const onConnected = jest.fn();
  const tree = await mount({ onConnected });
  await press(tree, 'Digitar manualmente');
  await type(tree, 'Endereço', 'http://192.168.0.10:3000');
  await type(tree, 'Código', 'q1Wn 7ZbX');
  await press(tree, 'Conectar');
  expect(shows(tree, 'Digite o endereço que aparece no computador, como 192.168.0.10:3000.')).toBe(true);
  expect(shows(tree, 'O código tem 43 letras, números, - e _, como aparece no computador.')).toBe(true);
  expect(fetch).not.toHaveBeenCalled();

  await type(tree, 'Endereço', '192.168.0.10:3000');
  await type(tree, 'Código', fingerprintGroups(SERVER.fingerprint));
  answer(true);
  await press(tree, 'Conectar');
  expect(onConnected).toHaveBeenCalledWith(SERVER);
});

// Starts with the camera not allowed yet, and checks a tap asks for it; then refused for good, and checks the screen
// says to allow it in Android's settings; then on a phone without a camera, which opens on the fields, with nothing
// to bring a camera back.
test('Mobile: the camera asks for its permission, or says why it can’t read', async () => {
  const requestPermission = jest.fn(async () => true);
  const permission = useCameraPermission as jest.Mock;
  permission.mockReturnValueOnce({ status: 'not-determined', hasPermission: false, canRequestPermission: true, requestPermission });
  const asking = await mount();
  expect(CodeScanner).not.toHaveBeenCalled();
  await press(asking, 'Ler o código com a câmera');
  expect(requestPermission).toHaveBeenCalledTimes(1);

  permission.mockReturnValueOnce({ status: 'denied', hasPermission: false, canRequestPermission: false, requestPermission });
  const blocked = await mount();
  expect(shows(blocked, 'A câmera está bloqueada para o APC. Libere-a nas configurações do Android, ou toque em Digitar manualmente.')).toBe(true);

  (useCameraDevice as jest.Mock).mockReturnValue(undefined);
  const none = await mount();
  (useCameraDevice as jest.Mock).mockReturnValue({ id: 'back' });
  expect(none.root.findAll((n) => n.props.testID === 'auth.connect-screen.camera')).toHaveLength(0);
  expect(none.root.findAll((n) => n.type === TextInput)).toHaveLength(2);
  expect(button(none, 'Ler QR Code')).toBeUndefined();
  expect(button(none, 'Digitar manualmente')).toBeUndefined();
});

// Opens the screen to pair again and checks "Voltar" and Android's back button go back; opened with no server
// paired, there is nothing to go back to.
test('Mobile: Voltar and the back button go back when a server is paired', async () => {
  const onCancel = jest.fn();
  const listeners: (() => boolean)[] = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
    listeners.push(listener as () => boolean);
    return { remove: () => {} };
  });
  const tree = await mount({ onCancel });
  await press(tree, 'Voltar');
  expect(listeners.at(-1)!()).toBe(true);
  expect(onCancel).toHaveBeenCalledTimes(2);
  expect(button(await mount(), 'Voltar')).toBeUndefined();
});

// Checks the parts of the screen carry their style ids, and every id on the screen is written as the convention asks.
test('Mobile: Conectar ao servidor carries its style ids', async () => {
  const tree = await mount({ onCancel: () => {} });
  for (const part of ['', '.heading', '.camera', '.actions']) {
    expect(byId(tree, `auth.connect-screen${part}`)).toBeDefined();
  }
  await press(tree, 'Digitar manualmente');
  expect(byId(tree, 'auth.connect-screen.form')).toBeDefined();
  const ids = tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props.testID === 'string').map((n) => n.props.testID);
  expect(ids.filter((id) => id.startsWith('auth.') && !isStyleId(id))).toEqual([]);
});
