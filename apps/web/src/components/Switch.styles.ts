import { menuItem } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the on/off control: a pill track whose knob slides over to the accent when on, glowing where the style
// has a glow. On its own it sits beside its label; inside a Menu it is a full-width menu item with a description.

/** A switch: on its own (base) or as a menu item (item), its label and description, and its track and knob, on or off. */
export const switchControl = recipe(
  'common.switch',
  tv({
    slots: {
      base: 'inline-flex cursor-pointer items-center gap-2 rounded-pill font-body text-sm text-text outline-none focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-50',
      item: menuItem(),
      text: 'grid',
      description: 'text-xs leading-snug text-text-muted',
      track: 'relative h-5 w-8.5 shrink-0 rounded-pill border transition-[background-color,border-color]',
      knob: 'absolute top-0.5 left-0.5 size-3.5 rounded-pill transition-[translate,background-color]',
    },
    variants: {
      on: {
        true: { track: 'border-accent bg-accent-soft', knob: 'translate-x-3.5 bg-accent shadow-glow' },
        false: { track: 'border-hairline bg-panel-raised', knob: 'bg-text-muted' },
      },
    },
    defaultVariants: { on: false },
  }),
  { base: '', item: '', text: 'text', description: 'text.description', track: 'track', knob: 'track.knob' },
)
