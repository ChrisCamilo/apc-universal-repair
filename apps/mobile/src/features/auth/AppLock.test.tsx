/**
 * @format
 */

import React from 'react';
import { AppState, Modal, NativeModules, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { PHONE_TEXTS } from '../../app/phoneTexts';
import { AppLock, LOCK_AWAY_MS } from './AppLock';
import { ThemeProvider } from '../../app/theme';
import { LocaleContext } from '../../app/locale';
import type { Locale } from '@apc/domain/locale';

// The app behind the phone's own lock: it opens once the lock is confirmed, says the inventory is locked when it is
// refused, with Desbloquear to ask again, and asks again back from a while away, over the app as it was. The native
// side's prompt is the setup's stand-in, which a test answers.

/** The native side that asks for the phone's lock (InventoryCopyModule.kt), as the setup stands in for it. */
const native = NativeModules.InventoryCopy as { unlock: jest.Mock; lock: jest.Mock };
/** Trees the tests rendered, unmounted after each. */
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

/**
 * Renders the lock over a screen of the app.
 * @returns The rendered tree.
 */
async function mount(locale: Locale = 'pt-BR') {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 780 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }}>
        <ThemeProvider>
          <LocaleContext.Provider value={{ locale, setLocale: () => {} }}>
            <AppLock>
              <Text>Estoque do app</Text>
            </AppLock>
          </LocaleContext.Provider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(tree!);
  return tree!;
}

/**
 * Lists the texts on screen.
 * @param tree Rendered tree.
 * @returns Every Text's content.
 */
function texts(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAll((n) => n.type === Text && typeof n.props.children === 'string').map((n) => n.props.children);
}

/**
 * Tells whether the lock covers the app.
 * @param tree Rendered tree.
 * @returns True while its screen shows.
 */
function covered(tree: ReactTestRenderer.ReactTestRenderer): boolean {
  return tree.root.findByType(Modal).props.visible;
}

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted.splice(0).forEach((tree) => tree.unmount()));
  native.unlock.mockImplementation(async () => 'open');
});

// Starts the app with the lock not yet confirmed and checks nothing of the app shows, the prompt asked with its texts;
// then confirms it and checks the app shows, uncovered.
test('Mobile: the app opens once the phone\'s lock is confirmed', async () => {
  let confirm: (result: string) => void = () => {};
  native.unlock.mockImplementation(() => new Promise((resolve) => (confirm = resolve)));
  const tree = await mount();
  expect(native.unlock).toHaveBeenLastCalledWith(PHONE_TEXTS['pt-BR'].appLock.title, PHONE_TEXTS['pt-BR'].appLock.subtitle);
  expect(texts(tree)).not.toContain('Estoque do app');
  expect(covered(tree)).toBe(true);
  await ReactTestRenderer.act(async () => confirm('open'));
  expect(texts(tree)).toContain('Estoque do app');
  expect(covered(tree)).toBe(false);
});

// Refuses the lock and checks the app stays hidden behind "Estoque bloqueado" and why, with Desbloquear; then presses
// it, confirms the lock and checks the app shows.
test('Mobile: a refused lock says the inventory is locked, and Desbloquear asks again', async () => {
  native.unlock.mockImplementationOnce(async () => 'cancelled');
  const tree = await mount();
  expect(texts(tree)).toEqual(expect.arrayContaining([PHONE_TEXTS['pt-BR'].appLock.locked, PHONE_TEXTS['pt-BR'].appLock.why]));
  expect(texts(tree)).not.toContain('Estoque do app');
  const unlock = tree.root.find((n) => typeof n.props.onPress === 'function' && n.findAll((c) => c.type === Text && c.props.children === PHONE_TEXTS['pt-BR'].appLock.unlock).length > 0);
  await ReactTestRenderer.act(async () => unlock.props.onPress());
  expect(texts(tree)).toContain('Estoque do app');
  expect(covered(tree)).toBe(false);
});

// Leaves the app for less than LOCK_AWAY_MS and checks it comes back open; then for LOCK_AWAY_MS and checks the copy's
// key is dropped and the lock asked again over the app, still there under it, which shows again once confirmed.
test('Mobile: back from a while away, the lock is asked again over the app as it was', async () => {
  // The listeners the lock gives React Native's AppState, whose stand-in the preset makes; put back as it was after.
  const listeners: ((state: string) => void)[] = [];
  const addListener = AppState.addEventListener as jest.Mock;
  const preset = addListener.getMockImplementation();
  addListener.mockImplementation((_event, listener) => {
    listeners.push(listener);
    return { remove: () => {} };
  });
  const now = jest.spyOn(Date, 'now');
  /** Leaves the app, then comes back after some time. */
  const away = async (ms: number) => {
    now.mockReturnValue(1_000_000);
    await ReactTestRenderer.act(async () => listeners.forEach((listener) => listener('background')));
    now.mockReturnValue(1_000_000 + ms);
  };
  try {
    const tree = await mount();
    native.unlock.mockClear();
    await away(LOCK_AWAY_MS - 1000);
    await ReactTestRenderer.act(async () => listeners.forEach((listener) => listener('active')));
    expect(native.lock).not.toHaveBeenCalled();
    expect(native.unlock).not.toHaveBeenCalled();

    let confirm: (result: string) => void = () => {};
    native.unlock.mockImplementation(() => new Promise((resolve) => (confirm = resolve)));
    await away(LOCK_AWAY_MS);
    await ReactTestRenderer.act(async () => listeners.forEach((listener) => listener('active')));
    expect(native.lock).toHaveBeenCalledTimes(1);
    expect(native.unlock).toHaveBeenCalledTimes(1);
    expect(covered(tree)).toBe(true);
    expect(texts(tree)).toContain('Estoque do app');
    await ReactTestRenderer.act(async () => confirm('open'));
    expect(covered(tree)).toBe(false);
  } finally {
    addListener.mockImplementation(preset);
    now.mockRestore();
  }
});

// Asks for the phone's lock in English and refuses it, and checks the prompt and the locked screen read in English.
test('Mobile: the lock reads in English', async () => {
  native.unlock.mockResolvedValue('cancelled');
  const tree = await mount('en-US');
  expect(native.unlock).toHaveBeenLastCalledWith('Unlock APC', "Use the phone's fingerprint, face or screen lock to open the inventory.");
  expect(texts(tree)).toEqual(expect.arrayContaining(['Inventory locked', "This phone's inventory is protected by its screen lock.", 'Unlock']));
});
