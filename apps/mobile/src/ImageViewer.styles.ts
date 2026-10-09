import type { ViewStyle } from 'react-native';
import { DIALOG_SCREEN_INSET, DIALOG_WIDTHS } from '@apc/shared/dialog';
import { popShadow, scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { roundStyles } from './styles/shared';
import { fontFamily, softHairline, withAlpha } from './theme';

// The look of the photo viewer, the same as the web: a window on the panel over the dimmed backdrop; the item's name
// and code over a 4:3 frame on the canvas that never grows past FRAME_MAX_SHARE of the screen's height; round arrows
// over the photo, lit in the accent while pressed; dots under it, the current one in the accent; the problems in the
// danger color; and the note and buttons at the bottom.

/** A dot under the photo, in px. */
export const DOT_SIZE = scales.space.s2 + scales.space.s1 / 2;
/** The share of the screen's height the frame never grows past (62dvh on the web). */
export const FRAME_MAX_SHARE = 0.62;
/** How far in from the frame's sides the arrows sit, in px. */
export const NAV_INSET = scales.space.s2 + scales.space.s1 / 2;
/** The arrows' width and height, in px (size-10 on the web). */
export const NAV_SIZE = scales.space.s6 + scales.space.s2;

/** The viewer: the backdrop, the window, its body, head and name, the frame, arrows, dots, problems and buttons. */
export const useStyles = createStyles(
  'common.image-viewer',
  {
    backdrop: 'backdrop',
    outside: 'outside',
    window: '',
    body: 'body',
    head: 'body.head',
    name: 'body.head.name',
    stage: 'body.stage',
    frame: 'body.stage.frame',
    image: 'body.stage.frame.image',
    empty: 'body.stage.frame.empty',
    round: 'body.stage.nav',
    previous: 'body.stage.nav.previous',
    dots: 'body.dots',
    dot: 'body.dots.dot',
    problems: 'body.problems',
    problem: 'body.problems.problem',
    buttons: 'body.buttons',
  },
  (theme) => {
    const { colors } = theme;
    const { round, roundPressed } = roundStyles(theme, NAV_SIZE);
    return {
      backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.canvas, scales.backdrop.opacity) },
      body: { gap: scales.space.s3, padding: scales.space.s4 },
      buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s2 },
      dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: scales.radiusPill, backgroundColor: colors.hairline },
      dotOn: { backgroundColor: colors.accent },
      dots: { flexDirection: 'row', justifyContent: 'center', gap: scales.space.s2 },
      empty: { alignItems: 'center', gap: scales.space.s2, padding: scales.space.s5 },
      frame: {
        width: '100%',
        aspectRatio: 4 / 3,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: scales.hairline,
        borderColor: softHairline(theme),
        borderRadius: theme.radiusTile,
        backgroundColor: colors.canvas,
      },
      head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: scales.space.s3 },
      image: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
      name: { flexShrink: 1, gap: scales.space.s1 / 2 },
      outside: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
      // The chevron points right; turned around, it points to the previous photo.
      previous: { transform: [{ rotate: '180deg' }] },
      problem: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: colors.danger },
      problems: {},
      round: { ...round, position: 'absolute', top: '50%', marginTop: -NAV_SIZE / 2 },
      roundNext: { right: NAV_INSET },
      roundPressed,
      roundPrev: { left: NAV_INSET },
      stage: {},
      window: {
        borderWidth: scales.hairline,
        borderColor: colors.hairline,
        borderRadius: theme.radiusPanel,
        backgroundColor: colors.panel,
        boxShadow: popShadow(),
      },
    };
  },
);

/**
 * Sizes the viewer's window: as wide as the viewer size allows on the screen, and no taller than the screen less its
 * inset.
 * @param screen The window's width and height.
 * @returns The window's width and max height.
 */
export function viewerBox(screen: { width: number; height: number }): ViewStyle {
  return { width: Math.min(DIALOG_WIDTHS.viewer, screen.width - DIALOG_SCREEN_INSET), maxHeight: screen.height - DIALOG_SCREEN_INSET };
}
