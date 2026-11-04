import { ICON_SIZES } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { displayLabel, glow } from './styles/shared';
import { fontFamily, softAccent } from './theme';

// The look of the tree, the same as the web: rows in the display face at the top level, the body face in between and
// the mono face for the leaves; the selected or highlighted row on the soft accent with an accent rule on its left;
// pressing a row shows what hover shows on the web. As on the web's phone layout, a row is 48px tall in the body size,
// and each level is indented 16px with no guide; a leaf's tag is a pill in the display face, outlined at rest and
// filled in the accent on the selected leaf. The tree's height comes from its owner.

/** The size of a leaf's tag, in px (text-[11px] on the web). */
export const TAG_SIZE = 11;

/** A tree: an item, its row with chevron, label, detail and tag, and the group of its children. */
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
    tag: 'item.row.tag',
    group: 'item.group',
  },
  (theme) => {
    const { colors } = theme;
    const size = scales.fontSize.base;
    return {
      chevron: {},
      detail: { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, color: colors.textMuted },
      group: { paddingLeft: scales.space.s4 },
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
        minHeight: scales.space.s7,
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
      rowActive: { borderLeftColor: colors.accent, backgroundColor: softAccent(theme), ...glow(theme) },
      rowPressed: { backgroundColor: colors.panelRaised },
      spacer: { width: ICON_SIZES.caret },
      tag: {
        ...displayLabel(theme, 'xs'),
        marginLeft: 'auto',
        paddingHorizontal: scales.space.s2 + scales.space.s1 / 2,
        paddingVertical: scales.space.s1,
        borderWidth: scales.hairline,
        borderColor: colors.hairline,
        borderRadius: scales.radiusPill,
        fontSize: TAG_SIZE,
        lineHeight: TAG_SIZE,
        letterSpacing: theme.displayTracking * TAG_SIZE,
        overflow: 'hidden',
      },
      tagActive: { borderColor: colors.accent, backgroundColor: colors.accent, color: colors.onAccent },
      tree: {},
    };
  },
);
