import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, type ViewStyle } from 'react-native';
import { scales } from '@apc/shared/theme';
import { useReducedMotion } from './motion';
import { softHairline, useTheme, type ActiveTheme } from './theme';

// A placeholder block in the shape of what is still loading, the same as the web: a soft hairline fill that
// pulses gently, standing still with reduced motion. Lines are pills, blocks take the tile radius and circles
// are round. Skeletons are hidden from screen readers: the region they fill should say it is loading, e.g.
// with a Spinner label.

// Lines are 12px tall and the pulse takes two seconds, as on the web.
const LINE_HEIGHT = scales.space.s3;
const PULSE_MS = 2000;

type SkeletonProps = {
  shape?: 'line' | 'block' | 'circle';
  /** Width in px or a percentage, e.g. "60%"; defaults to the full width. */
  width?: DimensionValue;
  /** Height; lines have their own, blocks need one and circles take their width. */
  height?: DimensionValue;
};

/**
 * Styles the placeholder: the soft hairline fill in the shape's size and corners.
 * @param theme Active theme.
 * @param shape Line, block or circle.
 * @param width Width.
 * @param height Height, for blocks.
 * @returns Style for the placeholder View.
 */
function skeletonStyle(theme: ActiveTheme, shape: NonNullable<SkeletonProps['shape']>, width: DimensionValue, height?: DimensionValue): ViewStyle {
  return {
    width,
    height: shape === 'line' ? LINE_HEIGHT : shape === 'circle' ? width : height,
    borderRadius: shape === 'block' ? theme.radiusTile : scales.radiusPill,
    backgroundColor: softHairline(theme),
  };
}

export function Skeleton({ shape = 'line', width = '100%', height }: SkeletonProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  // Pulse unless the user asked for reduced motion.
  useEffect(() => {
    opacity.setValue(1);
    if (reduced) {
      return;
    }
    const half = PULSE_MS / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: half, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: half, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);

  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID="skeleton"
      style={[skeletonStyle(theme, shape, width, height), { opacity }]}
    />
  );
}
