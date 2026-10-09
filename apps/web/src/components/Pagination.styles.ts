import { recipe, tv } from '../styles/tv.ts'

// The look of the pagination: the page size, the range and the page buttons on one line under a soft hairline,
// wrapping at phone width. The current page fills with the accent and glows where the style has a glow; a button that
// can't be used dims.

/** The pagination: the bar, the page size, the range, the page buttons and the gaps between them. */
export const pagination = recipe(
  'common.pagination',
  tv({
    slots: {
      base: 'flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline-soft pt-3',
      size: 'flex items-center gap-2',
      range: 'ms-auto max-card:ms-0',
      pages: 'flex flex-wrap gap-1',
      previous: 'rotate-180',
      gap: 'self-center px-0.5 font-mono text-xs text-text-muted',
      page: [
        'inline-grid h-8 min-w-8 place-items-center rounded-tile border px-2 font-mono text-xs tabular-nums outline-none',
        'transition-[border-color,color,background-color,box-shadow] focus-visible:shadow-ring',
      ],
    },
    variants: {
      current: {
        true: { page: 'cursor-pointer border-transparent bg-accent text-on-accent shadow-glow' },
        false: {
          page: [
            'border-hairline-soft bg-transparent text-text not-aria-disabled:cursor-pointer not-aria-disabled:hover:border-accent',
            'not-aria-disabled:hover:text-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
          ],
        },
      },
    },
    defaultVariants: { current: false },
  }),
  {
    base: '',
    size: 'size',
    range: 'range',
    pages: 'pages',
    previous: 'pages.previous',
    gap: 'pages.gap',
    page: 'pages.page',
  },
)
