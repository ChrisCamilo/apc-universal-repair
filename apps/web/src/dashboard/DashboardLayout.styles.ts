import { BAR_ITEM } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the Dashboard on a phone (below `card:`), as in the Estoque mockup: the page scrolls as a whole, the open
// tab's header on top, with the compact APC mark, the tab's name and the tab's "⋯", a bare 44px circle, and its
// content under it, kept clear of the bottom bar. The bar stays fixed at the bottom of the screen, on the panel's fill
// over a soft hairline, 80px tall and clear of the home indicator: the tabs, then Alertas and Conta, each an equal share (see BAR_ITEM). Alertas shows the
// unread count in a badge on its pill's corner; Conta shows the user's initials on the accent in its pill.

/** The bottom bar's height above the home indicator, which the page's content keeps clear of, in px. */
export const BOTTOM_BAR_HEIGHT = 80

/** The Dashboard on a phone: the page, the open tab's header with its mark, title and "⋯", and the content. */
export const phoneDashboard = recipe(
  'dashboard.phone',
  tv({
    slots: {
      // BOTTOM_BAR_HEIGHT: the content ends above the bar.
      base: 'flex min-h-[calc(100dvh-var(--top-inset,0px))] flex-col bg-canvas pb-[calc(var(--spacing)*20+env(safe-area-inset-bottom))]',
      header: 'flex min-h-18 items-center gap-3 pt-3 pr-2 pb-1 pl-4',
      title: 'm-0 min-w-0 flex-1 font-display text-2xl font-bold uppercase tracking-display text-text',
      more: [
        'grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill border-0 bg-transparent p-0 text-text outline-none',
        'transition-colors hover:bg-panel-raised hover:text-accent focus-visible:shadow-ring',
      ],
      main: 'flex flex-1 flex-col px-4 pt-1 pb-4',
    },
  }),
  { base: '', header: 'header', title: 'header.title', more: 'header.more', main: 'main' },
)

/** The bottom bar: the bar, an entry with its pill and label, the unread badge and the initials. */
export const bottomBar = recipe(
  'dashboard.bottom-bar',
  tv({
    slots: {
      base: [
        'fixed inset-x-0 bottom-0 z-40 flex min-h-20 border-t border-hairline-soft bg-panel px-2 pt-1.5',
        'pb-[max(--spacing(4.5),env(safe-area-inset-bottom))]',
      ],
      item: [...BAR_ITEM.item, 'hover:text-text'],
      pill: BAR_ITEM.pill,
      label: BAR_ITEM.label,
      badge: [
        'absolute top-0 right-3 grid h-4 min-w-4 place-items-center rounded-pill bg-accent px-1',
        'font-body text-[11px] leading-none font-bold tracking-normal text-on-accent',
      ],
      initials: 'grid size-6.5 place-items-center rounded-pill bg-accent font-display text-[11px] font-bold text-on-accent',
    },
  }),
  { base: '', item: 'item', pill: 'item.pill', label: 'item.label', badge: 'item.pill.badge', initials: 'item.pill.initials' },
)
