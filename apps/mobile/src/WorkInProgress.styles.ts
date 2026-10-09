import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { withAlpha } from './theme';

// The look of a screen still being built, the same as the web: its content stays in place under the canvas tint of
// the dialogs' backdrop, and a panel near the top, centered, holds the mechanic, the title and the note. React Native
// has no blur on both platforms without a native library, so the tint alone hides the screen here. The layer only
// tints and places the notice, so it adds no level to its id.

/** The least height the screen takes, so the notice always fits over it, in px (min-h-96 on the web). */
export const MIN_HEIGHT = scales.space.s1 * 96;
/** The widest the notice gets, in px (max-w-sm on the web). */
export const NOTICE_MAX_WIDTH = scales.space.s1 * 96;

/** A screen still being built: the content, the tinted layer over it, and the notice with its illustration. */
export const useStyles = createStyles(
  'common.work-in-progress',
  { base: '', content: 'content', overlay: 'overlay', illustration: 'notice.illustration' },
  (theme) => ({
    base: { minHeight: MIN_HEIGHT },
    content: {},
    illustration: { alignItems: 'center' },
    notice: { width: '100%', maxWidth: NOTICE_MAX_WIDTH, alignItems: 'center', gap: scales.space.s2 },
    overlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      paddingTop: scales.space.s7,
      paddingHorizontal: scales.space.s4,
      backgroundColor: withAlpha(theme.colors.canvas, scales.backdrop.opacity),
    },
  }),
);
