import { DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of a toast: a short message in the display face after its kind's icon, in a pill of the kind's status color
// (green for success, red for errors, blue for info, yellow for warnings) with its text color, near the bottom of the
// screen above the safe area, letting presses through around it. The polite and urgent live regions center the pill and
// stack a toast that leaves under the one taking its place. A toast fades in rising a little, from @starting-style, and
// fades out sinking back while it leaves, in the app's motion duration; with reduced motion it doesn't move.

/** The toasts' region, its polite and urgent live regions, and a toast with its icon, by kind. */
export const toast = recipe(
  'common.toast',
  tv({
    slots: {
      base: [
        'pointer-events-none fixed inset-x-4 top-auto bottom-[calc(var(--spacing)*6+env(safe-area-inset-bottom))] m-0 grid h-auto w-auto',
        'justify-items-center overflow-visible border-0 bg-transparent p-0',
      ],
      polite: 'grid justify-items-center [grid-area:1/1]',
      urgent: 'grid justify-items-center [grid-area:1/1]',
      message: [
        `inline-flex items-center gap-2 rounded-pill px-4 py-2 text-center text-xs ${DISPLAY_LABEL} shadow-pop [grid-area:1/1]`,
        'transition-[opacity,translate] starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none',
      ],
      icon: 'shrink-0',
    },
    variants: {
      kind: {
        success: { message: 'bg-success text-on-success' },
        error: { message: 'bg-danger text-on-danger' },
        info: { message: 'bg-info text-on-info' },
        warning: { message: 'bg-warn text-on-warn' },
      },
      leaving: { true: { message: 'translate-y-2 opacity-0' } },
    },
  }),
  { base: '', polite: 'polite', urgent: 'urgent', message: 'message', icon: 'message.icon' },
)
