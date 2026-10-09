import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { fieldStyles } from './styles/shared';
import { fontFamily, softHairline } from './theme';

// The look of the combobox, the same as the web: a text field's frame with a chevron at its end that turns while the
// list is open, the shared list and options, and the "+ Criar" row in the accent, set apart by a hairline from the
// options above it. The ring only draws around the frame, so it adds no level to the ids inside it.

/** How far past the chevron a press still lands, in px. */
export const CHEVRON_HIT_SLOP = scales.space.s2;

/** A combobox: the field, its ring and frame, input and chevron, the list, an option or the create row, and the error. */
export const useStyles = createStyles(
  'common.combobox',
  {
    field: '',
    fieldRing: 'ring',
    fieldFrame: 'frame',
    fieldInput: 'frame.input',
    toggle: 'frame.toggle',
    chevron: 'frame.toggle.chevron',
    fieldList: 'list',
    option: 'list.option',
    optionText: 'list.option.text',
    fieldError: 'error',
  },
  (theme) => ({
    ...fieldStyles(theme),
    chevron: { transform: [{ rotate: '90deg' }] },
    chevronOpen: { transform: [{ rotate: '-90deg' }] },
    // A hairline sets the create row apart from the options above it.
    optionBelow: { borderTopWidth: scales.hairline, borderTopColor: softHairline(theme) },
    optionTextCreate: { fontFamily: fontFamily(scales.bodyFont, 600), color: theme.colors.accent },
    toggle: {},
  }),
);
