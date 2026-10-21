import { FIELD } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of a field of codes typed as chips: the field's frame, which grows into rows of chips, each code in mono
// in a soft pill with its ×, a code with a message in the danger color, the input at the end of the chips, and the
// messages under the field.

/** A field of codes: its frame, the chips, a chip's code and ×, the input and the messages. */
export const codeListField = recipe(
  'inventory.code-list-field',
  tv({
    slots: {
      base: 'grid gap-1.5',
      frame: [FIELD.frame, FIELD.frameIdle, 'flex-wrap rounded-tile py-1.5 pl-2'],
      chips: 'contents',
      chip: 'group inline-flex items-center gap-1 rounded-pill border border-hairline-soft bg-panel-raised py-0.5 pr-1 pl-2.5 data-invalid:border-danger',
      code: 'font-mono text-xs text-text group-data-invalid:text-danger',
      remove: [FIELD.button, 'size-5'],
      input: [FIELD.input, 'min-w-24 py-1'],
      messages: 'm-0 grid gap-0.5 p-0',
      message: 'list-none font-body text-sm text-danger',
    },
  }),
  {
    base: '',
    frame: 'frame',
    chips: 'frame.chips',
    chip: 'frame.chip',
    code: 'frame.chip.code',
    remove: 'frame.chip.remove',
    input: 'frame.input',
    messages: 'messages',
    message: 'messages.message',
  },
)
