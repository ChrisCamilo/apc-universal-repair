import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { fieldStyles } from './styles/shared';

// The look of the pick-only dropdown, the same as the web: a small pill button on the panel, its border in the accent
// while a multiple choice has picks, the chevron turning while the list is open, and the shared list and options; a
// multiple choice shows a checkbox before each option.

/** The checkbox's width and height, in px (size-3.5 on the web). */
export const CHECKBOX_SIZE = scales.space.s1 * 3.5;
/** A disabled select dims to this opacity, as on the web (disabled:opacity-50). */
export const DISABLED_OPACITY = 0.5;

/** A select: the button with its text and chevron, the list, and an option with its box and text. */
export const useStyles = createStyles(
  'common.select',
  { button: 'button', shown: 'button.text', chevron: 'button.chevron', fieldList: 'list', option: 'list.option', box: 'list.option.box', optionText: 'list.option.text' },
  (theme) => {
    const { colors } = theme;
    const field = fieldStyles(theme);
    return {
      ...field,
      box: {
        width: CHECKBOX_SIZE,
        height: CHECKBOX_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: scales.hairline,
        borderColor: colors.hairline,
        borderRadius: theme.radiusTile / 4,
        backgroundColor: colors.panel,
      },
      boxChecked: { borderColor: colors.accent, backgroundColor: colors.accent },
      button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s2,
        borderWidth: scales.hairline,
        borderColor: colors.hairline,
        borderRadius: scales.radiusPill,
        backgroundColor: colors.panel,
        paddingHorizontal: scales.space.s3,
        paddingVertical: scales.space.s2,
      },
      buttonDisabled: { opacity: DISABLED_OPACITY },
      buttonPicked: { borderColor: colors.accent },
      chevron: { transform: [{ rotate: '90deg' }] },
      chevronOpen: { transform: [{ rotate: '-90deg' }] },
      shown: field.optionText,
    };
  },
);
