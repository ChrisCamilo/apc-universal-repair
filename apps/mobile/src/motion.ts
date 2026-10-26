import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { scales } from '@apc/shared/theme';

/** How an overlay moves besides fading: a dialog grows ("scale"), a menu, a panel or a list slides from its trigger ("translate"). */
export type OverlayMove = 'scale' | 'translate';

/**
 * Moves an overlay in and out, as on the web: it fades in while it grows from the motion token's enterScale or slides
 * enterShift px down from its trigger, in the token's duration and easing, and goes back the same way before it leaves
 * the screen, taking no touches meanwhile. With reduced motion it shows and goes at once.
 * @param open Whether the overlay is open.
 * @param move How it moves besides fading.
 * @returns `shown` while it is open or leaving, for a Modal's `visible`; `leaving` while it goes; `fade`, its opacity,
 * which takes no touches while it leaves; and `moved`, its growing or sliding. A dialog fades its backdrop, which holds
 * the window, and moves the window; a menu or a list fades and moves itself.
 */
export function useOverlayMotion(open: boolean, move: OverlayMove) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const [kept, setKept] = useState(open);
  // Opening shows it in the same render; closing keeps it until it has gone back.
  if (open && !kept) {
    setKept(true);
  }

  // Move to open or closed, at once with reduced motion, and let it go once it is closed.
  useEffect(() => {
    if (reduced) {
      progress.setValue(open ? 1 : 0);
      if (!open) {
        setKept(false);
      }
      return;
    }
    const { durationMs, easing } = scales.motion;
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: durationMs,
      easing: Easing.bezier(...easing),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => finished && !open && setKept(false));
    return () => animation.stop();
  }, [open, reduced, progress]);

  const moved = useMemo(() => {
    const { enterScale, enterShift } = scales.motion;
    return move === 'scale'
      ? { transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [enterScale, 1] }) }] }
      : { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-enterShift, 0] }) }] };
  }, [move, progress]);
  const leaving = kept && !open;
  return { shown: open || kept, leaving, fade: { opacity: progress, pointerEvents: leaving ? ('none' as const) : ('auto' as const) }, moved };
}

/**
 * Follows the phone's "reduce motion" setting, so animations can stand still or fade instead of moving.
 * @returns True while the user asks for reduced motion.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => live && setReduced(value));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
