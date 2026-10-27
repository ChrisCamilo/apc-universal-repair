import { recipe, tv } from '../styles/tv.ts'

// The look of the app's frame: exactly the window's height, less the room the page keeps above the app (--top-inset,
// the web app's demo's notice), so the page itself never scrolls; a header on the canvas
// with the APC mark, the navigation and the end slot over one soft hairline that the selected tab's underline sits on,
// always in view; and the content under it, filling the rest as a column its screen can stretch into. Only what the
// screen puts in it scrolls (the Inventory's list, or the content itself when a screen is taller than the room left).

/** The compact APC mark's width in the header, in px. */
export const HEADER_MARK_SIZE = 32

/** The frame: the page, the header and its bar, the mark, the navigation, the end slot and the content. */
export const appFrame = recipe(
  'common.app-frame',
  tv({
    slots: {
      base: 'flex h-[calc(100dvh-var(--top-inset,0px))] flex-col overflow-hidden bg-canvas',
      header: 'z-40 shrink-0 bg-canvas px-4 pt-3 sm:px-6',
      bar: 'flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-hairline-soft',
      brand: 'm-0 flex pb-2.5',
      // The scroll box clips both ways, so it reaches 1px down over the bar's border, where the selected tab's
      // underline sits.
      nav: '-mb-px max-w-full min-w-0 overflow-x-auto overflow-y-hidden pb-px',
      end: 'relative ml-auto flex items-center gap-2 pb-2',
      main: 'flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-auto px-4 py-3 sm:px-6',
    },
  }),
  {
    base: '',
    header: 'header',
    bar: 'header.bar',
    brand: 'header.bar.brand',
    nav: 'header.bar.nav',
    end: 'header.bar.end',
    main: 'main',
  },
)
