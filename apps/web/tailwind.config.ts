import { TABLE_CARD_BREAKPOINT } from '@apc/shared/table'

// The breakpoints the layout switches at, from the constants @apc/shared keeps, so the web and its tests use the same
// width: `max-card:` below the width where a table turns its rows into cards, `card:` from it up. index.css loads this
// file with @config; the colors, fonts and sizes stay in index.css, from the theme tokens.

export default {
  theme: {
    extend: {
      screens: { card: `${TABLE_CARD_BREAKPOINT}px` },
    },
  },
}
