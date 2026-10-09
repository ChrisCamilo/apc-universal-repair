import { recipe, tv } from '../styles/tv.ts'

// The look of the buttons: pill shape and the display face in uppercase with the style's tracking, except the link,
// which reads as inline text. Hover and press only apply while enabled; focus-visible draws the theme's ring.

// The display face of the framed variants, all but the link.
const FRAMED = 'font-display font-semibold uppercase tracking-display'

/** A button, by variant and size; the link keeps only the size's text, with no padding. */
export const button = recipe(
  'common.button',
  tv({
    slots: {
      base: [
        'relative inline-flex items-center justify-center gap-2 rounded-pill border outline-none',
        'transition-[transform,background-color,color,border-color,box-shadow] enabled:active:translate-y-px',
        'enabled:cursor-pointer focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-50',
      ],
    },
    variants: {
      variant: {
        primary: `${FRAMED} border-transparent bg-accent text-on-accent shadow-glow enabled:hover:bg-[color-mix(in_srgb,var(--accent)_86%,var(--text))]`,
        secondary: `${FRAMED} border-hairline text-text enabled:hover:border-accent enabled:hover:text-accent`,
        ghost: `${FRAMED} border-transparent text-text enabled:hover:bg-panel-raised`,
        link: 'border-transparent font-body text-text-muted underline underline-offset-4 enabled:hover:text-accent',
        danger: `${FRAMED} border-transparent bg-danger text-on-danger enabled:hover:bg-[color-mix(in_srgb,var(--danger)_86%,var(--text))]`,
      },
      size: { md: 'px-6 py-3 text-sm', sm: 'px-4 py-2 text-xs' },
    },
    compoundVariants: [{ variant: 'link', class: 'px-0 py-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  }),
  { base: '' },
)
