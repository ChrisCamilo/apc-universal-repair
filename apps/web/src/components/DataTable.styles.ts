import { DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the data table: headers in the muted display face, the sorted one in the accent with its arrow; rows on
// a soft hairline that light up on hover, tinted with a bar on their first cell when they need attention (warn or
// danger); numbers right-aligned in tabular mono figures. Below the card breakpoint each row becomes a card in a grid
// (thumbnail | main | end and actions), the header hides and the "Ordenar" select takes its place. A row that opens on
// a click gets the pointer and an accent outline inside its edges while focused by keyboard. The table's body only
// groups the rows, so it adds no level to their ids, which are the same as on mobile.

// A tinted row: its fill, its hover, and the bar on its first cell, or on the card at phone width.
const TINT = {
  warn: [
    'bg-warn-soft hover:bg-warn-soft-hover [&>td:first-child]:shadow-[inset_calc(var(--spacing)*0.75)_0_0_var(--warn)]',
    'max-card:shadow-[inset_calc(var(--spacing)*0.75)_0_0_var(--warn)] max-card:[&>td:first-child]:shadow-none',
  ],
  danger: [
    'bg-danger-soft hover:bg-danger-soft-hover [&>td:first-child]:shadow-[inset_calc(var(--spacing)*0.75)_0_0_var(--danger)]',
    'max-card:shadow-[inset_calc(var(--spacing)*0.75)_0_0_var(--danger)] max-card:[&>td:first-child]:shadow-none',
  ],
}

/** The table: the block, the sort bar, the scroll box, the table, its header cells, sort buttons and arrows, rows and cells. */
export const dataTable = recipe(
  'common.data-table',
  tv({
    slots: {
      base: 'grid min-w-0 gap-3',
      sortBar: 'hidden items-center gap-2 max-card:flex',
      sortSelect: 'min-w-0 flex-1',
      scroll: 'overflow-x-auto max-card:overflow-visible',
      table: 'w-full border-collapse font-body text-sm text-text max-card:block',
      head: 'max-card:hidden',
      header: `whitespace-nowrap border-b border-hairline px-2.5 py-2 text-xs ${DISPLAY_LABEL} text-left text-text-muted`,
      hidden: 'sr-only',
      sort: 'inline-flex cursor-pointer items-center gap-1.5 rounded-tile uppercase tracking-[inherit] outline-none transition-colors focus-visible:shadow-ring',
      arrow: 'font-mono tracking-normal',
      body: 'max-card:block',
      row: [
        'transition-[background-color] max-card:grid max-card:grid-cols-[calc(var(--spacing)*11)_minmax(0,1fr)_auto]',
        "max-card:items-center max-card:gap-x-3 max-card:gap-y-1 max-card:[grid-template-areas:'thumb_main_end''thumb_main_actions']",
        'max-card:border-b max-card:border-hairline-soft max-card:py-2.5 max-card:pr-1 max-card:pl-2',
      ],
      cell: 'border-b border-hairline-soft px-2.5 py-2 align-middle max-card:border-0 max-card:p-0',
      status: 'sr-only',
    },
    variants: {
      numeric: { true: { header: 'text-right', cell: 'text-right font-mono tabular-nums' } },
      sorted: { true: { header: 'text-accent' }, false: { sort: 'hover:text-text', arrow: 'opacity-45' } },
      tint: { none: { row: 'hover:bg-panel-raised' }, warn: { row: TINT.warn }, danger: { row: TINT.danger } },
      openable: {
        true: { row: 'cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-accent' },
      },
      area: {
        none: { cell: 'max-card:hidden' },
        thumb: { cell: 'max-card:[grid-area:thumb]' },
        main: { cell: 'max-card:[grid-area:main]' },
        end: { cell: 'max-card:[grid-area:end] max-card:justify-self-end' },
        actions: { cell: 'max-card:[grid-area:actions] max-card:justify-self-end' },
      },
    },
    defaultVariants: { numeric: false, sorted: false, tint: 'none', openable: false, area: 'none' },
  }),
  {
    base: '',
    sortBar: 'sort-bar',
    sortSelect: 'sort-bar.select',
    scroll: 'scroll',
    table: 'table',
    head: 'table.head',
    header: 'table.head.header',
    hidden: 'table.head.header.hidden',
    sort: 'table.head.header.sort',
    arrow: 'table.head.header.sort.arrow',
    body: 'table.body',
    row: 'table.row',
    cell: 'table.row.cell',
    status: 'table.row.status',
  },
)

/** A row's icon action, the accent on hover, or the danger color for one that deletes. */
export const rowAction = recipe(
  'common.row-action',
  tv({
    slots: {
      base: 'grid size-8 cursor-pointer place-items-center rounded-tile text-text-muted outline-none transition-colors hover:bg-panel focus-visible:shadow-ring',
    },
    variants: { tone: { default: 'hover:text-accent', danger: 'hover:text-danger' } },
    defaultVariants: { tone: 'default' },
  }),
  { base: '' },
)

/** A row's thumbnail: a small tile with the photo, or a cube when there is none; one that opens lights up on hover. */
export const tableThumbnail = recipe(
  'common.table-thumbnail',
  tv({
    slots: {
      base: 'grid size-11 place-items-center overflow-hidden rounded-tile border border-hairline-soft bg-panel-raised text-text-muted',
      image: 'size-full object-cover',
    },
    variants: {
      opens: {
        true: { base: 'cursor-zoom-in outline-none transition-[border-color,box-shadow] hover:border-accent hover:shadow-glow focus-visible:shadow-ring' },
      },
    },
    defaultVariants: { opens: false },
  }),
  { base: '', image: 'image' },
)

/** A row's main cell: the name, the code under it and, on a card, what the hidden columns said. */
export const tableTitle = recipe(
  'common.table-title',
  tv({
    slots: {
      base: 'grid min-w-0',
      title: 'font-semibold',
      code: 'font-mono text-xs text-text-muted',
      details: 'hidden text-xs text-text-muted max-card:block',
    },
  }),
  { base: '', title: 'title', code: 'code', details: 'details' },
)
