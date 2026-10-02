import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ICON_STROKE, ICON_VIEWBOX, type IconShape } from '@apc/shared/icons';
import { useTheme } from './theme';

// Draws a shared icon with react-native-svg. Without a color it takes the active theme's text color;
// pass another token color (theme.colors.accent…) to tint it.

type IconProps = {
  /** Icon geometry from @apc/shared/icons, e.g. searchIcon. */
  icon: IconShape[];
  /** Width and height in dp; defaults to 16. */
  size?: number;
  /** Stroke color, from the theme tokens; defaults to the text color. */
  color?: string;
  /** Accessible name. Leave it out when text next to the icon already says what it is. */
  label?: string;
};

export function Icon({ icon, size = 16, color, label }: IconProps) {
  const theme = useTheme();
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      fill="none"
      stroke={color ?? theme.colors.text}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      {icon.map((shape, i) => (
        <Shape key={i} shape={shape} />
      ))}
    </Svg>
  );
}

function Shape({ shape }: { shape: IconShape }) {
  switch (shape.kind) {
    case 'path':
      return <Path d={shape.d} />;
    case 'circle':
      return <Circle cx={shape.cx} cy={shape.cy} r={shape.r} />;
    case 'rect':
      return <Rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} />;
  }
}
