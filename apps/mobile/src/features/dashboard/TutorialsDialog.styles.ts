import { scales } from '@apc/tokens/theme';
import { createStyles } from '../../styles/createStyles';
import { fontFamily } from '../../app/theme';

// The look of "Tutoriais", inside its Dialog, the same as the web's phone layout: a muted line saying what each kind of
// tutorial is, then each tutorial a press the width of its section, a finger tall, its title over its one-line
// description and, last, its kind and its steps in the mono face; pressing one shows what hover shows on the web.

/** The tutorials dialog: the intro, a section's list, and a tutorial with its texts. */
export const useStyles = createStyles(
  'dashboard.tutorials-dialog',
  { intro: 'intro', list: 'list', tutorial: 'list.tutorial', title: 'list.tutorial.title', description: 'list.tutorial.description', meta: 'list.tutorial.meta' },
  (theme) => {
    const { colors } = theme;
    return {
      description: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.xs, color: colors.textMuted },
      intro: { marginBottom: scales.space.s3 },
      list: { gap: scales.space.s1 },
      meta: { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, color: colors.textMuted },
      title: { fontFamily: fontFamily(scales.bodyFont, 500), fontSize: scales.fontSize.sm, color: colors.text },
      tutorial: {
        minHeight: scales.space.s7,
        gap: scales.space.s1 / 2,
        paddingHorizontal: scales.space.s2,
        paddingVertical: scales.space.s2,
        borderRadius: theme.radiusTile,
      },
      tutorialPressed: { backgroundColor: colors.panelRaised },
    };
  },
);
