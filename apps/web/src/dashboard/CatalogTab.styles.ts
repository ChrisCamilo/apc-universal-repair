import { recipe, tv } from '../styles/tv.ts'

// The look of the Catalog tab: from the lg breakpoint, the brand rail beside the main column, where the tree sits
// beside the detail column; below it, one column, with the tiles in rows of two, or four from sm. The tree scrolls
// past max-h-96 (120 steps from lg), and the engine's specs wrap in a row. The rail, the tiles, the tree and the sheet
// only pass their classes to the Panel, the tile group and the TreeView, which keep their own ids; the main column,
// the body and the detail column only lay out, so they add no level to their children's ids, which are the same as on
// mobile.

/** The Catalog tab: its grid, the brand rail and tiles, the main column, the tree, the detail column and the sheet. */
export const catalogTab = recipe(
  'catalog.catalog-tab',
  tv({
    slots: {
      base: 'grid gap-3 lg:grid-cols-[calc(var(--spacing)*46)_minmax(0,1fr)]',
      rail: 'grid content-start gap-3',
      brands: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-1',
      main: 'grid min-w-0 content-start gap-3',
      body: 'grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,calc(var(--spacing)*82))]',
      tree: 'max-h-96 lg:max-h-[calc(var(--spacing)*120)]',
      detail: 'grid min-w-0 content-start gap-3',
      sheet: 'grid gap-3',
      specs: 'flex flex-wrap gap-x-3 gap-y-1',
    },
  }),
  {
    base: '',
    rail: 'rail',
    brands: 'rail.brands',
    main: 'main',
    body: 'body',
    tree: 'tree',
    detail: 'detail',
    sheet: 'sheet',
    specs: 'sheet.specs',
  },
)
