import { recipe, tv } from '../styles/tv.ts'

// The look of the stepper, as in the Novo item mockup: a 48px round − and + in the field's frame, lighting up in the
// accent on hover and dimmed when locked, and between them a 72px pill with the number centered, in the danger color's
// frame when there is an error; every part draws the theme's ring with the focus.

/** A stepper: the field, the row of buttons and number, a − or +, the number and the error under it. */
export const stepper = recipe(
  'common.stepper',
  tv({
    slots: {
      base: 'grid justify-items-start gap-1.5',
      row: 'flex items-center gap-2',
      button: [
        'grid size-12 shrink-0 place-items-center rounded-pill border border-hairline bg-panel p-0 text-text outline-none',
        'transition-colors enabled:cursor-pointer enabled:hover:border-accent enabled:hover:text-accent focus-visible:shadow-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
      ],
      input: 'h-12 w-18 rounded-pill border bg-panel text-center font-body text-lg font-semibold text-text outline-none transition-[border-color,box-shadow] focus:shadow-ring',
      error: 'm-0 font-body text-sm text-danger',
    },
    variants: {
      error: { true: { input: 'border-danger' }, false: { input: 'border-hairline' } },
    },
    defaultVariants: { error: false },
  }),
  { base: '', row: 'row', button: 'row.button', input: 'row.input', error: 'error' },
)
