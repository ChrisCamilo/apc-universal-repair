import Svg, { Circle, Line, Path, Rect, Text } from 'react-native-svg';
import { fontFamily, useTheme } from './theme';

// APC brand mark, the same as the web's: an instrument-panel badge whose needle and inner rule take the active
// accent, with everything else in the text colors, so it follows the style and mode. "badge" is the full logo
// (login); "compact" is the small gauge for headers and icons.

const BADGE_TICKS = [
  [62, 126, 70, 126],
  [74, 106, 80, 110],
  [110, 78, 110, 86],
  [146, 106, 140, 110],
  [150, 126, 158, 126],
];
const COMPACT_TICKS = [
  [10, 30, 14, 30],
  [24, 16, 24, 20],
  [34, 30, 38, 30],
];
const LABEL = 'APC Universal Repair';
// The badge's two lines of text, in viewBox units: "APC" and "UNIVERSAL REPAIR", with their tracking.
const NAME_SIZE = 48;
const NAME_TRACKING = 0.08 * NAME_SIZE;
const TAGLINE_SIZE = 11;
const TAGLINE_TRACKING = 0.3 * TAGLINE_SIZE;

type BrandMarkProps = {
  variant?: 'badge' | 'compact';
  /** Width in dp; the badge keeps its 11:9 ratio and reads well from 120, the compact mark is square and reads down to 16. */
  size?: number;
};

export function BrandMark({ variant = 'badge', size }: BrandMarkProps) {
  const theme = useTheme();
  const { colors } = theme;
  if (variant === 'compact') {
    const side = size ?? 24;
    return (
      <Svg viewBox="0 0 48 48" width={side} height={side} fill="none" accessible accessibilityRole="image" accessibilityLabel={LABEL}>
        <Rect x="2" y="2" width="44" height="44" rx="10" stroke={colors.text} strokeOpacity={0.35} strokeWidth={2} />
        <Path d="M10 30 A14 14 0 0 1 38 30" stroke={colors.text} strokeOpacity={0.6} strokeWidth={3} />
        {COMPACT_TICKS.map(([x1, y1, x2, y2]) => (
          <Line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.text} strokeWidth={2.5} />
        ))}
        <Line x1="24" y1="30" x2="32" y2="21" stroke={colors.accent} strokeWidth={3.5} strokeLinecap="round" />
        <Circle cx="24" cy="30" r="3" fill={colors.accent} />
      </Svg>
    );
  }

  const width = size ?? 240;
  return (
    <Svg
      viewBox="0 0 220 180"
      width={width}
      height={(width * 180) / 220}
      fill="none"
      accessible
      accessibilityRole="image"
      accessibilityLabel={LABEL}
    >
      <Rect x="12" y="12" width="196" height="156" rx="16" stroke={colors.text} strokeOpacity={0.35} strokeWidth={1.5} />
      <Rect x="22" y="22" width="176" height="136" rx="10" stroke={colors.accent} strokeOpacity={0.55} strokeWidth={1} />
      <Text
        x="110"
        y="70"
        textAnchor="middle"
        fill={colors.text}
        fontFamily={fontFamily(theme.displayFont, 700)}
        fontSize={NAME_SIZE}
        letterSpacing={NAME_TRACKING}
      >
        APC
      </Text>
      <Path d="M62 126 A48 48 0 0 1 158 126" stroke={colors.text} strokeOpacity={0.45} strokeWidth={1.5} />
      {BADGE_TICKS.map(([x1, y1, x2, y2]) => (
        <Line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.text} strokeOpacity={0.6} strokeWidth={2} />
      ))}
      <Line testID="badge-needle" x1="110" y1="126" x2="140" y2="96" stroke={colors.accent} strokeWidth={3} strokeLinecap="round" />
      <Circle cx="110" cy="126" r="4" fill={colors.accent} />
      <Text
        x="110"
        y="150"
        textAnchor="middle"
        fill={colors.textMuted}
        fontFamily={fontFamily(theme.displayFont, 600)}
        fontSize={TAGLINE_SIZE}
        letterSpacing={TAGLINE_TRACKING}
      >
        UNIVERSAL REPAIR
      </Text>
    </Svg>
  );
}
