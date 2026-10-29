import type { CSSProperties } from 'react'
import { SHEET_RADIUS, SHEET_TOP_INSET } from '@apc/shared/dialog'
import { recipe, tv } from '../styles/tv.ts'

// The look of a bottom sheet, for lists of choices on a phone: a panel docked to the bottom edge, its top corners
// rounded, over the dimmed, blurred backdrop of a dialog. The handle's bar sits on top, then the title row with an
// optional action, the content, which scrolls once the sheet reaches SHEET_TOP_INSET from the top, and an optional
// footer under a soft hairline. It opens sliding up from the bottom edge while
// it and its backdrop fade in, and closes back down the same way; with reduced motion, at once.

/**
 * A bottom sheet: the window, its layout, the handle with its bar, the title row with the title taking the room left
 * by the action, the scrolling body and the footer.
 */
export const bottomSheet = recipe(
  'common.bottom-sheet',
  tv({
    slots: {
      base: [
        'inset-x-0 top-auto bottom-0 m-0 w-full max-w-none overflow-hidden border-t border-hairline-soft bg-panel bg-(image:--sheen) p-0 text-text shadow-pop',
        'backdrop:bg-backdrop backdrop:backdrop-blur-backdrop',
        'transition-[opacity,translate,display,overlay] transition-discrete starting:translate-y-full starting:opacity-0 not-open:translate-y-full not-open:opacity-0',
        'backdrop:transition-[opacity,display,overlay] backdrop:transition-discrete backdrop:starting:opacity-0 not-open:backdrop:opacity-0',
        'motion-reduce:transition-none motion-reduce:backdrop:transition-none',
      ],
      layout: 'flex max-h-[inherit] flex-col',
      handle: 'flex shrink-0 cursor-grab touch-none justify-center pt-2 pb-3',
      bar: 'h-1 w-10 rounded-pill bg-hairline',
      header: 'flex shrink-0 items-center gap-2 pr-2 pb-2 pl-5',
      title: 'grow',
      body: 'min-h-0 overflow-y-auto',
      footer: 'shrink-0 border-t border-hairline-soft px-4 pt-3 pb-4',
    },
  }),
  { base: '', layout: 'layout', handle: 'handle', bar: 'handle.bar', header: 'header', title: 'header.title', body: 'body', footer: 'footer' },
)

/**
 * Sizes and places a bottom sheet's window: its rounded top corners, its height capped SHEET_TOP_INSET below the top
 * of the screen, and, while its handle is dragged down, how far, following the finger with no transition.
 * @param drag How far the handle is dragged down, in px; 0 when it isn't.
 * @returns The window's style.
 */
export function sheetBox(drag: number): CSSProperties {
  return {
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    maxHeight: `calc(100dvh - ${SHEET_TOP_INSET}px)`,
    ...(drag > 0 && { translate: `0 ${drag}px`, transition: 'none' }),
  }
}
