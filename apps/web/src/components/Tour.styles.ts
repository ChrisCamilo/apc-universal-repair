import { recipe, tv } from '../styles/tv.ts'

// The look of the guided tour: an accent outline around the step's target with the rest of the screen dimmed around
// it, glowing where the style has a glow, and a card in the accent frame with the part and step, the title, the text
// and the buttons. Their places on the screen come from the target, measured as the tour runs.

/** The tour: the spotlight and its glow, the card, its panel, its header and its buttons. */
export const tour = recipe(
  'common.tour',
  tv({
    slots: {
      spotlight: [
        'pointer-events-none fixed z-50 rounded-tile shadow-[0_0_0_9999px_var(--color-spotlight-dim)] outline-2 outline-accent',
        'motion-safe:transition-[left,top,width,height]',
      ],
      // The glow sits on its own layer: in styles without one it is "none", which can't join a shadow list.
      glow: 'absolute inset-0 rounded-[inherit] shadow-glow',
      card: 'fixed z-50 rounded-panel shadow-pop outline-none',
      panel: 'grid gap-2 border-accent! p-4!',
      header: 'flex justify-between gap-2',
      actions: 'flex flex-wrap items-center justify-between gap-2 pt-1',
      buttons: 'ms-auto flex gap-2',
    },
  }),
  {
    base: '',
    spotlight: 'spotlight',
    glow: 'spotlight.glow',
    card: 'card',
    panel: 'card.panel',
    header: 'card.header',
    actions: 'card.actions',
    buttons: 'card.actions.buttons',
  },
)
