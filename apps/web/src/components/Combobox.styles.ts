import { FIELD } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the combobox: a text field's frame with a chevron button at its end that turns while the list is open,
// the shared list and options, a note when nothing matches, and the "+ Criar" row in the accent, set apart by a
// hairline from the options above it. The anchor only places the list under the frame, so it adds no level to the ids
// inside it, which are the same as on mobile.

/** A combobox: the field, its frame, input and chevron, the list, an option or the create row, and the error. */
export const combobox = recipe(
  'common.combobox',
  tv({
    slots: {
      base: 'grid gap-1.5',
      anchor: 'relative',
      frame: FIELD.frame,
      input: FIELD.input,
      toggle: FIELD.button,
      chevron: 'transition-transform rotate-90',
      list: FIELD.list,
      empty: 'flex h-9 items-center px-2.5 font-body text-sm text-text-muted',
      option: FIELD.option,
      error: 'm-0 font-body text-sm text-danger',
    },
    variants: {
      disabled: { true: { base: 'opacity-50' } },
      error: { true: { frame: FIELD.frameError }, false: { frame: FIELD.frameIdle } },
      open: { true: { chevron: '-rotate-90' } },
      create: { true: { option: 'font-semibold text-accent!' } },
      // A hairline sets the create row apart from the options above it.
      below: { true: { option: 'border-t border-hairline-soft' } },
    },
    defaultVariants: { disabled: false, error: false, open: false, create: false, below: false },
  }),
  {
    base: '',
    anchor: 'anchor',
    frame: 'frame',
    input: 'frame.input',
    toggle: 'frame.toggle',
    chevron: 'frame.toggle.chevron',
    list: 'list',
    empty: 'list.empty',
    option: 'list.option',
    error: 'error',
  },
)
