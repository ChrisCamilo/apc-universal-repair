import type { CSSProperties } from 'react'
import { DIALOG_SCREEN_INSET, DIALOG_WIDTHS } from '@apc/shared/dialog'
import { recipe, tv } from '../styles/tv.ts'

// The look of the photo viewer: a modal on the panel over the dimmed, blurred backdrop; the item's name and code over
// a 4:3 frame on the canvas that never grows past 62% of the screen's height; round arrows over the photo, lit in the
// accent on hover; dots under it, the current one in the accent; the problems in the danger color; and the note and
// buttons at the bottom.

/** The viewer: the window, its body, head and name, the frame with the photo or the empty note, arrows, dots and footer. */
export const imageViewer = recipe(
  'common.image-viewer',
  tv({
    slots: {
      base: [
        'm-auto max-w-none overflow-y-auto rounded-panel border border-hairline bg-panel p-0 text-text shadow-pop',
        'backdrop:bg-backdrop backdrop:backdrop-blur-backdrop',
      ],
      body: 'grid gap-3 p-4',
      head: 'flex items-start justify-between gap-3',
      name: 'grid min-w-0 gap-0.5',
      stage: 'relative',
      frame: 'relative grid aspect-4/3 max-h-[62dvh] w-full place-items-center overflow-hidden rounded-tile border border-hairline-soft bg-canvas text-text-muted',
      image: 'absolute inset-0 size-full object-contain',
      empty: 'grid justify-items-center gap-2 p-6 text-center',
      nav: [
        'absolute top-1/2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-pill border border-hairline bg-panel text-text',
        'outline-none transition-[border-color,color,box-shadow] hover:border-accent hover:text-accent hover:shadow-glow focus-visible:shadow-ring',
      ],
      previous: 'rotate-180',
      dots: 'flex items-center justify-center gap-2',
      dot: 'size-2.5 cursor-pointer rounded-pill bg-hairline outline-none focus-visible:shadow-ring aria-current:bg-accent aria-current:shadow-glow',
      problems: 'm-0 grid list-none gap-0.5 p-0 font-body text-sm text-danger',
      footer: 'flex flex-wrap items-center justify-between gap-3',
      buttons: 'flex flex-wrap gap-2',
      input: 'sr-only',
    },
    variants: { side: { prev: { nav: 'left-2.5' }, next: { nav: 'right-2.5' } } },
  }),
  {
    base: '',
    body: 'body',
    head: 'body.head',
    name: 'body.head.name',
    stage: 'body.stage',
    frame: 'body.stage.frame',
    image: 'body.stage.frame.image',
    empty: 'body.stage.frame.empty',
    nav: 'body.stage.nav',
    previous: 'body.stage.nav.previous',
    dots: 'body.dots',
    dot: 'body.dots.dot',
    problems: 'body.problems',
    footer: 'body.footer',
    buttons: 'body.footer.buttons',
    input: 'body.footer.input',
  },
)

/**
 * Sizes the viewer's window: as wide as the viewer size allows on the screen, and no taller than the screen less its
 * inset. The browser caps a modal dialog at 100% - 6px - 2em; the window's max-w-none lets this width apply instead.
 * @returns The window's width and max height.
 */
export function viewerBox(): CSSProperties {
  return {
    width: `min(${DIALOG_WIDTHS.viewer}px, calc(100vw - ${DIALOG_SCREEN_INSET}px))`,
    maxHeight: `calc(100dvh - ${DIALOG_SCREEN_INSET}px)`,
  }
}
