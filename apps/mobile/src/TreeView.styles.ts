import { ICON_SIZES } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { glow } from './styles/shared';
import { fontFamily, softHairline, withAlpha } from './theme';

// The look of the tree, the same as the web: rows in the display face at the top level, the body face in between and
// the mono face for the leaves; the selected or highlighted row on the soft accent with an accent rule on its left;
// pressing a row shows what hover shows on the web; a guide hanging under each open branch. The tree's height comes
// from its owner.

/** A tree: an item, its row with chevron, label and detail, and the group of its children. */
export const useStyles = createStyles(
  'common.tree-view',
  {
    tree: '',
    item: 'item',
    row: 'item.row',
    chevron: 'item.row.chevron',
    spacer: 'item.row.spacer',
    label: 'item.row.label',
    detail: 'item.row.detail',
    group: 'item.group',
  },
  (theme) => {
    const { colors } = theme;
    const size = scales.fontSize.sm;
    return {
      chevron: {},
      detail: { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, color: colors.textMuted },
      // The guide hangs under the chevron's center: the row's padding and accent rule plus half the chevron.
      group: {
        marginLeft: scales.space.s2 + scales.hairline * 2 + ICON_SIZES.caret / 2,
        paddingLeft: scales.space.s2,
        borderLeftWidth: scales.hairline,
        borderLeftColor: softHairline(theme),
      },
      item: {},
      label: { flexShrink: 1, fontFamily: fontFamily(scales.bodyFont), fontSize: size, color: colors.text },
      labelActive: { color: colors.accent },
      labelDisplay: {
        fontFamily: fontFamily(theme.displayFont, 600),
        letterSpacing: theme.displayTracking * size,
        textTransform: 'uppercase',
      },
      labelMono: { fontFamily: fontFamily(scales.monoFont) },
      labelMonoActive: { fontFamily: fontFamily(scales.monoFont, 500) },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s2,
        paddingHorizontal: scales.space.s2,
        paddingVertical: scales.space.s2,
        borderLeftWidth: scales.hairline * 2,
        borderLeftColor: 'transparent',
        borderRadius: theme.radiusTile,
        backgroundColor: 'transparent',
      },
      rowActive: { borderLeftColor: colors.accent, backgroundColor: withAlpha(colors.accent, scales.accentSoft), ...glow(theme) },
      rowPressed: { backgroundColor: colors.panelRaised },
      spacer: { width: ICON_SIZES.caret },
      tree: {},
    };
  },
);
