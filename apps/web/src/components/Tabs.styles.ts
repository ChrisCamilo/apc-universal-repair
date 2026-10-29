import { BAR_ITEM, DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the tabs: labels in the muted display face, the selected one in the accent over an accent underline that
// glows where the style has a glow, sitting on the bar's hairline; a count in a pill that turns to the accent on the
// selected tab. While the tabs can be reordered they show a grip, the tab being dragged dims and an accent line marks
// the side of the tab under the pointer where it will land.
// The bar variant is the phone's bottom bar (see BAR_ITEM): each tab an equal share of the bar, its icon in a pill over
// its label, the selected one in the accent with its pill filled, and no underline; the list takes one share per tab,
// beside the bar's other entries (--tab-count). The grip and the cone sit on the pill's corners.

/** The tab list, a tab with its pill, grip and count, by variant and drag state, and the status that announces a move. */
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
      // Only the bar draws the pill and keeps the label to one line; the line lets them sit in the row.
      pill: 'contents',
      label: 'contents',
      grip: '-mr-1 flex text-text-muted',
      wip: 'flex text-text-muted',
      count: [
        'rounded-pill border border-hairline px-2 font-mono text-xs font-medium tracking-normal tabular-nums text-text-muted transition-colors',
        'group-aria-selected:border-[color-mix(in_srgb,var(--accent)_45%,transparent)] group-aria-selected:text-accent',
      ],
      status: 'sr-only',
    },
    variants: {
      variant: {
        line: {},
        bar: {
          base: 'min-w-0 grow-(--tab-count) basis-0 gap-0',
          tab: [...BAR_ITEM.item, 'after:hidden sm:px-0 aria-selected:text-accent'],
          pill: [BAR_ITEM.pill, 'group-aria-selected:bg-accent-soft'],
          label: BAR_ITEM.label,
          grip: 'absolute top-0 -left-1 mr-0',
          wip: 'absolute -top-1 -right-1',
        },
      },
      reorderable: { true: { tab: 'cursor-grab' } },
      dragging: { true: { tab: 'cursor-grabbing opacity-45' } },
      drop: {
        none: {},
        before: { tab: 'shadow-[inset_2px_0_0_var(--color-accent)]' },
        after: { tab: 'shadow-[inset_-2px_0_0_var(--color-accent)]' },
      },
    },
    defaultVariants: { variant: 'line', reorderable: false, dragging: false, drop: 'none' },
  }),
  { base: '', tab: 'tab', pill: 'tab.pill', label: 'tab.label', grip: 'tab.grip', wip: 'tab.wip', count: 'tab.count', status: 'status' },
)

/** A tab's panel, with the focus ring. */
export const tabPanel = recipe(
  'common.tab-panel',
  // A column that fills the room it is given, so its screen can stretch to the bottom.
  tv({ slots: { base: 'flex min-h-0 flex-1 flex-col outline-none focus-visible:shadow-ring' } }),
  { base: '' },
)
