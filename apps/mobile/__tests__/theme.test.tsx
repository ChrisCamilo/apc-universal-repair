/**
 * @format
 */

import React from 'react';
import { View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, STYLES, scales, themes } from '@apc/shared/theme';
import { fontFamily, ThemeProvider, useTheme, type FontWeight } from '../src/theme';
import androidAssets from '../android/link-assets-manifest.json';
import iosAssets from '../ios/link-assets-manifest.json';

function Probe() {
  const theme = useTheme();
  return <View testID="probe" style={{ backgroundColor: theme.colors.canvas, borderColor: theme.colors.accent }} />;
}

for (const style of STYLES) {
  for (const mode of MODES) {
    test(`hands the ${style}/${mode} tokens to components`, async () => {
      let tree: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        tree = ReactTestRenderer.create(
          <ThemeProvider style={style} mode={mode}>
            <Probe />
          </ThemeProvider>,
        );
      });
      const probe = tree!.root.findByProps({ testID: 'probe' });
      expect(probe.props.style).toEqual({
        backgroundColor: themes[style][mode].colors.canvas,
        borderColor: themes[style][mode].colors.accent,
      });
    });
  }
}

test('every font the themes use is linked into the Android and iOS apps', () => {
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
