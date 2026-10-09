import { tv } from './tv.ts'

// The style recipes three or more components share, the same patterns as mobile's styles/shared.ts. They give
// classes only: a component puts them in its own recipe's slots, so the elements keep their component's style ids.

/** A label in the display face: semibold, uppercase, with the style's tracking. Buttons, chips and segments use it. */
export const DISPLAY_LABEL = 'font-display font-semibold uppercase tracking-display'

/**
 * The parts of a text field and of a dropdown list: an icon button at the frame's end (the password eye, the Combobox
 * chevron), the pill frame and its border at rest or with an error, the typed text, the list and an option. TextField,
 * Combobox and Select put them in their recipes. The list holds SELECT_VISIBLE_OPTIONS options of h-9 plus its p-1
 * padding, 5 × 9 + 2 = 47 spacing units; the rest scroll.
 */
export const FIELD = {
  button:
    'grid shrink-0 place-items-center rounded-pill text-text-muted outline-none transition-colors enabled:cursor-pointer enabled:hover:text-text focus-visible:shadow-ring disabled:cursor-not-allowed',
  frame: 'flex min-w-0 items-center gap-2 rounded-pill border bg-panel px-4 py-2.5 transition-[border-color,box-shadow] focus-within:shadow-ring',
  frameError: 'border-danger',
  frameIdle: 'border-hairline focus-within:border-accent',
  input:
    'min-w-0 flex-1 bg-transparent font-body text-base text-text outline-none placeholder:text-text-muted text-ellipsis disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:appearance-none',
  list: 'absolute inset-x-0 top-full z-10 mt-1 max-h-47 overflow-y-auto overscroll-contain rounded-tile border border-hairline-soft bg-panel p-1 shadow-pop',
  option: 'relative flex h-9 cursor-pointer items-center gap-2 truncate rounded-tile px-2.5 font-body text-sm text-text aria-selected:text-accent data-active:bg-panel-raised',
}

/** A full-width menu item: Switch, Segmented and MenuItem rows, with the raised fill on hover and focus. */
export const menuItem = tv({
  base: [
    'flex w-full cursor-pointer items-center justify-between gap-3 rounded-tile px-2 py-2 text-left font-body text-sm',
    'text-text outline-none transition-colors hover:bg-panel-raised focus-visible:bg-panel-raised',
  ],
})
