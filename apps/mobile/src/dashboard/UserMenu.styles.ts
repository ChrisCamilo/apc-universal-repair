import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';

// The look of the user menu in its bottom sheet: inset as the menu's popover was, so the items' text lines up with the
// sheet's title.

/** The menu inside the bottom sheet. */
export const useStyles = createStyles('dashboard.user-menu', { menu: '' }, () => ({
  menu: { paddingHorizontal: scales.space.s4, paddingBottom: scales.space.s2 },
}));
