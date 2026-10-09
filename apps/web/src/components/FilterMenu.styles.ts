import { DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the filter menu: a pill trigger in the display face that lights up in the accent while filters are on,
// with their count in an accent badge, and under it a panel of labeled rows, each a set of chips or a select, with
// Limpar and Aplicar under a hairline. The panel is FILTER_PANEL_SPACING wide (Tailwind only builds classes written
// out in full, hence the numbers in the class).

/** A filter menu: the wrapper, the trigger with its count, the panel, a row and its chips, and the actions. */
export const filterMenu = recipe(
  'common.filter-menu',
  tv({
    slots: {
      base: 'relative',
      trigger: [
        `inline-flex cursor-pointer items-center gap-2 rounded-pill border px-4 py-2 text-xs ${DISPLAY_LABEL} outline-none`,
        'transition-[background-color,color,border-color,box-shadow] focus-visible:shadow-ring',
      ],
      count: 'min-w-4.5 rounded-pill bg-accent px-1.5 text-center font-mono text-xs font-medium tracking-normal text-on-accent',
      panel: 'absolute left-0 top-full z-20 mt-1.5 grid w-[min(calc(var(--spacing)*90),calc(100vw-var(--spacing)*20))] gap-2 shadow-pop',
      row: 'grid grid-cols-[calc(var(--spacing)*28)_minmax(0,1fr)] items-center gap-3',
      chips: 'flex flex-wrap items-center gap-x-4 gap-y-1.5',
      actions: 'mt-0.5 flex justify-end gap-2 border-t border-hairline-soft pt-2',
    },
    variants: {
      active: {
        true: { trigger: 'border-accent bg-accent-soft text-accent' },
        false: { trigger: 'border-hairline text-text hover:border-accent hover:text-accent' },
      },
    },
    defaultVariants: { active: false },
  }),
  {
    base: '',
    trigger: 'trigger',
    count: 'trigger.count',
    panel: 'panel',
    row: 'panel.row',
    chips: 'panel.row.chips',
    actions: 'panel.actions',
  },
)
