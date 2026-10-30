import { scales } from '@apc/shared/theme';
import { createStyles } from './styles/createStyles';
import { displayLabel } from './styles/shared';
import { fontFamily, softHairline } from './theme';

// The look of a phone's filter sheet, the same as the web (the Filtros mockup): full-width 56px rows under soft
// hairlines, each with its label, its value (muted, or in the accent once chosen) and a chevron; the sort's row leads
// with its icon and a strip of the canvas sets it apart from the filters. A segmented choice sits under a muted display
// label. A list of options, opened from a row, has the ← and the row's name on top and its options as rows, the chosen
// ones in the accent with a check. "Limpar" is an accent text button.

/**
 * A filter sheet: Limpar, a row with its label and value, the strip after the sort, a segmented field with its label,
 * a list's header and title, and an option with its label.
 */
export const useStyles = createStyles(
  'common.filter-sheet',
  {
    clear: 'clear',
    clearLabel: 'clear.label',
    row: 'row',
    rowLabel: 'row.label',
    rowValue: 'row.value',
    strip: 'strip',
    segments: 'segments',
    segmentsLabel: 'segments.label',
    listHeader: 'list.header',
    listTitle: 'list.header.title',
    option: 'list.option',
    optionLabel: 'list.option.label',
  },
  (theme) => {
    const { colors } = theme;
    const hairline = { borderTopWidth: scales.hairline, borderTopColor: softHairline(theme) };
    const body = (size: number, weight: 400 | 500 | 600 = 400) => ({
      fontFamily: fontFamily(scales.bodyFont, weight),
      fontSize: size,
      color: colors.text,
    });
    return {
      clear: {
        minHeight: scales.touch.icon,
        justifyContent: 'center',
        paddingHorizontal: scales.space.s3,
        borderRadius: scales.radiusPill,
      },
      clearLabel: { ...body(scales.fontSize.base, 600), color: colors.accent },
      clearPressed: { opacity: 0.8 },
      listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s1,
        paddingLeft: scales.space.s2,
        paddingRight: scales.space.s4,
        paddingBottom: scales.space.s2,
        borderBottomWidth: scales.hairline,
        borderBottomColor: softHairline(theme),
      },
      listTitle: displayLabel(theme, 'sm'),
      option: {
        ...hairline,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s3,
        minHeight: scales.touch.row,
        paddingHorizontal: scales.space.s5,
      },
      optionFirst: { borderTopWidth: 0 },
      optionLabel: { ...body(scales.fontSize.base), flexGrow: 1, flexShrink: 1 },
      optionLabelOn: { fontFamily: fontFamily(scales.bodyFont, 600), color: colors.accent },
      optionPressed: { backgroundColor: colors.panelRaised },
      row: {
        ...hairline,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s3,
        minHeight: scales.touch.row,
        paddingLeft: scales.space.s5,
        paddingRight: scales.space.s4,
      },
      rowLabel: { ...body(scales.fontSize.base, 500), flexGrow: 1, flexShrink: 1 },
      rowPressed: { backgroundColor: colors.panelRaised },
      rowValue: { ...body(15), maxWidth: '45%', color: colors.textMuted },
      rowValueChosen: { fontFamily: fontFamily(scales.bodyFont, 600), color: colors.accent },
      segments: { gap: scales.space.s2, paddingHorizontal: scales.space.s5, paddingTop: scales.space.s3, paddingBottom: scales.space.s4 },
      segmentsFirst: { ...hairline, paddingBottom: scales.space.s1 },
      segmentsLabel: { ...displayLabel(theme, 'xs'), color: colors.textMuted },
      strip: { height: scales.space.s2, backgroundColor: colors.canvas },
    };
  },
);
