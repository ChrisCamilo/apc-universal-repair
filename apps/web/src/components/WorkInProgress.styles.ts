import { recipe, tv } from '../styles/tv.ts'

// The look of a screen still being built: its content stays in place, blurred so it can't be read, under the canvas
// tint of the dialogs' backdrop, and a panel near the top, centered, holds the mechanic in the accent, the title and
// the note. The layer only tints and places the notice, so it adds no level to its id, which is the same as on mobile.

/** A screen still being built: the blurred content, the layer over it, and the notice with its illustration. */
export const workInProgress = recipe(
  'common.work-in-progress',
  tv({
    slots: {
      base: 'relative min-h-96',
      content: 'pointer-events-none blur-sm select-none',
      overlay: 'absolute inset-0 grid content-start justify-items-center bg-backdrop px-4 pt-16',
      notice: 'grid max-w-sm justify-items-center gap-2 text-center',
      illustration: 'flex text-accent',
    },
  }),
  { base: '', content: 'content', overlay: 'overlay', notice: 'notice', illustration: 'notice.illustration' },
)
