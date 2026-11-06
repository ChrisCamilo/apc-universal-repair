/**
 * @format
 */

import React from 'react';
import { AppState, Linking, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {
  apkName,
  dayKey,
  DISMISSED_UPDATE_KEY,
  isNewer,
  LATEST_RELEASE_URL,
  releaseUpdate,
  shouldOffer,
  type Release,
} from '../src/updates/appUpdate';
import { UpdatePrompt } from '../src/updates/UpdatePrompt';
import { themeStorage, ThemeProvider } from '../src/app/theme';

const INSTALLED = '0.6.8';
const NEXT = '0.6.9';
const APK_URL = `https://github.com/ChrisCamilo/apc-universal-repair/releases/download/v${NEXT}/${apkName(NEXT)}`;
// The latest release as GitHub answers it: the next version, with its APK beside the desktop files.
const RELEASE: Release = {
  tag_name: `v${NEXT}`,
  assets: [
    { name: `APC-Universal-Repair-Setup-${NEXT}.exe`, browser_download_url: 'https://example.invalid/setup.exe' },
    { name: apkName(NEXT), browser_download_url: APK_URL },
  ],
};
const TITLE = `Nova versão ${NEXT} disponível`;

/**
 * Answers the next request to GitHub with a release.
 * @param release The release to answer with.
 */
function answer(release: Release) {
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(release) });
}

/**
 * Renders the prompt, checking for updates, and waits for the check.
 * @returns The rendered tree.
 */
async function mount() {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <UpdatePrompt enabled installed={INSTALLED} />
      </ThemeProvider>,
    );
  });
  return tree!;
}

/**
 * Presses the button with a text.
 * @param tree Rendered tree.
 * @param label The button's text.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  const node = tree.root.findAll((n) => typeof n.props.onPress === 'function' && n.findAll((t) => t.type === Text && t.props.children === label).length > 0)[0];
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Tells whether a text is on screen.
 * @param tree Rendered tree.
 * @param text Exact text.
 * @returns True when a Text shows it.
 */
function shows(tree: ReactTestRenderer.ReactTestRenderer, text: string): boolean {
  return tree.root.findAll((n) => n.type === Text && n.props.children === text).length > 0;
}

beforeEach(async () => {
  await themeStorage.clear();
  jest.useFakeTimers({ now: new Date(2026, 10, 4, 9, 0), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Compares versions part by part, with or without the tag's "v", and treats anything that isn't major.minor.patch as
// not newer.
test('Mobile: a version is newer only by its numbers, part by part', () => {
  expect(isNewer('0.6.9', '0.6.8')).toBe(true);
  expect(isNewer('v0.6.10', '0.6.9')).toBe(true);
  expect(isNewer('1.0.0', '0.99.99')).toBe(true);
  expect(isNewer('0.6.8', '0.6.8')).toBe(false);
  expect(isNewer('0.6.7', '0.6.8')).toBe(false);
  expect(isNewer('0.5.20', '0.6.0')).toBe(false);
  expect(isNewer('0.7', '0.6.8')).toBe(false);
  expect(isNewer('0.7.0-beta', '0.6.8')).toBe(false);
  expect(isNewer('0.7.0', 'dev')).toBe(false);
});

// Reads the APK's address from a newer release, and nothing from one that is the same version, carries no APK of its
// version, or isn't a release at all; and offers a version unless that one was put off today.
test('Mobile: a newer release with its APK is offered unless put off today', () => {
  expect(releaseUpdate(RELEASE, INSTALLED)).toEqual({ version: NEXT, url: APK_URL });
  expect(releaseUpdate(RELEASE, NEXT)).toBeNull();
  expect(releaseUpdate({ ...RELEASE, assets: [{ name: apkName('0.6.8'), browser_download_url: APK_URL }] }, INSTALLED)).toBeNull();
  expect(releaseUpdate({ message: 'Not Found' } as Release, INSTALLED)).toBeNull();

  const update = { version: NEXT, url: APK_URL };
  expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  expect(shouldOffer(update, null, '2026-11-04')).toBe(true);
  expect(shouldOffer(update, { version: NEXT, day: '2026-11-04' }, '2026-11-04')).toBe(false);
  expect(shouldOffer(update, { version: NEXT, day: '2026-11-03' }, '2026-11-04')).toBe(true);
  expect(shouldOffer(update, { version: '0.6.8', day: '2026-11-04' }, '2026-11-04')).toBe(true);
});

// Opens with a newer release out and checks the dialog names the version, says what Atualizar does and the one-time
// permission, and Atualizar opens the APK's address in the browser and closes it.
test('Mobile: a newer version is offered and Atualizar opens its APK', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  answer(RELEASE);
  const tree = await mount();
  expect(fetch).toHaveBeenLastCalledWith(LATEST_RELEASE_URL, expect.anything());
  expect(shows(tree, TITLE)).toBe(true);
  expect(shows(tree, 'Na primeira vez, o Android pede para permitir que o navegador instale apps desconhecidos.')).toBe(true);

  await press(tree, 'Atualizar');
  expect(open).toHaveBeenCalledWith(APK_URL);
  expect(shows(tree, TITLE)).toBe(false);
});

// Opens up to date, offline and with a release GitHub doesn't find, and checks nothing shows.
test('Mobile: nothing shows up to date or when the check fails', async () => {
  answer({ ...RELEASE, tag_name: `v${INSTALLED}` });
  expect(shows(await mount(), TITLE)).toBe(false);
  (fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Network request failed'));
  expect(shows(await mount(), TITLE)).toBe(false);
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ message: 'Not Found' }) });
  expect(shows(await mount(), TITLE)).toBe(false);
});

// Puts the version off with Agora não and checks it doesn't come back when the app opens again that day, nor when it
// comes back to the foreground the same day, and does the next day.
test('Mobile: Agora não holds the version until the next day', async () => {
  const changes: ((state: string) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    changes.push(listener as (state: string) => void);
    return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
  });
  answer(RELEASE);
  const first = await mount();
  await press(first, 'Agora não');
  expect(shows(first, TITLE)).toBe(false);
  expect(JSON.parse((await themeStorage.getItem(DISMISSED_UPDATE_KEY))!)).toEqual({ version: NEXT, day: '2026-11-04' });

  answer(RELEASE);
  const again = await mount();
  expect(shows(again, TITLE)).toBe(false);
  const calls = (fetch as jest.Mock).mock.calls.length;
  await ReactTestRenderer.act(async () => changes.at(-1)!('active'));
  expect((fetch as jest.Mock).mock.calls.length).toBe(calls);

  jest.setSystemTime(new Date(2026, 10, 5, 8, 0));
  answer(RELEASE);
  await ReactTestRenderer.act(async () => changes.at(-1)!('active'));
  expect(shows(again, TITLE)).toBe(true);
});
