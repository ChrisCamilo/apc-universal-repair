import type { ReactNode } from 'react';
import { Text as NativeText, type TextStyle } from 'react-native';
import { scales } from '@apc/shared/theme';
import {
  HEADING_LEVELS,
  HEADING_TRACKING,
  LABEL_TYPE,
  READOUT_TYPE,
  TONES,
  type HeadingLevel,
  type TextSize,
  type Tone,
} from '@apc/shared/typography';
import { fontFamily, useTheme, type ActiveTheme } from './theme';

// Text primitives on top of the type scale, the same variants as the web (see @apc/shared/typography).
// Each weight is its own bundled font file, so the weight goes into fontFamily() instead of fontWeight.

const BODY_LINE_HEIGHT = 1.6;

type HeadingProps = { level?: HeadingLevel; tone?: Tone; align?: TextStyle['textAlign']; children: ReactNode };
type LabelProps = { tone?: Tone; children: ReactNode };
type ReadoutProps = { tone?: Tone; children: ReactNode };
type TextProps = {
  size?: TextSize;
  tone?: Tone;
  /** Lines up wrapped text, e.g. "center" in an empty state. */
  align?: TextStyle['textAlign'];
  /** Cuts the text after this many lines with an ellipsis. */
  lines?: number;
  children: ReactNode;
};

/**
 * Builds the style of display-face text (headings and labels).
 * @param theme Active theme, for the display face, its tracking and the colors.
 * @param size Font size step from scales.fontSize.
 * @param weight Font weight; picks the bundled font file.
 * @param tracking Share of the style's display tracking to use.
 * @param tone Color tone.
 * @returns Style for a React Native Text.
 */
function displayStyle(
  theme: ActiveTheme,
  size: keyof typeof scales.fontSize,
  weight: 600 | 700,
  tracking: number,
  tone: Tone,
): TextStyle {
  const fontSize = scales.fontSize[size];
  return {
    fontFamily: fontFamily(theme.displayFont, weight),
    fontSize,
    letterSpacing: theme.displayTracking * tracking * fontSize,
    textTransform: 'uppercase',
    color: theme.colors[TONES[tone]],
  };
}

export function Heading({ level = 2, tone = 'default', align, children }: HeadingProps) {
  const theme = useTheme();
  const { size, weight } = HEADING_LEVELS[level];
  return (
    <NativeText accessibilityRole="header" style={{ ...displayStyle(theme, size, weight, HEADING_TRACKING, tone), textAlign: align }}>
      {children}
    </NativeText>
  );
}

export function Text({ size = 'base', tone = 'default', lines, align, children }: TextProps) {
  const theme = useTheme();
  const fontSize = scales.fontSize[size];
  return (
    <NativeText
      numberOfLines={lines}
      style={{
        fontFamily: fontFamily(scales.bodyFont),
        fontSize,
        lineHeight: fontSize * BODY_LINE_HEIGHT,
        color: theme.colors[TONES[tone]],
        textAlign: align,
      }}
    >
      {children}
    </NativeText>
  );
}

export function Label({ tone = 'muted', children }: LabelProps) {
  const theme = useTheme();
  return <NativeText style={displayStyle(theme, LABEL_TYPE.size, LABEL_TYPE.weight, 1, tone)}>{children}</NativeText>;
}

export function NumericReadout({ tone = 'default', children }: ReadoutProps) {
  const theme = useTheme();
  return (
    <NativeText
      style={{
        fontFamily: fontFamily(scales.monoFont, READOUT_TYPE.weight),
        fontSize: scales.fontSize[READOUT_TYPE.size],
        fontVariant: ['tabular-nums'],
        color: theme.colors[TONES[tone]],
      }}
    >
      {children}
    </NativeText>
  );
}
