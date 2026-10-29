import type { CSSProperties } from 'react'
import { DIALOG_HEIGHT_INSET, DIALOG_SCREEN_INSET, DIALOG_WIDTHS, type DialogSize } from '@apc/shared/dialog'
import { recipe, tv } from '../styles/tv.ts'

// The look of a modal window: the panel with its sheen and hairline frame over a dimmed, blurred backdrop, its content
// scrolling inside while the action bar stays pinned at the bottom under a soft hairline. A closable dialog has the ×
// at the right of its title. It opens fading in while it grows from the motion token's enterScale (98%), with its
// backdrop fading in, and closes back the same way, staying on top until it is gone; with reduced motion, at once.
// On a phone (below `card:`), a form fills the screen: the title row stays on top, the × at its left, the content
// scrolls under it, and the actions sit at the bottom, clear of the home indicator; it slides up from the bottom edge
// instead of growing. A confirmation stays a centered box, 16px from the screen's edges.

/** A dialog: the window, its layout, the scrolling body, the title row and the action bar. */
export const dialog = recipe(
  'common.dialog',
  tv({
    slots: {
      base: [
        'm-auto max-h-(--dialog-max-height) w-(--dialog-width) max-w-none overflow-hidden rounded-panel border border-hairline bg-panel bg-(image:--sheen) p-0 text-text shadow-pop',
        'backdrop:bg-backdrop backdrop:backdrop-blur-backdrop',
        'transition-[opacity,scale,translate,display,overlay] transition-discrete starting:scale-98 starting:opacity-0 not-open:scale-98 not-open:opacity-0',
        'backdrop:transition-[opacity,display,overlay] backdrop:transition-discrete backdrop:starting:opacity-0 not-open:backdrop:opacity-0',
        'motion-reduce:transition-none motion-reduce:backdrop:transition-none',
      ],
      layout: 'flex max-h-[inherit] flex-col',
      body: 'grid min-h-0 gap-4 overflow-y-auto p-6',
      header: 'flex items-start justify-between gap-3',
      actions: 'flex flex-wrap justify-end gap-2 border-t border-hairline-soft px-6 pt-3 pb-6',
    },
    variants: {
      fill: {
        true: {
          base: [
            'max-card:m-0 max-card:h-dvh max-card:max-h-none max-card:w-full max-card:rounded-none max-card:border-0',
            'max-card:starting:translate-y-full max-card:starting:scale-100 max-card:not-open:translate-y-full max-card:not-open:scale-100',
          ],
          layout: 'max-card:h-full',
          body: 'max-card:flex-1 max-card:content-start max-card:px-4 max-card:pt-0 max-card:pb-4',
          // Pinned on top while the content scrolls under it, across the window, on the panel's fill.
          header: [
            'max-card:sticky max-card:top-0 max-card:z-10 max-card:-mx-4 max-card:min-h-14 max-card:flex-row-reverse',
            'max-card:items-center max-card:justify-end max-card:gap-1 max-card:border-b max-card:border-hairline-soft max-card:bg-panel max-card:px-2 max-card:py-2',
          ],
          actions: 'max-card:px-4 max-card:pb-[max(--spacing(4),env(safe-area-inset-bottom))]',
        },
      },
    },
    defaultVariants: { fill: false },
  }),
  { base: '', layout: 'layout', body: 'body', header: 'body.header', actions: 'actions' },
)

/**
 * Sizes a dialog's window: as wide as its size allows on the screen, and no taller than the screen less its inset. The
 * browser caps a modal dialog at 100% - 6px - 2em; the window's max-w-none lets this width apply instead. They are
 * custom properties, so a form on a phone fills the screen in their place.
 * @param size The dialog's size, e.g. "form".
 * @returns The window's width and max height, as --dialog-width and --dialog-max-height.
 */
export function dialogBox(size: DialogSize): CSSProperties {
  return {
    '--dialog-width': `min(${DIALOG_WIDTHS[size]}px, calc(100vw - ${DIALOG_SCREEN_INSET}px))`,
    '--dialog-max-height': `calc(100dvh - ${DIALOG_HEIGHT_INSET}px)`,
  } as CSSProperties
}
