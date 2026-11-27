import { scales } from '@apc/tokens/theme';
import { createStyles } from '../../styles/createStyles';
import { displayLabel } from '../../styles/shared';
import { fontFamily, softHairline } from '../../app/theme';

// The look of the accordion, the same as the web's phone layout: each section a header 48px tall in the display face,
// with a muted note after its title, a soft hairline between sections, the chevron turning a quarter as the section
// opens, and its content under it. Pressing a header shows what hover shows on the web.

/** An accordion: a section, its header with chevron, title and note, and its content. */
export const useStyles = createStyles(
  'common.accordion',
  {
    accordion: '',
    section: 'section',
    header: 'section.header',
    chevron: 'section.header.chevron',
    title: 'section.header.title',
    detail: 'section.header.detail',
    content: 'section.content',
  },
  (theme) => {
    const { colors } = theme;
    return {
      accordion: {},
      chevron: {},
      content: { paddingHorizontal: scales.space.s2, paddingTop: scales.space.s1, paddingBottom: scales.space.s3 },
      detail: { flexShrink: 0, fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.xs, color: colors.textMuted },
      header: {
        minHeight: scales.space.s7,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scales.space.s2,
        paddingHorizontal: scales.space.s2,
        paddingVertical: scales.space.s2,
        borderRadius: theme.radiusTile,
      },
      headerPressed: { backgroundColor: colors.panelRaised },
      section: {},
      sectionSeparated: { borderTopWidth: scales.hairline, borderTopColor: softHairline(theme) },
      title: { ...displayLabel(theme, 'sm'), flex: 1, minWidth: 0, color: colors.text },
    };
  },
);
