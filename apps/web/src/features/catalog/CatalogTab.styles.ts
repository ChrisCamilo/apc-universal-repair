import { DISPLAY_LABEL } from '../../styles/shared.ts'
import { recipe, tv } from '../../styles/tv.ts'

// The look of the Catalog tab: from the lg breakpoint, the brand rail beside the main column, where the tree sits
// beside the detail column; below it, one column, with the tiles in rows of two, or four from sm. The tree scrolls
// past max-h-96 (120 steps from lg), and the engine's specs wrap in a row. The rail, the tiles, the tree and the sheet
// only pass their classes to the Panel, the tile group and the TreeView, which keep their own ids; the main column,
// the body and the detail column only lay out, so they add no level to their children's ids, which are the same as on
// mobile. While the catalog loads, or when it can't be loaded, the tab is one box with the spinner or the message in
// its middle.
// On a phone (below `card:`) the tab is one screen at a time, as in the "Catálogo no celular" mockup, under the
// page's header and over the bottom bar. A section's heading, such as "Marcas · 4", is small and muted in the display
// face. Each brand is a line across the screen, 72px tall, over a soft hairline: its letters in a raised square in the
// accent, its name over its line of models and sheets, and a chevron. The tree grows to its full height, since the
// page scrolls as a whole. The sheet's readouts sit two to a row, each in a box with its name above it.

/** A section's heading on a phone screen, such as "Marcas · 4" or the parts a code search found. */
export const SECTION_HEADING = `m-0 text-sm text-text-muted ${DISPLAY_LABEL}`

/**
 * The Catalog tab: the box of its loading and error states, its grid, the brand rail and tiles, the main column, the tree, the detail column and the sheet; on a
 * phone, the screen with its headings, the brand lines, the tree, the path to an engine and the sheet's readouts.
 */
export const catalogTab = recipe(
  'catalog.catalog-tab',
  tv({
    slots: {
      status: 'grid min-h-60 place-items-center p-6',
      base: 'grid gap-3 lg:grid-cols-[calc(var(--spacing)*46)_minmax(0,1fr)]',
      rail: 'grid content-start gap-3',
      brands: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-1',
      main: 'grid min-w-0 content-start gap-3',
      body: 'grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,calc(var(--spacing)*82))]',
      tree: 'max-h-96 lg:max-h-[calc(var(--spacing)*120)]',
      detail: 'grid min-w-0 content-start gap-3',
      sheet: 'grid gap-3',
      specs: 'flex flex-wrap gap-x-3 gap-y-1',
      screen: 'grid min-w-0 content-start gap-3',
      heading: `${SECTION_HEADING} pt-2`,
      brandList: 'm-0 -mx-4 list-none p-0',
      brand: [
        'flex min-h-18 w-full cursor-pointer items-center gap-3 border-0 border-b border-hairline-soft bg-transparent py-0 pr-3 pl-4',
        'text-left font-body text-text outline-none transition-colors hover:bg-panel-raised focus-visible:shadow-ring',
      ],
      mark: 'grid size-11 shrink-0 place-items-center rounded-tile border border-hairline-soft bg-panel-raised font-display text-base font-bold text-accent',
      brandText: 'grid min-w-0 flex-1 gap-0.5',
      brandName: 'truncate text-[17px]/5.5 font-semibold',
      brandMeta: 'text-[13px]/4.5 text-text-muted',
      chevron: 'shrink-0 text-text-muted',
      screenTree: '-mx-4 max-h-none',
      path: 'm-0 text-[13px]/4.5 text-text-muted',
      readouts: 'm-0 grid grid-cols-2 gap-2',
      readout: 'm-0 grid gap-0.5 rounded-tile border border-hairline-soft bg-panel px-3.5 py-3',
      readoutLabel: `text-xs text-text-muted ${DISPLAY_LABEL}`,
      readoutValue: 'm-0',
    },
  }),
  {
    status: 'status',
    base: '',
    rail: 'rail',
    brands: 'rail.brands',
    main: 'main',
    body: 'body',
    tree: 'tree',
    detail: 'detail',
    sheet: 'sheet',
    specs: 'sheet.specs',
    screen: 'screen',
    heading: 'screen.heading',
    brandList: 'screen.brands',
    brand: 'screen.brands.brand',
    mark: 'screen.brands.brand.mark',
    brandText: 'screen.brands.brand.text',
    brandName: 'screen.brands.brand.text.name',
    brandMeta: 'screen.brands.brand.text.meta',
    chevron: 'screen.brands.brand.chevron',
    screenTree: 'screen.tree',
    path: 'screen.path',
    readouts: 'screen.readouts',
    readout: 'screen.readouts.readout',
    readoutLabel: 'screen.readouts.readout.label',
    readoutValue: 'screen.readouts.readout.value',
  },
)
