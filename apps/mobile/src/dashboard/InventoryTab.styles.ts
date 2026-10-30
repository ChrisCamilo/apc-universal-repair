import { scales } from '@apc/shared/theme';
import { createStyles } from '../styles/createStyles';
import { displayLabel, glow } from '../styles/shared';
import { fontFamily } from '../theme';

// The look of the Inventory tab, the same as the web on a phone (the Estoque mockup): on the canvas, with no panel
// around it, one column that scrolls as a whole (the toolbar, the filters and the cards), ending clear
// of the round "+" at the bottom right, with "Fim da lista" once every item is in; the filters in a wrapping row; each card's pencil and trash side by side, and
// its quantity at 20px with its stock status under it in the 11px display face, muted for "un.", in the warn or danger
// color for Baixo or Esgotado; and, while the list loads, skeleton rows in the cards' shape. The list takes the room
// left, with the error and the empty states centered in it. The skeletons keep their own ids.

/** The skeleton's line widths: the name, then the details. */
export const LOADING_LINES = ['40%', '20%'] as const;
/** The skeleton's quantity, the width of a short number. */
export const LOADING_QUANTITY = scales.space.s1 * 14;
/** The skeleton's thumbnail, the size of a card's thumbnail. */
export const LOADING_THUMB = scales.space.s1 * 11;
/** The round "+", in px (size-14 on the web). */
export const FAB_SIZE = scales.space.s1 * 14;
/** A card's quantity, in px (text-xl on the web). */
const QUANTITY_SIZE = scales.fontSize.xl;
/** A card's stock status under its quantity, in px (11px on the web). */
const TAG_SIZE = 11;

/** The Inventory tab: its column, the filters, each card's actions and quantity, the "+" and the loading rows. */
export const useStyles = createStyles(
  'inventory.inventory-tab',
  {
    panel: '',
    tab: 'scroll',
    filters: 'filters',
    list: 'list',
    end: 'list.end',
    actions: 'actions',
    name: 'name',
    quantity: 'quantity',
    quantityValue: 'quantity.value',
    quantityTag: 'quantity.tag',
    fab: 'new-item',
    fabButton: 'new-item.button',
    loading: 'loading',
    loadingRow: 'loading.row',
    loadingLines: 'loading.row.lines',
  },
  (theme) => ({
    actions: { flexDirection: 'row', gap: scales.space.s1 },
    fab: { position: 'absolute', right: scales.space.s4, bottom: scales.space.s4 },
    fabButton: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: scales.radiusPill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
      ...glow(theme),
    },
    fabButtonPressed: { transform: [{ translateY: 1 }] },
    // "Fim da lista", as on the web.
    end: {
      paddingVertical: scales.space.s4,
      textAlign: 'center',
      fontFamily: fontFamily(scales.monoFont),
      fontSize: scales.fontSize.xs,
      color: theme.colors.textMuted,
    },
    filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: scales.space.s2 },
    list: { flexGrow: 1, gap: scales.space.s3 },
    listCentered: { justifyContent: 'center' },
    loading: { gap: scales.space.s3, paddingVertical: scales.space.s2 },
    loadingLines: { flex: 1, gap: scales.space.s2 },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: scales.space.s3 },
    // A card's name, in semibold, as on the web.
    name: { fontFamily: fontFamily(scales.bodyFont, 600), fontSize: scales.fontSize.base, color: theme.colors.text },
    panel: { flex: 1 },
    quantity: { alignItems: 'flex-end', gap: scales.space.s1 / 2 },
    quantityLow: { color: theme.colors.warn },
    quantityOut: { color: theme.colors.danger },
    quantityTag: { ...displayLabel(theme, 'xs'), fontSize: TAG_SIZE, letterSpacing: theme.displayTracking * TAG_SIZE, color: theme.colors.textMuted },
    quantityValue: { fontFamily: fontFamily(scales.bodyFont, 600), fontSize: QUANTITY_SIZE, lineHeight: QUANTITY_SIZE + scales.space.s1, color: theme.colors.text },
    scroll: { flex: 1 },
    // The content ends clear of the "+", with its margin over and under it.
    tab: { flexGrow: 1, gap: scales.space.s3, paddingBottom: FAB_SIZE + scales.space.s4 * 2 },
  }),
);
