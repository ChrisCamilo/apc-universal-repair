import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';

// The look of the item form, the same as the web on a phone: the fields in one column, and the position and side
// choices each with its label over it. The details use the same layout, with the values as text.

/** The item form: its fields and the labeled choices. */
export const useStyles = createStyles('inventory.item-form-dialog', { fields: 'fields', choice: 'fields.choice' }, () => ({
  choice: { gap: scales.space.s2 },
  fields: { gap: scales.space.s3 },
}));
