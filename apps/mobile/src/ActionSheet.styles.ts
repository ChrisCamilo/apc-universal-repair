import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { fontFamily, softHairline } from './theme';

// The look of a phone's sheet of actions, the same as the web (the Mais ações mockup): full-width 56px rows, each with
// its muted icon and its name, soft hairlines between them, the raised fill while pressed, and room under the last
// one, above the home indicator.

/** The room under the last row, in px (the mockup's 28px, less the sheet's own padding). */
const END_ROOM = scales.space.s3;

/** An action sheet: the list, and an action with its name. */
export const useStyles = createStyles('common.action-sheet', { list: '', action: 'action', label: 'action.label' }, (theme) => ({
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scales.space.s4,
    minHeight: scales.touch.row,
    paddingHorizontal: scales.space.s5,
    borderTopWidth: scales.hairline,
    borderTopColor: softHairline(theme),
  },
  actionFirst: { borderTopWidth: 0 },
  actionPressed: { backgroundColor: theme.colors.panelRaised },
  label: { fontFamily: fontFamily(scales.bodyFont, 500), fontSize: scales.fontSize.base, color: theme.colors.text },
  list: { paddingBottom: END_ROOM },
}));
