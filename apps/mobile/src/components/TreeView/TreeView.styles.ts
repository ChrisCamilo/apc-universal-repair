import { ICON_SIZES } from '@apc/tokens/icons';
import { scales } from '@apc/tokens/theme';
import { createStyles } from '../../styles/createStyles';
import { displayLabel, glow } from '../../styles/shared';
import { fontFamily, softAccent } from '../../app/theme';

// The look of the tree, the same as the web: rows in the display face at the top level, the body face in between and
// the mono face for the leaves; the selected or highlighted row on the soft accent with an accent rule on its left;
// pressing a row shows what hover shows on the web. As on the web's phone layout, a row is 48px tall in the body size,
// and each level is indented 16px with no guide; a leaf's tag is a pill in the display face, outlined at rest and
// filled in the accent on the selected leaf. The chevron of a branch that can be selected, which opens it apart from the
// row, is a finger wide, its center where it was. The tree's height comes from its owner. A row's own buttons sit at its
// right end, always in view, and the line after a branch's children sits under them. The line holding a row and its
// buttons only lays them out.

/** The size of a leaf's tag, in px (text-[11px] on the web). */
export const TAG_SIZE = 11;

/** A tree: an item, its row with chevron, label, detail and tag, and the group of its children. */
export const useStyles = createStyles(
  'common.tree-view',
  {
    tree: '',
    item: 'item',
    line: 'item.line',
    row: 'item.row',
    chevron: 'item.row.chevron',
    toggle: 'item.row.toggle',
    spacer: 'item.row.spacer',
    label: 'item.row.label',
    detail: 'item.row.detail',
    tag: 'item.row.tag',
    actions: 'item.row.actions',
    group: 'item.group',
    after: 'item.group.after',
  },
  (theme) => {
    const { colors } = theme;
    const size = scales.fontSize.base;
    return {
      actions: { flexDirection: 'row', alignItems: 'center', gap: scales.space.s1 / 2 },
      after: { paddingVertical: scales.space.s1, alignItems: 'flex-start' },
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
      line: { flexDirection: 'row', alignItems: 'center' },
      labelMonoActive: { fontFamily: fontFamily(scales.monoFont, 500) },
      row: {
        flex: 1,
        minWidth: 0,
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
      // A finger wide, reaching past the chevron on each side, so the chevron and the label stay where they were.
      toggle: {
        width: scales.touch.icon,
        height: scales.touch.icon,
        marginVertical: -scales.space.s2,
        marginHorizontal: (ICON_SIZES.caret - scales.touch.icon) / 2,
        alignItems: 'center',
        justifyContent: 'center',
      },
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
