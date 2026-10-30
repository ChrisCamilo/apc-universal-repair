import { recipe, tv } from '../styles/tv.ts'

// The look of a phone's sheet of actions, as in the Mais ações mockup: full-width 56px rows, each with its muted icon
// and its name, soft hairlines between them, and room under the last one.

/** An action sheet: the list, an action and its icon. */
export const actionSheet = recipe(
  'common.action-sheet',
  tv({
    slots: {
      // The mockup's 28px under the last row, above the home indicator.
      base: 'grid pb-[calc(var(--spacing)*7+env(safe-area-inset-bottom))]',
      action: [
        'flex h-14 w-full cursor-pointer items-center gap-4 border-0 border-t border-hairline-soft bg-transparent px-5 text-left font-body text-base font-medium text-text first:border-t-0',
        'outline-none transition-colors hover:bg-panel-raised focus-visible:bg-panel-raised',
      ],
      icon: 'shrink-0 text-text-muted',
    },
  }),
  { base: '', action: 'action', icon: 'action.icon' },
)
