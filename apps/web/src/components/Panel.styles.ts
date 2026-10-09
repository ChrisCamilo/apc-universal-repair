import { recipe, tv } from '../styles/tv.ts'

// The look of the surfaces the Dashboard nests: every panel pads its content and has the soft hairline; an outer
// panel takes the panel radius and the top sheen, a nested one the smaller tile radius and no sheen, so the highlight
// isn't stacked; a raised one stands out on the raised fill.

/** A panel: nested or not, raised or not, with the sheen or not. */
export const panel = recipe(
  'common.panel',
  tv({
    slots: { base: 'border border-hairline-soft p-3 transition-[background-color,border-color,border-radius]' },
    variants: {
      nested: { true: 'rounded-tile', false: 'rounded-panel' },
      raised: { true: 'bg-panel-raised', false: 'bg-panel' },
      sheen: { true: 'bg-(image:--sheen)' },
    },
    defaultVariants: { nested: false, raised: false, sheen: false },
  }),
  { base: '' },
)

/** A soft hairline between groups of content. */
export const divider = recipe('common.divider', tv({ slots: { base: 'mx-1 my-2 h-px border-0 bg-hairline-soft' } }), { base: '' })
