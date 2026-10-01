/**
 * @format
 */

import React from 'react';
import { View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, STYLES, scales, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { fontFamily, themeStorage, ThemeProvider, useTheme, type ActiveTheme, type FontWeight } from '../src/theme';
import androidAssets from '../android/link-assets-manifest.json';
import iosAssets from '../ios/link-assets-manifest.json';

/** The theme the probe saw on its last render, so tests can read it and call its setters. */
const latest: { theme: ActiveTheme | null } = { theme: null };
/** Stand-in for React Native's useColorScheme: what the system color scheme is in each test. */
const systemScheme: jest.Mock = jest.requireMock('react-native/Libraries/Utilities/useColorScheme').default;

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: jest.fn() }));

/**
 * Renders the probe inside a fresh ThemeProvider, as on app start, and waits for the saved theme to load.
 * @returns The rendered tree.
 */
async function mount(): Promise<ReactTestRenderer.ReactTestRenderer> {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
  });
  return tree!;
}

/**
 * Reads the colors the probe received on its last render.
 * @param tree Rendered tree that holds the probe.
 * @returns The probe's background (canvas) and border (accent) colors.
 */
function probeColors(tree: ReactTestRenderer.ReactTestRenderer): { backgroundColor: string; borderColor: string } {
  return tree.root.findByProps({ testID: 'probe' }).props.style;
}

/**
 * Switches the style and mode through the provider's setters, as a switcher control would.
 * @param style Style to pick.
 * @param mode Mode to pick.
 */
async function pick(style: Style, mode: Mode): Promise<void> {
  await ReactTestRenderer.act(async () => {
    latest.theme!.setStyle(style);
    latest.theme!.setMode(mode);
  });
}

function Probe() {
  const theme = useTheme();
  latest.theme = theme;
  return <View testID="probe" style={{ backgroundColor: theme.colors.canvas, borderColor: theme.colors.accent }} />;
}

beforeEach(async () => {
  jest.restoreAllMocks();
  systemScheme.mockReturnValue('dark');
  latest.theme = null;
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Saves one style and mode, starts the app and checks components receive that combination's
    // colors through useTheme().
    test(`Mobile: loads the saved ${style}/${mode} and hands its tokens to components`, async () => {
      await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
      const tree = await mount();
      expect(probeColors(tree)).toEqual({
        backgroundColor: themes[style][mode].colors.canvas,
        borderColor: themes[style][mode].colors.accent,
      });
    });
  }
}

// Starts on the defaults, switches style and mode together and checks components get the new tokens
// in the same session, without restarting the app.
test('Mobile: switching style and mode updates components without a restart', async () => {
  const tree = await mount();
  await pick('gt4', 'day');
  expect(latest.theme).toMatchObject({ style: 'gt4', mode: 'day' });
  expect(probeColors(tree).backgroundColor).toBe(themes.gt4.day.colors.canvas);
});

// Picks GT4 by day, closes the app and starts it again, checking the choice was saved and comes back.
test('Mobile: the chosen style and mode survive an app restart', async () => {
  const first = await mount();
  await pick('gt4', 'day');
  await ReactTestRenderer.act(async () => first.unmount());

  await mount();
  expect(latest.theme).toMatchObject({ style: 'gt4', mode: 'day' });
});

// With nothing saved the mode follows the system color scheme; once the user picks a mode, that
// choice wins over the system.
test('Mobile: mode follows the system color scheme until the user picks one', async () => {
  systemScheme.mockReturnValue('light');
  await mount();
  expect(latest.theme).toMatchObject({ style: 'eighties', mode: 'day' });

  await pick('eighties', 'night');
  expect(latest.theme?.mode).toBe('night');
});

// Makes storage fail on read and write, and checks the app still starts on the defaults and the
// switch still works for the current session.
test('Mobile: switching works when storage is unavailable', async () => {
  jest.spyOn(themeStorage, 'getMany').mockRejectedValue(new Error('Storage is unavailable'));
  jest.spyOn(themeStorage, 'setItem').mockRejectedValue(new Error('Storage is unavailable'));
  const tree = await mount();
  expect(latest.theme).toMatchObject({ style: 'eighties', mode: 'night' });

  await pick('gt4', 'day');
  expect(probeColors(tree).backgroundColor).toBe(themes.gt4.day.colors.canvas);
});

// Checks every font file the themes ask for (body, mono and each display face) appears in the Android
// and iOS asset manifests, so no text falls back to the system font on a device.
test('Mobile: every font the themes use is linked into the Android and iOS apps', () => {
  const used: [string, FontWeight[]][] = [
    [scales.bodyFont, [400, 500, 600]],
    [scales.monoFont, [400, 500]],
    ...STYLES.map((s): [string, FontWeight[]] => [themes[s].night.displayFont, [600, 700]]),
  ];
  const files = used.flatMap(([family, weights]) => weights.map((w) => `assets/fonts/${fontFamily(family, w)}.ttf`));
  for (const manifest of [androidAssets, iosAssets]) {
    const linked = manifest.data.map((asset) => asset.path);
    expect(files.filter((file) => !linked.includes(file))).toEqual([]);
  }
});
