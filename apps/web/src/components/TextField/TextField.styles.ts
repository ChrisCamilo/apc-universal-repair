import { FIELD } from '../../styles/shared.ts'
import { recipe, tv } from '../../styles/tv.ts'

// The look of the pill-shaped inputs: the frame lights up in the accent with the theme's ring while focused, and in
// the danger color when there is an error; a disabled field dims. A field of several lines is a box with the tile's
// corners instead of a pill, its text wrapping and the box growing downwards when dragged.

/** A labeled text field: the field, its frame, leading icon, input, the password toggle and the error under it. */
export const textField = recipe(
  'common.text-field',
  tv({
    slots: {
      base: 'grid gap-1.5',
      frame: FIELD.frame,
      icon: 'flex text-text-muted',
      input: FIELD.input,
      toggle: FIELD.button,
      error: 'm-0 font-body text-sm text-danger',
    },
    variants: {
      disabled: { true: { base: 'opacity-50' } },
      error: { true: { frame: FIELD.frameError }, false: { frame: FIELD.frameIdle } },
      multiline: { true: { frame: 'items-start rounded-tile', input: 'resize-y whitespace-pre-wrap' } },
    },
    defaultVariants: { disabled: false, error: false, multiline: false },
  }),
  { base: '', frame: 'frame', icon: 'frame.icon', input: 'frame.input', toggle: 'frame.toggle', error: 'error' },
)

/** The search field: its frame, the search icon, the input and the clear button. */
export const searchField = recipe(
  'common.search-field',
  tv({
    slots: {
      base: [FIELD.frame, FIELD.frameIdle],
      icon: 'flex text-text-muted',
      input: FIELD.input,
      clear: FIELD.button,
    },
    variants: { disabled: { true: { base: 'opacity-50' } } },
    defaultVariants: { disabled: false },
  }),
  { base: '', icon: 'icon', input: 'input', clear: 'clear' },
)
