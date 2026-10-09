import { recipe, tv } from '../styles/tv.ts'

// The look of the app's frame: a header on the canvas with the APC mark, the navigation and the end slot over one soft
// hairline that the selected tab's underline sits on, pinned to the top from the card breakpoint up, and the content
// under it, clipped only sideways so menus can still drop below it.

/** The compact APC mark's width in the header, in px. */
export const HEADER_MARK_SIZE = 32

/** The frame: the page, the header and its bar, the mark, the navigation, the end slot and the content. */
export const appFrame = recipe(
  'common.app-frame',
  tv({
    slots: {
      base: 'min-h-dvh bg-canvas',
      header: 'z-40 bg-canvas px-4 pt-3 sm:px-6 card:sticky card:top-0',
      bar: 'flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-hairline-soft',
      brand: 'm-0 flex pb-2.5',
      // The scroll box clips both ways, so it reaches 1px down over the bar's border, where the selected tab's
      // underline sits.
      nav: '-mb-px max-w-full min-w-0 overflow-x-auto overflow-y-hidden pb-px',
      end: 'ml-auto pb-2',
      main: 'overflow-x-clip px-4 py-3 sm:px-6',
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
