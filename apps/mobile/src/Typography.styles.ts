import { scales } from '@apc/shared/theme';
import { HEADING_LEVELS, HEADING_TRACKING, LABEL_TYPE, READOUT_TYPE, TONES, type HeadingLevel, type TextSize, type Tone } from '@apc/shared/typography';
import { createStyles } from './styles/createStyles';
import { fontFamily, type ActiveTheme } from './theme';

// The look of the text primitives, the same as the web, on the type scale of @apc/shared/typography. Each weight is its
// own bundled font file, so the weight goes into fontFamily() instead of fontWeight. Tones, heading levels and text
// sizes are keys a primitive picks with the maps below.

/** Body text's line height, as a multiple of its size (leading-relaxed on the web). */
export const BODY_LINE_HEIGHT = 1.6;
/** The key of each heading level's style. */
export const LEVEL_KEYS = { 1: 'level1', 2: 'level2', 3: 'level3', 4: 'level4' } as const satisfies Record<HeadingLevel, string>;
/** The key of each text size's style. */
export const SIZE_KEYS = { sm: 'sizeSm', base: 'sizeBase', lg: 'sizeLg' } as const satisfies Record<TextSize, string>;
/** The key of each tone's style. */
export const TONE_KEYS = { default: 'toneDefault', muted: 'toneMuted', accent: 'toneAccent', danger: 'toneDanger' } as const satisfies Record<Tone, string>;

/**
 * Styles text in the display face: uppercase, at a size and weight, with a share of the style's tracking.
 * @param theme Active theme.
 * @param size Font size step.
 * @param weight Font weight.
 * @param tracking Share of the style's display tracking, e.g. HEADING_TRACKING.
 * @returns The text's style, without a color.
 */
function display(theme: ActiveTheme, size: keyof typeof scales.fontSize, weight: 500 | 600 | 700, tracking: number) {
  const fontSize = scales.fontSize[size];
  return {
    fontFamily: fontFamily(theme.displayFont, weight),
    fontSize,
    letterSpacing: theme.displayTracking * tracking * fontSize,
    textTransform: 'uppercase',
  } as const;
}

/**
 * Styles the tones: the text color for each.
 * @param theme Active theme.
 * @returns A style per tone, under TONE_KEYS.
 */
function tones(theme: ActiveTheme) {
  return {
    toneAccent: { color: theme.colors[TONES.accent] },
    toneDanger: { color: theme.colors[TONES.danger] },
    toneDefault: { color: theme.colors[TONES.default] },
    toneMuted: { color: theme.colors[TONES.muted] },
  };
}

/** A heading in the display face, by level and tone. */
export const useHeadingStyles = createStyles('common.heading', { heading: '' }, (theme) => {
  const level = (n: HeadingLevel) => display(theme, HEADING_LEVELS[n].size, HEADING_LEVELS[n].weight, HEADING_TRACKING);
  return { ...tones(theme), heading: {}, level1: level(1), level2: level(2), level3: level(3), level4: level(4) };
});

/** A field's or a group's label in the display face, by tone. */
export const useLabelStyles = createStyles('common.label', { label: '' }, (theme) => ({
  ...tones(theme),
  label: display(theme, LABEL_TYPE.size, LABEL_TYPE.weight, 1),
}));

/** Mono digits that line up, such as counts and codes, by tone. */
export const useReadoutStyles = createStyles('common.numeric-readout', { readout: '' }, (theme) => ({
  ...tones(theme),
  readout: {
    fontFamily: fontFamily(scales.monoFont, READOUT_TYPE.weight),
    fontSize: scales.fontSize[READOUT_TYPE.size],
    fontVariant: ['tabular-nums'],
  },
}));

/** Body text, by size and tone. */
export const useTextStyles = createStyles('common.text', { text: '' }, (theme) => {
  const size = (step: TextSize) => ({ fontSize: scales.fontSize[step], lineHeight: scales.fontSize[step] * BODY_LINE_HEIGHT });
  return { ...tones(theme), sizeBase: size('base'), sizeLg: size('lg'), sizeSm: size('sm'), text: { fontFamily: fontFamily(scales.bodyFont) } };
});
