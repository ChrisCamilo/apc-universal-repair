import { recipe, tv } from '../styles/tv.ts'

// The look of an empty or error state: an icon, a short title, a line that says what to do next and an optional
// action, centered. The empty state's icon is muted; the error state's is in the danger color.

/** An empty or error state: the block, its icon by tone, the message and the action. */
export const stateMessage = recipe(
  'common.state-message',
  tv({
    slots: {
      base: 'grid justify-items-center gap-2 px-4 py-8 text-center',
      icon: '',
      message: 'max-w-prose',
      action: 'mt-2',
    },
    variants: { tone: { muted: { icon: 'text-text-muted' }, danger: { icon: 'text-danger' } } },
    defaultVariants: { tone: 'muted' },
  }),
  { base: '', icon: 'icon', message: 'message', action: 'action' },
)
