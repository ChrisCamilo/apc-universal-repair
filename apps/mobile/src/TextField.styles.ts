import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { fieldStyles } from './styles/shared';
import { fontFamily } from './theme';

// The look of the pill-shaped inputs, the same as the web: the frame lights up in the accent with a focus ring while
// focused, and in the danger color on error; a disabled field dims. The ring only draws around the frame, so it adds
// no level to the ids inside it.

/** How far past the eye and the clear × a press still lands, in px. */
export const TRAILING_HIT_SLOP = scales.space.s2;

/** A labeled text field: the field, its ring and frame, the input, the password toggle and the error under it. */
export const useStyles = createStyles(
  'common.text-field',
  { field: '', fieldRing: 'ring', fieldFrame: 'frame', fieldInput: 'frame.input', toggle: 'frame.toggle', error: 'error' },
  (theme) => ({
    ...fieldStyles(theme),
    error: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: theme.colors.danger },
    toggle: {},
  }),
);

/** The search field: its ring and frame, the input and the clear button. */
export const useSearchStyles = createStyles(
  'common.search-field',
  { fieldRing: 'ring', fieldFrame: '', fieldInput: 'input', clear: 'clear' },
  (theme) => ({ ...fieldStyles(theme), clear: {} }),
);
