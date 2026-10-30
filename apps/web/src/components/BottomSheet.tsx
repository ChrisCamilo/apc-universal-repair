import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { SHEET_CLOSE_DRAG } from '@apc/shared/dialog'
import { bottomSheet, sheetBox } from './BottomSheet.styles.ts'
import { Heading } from './Typography.tsx'
import { usePresence } from './usePresence.ts'

// A list of choices on a phone, such as the filters or a menu of actions, in a sheet that rises from the bottom of
// the screen. Like the Dialog it is a native <dialog> opened with showModal(): it sits on top of the page behind the
// dimmed, blurred backdrop, moves the focus inside and keeps it there, and gives it back to where it was when it
// closes. Escape, a click on the backdrop and a drag down from the handle, past SHEET_CLOSE_DRAG, ask the owner to
// close it (the owner holds `open`); an owner with a list open inside the sheet may take Escape to go back from it.
// It grows with its content, and its body scrolls once it is as tall as it gets.
// It slides up and fades in, and back down, its content kept while it leaves and the window inert (see usePresence).

type BottomSheetProps = {
  open: boolean
  /** Called on Escape, a click on the backdrop or a drag down; the owner closes the sheet by setting `open` to false. */
  onClose: () => void
  /** Called on Escape in place of onClose, e.g. to go back from a list opened inside the sheet. */
  onBack?: () => void
  title: string
  /** A control at the right of the title, such as "Limpar". */
  action?: ReactNode
  /** Pinned under the content, such as "Ver 3 itens". */
  footer?: ReactNode
  children: ReactNode
}

export function BottomSheet({ open, onClose, onBack, title, action, footer, children }: BottomSheetProps) {
  const titleId = useId()
  const sheet = useRef<HTMLDialogElement>(null)
  const dragStart = useRef<number | null>(null)
  const [drag, setDrag] = useState(0)
  const { classes, ids } = bottomSheet()
  const { present, leaving } = usePresence(open, sheet)

  // Open and close the native dialog as `open` changes; showModal() puts the focus on its first control.
  useEffect(() => {
    const element = sheet.current
    if (open && element && !element.open) {
      setDrag(0)
      element.showModal()
    } else if (!open && element?.open) {
      element.close()
    }
  }, [open])

  return (
    <dialog
      ref={sheet}
      inert={leaving}
      aria-labelledby={titleId}
      className={classes.base()}
      data-testid={ids.base}
      style={sheetBox(drag)}
      onCancel={(event) => {
        // Only the sheet's own Escape closes it, not a file picker's "cancel" bubbling up from inside.
        if (event.target === sheet.current) {
          event.preventDefault()
          const leave = onBack ?? onClose
          leave()
        }
      }}
      // A click on the dialog itself, not on its content, landed on the backdrop.
      onClick={(event) => {
        if (event.target === sheet.current) {
          onClose()
        }
      }}
    >
      {present && (
        <div className={classes.layout()} data-testid={ids.layout}>
          <div
            className={classes.handle()}
            data-testid={ids.handle}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              dragStart.current = event.clientY
            }}
            onPointerMove={(event) => {
              if (dragStart.current !== null) {
                setDrag(Math.max(0, event.clientY - dragStart.current))
              }
            }}
            onPointerUp={() => {
              dragStart.current = null
              if (drag > SHEET_CLOSE_DRAG) {
                onClose()
              } else {
                setDrag(0)
              }
            }}
            onPointerCancel={() => {
              dragStart.current = null
              setDrag(0)
            }}
          >
            <span className={classes.bar()} data-testid={ids.bar} />
          </div>
          <div className={classes.header()} data-testid={ids.header}>
            <Heading id={titleId} level={3} className={classes.title()}>
              {title}
            </Heading>
            {action}
          </div>
          <div className={classes.body()} data-testid={ids.body}>
            {children}
          </div>
          {footer && (
            <div className={classes.footer()} data-testid={ids.footer}>
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}
