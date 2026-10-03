import { useEffect, useRef } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';
import { scales } from '@apc/shared/theme';
import { useReducedMotion } from './motion';
import { useTheme } from './theme';

// A ring with a gap, turning while something loads, the same as the web. "sm" matches body text, e.g. inside
// a button; "md" stands on its own, e.g. over a photo or a panel. With reduced motion it doesn't turn but
// fades softly in and out. With a label it is announced as loading; without one it is decorative and
// whatever holds it says it is busy.

// The ring turns once a second and, with reduced motion, fades in and out every two, as on the web.
const PULSE_MS = 2000;
const SIZES = { sm: scales.fontSize.base, md: scales.space.s5 };
const SPIN_MS = 1000;

type SpinnerProps = {
  size?: keyof typeof SIZES;
  /** Announced to screen readers, e.g. "Carregando estoque"; leave it out when the surroundings already say so. */
  label?: string;
  /** Ring color; defaults to the muted text color. */
  color?: string;
  testID?: string;
};

/**
 * Styles the ring: a two-hairline circle in the color, open on its right side.
 * @param size Width and height, in px.
 * @param color Ring color.
 * @returns Style for the ring View.
 */
function ringStyle(size: number, color: string): ViewStyle {
  return {
    width: size,
    height: size,
    borderWidth: scales.hairline * 2,
    borderColor: color,
    borderRightColor: 'transparent',
    borderRadius: scales.radiusPill,
  };
}

export function Spinner({ size = 'md', label, color, testID }: SpinnerProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  // Turn forever, or fade in and out with reduced motion.
  useEffect(() => {
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: reduced ? PULSE_MS : SPIN_MS,
        easing: reduced ? Easing.inOut(Easing.ease) : Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, reduced]);

  const motion = reduced
    ? { opacity: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.4, 1] }) }
    : { transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] };
  return (
    <Animated.View
      testID={testID}
      accessible={!!label}
      accessibilityRole={label ? 'progressbar' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!label}
      style={[ringStyle(SIZES[size], color ?? theme.colors.textMuted), motion]}
    />
  );
}
