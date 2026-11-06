import { scales } from '@apc/tokens/theme';
import { createStyles } from '../../styles/createStyles';
import { displayLabel } from '../../styles/shared';

// The look of the parts a Catalog search by code found, the same as the web on a phone: no box, a heading small and
// muted in the display face over the Inventory's cards, which keep their own look.

/** The found parts: their column and its heading. */
export const useStyles = createStyles('catalog.part-results', { box: '', heading: 'heading' }, (theme) => ({
  box: { gap: scales.space.s2, paddingTop: scales.space.s2 },
  heading: { ...displayLabel(theme, 'sm'), color: theme.colors.textMuted },
}));
