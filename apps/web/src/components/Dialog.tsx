import { useEffect, useId, useRef, type ReactNode } from 'react'
import type { DialogSize } from '@apc/shared/dialog'
import { CloseButton } from './CloseButton.tsx'
import { dialog as dialogRecipe, dialogBox } from './Dialog.styles.ts'
import { Heading } from './Typography.tsx'

// A modal window for forms and confirmations, built on the native <dialog> opened with showModal(): it sits
// on top of the page behind a dimmed, blurred backdrop, moves the focus inside and keeps it there, and gives
// it back to where it was when it closes. Escape and the owner's Cancel close it (the owner holds `open`).
// The content scrolls inside while the action bar stays pinned at the bottom, so the main action is visible
// without scrolling at 1280×720 and 360×780. A `dismissible` dialog, one with nothing to lose such as a notice,
// also closes on a click outside it, on the backdrop. A `closable` dialog has the round × at the right of its title,
// the same as the photo viewer's, which closes it like Escape; the focus still starts past it, on a control.

// The elements the focus can start on: the scrolling body is focusable too, but the focus belongs on a control.
const CONTROLS = 'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])'

type DialogProps = {
  open: boolean
  /** Called on Escape (and a click outside when dismissible); the owner closes the dialog by setting `open` to false. */
  onClose: () => void
  title: string
  /** "form" for forms such as the item form, "confirm" for short confirmations. */
  size?: DialogSize
  /** Buttons of the action bar, e.g. Cancel and Save. */
  actions: ReactNode
  /** Shows the × at the right of the title, which asks the owner to close the dialog like Escape does. */
  closable?: boolean
  /** Also closes on a click outside, for dialogs with nothing to lose, such as a notice; off for forms. */
  dismissible?: boolean
  children: ReactNode
}

export function Dialog({ open, onClose, title, size = 'form', actions, closable = false, dismissible = false, children }: DialogProps) {
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const { classes, ids } = dialogRecipe()

  // Open and close the native dialog as `open` changes.
  useEffect(() => {
    const element = dialog.current
    if (open && element && !element.open) {
      element.showModal()
      // Start on the first control past the ×: the first field of a form, or Cancel in a confirmation.
      const controls = [...element.querySelectorAll<HTMLElement>(CONTROLS)]
      controls.find((control) => control !== close.current)?.focus()
    } else if (!open && element?.open) {
      element.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={classes.base()}
      data-testid={ids.base}
      style={dialogBox(size)}
      onCancel={(event) => {
        // A file picker closed without a choice also fires "cancel", which bubbles up to here: only the
        // dialog's own Escape closes it, and the owner does, so `open` stays the one source of truth.
        if (event.target === dialog.current) {
          event.preventDefault()
          onClose()
        }
      }}
      // A click on the dialog itself, not on its content, landed on the backdrop.
      onClick={(event) => {
        if (dismissible && event.target === dialog.current) {
          onClose()
        }
      }}
    >
      {open && (
        <div className={classes.layout()} data-testid={ids.layout}>
          <div className={classes.body()} data-testid={ids.body}>
            {closable ? (
              <div className={classes.header()} data-testid={ids.header}>
                <Heading id={titleId} level={3}>
                  {title}
                </Heading>
                <CloseButton ref={close} onClick={onClose} />
              </div>
            ) : (
              <Heading id={titleId} level={3}>
                {title}
              </Heading>
            )}
            {children}
          </div>
          <div className={classes.actions()} data-testid={ids.actions}>
            {actions}
          </div>
        </div>
      )}
    </dialog>
  )
}
