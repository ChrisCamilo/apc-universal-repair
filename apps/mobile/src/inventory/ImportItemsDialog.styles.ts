import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { softHairline } from '../theme';

// The look of the CSV import, the same as the web: the file buttons in a wrapping row, and the preview, with the names
// to create and each row of the file over a soft hairline, its line, code and name in a wrapping head, and a row with
// errors marked by a danger stripe at its start.

/** The danger stripe at the start of a row with errors, in px (border-l-2 on the web). */
export const ERROR_STRIPE_WIDTH = scales.space.s1 / 2;

/** The import: the buttons, and the preview with its names and rows. */
export const useStyles = createStyles(
  'inventory.import-items-dialog',
  { buttons: 'buttons', preview: 'preview', creates: 'preview.creates', row: 'preview.row', head: 'preview.row.head' },
  (theme) => ({
    buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s2 },
    creates: { gap: scales.space.s1 },
    head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: scales.space.s2 },
    preview: { gap: scales.space.s1 },
    row: {
      gap: scales.space.s1 / 2,
      paddingVertical: scales.space.s2,
      borderBottomWidth: scales.hairline,
      borderBottomColor: softHairline(theme),
    },
    rowInvalid: { borderLeftWidth: ERROR_STRIPE_WIDTH, borderLeftColor: theme.colors.danger, paddingLeft: scales.space.s3 },
  }),
);
