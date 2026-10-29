import type { ViewStyle } from 'react-native';
import { SHEET_HANDLE, SHEET_RADIUS, SHEET_TOP_INSET } from '@apc/shared/dialog';
import { popShadow, scales, sheenGradient } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { softHairline, withAlpha } from './theme';

// The look of a bottom sheet, the same as the web: a panel docked to the bottom edge, its top corners rounded, over
// the dimmed backdrop of a dialog. The handle's bar sits on top, then the title row with an optional action, the
// content, which scrolls once the sheet reaches SHEET_TOP_INSET from the top, and an optional footer under a soft
// hairline, padded for the phone's home indicator.

/**
 * A bottom sheet: the backdrop and the tap target above the sheet, the sheet, the handle with its bar, the title row
 * with the title taking the room left by the action, the scrolling body and the footer.
 */
export const useStyles = createStyles(
  'common.bottom-sheet',
  {
    backdrop: 'backdrop',
    outside: 'outside',
    window: '',
    handle: 'handle',
    bar: 'handle.bar',
    header: 'header',
    title: 'header.title',
    body: 'body',
    footer: 'footer',
  },
  (theme) => ({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: withAlpha(theme.colors.canvas, scales.backdrop.opacity) },
    bar: { width: SHEET_HANDLE.width, height: SHEET_HANDLE.height, borderRadius: scales.radiusPill, backgroundColor: theme.colors.hairline },
    body: { flexShrink: 1 },
    footer: {
      borderTopWidth: scales.hairline,
      borderTopColor: softHairline(theme),
      paddingHorizontal: scales.space.s4,
      paddingTop: scales.space.s3,
    },
    handle: { alignItems: 'center', paddingTop: scales.space.s2, paddingBottom: scales.space.s3 },
    header: { flexDirection: 'row', alignItems: 'center', gap: scales.space.s2, paddingLeft: scales.space.s5, paddingRight: scales.space.s2, paddingBottom: scales.space.s2 },
    outside: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
    title: { flexGrow: 1, flexShrink: 1 },
    window: {
      width: '100%',
      overflow: 'hidden',
      borderTopWidth: scales.hairline,
      borderTopColor: softHairline(theme),
      borderTopLeftRadius: SHEET_RADIUS,
      borderTopRightRadius: SHEET_RADIUS,
      backgroundColor: theme.colors.panel,
      backgroundImage: sheenGradient(theme.sheen, theme.mode),
      boxShadow: popShadow(),
    },
  }),
);

/**
 * Caps a bottom sheet's height SHEET_TOP_INSET below the top of the screen.
 * @param screen The window's height.
 * @returns The sheet's max height.
 */
export function sheetBox(screen: { height: number }): ViewStyle {
  return { maxHeight: screen.height - SHEET_TOP_INSET };
}

/**
 * Pads the bottom of a bottom sheet's last part, its footer or its body, for the phone's home indicator.
 * @param bottom The screen's bottom inset, in px.
 * @returns The padding under it.
 */
export function sheetEnd(bottom: number): ViewStyle {
  return { paddingBottom: scales.space.s4 + bottom };
}
