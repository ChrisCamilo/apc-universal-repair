import { recipe, tv } from '../styles/tv.ts'

// The look of the desktop app's update notice: a small card at the window's bottom right, in the panel's colors with the
// sheen and a soft shadow, letting presses through around it. The info icon in the info color, the message, and under
// them "Depois" and "Reiniciar agora" at the end. It fades in rising a little, from @starting-style, in the app's motion
// duration; with reduced motion it doesn't move.

/** The notice's live region and its card, with the icon, the message and the actions. */
export const updateNotice = recipe(
  'setup.update-notice',
  tv({
    slots: {
      base: 'pointer-events-none fixed right-4 bottom-4 z-40 grid justify-items-end',
      card: [
        'pointer-events-auto grid w-[min(calc(var(--spacing)*90),calc(100vw-var(--spacing)*8))] grid-cols-[auto_1fr] gap-3',
        'rounded-panel border border-hairline-soft bg-panel bg-(image:--sheen) p-4 shadow-pop',
        'transition-[opacity,translate] starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none',
      ],
      icon: 'mt-0.5 text-info',
      message: 'm-0 text-sm leading-snug text-text',
      actions: 'col-span-2 flex justify-end gap-2',
    },
  }),
  { base: '', card: 'card', icon: 'card.icon', message: 'card.message', actions: 'card.actions' },
)
