import type { ViewStyle } from 'react-native';
import { DIALOG_HEIGHT_INSET, DIALOG_SCREEN_INSET, DIALOG_WIDTHS, type DialogSize } from '@apc/shared/dialog';
import { popShadow, scales, sheenGradient } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { softHairline, withAlpha } from './theme';

// The look of a modal window, the same as the web: the panel with its sheen and hairline frame over a dimmed backdrop,
// its content scrolling inside while the action bar stays pinned at the bottom under a soft hairline. A closable
// dialog has the × at the right of its title, which wraps beside it.

/** A dialog: the backdrop and the tap target around the window, the window, its body, the title row and the actions. */
export const useStyles = createStyles(
  'common.dialog',
  { backdrop: 'backdrop', outside: 'outside', window: '', body: 'body', header: 'body.header', title: 'body.header.title', actions: 'actions' },
  (theme) => ({
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: scales.space.s2,
      borderTopWidth: scales.hairline,
      borderTopColor: softHairline(theme),
      paddingHorizontal: scales.space.s5,
      paddingTop: scales.space.s3,
      paddingBottom: scales.space.s5,
    },
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(theme.colors.canvas, scales.backdrop.opacity),
    },
    body: { gap: scales.space.s4, padding: scales.space.s5 },
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: scales.space.s3 },
    outside: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
    title: { flexShrink: 1 },
    window: {
      overflow: 'hidden',
      borderWidth: scales.hairline,
      borderColor: theme.colors.hairline,
      borderRadius: theme.radiusPanel,
      backgroundColor: theme.colors.panel,
      backgroundImage: sheenGradient(theme.sheen, theme.mode),
      boxShadow: popShadow(),
    },
  }),
);

/**
 * Sizes a dialog's window: as wide as its size allows on the screen, and no taller than the screen less its inset.
 * @param size The dialog's size, e.g. "form".
 * @param screen The window's width and height.
 * @returns The window's width and max height.
 */
export function windowBox(size: DialogSize, screen: { width: number; height: number }): ViewStyle {
  return { width: Math.min(DIALOG_WIDTHS[size], screen.width - DIALOG_SCREEN_INSET), maxHeight: screen.height - DIALOG_HEIGHT_INSET };
}
