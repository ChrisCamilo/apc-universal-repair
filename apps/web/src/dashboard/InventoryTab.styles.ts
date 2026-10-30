import { DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the Inventory tab, on its Panel: the search on the left, which grows to fill the row up to max-w-xl
// from sm, and the buttons as one group pushed to the panel's right edge, also when they wrap under the search on a
// narrow screen; the filters, with the result count in mono at the end; the table's cells, the chevron of an item of
// several brands in the accent, which turns down while the item is open, and its "N marcas" under its name; and,
// while the list loads, skeleton rows in the table's shape. The panel fills the screen down to the bottom: on desktop the toolbar and the
// filters stay at its top, the pagination at its bottom, and only the list between them scrolls; on a phone (below
// the card breakpoint) the toolbar, the filters and the cards scroll together above the pagination. The loading rows,
// the empty state and the error state take the list's room, the last two centered in it. The Panel, the Spinner and
// the skeletons keep their own ids; the toolbar only lines the search up with the buttons, so it adds no level to
// their ids.
// On a phone (below `card:`) the panel's frame goes, so the tab sits on the canvas as in the Estoque mockup, ending
// clear of the round "+" fixed at the bottom right, above the bottom bar. A card's quantity is 20px, with its stock
// status under it in the 11px display face, muted for "un.", in the warn or danger color for Baixo or Esgotado.

/** The skeleton's line widths: the name, then the details. */
export const LOADING_LINES = ['40%', '20%']
/** The skeleton's quantity, the width of a short number. */
export const LOADING_QUANTITY = 'calc(var(--spacing) * 14)'
/** The skeleton's thumbnail, the size of a row's thumbnail. */
export const LOADING_THUMB = 'calc(var(--spacing) * 11)'

/** The Inventory tab: its toolbars and count, the table's cells and the loading rows. */
export const inventoryTab = recipe(
  'inventory.inventory-tab',
  tv({
    slots: {
      base: 'flex min-h-0 min-w-0 flex-1 flex-col gap-3 max-card:border-0 max-card:bg-transparent max-card:bg-none max-card:p-0 max-card:pb-18',
      body: 'flex min-h-0 flex-1 flex-col gap-3 max-card:overflow-y-auto',
      list: 'flex min-h-0 flex-1 flex-col max-card:flex-none',
      toolbar: 'flex flex-wrap items-center gap-2',
      search: 'min-w-0 flex-[1_1_calc(var(--spacing)*64)] sm:max-w-xl',
      buttons: 'ml-auto flex flex-wrap justify-end gap-2',
      filters: 'flex flex-wrap items-center gap-x-3 gap-y-2',
      count: 'm-0 ml-auto font-mono text-xs tabular-nums text-text-muted max-card:ml-0 max-card:w-full',
      title: 'grid justify-items-start gap-0.5',
      brands: 'font-mono text-xs text-accent',
      chevron: 'grid place-items-center text-accent transition-transform',
      vehicle: 'grid',
      model: 'text-text-muted',
      coded: '',
      location: 'font-mono text-xs',
      price: 'whitespace-nowrap',
      actions: 'inline-flex gap-0.5',
      quantity: 'grid justify-items-end gap-0.5',
      quantityValue: 'font-body text-xl/6 font-semibold',
      quantityTag: `text-[11px]/3.5 ${DISPLAY_LABEL}`,
      fab: [
        'fixed right-4 bottom-[calc(var(--spacing)*24+env(safe-area-inset-bottom))] z-30 grid size-14 cursor-pointer place-items-center',
        'rounded-pill border-0 bg-accent p-0 text-on-accent shadow-glow outline-none transition-transform active:translate-y-px focus-visible:shadow-ring',
      ],
      loading: 'grid content-start gap-3 py-2',
      spinner: 'sr-only',
      loadingRow: 'flex items-center gap-3',
      loadingLines: 'grid flex-1 gap-1.5',
    },
    variants: {
      // A value that doesn't apply to the item ("N/A") is muted.
      muted: { true: { coded: 'text-text-muted' } },
      // The error state, centered in the list's room.
      centered: { true: { list: 'justify-center' } },
      // An item opened into its brands' rows.
      open: { true: { chevron: 'rotate-90' } },
      // A card's quantity and its stock status, by the item's status.
      stock: {
        ok: { quantityValue: 'text-text', quantityTag: 'text-text-muted' },
        low: { quantityValue: 'text-warn', quantityTag: 'text-warn' },
        out: { quantityValue: 'text-danger', quantityTag: 'text-danger' },
      },
    },
  }),
  {
    base: '',
    body: 'body',
    list: 'list',
    toolbar: 'toolbar',
    search: 'search',
    buttons: 'toolbar.buttons',
    filters: 'filters',
    count: 'filters.count',
    title: 'title',
    brands: 'title.brands',
    chevron: 'chevron',
    vehicle: 'vehicle',
    model: 'vehicle.model',
    coded: 'coded',
    location: 'location',
    price: 'price',
    actions: 'actions',
    quantity: 'quantity',
    quantityValue: 'quantity.value',
    quantityTag: 'quantity.tag',
    fab: 'new-item',
    loading: 'loading',
    spinner: 'loading.spinner',
    loadingRow: 'loading.row',
    loadingLines: 'loading.row.lines',
  },
)
