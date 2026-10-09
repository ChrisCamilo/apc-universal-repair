import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { displayLabel, glow, menuItemStyles } from './styles/shared';

// The look of the compact single choice, the same as the web: options in a hairline pill on the panel, the chosen
// one filled with the accent and glowing where the style has a glow. Inside a Menu it sits in a labeled row, and its
// options pack tighter.

/** A segmented choice: the menu row with its label and description, the group, and an option with its label. */
export const useStyles = createStyles(
  'common.segmented',
  { group: '', option: 'option', optionLabel: 'option.label', row: 'row', text: 'row.text', menuItemLabel: 'row.text.label', menuItemDescription: 'row.text.description' },
  (theme) => {
    const { colors } = theme;
    const { menuItemLabel, menuItemDescription } = menuItemStyles(theme);
    return {
      group: {
        flexDirection: 'row',
        alignSelf: 'flex-start',
        gap: scales.space.s1 / 2,
        padding: scales.space.s1 / 2,
        borderWidth: scales.hairline,
        borderColor: colors.hairline,
        borderRadius: scales.radiusPill,
        backgroundColor: colors.panel,
      },
      menuItemDescription,
      menuItemLabel,
      option: { paddingHorizontal: scales.space.s3, paddingVertical: scales.space.s1, borderRadius: scales.radiusPill, backgroundColor: 'transparent' },
      optionInMenu: { paddingHorizontal: scales.space.s2 },
      optionLabel: { ...displayLabel(theme, 'xs'), color: colors.textMuted },
      optionLabelOn: { color: colors.onAccent },
      optionLabelPressed: { color: colors.text },
      optionOn: { backgroundColor: colors.accent, ...glow(theme) },
      row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        columnGap: scales.space.s3,
        rowGap: scales.space.s2,
        paddingHorizontal: scales.space.s2,
        paddingVertical: scales.space.s2,
      },
      text: { flexShrink: 1 },
    };
  },
);
