import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';

// The look of the Inventory tab, the same as the web on a phone: one column on the Panel, the filters in a wrapping
// row, each card's pencil and trash side by side, and, while the list loads, skeleton rows in the cards' shape. The
// Panel and the skeletons keep their own ids.

/** The skeleton's line widths: the name, then the details. */
export const LOADING_LINES = ['40%', '20%'] as const;
/** The skeleton's quantity, the width of a short number. */
export const LOADING_QUANTITY = scales.space.s1 * 14;
/** The skeleton's thumbnail, the size of a card's thumbnail. */
export const LOADING_THUMB = scales.space.s1 * 11;

/** The Inventory tab: its column, the filters, each card's actions and the loading rows. */
export const useStyles = createStyles(
  'inventory.inventory-tab',
  { tab: '', filters: 'filters', actions: 'actions', loading: 'loading', loadingRow: 'loading.row', loadingLines: 'loading.row.lines' },
  () => ({
    actions: { flexDirection: 'row', gap: scales.space.s1 },
    filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: scales.space.s2 },
    loading: { gap: scales.space.s3, paddingVertical: scales.space.s2 },
    loadingLines: { flex: 1, gap: scales.space.s2 },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: scales.space.s3 },
    tab: { gap: scales.space.s3 },
  }),
);
