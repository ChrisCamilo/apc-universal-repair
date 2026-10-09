import { DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the tabs: labels in the muted display face, the selected one in the accent over an accent underline that
// glows where the style has a glow, sitting on the bar's hairline; a count in a pill that turns to the accent on the
// selected tab. While the tabs can be reordered they show a grip, the tab being dragged dims and an accent line marks
// the side of the tab under the pointer where it will land.

/** The tab list, a tab with its grip and count, by drag state, and the status that announces a move. */
export const tabs = recipe(
  'common.tabs',
  tv({
    slots: {
      base: 'flex gap-1',
      tab: [
        `group relative inline-flex cursor-pointer items-center gap-2 rounded-tile border-0 bg-transparent px-2.5 pt-2.5 pb-3 text-sm ${DISPLAY_LABEL}`,
        'text-text-muted outline-none transition-colors not-aria-selected:hover:text-text aria-selected:text-accent focus-visible:shadow-ring',
        "sm:px-3.5 after:absolute after:inset-x-2.5 after:-bottom-px after:h-0.5 after:rounded-pill after:content-['']",
        'after:transition-[background-color,box-shadow] aria-selected:after:bg-accent aria-selected:after:shadow-glow',
      ],
      grip: '-mr-1 flex text-text-muted',
      wip: 'flex text-text-muted',
      wipLabel: 'sr-only',
      count: [
        'rounded-pill border border-hairline px-2 font-mono text-xs font-medium tracking-normal tabular-nums text-text-muted transition-colors',
        'group-aria-selected:border-[color-mix(in_srgb,var(--accent)_45%,transparent)] group-aria-selected:text-accent',
      ],
      status: 'sr-only',
    },
    variants: {
      reorderable: { true: { tab: 'cursor-grab' } },
      dragging: { true: { tab: 'cursor-grabbing opacity-45' } },
      drop: {
        none: {},
        before: { tab: 'shadow-[inset_2px_0_0_var(--color-accent)]' },
        after: { tab: 'shadow-[inset_-2px_0_0_var(--color-accent)]' },
      },
    },
    defaultVariants: { reorderable: false, dragging: false, drop: 'none' },
  }),
  { base: '', tab: 'tab', grip: 'tab.grip', wip: 'tab.wip', wipLabel: 'tab.wip.label', count: 'tab.count', status: 'status' },
)

/** A tab's panel, with the focus ring. */
export const tabPanel = recipe('common.tab-panel', tv({ slots: { base: 'outline-none focus-visible:shadow-ring' } }), { base: '' })
