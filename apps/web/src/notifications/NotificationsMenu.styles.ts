import { recipe, tv } from '../styles/tv.ts'

// The look of the notifications: the bell on its trigger, with the count of the unread on the accent at its corner, and
// in its menu the latest notifications, each with its kind's icon in the kind's color, the message and how long ago,
// the ones that were unread when the menu opened on the soft accent; or a muted notice when there are none. The gear in
// the menu's header opens its settings: the toast's time between a − and a + button.

/** The bell on the menu's trigger and its unread badge. */
export const bellBadge = recipe(
  'notifications.bell',
  tv({
    slots: {
      base: 'relative grid size-7 place-items-center text-text',
      badge: [
        'absolute -top-1 -right-1.5 grid h-4 min-w-4 place-items-center rounded-pill bg-accent px-1',
        'font-display text-xs leading-none font-bold text-on-accent',
      ],
    },
  }),
  { base: '', badge: 'badge' },
)

/** The menu's list of notifications, each one by kind and whether it was unread, and the notice when there are none. */
export const notificationsMenu = recipe(
  'notifications.menu',
  tv({
    slots: {
      list: 'm-0 grid max-h-80 list-none gap-0.5 overflow-y-auto p-0',
      item: 'grid grid-cols-[auto_1fr] items-start gap-2.5 rounded-tile px-2 py-2',
      icon: 'mt-0.5',
      text: 'grid min-w-0',
      message: 'text-sm leading-snug break-words',
      time: 'text-xs text-text-muted',
      empty: 'grid justify-items-center gap-2 px-2 py-6 text-sm text-text-muted',
    },
    variants: {
      kind: {
        success: { icon: 'text-success' },
        error: { icon: 'text-danger' },
        info: { icon: 'text-info' },
        warning: { icon: 'text-warn' },
      },
      fresh: { true: { item: 'bg-accent-soft' } },
    },
  }),
  {
    base: '',
    list: 'list',
    item: 'list.item',
    icon: 'list.item.icon',
    text: 'list.item.text',
    message: 'list.item.message',
    time: 'list.item.time',
    empty: 'empty',
  },
)

/** The settings: the gear that opens them, and the toast's time with its − and + buttons. */
export const notificationsSettings = recipe(
  'notifications.settings',
  tv({
    slots: {
      base: 'mb-1 flex items-center justify-between gap-3 border-b border-hairline-soft px-2 pt-1 pb-3',
      label: 'grid text-sm',
      hint: 'text-xs text-text-muted',
      stepper: 'flex items-center gap-1',
      value: 'min-w-10 text-center font-mono text-sm',
      button: [
        'grid size-8 cursor-pointer place-items-center rounded-pill text-text-muted outline-none transition-[background-color,color,box-shadow]',
        'enabled:hover:bg-accent-soft enabled:hover:text-accent focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-50',
      ],
    },
    variants: { open: { true: { button: 'bg-accent-soft text-accent' } } },
  }),
  { base: '', label: 'label', hint: 'label.hint', stepper: 'stepper', value: 'stepper.value', button: 'button' },
)
