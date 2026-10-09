import { scales } from '@apc/shared/theme';
import { softHairline } from './Panel';
import { createStyles } from './styles/createStyles';
import { displayLabel } from './styles/shared';
import { withAlpha } from './theme';

// The look of the quick-filter chips, the same as the web: a soft hairline pill in the muted display face that lights
// up in the accent when on; pressing shows what hover shows on the web. The group wraps them.

/** A chip, by size and state, and its label. */
export const useStyles = createStyles('common.filter-chip', { chip: '', label: 'label' }, (theme) => {
  const { colors } = theme;
  return {
    chip: { borderWidth: scales.hairline, borderColor: softHairline(theme), borderRadius: scales.radiusPill, backgroundColor: 'transparent' },
    chipMd: { paddingHorizontal: scales.space.s3, paddingVertical: scales.space.s1 },
    chipOn: { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, scales.accentSoft) },
    chipPressed: { borderColor: colors.hairline },
    chipSm: { paddingHorizontal: scales.space.s2, paddingVertical: scales.space.s1 / 2 },
    label: { ...displayLabel(theme, 'xs'), color: colors.textMuted },
    labelOn: { color: colors.accent },
    labelPressed: { color: colors.text },
  };
});

/** A group of chips, wrapping. */
export const useGroupStyles = createStyles('common.filter-chip-group', { group: '' }, () => ({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s2 },
}));
