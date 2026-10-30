import { DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of a phone's filter sheet, as in the Filtros mockup: full-width 56px rows under soft hairlines, each with
// its label, its value (muted, or in the accent once chosen) and a chevron; the sort's row leads with its icon and a
// strip of the canvas sets it apart from the filters. A segmented choice sits under a muted display label. A list of
// options, opened from a row, has the ← and the row's name on top and its options as rows, the chosen ones in the
// accent with a check. "Limpar" is an accent text button, and "Ver n itens" fills the footer.

/**
 * A filter sheet: its content, Limpar, a row with its icon, label, value and chevron, the strip after the sort, a segmented field
 * with its label, a list's header and title, an option with its check, and the footer's button.
 */
export const filterSheet = recipe(
  'common.filter-sheet',
  tv({
    slots: {
      base: 'flex flex-col',
      clear: [
        'min-h-11 cursor-pointer rounded-pill border-0 bg-transparent px-3 font-body text-base font-semibold text-accent outline-none',
        'transition-opacity hover:opacity-80 focus-visible:shadow-ring',
      ],
      row: [
        'flex h-14 w-full cursor-pointer items-center gap-3 border-0 border-t border-hairline-soft bg-transparent pr-4 pl-5 text-left font-body text-base font-medium text-text',
        'outline-none transition-colors hover:bg-panel-raised focus-visible:bg-panel-raised',
      ],
      icon: 'shrink-0 text-text-muted',
      label: 'grow truncate',
      value: 'max-w-[45%] shrink-0 truncate text-[15px]',
      strip: 'h-2 bg-canvas',
      segments: 'grid gap-2 px-5 pt-3',
      segmentsLabel: `text-xs ${DISPLAY_LABEL} text-text-muted`,
      listHeader: 'flex items-center gap-1 border-b border-hairline-soft pr-4 pb-2 pl-2',
      listTitle: `text-sm ${DISPLAY_LABEL} text-text`,
      option: [
        'flex h-14 w-full cursor-pointer items-center gap-3 border-0 border-t border-hairline-soft bg-transparent px-5 text-left font-body text-base text-text first:border-t-0',
        'outline-none transition-colors hover:bg-panel-raised focus-visible:bg-panel-raised aria-selected:font-semibold aria-selected:text-accent',
      ],
      check: 'ml-auto shrink-0 text-accent',
      apply: 'w-full',
    },
    variants: {
      chosen: { true: { value: 'font-semibold text-accent' }, false: { value: 'text-text-muted' } },
      // The first of the segmented choices sharing a heading opens with a hairline; the last leaves room under it.
      first: { true: { segments: 'border-t border-hairline-soft pb-1' }, false: { segments: 'pb-4' } },
    },
    defaultVariants: { chosen: false, first: false },
  }),
  {
    base: '',
    clear: 'clear',
    row: 'row',
    icon: 'row.icon',
    label: 'row.label',
    value: 'row.value',
    strip: 'strip',
    segments: 'segments',
    segmentsLabel: 'segments.label',
    listHeader: 'list.header',
    listTitle: 'list.header.title',
    option: 'list.option',
    check: 'list.option.check',
    apply: 'apply',
  },
)
