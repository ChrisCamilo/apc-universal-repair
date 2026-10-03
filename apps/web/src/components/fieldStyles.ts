// Class lists shared by the text inputs (TextField, SearchField, Combobox) and the dropdown lists (Select,
// Combobox), so fields and lists look the same everywhere. Tailwind only builds classes it finds written out,
// hence the literal strings.

/** Border of the field frame: hairline, accent while focused, danger on error. */
export const FIELD_BORDER_CLASSES = {
  idle: 'border-hairline focus-within:border-accent',
  error: 'border-danger',
}
/** Look of an icon button at the end of the frame, such as the password eye or the Combobox chevron. */
export const FIELD_BUTTON_CLASSES =
  'grid shrink-0 place-items-center rounded-pill text-text-muted outline-none transition-colors ' +
  'enabled:cursor-pointer enabled:hover:text-text focus-visible:shadow-ring disabled:cursor-not-allowed'
/** Look of the pill frame around an input; its border color comes from FIELD_BORDER_CLASSES. */
export const FIELD_FRAME_CLASSES =
  'flex min-w-0 items-center gap-2 rounded-pill border bg-panel px-4 py-2.5 transition-[border-color,box-shadow] ' +
  'focus-within:shadow-ring'
/** Look of the text input inside the frame. */
export const FIELD_INPUT_CLASSES =
  'min-w-0 flex-1 bg-transparent font-body text-base text-text outline-none placeholder:text-text-muted ' +
  'text-ellipsis disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:appearance-none'
/**
 * Look of a dropdown list: 5 options of h-9 plus its p-1 padding, 5 × 9 + 2 = 47 spacing units
 * (SELECT_VISIBLE_OPTIONS); the rest scroll.
 */
export const SELECT_LIST_CLASSES =
  'absolute inset-x-0 top-full z-10 mt-1 max-h-47 overflow-y-auto overscroll-contain rounded-tile ' +
  'border border-hairline-soft bg-panel p-1 shadow-pop'
/** Look of an option in a list: the chosen one in the accent, the highlighted one on the raised fill. */
export const SELECT_OPTION_CLASSES =
  'relative flex h-9 cursor-pointer items-center gap-2 truncate rounded-tile px-2.5 font-body text-sm text-text ' +
  'aria-selected:text-accent data-active:bg-panel-raised'
