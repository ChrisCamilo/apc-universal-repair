import { recipe, tv } from '../styles/tv.ts'

// The layout of the wireframe screens, and only their layout (grid, flex, gaps, widths): every color, face, border and
// radius comes from the design-system components. The Dashboard is the app frame with nothing of its own, so its base
// has no classes; the Catalog and Inventory tabs are its slots. The Catalog tab is laid out as the real one: from the
// lg breakpoint, the brand rail beside the main panel, where the tree sits beside the detail column. The Inventory tab
// is a panel with the search and buttons, the filters with the result count at the end, the table and the pages. The
// slots that only style a design-system component pass it their classes, and it keeps its own id; the body and the
// detail column only lay out, so they add no level to their children's ids.

/** The wireframe Dashboard: the Catalog tab with its rail, tree and sheet, and the Inventory tab with its toolbars. */
export const screens = recipe(
  'docs.screens',
  tv({
    slots: {
      base: '',
      catalog: 'grid gap-3 lg:grid-cols-[calc(var(--spacing)*46)_minmax(0,1fr)]',
      rail: 'grid content-start gap-3',
      brands: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-1',
      main: 'grid min-w-0 content-start gap-3',
      body: 'grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,calc(var(--spacing)*82))]',
      tree: 'max-h-96 lg:max-h-[calc(var(--spacing)*120)]',
      detail: 'grid min-w-0 content-start gap-3',
      sheet: 'grid gap-3',
      specs: 'flex flex-wrap gap-x-3 gap-y-1',
      sheetActions: 'flex flex-wrap gap-2',
      inventory: 'grid min-w-0 gap-3',
      toolbar: 'flex flex-wrap items-center gap-2',
      search: 'min-w-0 flex-[1_1_calc(var(--spacing)*64)]',
      filters: 'flex flex-wrap items-center gap-x-3 gap-y-2',
      summary: 'ml-auto',
      rowActions: 'inline-flex gap-0.5',
    },
  }),
  {
    base: '',
    catalog: 'catalog',
    rail: 'catalog.rail',
    brands: 'catalog.rail.brands',
    main: 'catalog.main',
    body: 'catalog.main.body',
    tree: 'catalog.main.tree',
    detail: 'catalog.main.detail',
    sheet: 'catalog.main.sheet',
    specs: 'catalog.main.sheet.specs',
    sheetActions: 'catalog.main.sheet.actions',
    inventory: 'inventory',
    toolbar: 'inventory.toolbar',
    search: 'inventory.toolbar.search',
    filters: 'inventory.filters',
    summary: 'inventory.filters.summary',
    rowActions: 'inventory.row-actions',
  },
)
