import type { CSSProperties } from 'react'
import { DIALOG_HEIGHT_INSET, DIALOG_SCREEN_INSET, DIALOG_WIDTHS, type DialogSize } from '@apc/shared/dialog'
import { recipe, tv } from '../styles/tv.ts'

// The look of a modal window: the panel with its sheen and hairline frame over a dimmed, blurred backdrop, its content
// scrolling inside while the action bar stays pinned at the bottom under a soft hairline. A closable dialog has the ×
// at the right of its title. It opens fading in while it grows from the motion token's enterScale (98%), with its
// backdrop fading in, and closes back the same way, staying on top until it is gone; with reduced motion, at once.

/** A dialog: the window, its layout, the scrolling body, the title row and the action bar. */
export const dialog = recipe(
  'common.dialog',
  tv({
    slots: {
      base: [
        'm-auto max-w-none overflow-hidden rounded-panel border border-hairline bg-panel bg-(image:--sheen) p-0 text-text shadow-pop',
        'backdrop:bg-backdrop backdrop:backdrop-blur-backdrop',
        'transition-[opacity,scale,display,overlay] transition-discrete starting:scale-98 starting:opacity-0 not-open:scale-98 not-open:opacity-0',
        'backdrop:transition-[opacity,display,overlay] backdrop:transition-discrete backdrop:starting:opacity-0 not-open:backdrop:opacity-0',
        'motion-reduce:transition-none motion-reduce:backdrop:transition-none',
      ],
      layout: 'flex max-h-[inherit] flex-col',
      body: 'grid min-h-0 gap-4 overflow-y-auto p-6',
      header: 'flex items-start justify-between gap-3',
      actions: 'flex flex-wrap justify-end gap-2 border-t border-hairline-soft px-6 pt-3 pb-6',
    },
  }),
  { base: '', layout: 'layout', body: 'body', header: 'body.header', actions: 'actions' },
)

/**
 * Sizes a dialog's window: as wide as its size allows on the screen, and no taller than the screen less its inset. The
 * browser caps a modal dialog at 100% - 6px - 2em; the window's max-w-none lets this width apply instead.
 * @param size The dialog's size, e.g. "form".
 * @returns The window's width and max height.
 */
export function dialogBox(size: DialogSize): CSSProperties {
  return {
    width: `min(${DIALOG_WIDTHS[size]}px, calc(100vw - ${DIALOG_SCREEN_INSET}px))`,
    maxHeight: `calc(100dvh - ${DIALOG_HEIGHT_INSET}px)`,
  }
}
