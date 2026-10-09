import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue } from 'react-native';
import { useReducedMotion } from './motion';
import { useStyles } from './Skeleton.styles';

// A placeholder block in the shape of what is still loading, the same as the web: a soft hairline fill that
// pulses gently, standing still with reduced motion. Lines are pills, blocks take the tile radius and circles
// are round. Skeletons are hidden from screen readers: the region they fill should say it is loading, e.g.
// with a Spinner label.

// The pulse takes two seconds, as on the web.
const PULSE_MS = 2000;

type SkeletonProps = {
  shape?: 'line' | 'block' | 'circle';
  /** Width in px or a percentage, e.g. "60%"; defaults to the full width. */
  width?: DimensionValue;
  /** Height; lines have their own, blocks need one and circles take their width. */
  height?: DimensionValue;
};

export function Skeleton({ shape = 'line', width = '100%', height }: SkeletonProps) {
  const { styles, ids } = useStyles();
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
      testID={ids.skeleton}
      style={[
        styles.skeleton,
        shape === 'block' && styles.skeletonBlock,
        shape === 'line' && styles.skeletonLine,
        { width, opacity },
        shape === 'block' && { height },
        shape === 'circle' && { height: width },
      ]}
    />
  );
}
