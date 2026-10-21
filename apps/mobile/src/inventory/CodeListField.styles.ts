import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { fieldStyles } from '../styles/shared';
import { fontFamily, softHairline } from '../theme';

// The look of a field of codes typed as chips, the same as the web: the field's frame, which grows into rows of chips,
// each code in mono in a soft pill with its ×, a code with a message in the danger color, the input after the chips,
// and the messages under the field. The ring only draws around the frame, so it adds no level to the ids inside it.

/** How far past a chip's × a press still lands, in px. */
export const REMOVE_HIT_SLOP = scales.space.s1;

/** A field of codes: its ring and frame, the chips, a chip's code and ×, the input and the messages. */
export const useStyles = createStyles(
  'inventory.code-list-field',
  {
    field: '',
    fieldRing: 'ring',
    fieldFrame: 'frame',
    chip: 'frame.chip',
    code: 'frame.chip.code',
    remove: 'frame.chip.remove',
    fieldInput: 'frame.input',
    messages: 'messages',
    message: 'messages.message',
  },
  (theme) => {
    const field = fieldStyles(theme);
    const { colors } = theme;
    return {
      ...field,
      fieldRing: { ...field.fieldRing, borderRadius: theme.radiusTile },
      fieldFrame: {
        ...field.fieldFrame,
        flexWrap: 'wrap',
        borderRadius: theme.radiusTile,
        paddingLeft: scales.space.s2,
        paddingVertical: scales.space.s1,
        gap: scales.space.s1,
      },
      fieldInput: { ...field.fieldInput, minWidth: scales.space.s1 * 24 },
      chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s1,
        borderRadius: scales.radiusPill,
        borderWidth: scales.hairline,
        borderColor: softHairline(theme),
        backgroundColor: colors.panelRaised,
        paddingVertical: scales.space.s1 / 2,
        paddingLeft: scales.space.s2,
        paddingRight: scales.space.s1,
      },
      chipInvalid: { borderColor: colors.danger },
      code: { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, color: colors.text },
      codeInvalid: { color: colors.danger },
      remove: { width: scales.space.s5, height: scales.space.s5, alignItems: 'center', justifyContent: 'center' },
      messages: { gap: scales.space.s1 / 2 },
      message: field.fieldError,
    };
  },
);
