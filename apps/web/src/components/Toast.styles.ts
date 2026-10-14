import { DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of a toast: a short message in the display face after its kind's icon, in a pill of the kind's status color
// (green for success, red for errors, blue for info, yellow for warnings) with its text color, near the bottom of the
// screen above the safe area, letting presses through around it. The polite and urgent live regions center the pill.

/** The toasts' region, its polite and urgent live regions, and a toast with its icon, by kind. */
export const toast = recipe(
  'common.toast',
  tv({
    slots: {
      base: [
        'pointer-events-none fixed inset-x-4 top-auto bottom-[calc(var(--spacing)*6+env(safe-area-inset-bottom))] m-0 flex h-auto w-auto',
        'justify-center overflow-visible border-0 bg-transparent p-0',
      ],
      polite: 'flex justify-center',
      urgent: 'flex justify-center',
      message: `inline-flex items-center gap-2 rounded-pill px-4 py-2 text-center text-xs ${DISPLAY_LABEL} shadow-pop`,
      icon: 'shrink-0',
    },
    variants: {
      kind: {
        success: { message: 'bg-success text-on-success' },
        error: { message: 'bg-danger text-on-danger' },
        info: { message: 'bg-info text-on-info' },
        warning: { message: 'bg-warn text-on-warn' },
      },
    },
  }),
  { base: '', polite: 'polite', urgent: 'urgent', message: 'message', icon: 'message.icon' },
)
