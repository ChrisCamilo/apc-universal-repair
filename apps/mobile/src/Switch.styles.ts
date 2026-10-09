import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { glow, menuItemStyles } from './styles/shared';
import { withAlpha } from './theme';

// The look of the on/off control, the same as the web: a pill track whose knob slides over to the accent when on,
// glowing where the style has a glow. On its own it sits beside its label; inside a Menu it is a full-width menu item
// with a description.

/** A switch dims to this opacity while disabled, as on the web (disabled:opacity-50). */
export const DISABLED_OPACITY = 0.5;
/** The knob's inset inside the track, in px. */
export const KNOB_INSET = scales.space.s1 / 2;
/** The knob's width and height, in px (size-3.5 on the web). */
export const KNOB_SIZE = scales.space.s1 * 3.5;
/** The track's height, in px (h-5 on the web). */
export const TRACK_HEIGHT = scales.space.s1 * 5;
/** The track's width, in px (w-8.5 on the web). */
export const TRACK_WIDTH = scales.space.s1 * 8.5;
/** How far the knob slides when on: across the track, inside its border and insets. */
export const KNOB_TRAVEL = TRACK_WIDTH - 2 * scales.hairline - 2 * KNOB_INSET - KNOB_SIZE;

/** A switch: on its own (alone) or as a menu item, its label and description, and its track and knob, on or off. */
export const useStyles = createStyles(
  'common.switch',
  { alone: '', menuItem: '', text: 'text', menuItemLabel: 'text.label', menuItemDescription: 'text.description', track: 'track', knob: 'track.knob' },
  (theme) => {
    const { colors } = theme;
    return {
      ...menuItemStyles(theme),
      alone: { flexDirection: 'row', alignItems: 'center', gap: scales.space.s2 },
      aloneDisabled: { opacity: DISABLED_OPACITY },
      knob: {
        position: 'absolute',
        top: KNOB_INSET,
        left: KNOB_INSET,
        width: KNOB_SIZE,
        height: KNOB_SIZE,
        borderRadius: scales.radiusPill,
        backgroundColor: colors.textMuted,
      },
      knobOn: { backgroundColor: colors.accent, transform: [{ translateX: KNOB_TRAVEL }], ...glow(theme) },
      text: { flex: 1 },
      track: {
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: scales.radiusPill,
        borderWidth: scales.hairline,
        borderColor: colors.hairline,
        backgroundColor: colors.panelRaised,
      },
      trackOn: { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, scales.accentSoft) },
    };
  },
);
