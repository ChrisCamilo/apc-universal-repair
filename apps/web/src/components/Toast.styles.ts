import { DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of a toast: a short message in the display face, in the canvas color on the text color, in a pill near the
// bottom of the screen above the safe area, letting presses through around it.

/** The toasts' region and a toast. */
export const toast = recipe(
  'common.toast',
  tv({
    slots: {
      base: [
        'pointer-events-none fixed inset-x-4 top-auto bottom-[calc(var(--spacing)*6+env(safe-area-inset-bottom))] m-0 flex h-auto w-auto',
        'justify-center overflow-visible border-0 bg-transparent p-0',
      ],
      message: `rounded-pill bg-text px-4 py-2 text-center text-xs ${DISPLAY_LABEL} text-canvas shadow-pop`,
    },
  }),
  { base: '', message: 'message' },
)
