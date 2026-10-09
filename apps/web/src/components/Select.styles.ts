import { FIELD } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the compact dropdown: a small pill button on the panel, its border in the accent while a multiple choice
// has picks, the chevron turning while the list is open, and the shared list and options; a multiple choice shows a
// checkbox before each option.

/** A select: the wrapper, the button with its text and chevron, the list, and an option with its box and text. */
export const select = recipe(
  'common.select',
  tv({
    slots: {
      base: 'relative min-w-0',
      button: [
        'flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-pill border border-hairline bg-panel px-3 py-1.5 text-left font-body',
        'text-sm text-text outline-none transition-[border-color,box-shadow] focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-50',
      ],
      shown: 'min-w-0 flex-1 truncate',
      chevron: 'shrink-0 text-text-muted transition-transform rotate-90',
      list: FIELD.list,
      option: FIELD.option,
      box: 'grid size-3.5 shrink-0 place-items-center rounded-[calc(var(--tile-radius)/4)] border border-hairline bg-panel',
      text: 'min-w-0 flex-1 truncate',
      check: 'shrink-0',
    },
    variants: {
      picked: { true: { button: 'border-accent' } },
      open: { true: { chevron: '-rotate-90' } },
      selected: { true: { box: 'border-accent bg-accent text-on-accent' } },
    },
    defaultVariants: { picked: false, open: false, selected: false },
  }),
  {
    base: '',
    button: 'button',
    shown: 'button.text',
    chevron: 'button.chevron',
    list: 'list',
    option: 'list.option',
    box: 'list.option.box',
    text: 'list.option.text',
    check: 'list.option.check',
  },
)
