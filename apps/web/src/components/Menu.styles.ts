import { DISPLAY_LABEL, menuItem as menuItemClasses } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the dropdown menu: a pill trigger that lights up in the accent on hover and while open, its chevron
// turning, and a panel with the sheen under it, lined up with the trigger's start or end. Inside it: a header, small
// section labels, action items, and the user badge the user menu's trigger shows.

/** A menu: the wrapper, the trigger with its chevron, and the popover, by side. */
export const menu = recipe(
  'common.menu',
  tv({
    slots: {
      base: 'relative inline-block h-fit',
      trigger: [
        'inline-flex cursor-pointer items-center gap-2 rounded-pill border border-hairline-soft py-1 pr-2.5 pl-1 text-text outline-none',
        'transition-[background-color,border-color,box-shadow] hover:border-accent hover:bg-accent-soft focus-visible:shadow-ring',
      ],
      chevron: 'text-text-muted transition-transform rotate-90',
      popover: [
        'absolute top-full z-30 mt-1 grid w-[min(calc(var(--spacing)*72.5),calc(100vw-var(--spacing)*16))] gap-0.5 rounded-panel',
        'border border-hairline-soft bg-panel bg-(image:--sheen) p-2 shadow-pop',
      ],
    },
    variants: {
      align: { start: { popover: 'left-0' }, end: { popover: 'right-0' } },
      open: { true: { trigger: 'border-accent bg-accent-soft', chevron: '-rotate-90' } },
    },
    defaultVariants: { align: 'end', open: false },
  }),
  { base: '', trigger: 'trigger', chevron: 'trigger.chevron', popover: 'popover' },
)

/** A menu's header: its title and subtitle over a soft hairline. */
export const menuHeader = recipe(
  'common.menu-header',
  tv({
    slots: {
      base: 'mb-1 grid border-b border-hairline-soft px-2 pt-2 pb-3',
      title: 'font-mono text-sm font-medium',
      subtitle: 'text-xs text-text-muted',
    },
  }),
  { base: '', title: 'title', subtitle: 'subtitle' },
)

/** An action item: the row, its label and description, and the icon at its end in the accent. */
export const menuItem = recipe(
  'common.menu-item',
  tv({
    slots: {
      base: menuItemClasses(),
      text: 'grid',
      description: 'text-xs leading-snug text-text-muted',
      icon: 'shrink-0 text-accent',
    },
  }),
  { base: '', text: 'text', description: 'text.description', icon: 'icon' },
)

/** A small section label in the muted display face. */
export const menuLabel = recipe(
  'common.menu-label',
  tv({ slots: { base: `mx-2 mt-2 mb-0.5 text-xs ${DISPLAY_LABEL} text-text-muted` } }),
  { base: '' },
)

/** The user badge: the initials on the accent, then the username, which phones leave out. */
export const userBadge = recipe(
  'common.user-badge',
  tv({
    slots: {
      initials: 'grid size-7 place-items-center rounded-pill bg-accent font-display text-xs font-bold text-on-accent',
      name: 'font-mono text-xs max-sm:hidden',
    },
  }),
  { base: '', initials: 'initials', name: 'name' },
)
