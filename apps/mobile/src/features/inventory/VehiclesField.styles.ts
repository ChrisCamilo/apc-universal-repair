import { scales } from '@apc/tokens/theme';
import { createStyles } from '../../styles/createStyles';
import { fieldStyles } from '../../styles/shared';
import { fontFamily, softAccent, softHairline } from '../../app/theme';

// The look of the vehicles in the item form, the same as the web: the chips wrap in rows, each a 44px soft accent pill
// with the vehicle and a 44px muted × that brightens while pressed; the new vehicle's fields sit in a soft hairline
// frame, its generation and version side by side, each half the width, with Cancelar and Adicionar at its end; a message is in the danger color.

/**
 * The vehicles: the field, the chips, a chip with its text and ×, the new vehicle with its generation and version and
 * its buttons, and a message.
 */
export const useStyles = createStyles(
  'inventory.vehicles-field',
  {
    field: '',
    chips: 'chips',
    chip: 'chips.chip',
    chipText: 'chips.chip.text',
    remove: 'chips.chip.remove',
    draft: 'draft',
    pair: 'draft.pair',
    pairField: 'draft.pair.field',
    draftActions: 'draft.actions',
    error: 'error',
  },
  (theme) => ({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      height: scales.touch.icon,
      paddingLeft: scales.space.s3 + scales.space.s1 / 2,
      borderRadius: scales.radiusPill,
      backgroundColor: softAccent(theme),
    },
    chipText: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.base, color: theme.colors.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s2 },
    draft: {
      gap: scales.space.s3,
      padding: scales.space.s3,
      borderWidth: scales.hairline,
      borderColor: softHairline(theme),
      borderRadius: theme.radiusTile,
    },
    draftActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: scales.space.s2 },
    error: fieldStyles(theme).fieldError,
    field: { gap: scales.space.s2 },
    pair: { flexDirection: 'row', alignItems: 'flex-start', gap: scales.space.s2 + scales.space.s1 / 2 },
    pairField: { flex: 1, minWidth: 0 },
    remove: { width: scales.touch.icon, height: scales.touch.icon, alignItems: 'center', justifyContent: 'center' },
  }),
);
