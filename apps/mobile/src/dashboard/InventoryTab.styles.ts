import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';

// The look of the Inventory tab, the same as the web on a phone: the Panel fills the screen down to the bottom, with
// one column that scrolls inside it (the toolbar, the filters and the cards) above the pagination, which stays at its
// bottom; the filters in a wrapping row; each card's pencil and trash side by side; the "N marcas" of an item of
// several brands, whose chevron turns down while the item is open; and, while the list loads,
// skeleton rows in the cards' shape. The list takes the room left, with the error and the empty states centered in
// it. The Panel and the skeletons keep their own ids.

/** The skeleton's line widths: the name, then the details. */
export const LOADING_LINES = ['40%', '20%'] as const;
/** The skeleton's quantity, the width of a short number. */
export const LOADING_QUANTITY = scales.space.s1 * 14;
/** The skeleton's thumbnail, the size of a card's thumbnail. */
export const LOADING_THUMB = scales.space.s1 * 11;

/** The Inventory tab: its column, the filters, each card's actions and brands, and the loading rows. */
export const useStyles = createStyles(
  'inventory.inventory-tab',
  {
    tab: '',
    filters: 'filters',
    list: 'list',
    actions: 'actions',
    brands: 'brands',
    chevron: 'brands.chevron',
    loading: 'loading',
    loadingRow: 'loading.row',
    loadingLines: 'loading.row.lines',
  },
  () => ({
    actions: { flexDirection: 'row', gap: scales.space.s1 },
    brands: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: scales.space.s1 },
    chevron: {},
    // An item opened into its brands' cards.
    chevronOpen: { transform: [{ rotate: '90deg' }] },
    filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: scales.space.s2 },
    list: { flexGrow: 1, gap: scales.space.s3 },
    listCentered: { justifyContent: 'center' },
    loading: { gap: scales.space.s3, paddingVertical: scales.space.s2 },
    loadingLines: { flex: 1, gap: scales.space.s2 },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: scales.space.s3 },
    panel: { flex: 1, gap: scales.space.s3 },
    scroll: { flex: 1 },
    tab: { flexGrow: 1, gap: scales.space.s3 },
  }),
);
