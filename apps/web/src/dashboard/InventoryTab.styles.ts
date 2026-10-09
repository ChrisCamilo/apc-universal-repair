import { recipe, tv } from '../styles/tv.ts'

// The look of the Inventory tab, on its Panel: the search, which grows to fill the row up to max-w-xl from sm, beside
// the buttons; the filters, with the result count in mono at the end; the table's cells; and, while the list loads,
// skeleton rows in the table's shape. The Panel, the Spinner and the skeletons keep their own ids; the toolbar only
// lines the search up with the buttons, so it adds no level to their ids.

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
      base: 'grid min-w-0 gap-3',
      toolbar: 'flex flex-wrap items-center gap-2',
      search: 'min-w-0 flex-[1_1_calc(var(--spacing)*64)] sm:max-w-xl',
      filters: 'flex flex-wrap items-center gap-x-3 gap-y-2',
      count: 'm-0 ml-auto font-mono text-xs tabular-nums text-text-muted',
      vehicle: 'grid',
      model: 'text-text-muted',
      coded: '',
      location: 'font-mono text-xs',
      price: 'whitespace-nowrap',
      actions: 'inline-flex gap-0.5',
      loading: 'grid gap-3 py-2',
      spinner: 'sr-only',
      loadingRow: 'flex items-center gap-3',
      loadingLines: 'grid flex-1 gap-1.5',
    },
    variants: {
      // A value that doesn't apply to the item ("N/A") is muted.
      muted: { true: { coded: 'text-text-muted' } },
    },
  }),
  {
    base: '',
    toolbar: 'toolbar',
    search: 'search',
    filters: 'filters',
    count: 'filters.count',
    vehicle: 'vehicle',
    model: 'vehicle.model',
    coded: 'coded',
    location: 'location',
    price: 'price',
    actions: 'actions',
    loading: 'loading',
    spinner: 'loading.spinner',
    loadingRow: 'loading.row',
    loadingLines: 'loading.row.lines',
  },
)
