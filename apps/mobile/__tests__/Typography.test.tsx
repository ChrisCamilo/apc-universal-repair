/**
 * @format
 */

import React from 'react';
import { Text as NativeText } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { HEADING_LEVELS, HEADING_TRACKING } from '@apc/shared/typography';
import { fontFamily, themeStorage, ThemeProvider } from '../src/theme';
import { Heading, Label, NumericReadout, Text } from '../src/Typography';

/**
 * Saves a style and mode, then renders the element inside a ThemeProvider and waits for it to load them.
 * @param style Style to start on.
 * @param mode Mode to start on.
 * @param element Element to render.
 * @returns Style of every native Text rendered, in order.
 */
async function textStyles(style: Style, mode: Mode, element: React.ReactElement) {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  return tree!.root.findAllByType(NativeText).map((node) => node.props);
}

beforeEach(async () => {
  await themeStorage.clear();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders a heading and a label in one style and mode and checks they use that style's display
    // face and tracking, uppercase, in the text and muted colors.
    test(`Mobile: headings and labels follow the ${style}/${mode} display face and colors`, async () => {
      const theme = themes[style][mode];
      const [heading, label] = await textStyles(
        style,
        mode,
        <>
          <Heading level={1}>Opala Diplomata</Heading>
          <Label>Cilindrada</Label>
        </>,
      );
      const size = scales.fontSize[HEADING_LEVELS[1].size];
      expect(heading.accessibilityRole).toBe('header');
      expect(heading.style).toMatchObject({
        fontFamily: fontFamily(theme.displayFont, 700),
        fontSize: size,
        letterSpacing: theme.displayTracking * HEADING_TRACKING * size,
        textTransform: 'uppercase',
        color: theme.colors.text,
      });
      expect(label.style).toMatchObject({
        fontFamily: fontFamily(theme.displayFont, 600),
        textTransform: 'uppercase',
        color: theme.colors.textMuted,
      });
    });
  }
}

// Checks each heading level gets its own size and weight file, from level 1 (largest, bold) to 4.
test('Mobile: heading levels step down in size', async () => {
  const styles = await textStyles(
    'eighties',
    'night',
    <>
      {([1, 2, 3, 4] as const).map((level) => (
        <Heading key={level} level={level}>Nível {level}</Heading>
      ))}
    </>,
  );
  const sizes = styles.map((props) => props.style.fontSize);
  expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  expect(styles[0].style.fontFamily).toBe(fontFamily(themes.eighties.night.displayFont, 700));
  expect(styles[3].style.fontFamily).toBe(fontFamily(themes.eighties.night.displayFont, 600));
});

// Checks body text takes its size and tone, and cuts after the given number of lines, as the
// Dashboard's five-line summary needs.
test('Mobile: body text sizes, tones and line clamping', async () => {
  const [small, clamped] = await textStyles(
    'gt4',
    'day',
    <>
      <Text size="sm" tone="accent">Ver ficha técnica</Text>
      <Text lines={5}>Resumo longo do motor</Text>
    </>,
  );
  expect(small.style).toMatchObject({ fontSize: scales.fontSize.sm, color: themes.gt4.day.colors.accent });
  expect(small.numberOfLines).toBeUndefined();
  expect(clamped.numberOfLines).toBe(5);
  expect(clamped.style.fontFamily).toBe(fontFamily(scales.bodyFont));
});

// Checks numeric readouts use the mono face with tabular figures, so digits line up in columns.
test('Mobile: numeric readouts use mono tabular figures', async () => {
  const [readout] = await textStyles('eighties', 'night', <NumericReadout>4.1 L · 1986</NumericReadout>);
  expect(readout.style).toMatchObject({
    fontFamily: fontFamily(scales.monoFont, 500),
    fontVariant: ['tabular-nums'],
    color: themes.eighties.night.colors.text,
  });
});
