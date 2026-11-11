import { scales } from '@apc/tokens/theme';
import { createStyles } from '../../styles/createStyles';
import { fieldStyles } from '../../styles/shared';

// The look of the pill-shaped inputs, the same as the web: the frame lights up in the accent with a focus ring while
// focused, and in the danger color on error; a disabled field dims. The ring only draws around the frame, so it adds
// no level to the ids inside it. A field of several lines is a box with the tile's corners instead of a pill, its text
// wrapping from the top, as tall as its lines.

/** How far past the eye and the clear × a press still lands, in px. */
export const TRAILING_HIT_SLOP = scales.space.s2;
/** How tall a line of a field of several lines is, in px: the body size at the web's 1.5 line height. */
export const FIELD_LINE_HEIGHT = scales.fontSize.base * 1.5;

/** A labeled text field: the field, its ring and frame, the input, the password toggle and the error under it. */
export const useStyles = createStyles(
  'common.text-field',
  { field: '', fieldRing: 'ring', fieldFrame: 'frame', fieldInput: 'frame.input', toggle: 'frame.toggle', fieldError: 'error' },
  (theme) => ({
    ...fieldStyles(theme),
    toggle: fieldStyles(theme).fieldButton,
    fieldRingMultiline: { borderRadius: theme.radiusTile + scales.focusRing.width },
    fieldFrameMultiline: { alignItems: 'flex-start', borderRadius: theme.radiusTile },
    fieldInputMultiline: { textAlignVertical: 'top' },
  }),
);

/** The search field: its ring and frame, the input and the clear button. */
export const useSearchStyles = createStyles(
  'common.search-field',
  { fieldRing: 'ring', fieldFrame: '', fieldInput: 'input', clear: 'clear' },
  (theme) => ({ ...fieldStyles(theme), clear: fieldStyles(theme).fieldButton }),
);
