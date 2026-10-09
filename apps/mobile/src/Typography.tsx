import type { ReactNode } from 'react';
import { Text as NativeText, type TextStyle } from 'react-native';
import type { HeadingLevel, TextSize, Tone } from '@apc/shared/typography';
import { LEVEL_KEYS, SIZE_KEYS, TONE_KEYS, useHeadingStyles, useLabelStyles, useReadoutStyles, useTextStyles } from './Typography.styles';

// Text primitives on top of the type scale, the same variants as the web (see @apc/shared/typography and
// Typography.styles.ts).

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

export function Heading({ level = 2, tone = 'default', align, children }: HeadingProps) {
  const { styles, ids } = useHeadingStyles();
  return (
    <NativeText
      accessibilityRole="header"
      style={[styles.heading, styles[LEVEL_KEYS[level]], styles[TONE_KEYS[tone]], align !== undefined && { textAlign: align }]}
      testID={ids.heading}
    >
      {children}
    </NativeText>
  );
}

export function Text({ size = 'base', tone = 'default', lines, align, children }: TextProps) {
  const { styles, ids } = useTextStyles();
  return (
    <NativeText
      numberOfLines={lines}
      style={[styles.text, styles[SIZE_KEYS[size]], styles[TONE_KEYS[tone]], align !== undefined && { textAlign: align }]}
      testID={ids.text}
    >
      {children}
    </NativeText>
  );
}

export function Label({ tone = 'muted', children }: LabelProps) {
  const { styles, ids } = useLabelStyles();
  return (
    <NativeText style={[styles.label, styles[TONE_KEYS[tone]]]} testID={ids.label}>
      {children}
    </NativeText>
  );
}

export function NumericReadout({ tone = 'default', children }: ReadoutProps) {
  const { styles, ids } = useReadoutStyles();
  return (
    <NativeText style={[styles.readout, styles[TONE_KEYS[tone]]]} testID={ids.readout}>
      {children}
    </NativeText>
  );
}
