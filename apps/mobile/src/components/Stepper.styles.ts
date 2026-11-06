import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { FIELD_DISABLED_OPACITY, fieldStyles, roundStyles } from '../styles/shared';
import { fontFamily } from '../theme';

// The look of the stepper, the same as the web: a 48px round − and + in the field's frame, lit in the accent while
// pressed and dimmed when locked, and between them a 72px pill with the number centered, its frame in the accent while
// typed in and in the danger color when there is an error.

/** The − and the +, and the number between them, are 48px tall; the number is 72px wide. */
export const STEPPER_SIZE = scales.space.s7;

/** A stepper: the field, the row of buttons and number, a − or +, the number and the error under it. */
export const useStyles = createStyles(
  'common.stepper',
  { field: '', row: 'row', button: 'row.button', input: 'row.input', error: 'error' },
  (theme) => {
    const field = fieldStyles(theme);
    const round = roundStyles(theme, STEPPER_SIZE);
    return {
      button: round.round,
      buttonLocked: { opacity: FIELD_DISABLED_OPACITY },
      buttonPressed: round.roundPressed,
      error: field.fieldError,
      field: field.field,
      input: {
        width: scales.space.s8,
        height: STEPPER_SIZE,
        padding: 0,
        textAlign: 'center',
        borderWidth: scales.hairline,
        borderColor: theme.colors.hairline,
        borderRadius: scales.radiusPill,
        backgroundColor: theme.colors.panel,
        fontFamily: fontFamily(scales.bodyFont, 600),
        fontSize: scales.fontSize.lg,
        color: theme.colors.text,
      },
      inputError: field.fieldFrameError,
      inputFocused: field.fieldFrameFocused,
      row: { flexDirection: 'row', alignItems: 'center', gap: scales.space.s2 },
    };
  },
);
