import { scales } from '@apc/tokens/theme';
import { createStyles } from '../../styles/createStyles';
import { displayLabel } from '../../styles/shared';
import { fontFamily } from '../../app/theme';

// The look of an engine's sheet as a form, the same as the web on a phone, filling a full-screen dialog: a muted label
// over the title it will have, the year it takes from the tree in a dashed box, the displacement and cylinders side by
// side, the drive and the summary, then how the engine will read in the tree and its readouts.

/** The sheet's form: its heading, the year from the tree, the two short fields, the drive and the preview. */
export const useStyles = createStyles(
  'catalog.engine-sheet-form',
  {
    base: '',
    head: 'head',
    kicker: 'head.kicker',
    fromTree: 'from-tree',
    pair: 'pair',
    pairField: 'pair.field',
    drive: 'drive',
    problem: 'drive.problem',
    preview: 'preview',
    readouts: 'preview.readouts',
  },
  (theme) => ({
    base: { gap: scales.space.s4 },
    drive: { gap: scales.space.s1 + scales.space.s1 / 2 },
    fromTree: {
      borderWidth: scales.hairline,
      borderStyle: 'dashed',
      borderColor: theme.colors.hairline,
      borderRadius: theme.radiusTile,
      paddingHorizontal: scales.space.s3,
      paddingVertical: scales.space.s2,
      fontFamily: fontFamily(scales.bodyFont),
      fontSize: scales.fontSize.sm,
      color: theme.colors.textMuted,
    },
    head: { gap: scales.space.s1 },
    kicker: { ...displayLabel(theme, 'xs'), color: theme.colors.textMuted },
    pair: { flexDirection: 'row', gap: scales.space.s3 },
    pairField: { flex: 1 },
    preview: { gap: scales.space.s1 + scales.space.s1 / 2 },
    problem: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: theme.colors.danger },
    readouts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: scales.space.s3, rowGap: scales.space.s1 },
  }),
);
