import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';

// The look of the Catalog tab, the same as the web's on a narrow screen: one column of the brand rail, the search,
// the model tree no taller than TREE_MAX_HEIGHT, the photo and the sheet, with the engine's specs in a wrapping row.
// The rail and the tree only pass their style to the Panel and the TreeView, which keep their own ids.

/** How many brand tiles sit in a row: two on a phone, four from WIDE_SCREEN on. */
export const TILE_COLUMNS = { narrow: 2, wide: 4 };
/** The tree's height before it scrolls, in px, as on the web (max-h-96). */
export const TREE_MAX_HEIGHT = scales.space.s1 * 96;
/** Screen width from which the brand tiles sit four to a row: the web's sm breakpoint. */
export const WIDE_SCREEN = 640;

/** The Catalog tab: its column, the brand rail, the tree, and the engine's sheet with its specs. */
export const useStyles = createStyles('catalog.catalog-tab', { tab: '', sheet: 'sheet', specs: 'sheet.specs' }, () => ({
  rail: { gap: scales.space.s3 },
  sheet: { gap: scales.space.s3 },
  specs: { flexDirection: 'row', flexWrap: 'wrap', columnGap: scales.space.s3, rowGap: scales.space.s1 },
  tab: { gap: scales.space.s3 },
  tree: { maxHeight: TREE_MAX_HEIGHT },
}));
