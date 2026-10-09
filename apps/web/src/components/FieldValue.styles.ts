import { recipe, tv } from '../styles/tv.ts'

// The look of a field's value shown for reading: the label on top and the value in a frame the size and shape of a
// TextField, with the soft hairline and no fill, so it reads as text and not as a disabled input.

/** A value for reading: the group, and the value's frame. */
export const fieldValue = recipe(
  'common.field-value',
  tv({
    slots: {
      base: 'grid content-start gap-1.5',
      value: 'm-0 min-w-0 truncate rounded-pill border border-hairline-soft px-4 py-2.5 font-body text-base text-text',
    },
  }),
  { base: '', value: 'value' },
)
