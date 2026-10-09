import { recipe, tv } from '../styles/tv.ts'

// The look of the photo frame: the whole photo, letterboxed on the raised fill in a soft hairline, fading in once it
// loads; a spinner over it while it loads; and a note with a picture when there is no photo. A frame in a panel takes
// the smaller tile radius.

/** The photo frame: the frame, the photo, the spinner and the missing note. */
export const imageFrame = recipe(
  'common.image-frame',
  tv({
    slots: {
      base: 'relative grid place-items-center overflow-hidden border border-hairline-soft bg-panel-raised text-text-muted',
      image: 'absolute inset-0 size-full object-contain opacity-0 transition-opacity',
      spinner: 'absolute',
      missing: 'grid justify-items-center gap-2 p-4 text-center font-body text-sm',
    },
    variants: {
      nested: { true: { base: 'rounded-tile' }, false: { base: 'rounded-panel' } },
      loaded: { true: { image: 'opacity-100' } },
    },
    defaultVariants: { nested: false, loaded: false },
  }),
  { base: '', image: 'image', spinner: 'spinner', missing: 'missing' },
)
