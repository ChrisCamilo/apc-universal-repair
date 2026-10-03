import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useTheme } from './theme';

// The compact APC mark, the same gauge as the web's compact BrandMark: the needle takes the active accent and
// everything else the text color, so it follows the style and mode. The full badge comes with the login (#62).

const COMPACT_TICKS = [
  [10, 30, 14, 30],
  [24, 16, 24, 20],
  [34, 30, 38, 30],
];
const LABEL = 'APC Universal Repair';

type BrandMarkProps = {
  /** Side in dp; the mark is square and reads down to 16. */
  size?: number;
};

export function BrandMark({ size = 24 }: BrandMarkProps) {
  const { colors } = useTheme();
  return (
    <Svg viewBox="0 0 48 48" width={size} height={size} fill="none" accessible accessibilityRole="image" accessibilityLabel={LABEL}>
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
