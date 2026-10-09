import { createStyles } from './styles/createStyles';
import { fieldStyles } from './styles/shared';
import { softHairline } from './Panel';

// The look of a field's value shown for reading, the same as the web: a TextField's frame, the size and shape of it,
// with the soft hairline and no fill, so it reads as text and not as a disabled input.

/** A value for reading: the field, the ring that keeps the frame where a TextField's is, the frame and the value. */
export const useStyles = createStyles(
  'common.field-value',
  { field: '', fieldRing: 'ring', frame: 'value', fieldInput: 'value.text' },
  (theme) => {
    const shared = fieldStyles(theme);
    return {
      field: shared.field,
      fieldInput: shared.fieldInput,
      fieldRing: shared.fieldRing,
      frame: { ...shared.fieldFrame, borderColor: softHairline(theme), backgroundColor: 'transparent' },
    };
  },
);
