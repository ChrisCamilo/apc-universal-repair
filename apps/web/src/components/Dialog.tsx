import { useEffect, useId, useRef, type ReactNode } from 'react'
import type { DialogSize } from '@apc/shared/dialog'
import { BackButton } from './BackButton.tsx'
import { CloseButton } from './CloseButton.tsx'
import { dialog as dialogRecipe, dialogBox } from './Dialog.styles.ts'
import { Heading } from './Typography.tsx'
import { usePhone } from './usePhone.ts'
import { usePresence } from './usePresence.ts'

// A modal window for forms and confirmations, built on the native <dialog> opened with showModal(): it sits
// on top of the page behind a dimmed, blurred backdrop, moves the focus inside and keeps it there, and gives
// it back to where it was when it closes. Escape and the owner's Cancel close it (the owner holds `open`).
// The content scrolls inside while the action bar stays pinned at the bottom, so the main action is visible
// without scrolling at 1280×720 and 360×780. A `dismissible` dialog, one with nothing to lose such as a notice,
// also closes on a click outside it, on the backdrop. A `closable` dialog has the round × at the right of its title,
// the same as the photo viewer's, which closes it like Escape; the focus still starts past it, on a control.
// It grows and fades in, and back out, its content kept while it leaves and the window inert (see usePresence).
// On a phone a form fills the screen, its title row pinned on top and its actions at the bottom, and slides up from the
// bottom edge, the focus starting on its title row's button so the keyboard doesn't cover the form as it opens; a
// confirmation stays a centered box (see Dialog.styles.ts). A dialog whose content heads itself, such as
// an item's details on a phone, may have a ← in place of the × and its title for screen readers only, and a control
// at the right of its title row.

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
  /**
   * A ← at the left of the title row in place of the ×, named for where it goes, e.g. "Voltar ao estoque"; it closes
   * the dialog like Escape. The title then names the dialog for screen readers only, its content heading it.
   */
  back?: string
  /** A control at the right of the title row, e.g. an item's Excluir. */
  headerAction?: ReactNode
  children: ReactNode
}

export function Dialog({
  open,
  onClose,
  title,
  size = 'form',
  actions,
  closable = false,
  dismissible = false,
  back,
  headerAction,
  children,
}: DialogProps) {
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const { classes, ids } = dialogRecipe({ fill: size === 'form', back: back !== undefined })
  const { present, leaving } = usePresence(open, dialog)
  const phone = usePhone()

  // Open and close the native dialog as `open` changes.
  useEffect(() => {
    const element = dialog.current
    if (open && element && !element.open) {
      element.showModal()
      // Start on the first control past the ×: the first field of a form, or Cancel in a confirmation; a form on a
      // phone starts on its title row, the × or the ←, so no keyboard rises over it.
      const controls = [...element.querySelectorAll<HTMLElement>(CONTROLS)]
      const start = phone && size === 'form' ? controls[0] : controls.find((control) => control !== close.current)
      start?.focus()
    } else if (!open && element?.open) {
      element.close()
    }
  }, [open, phone, size])

  return (
    <dialog
      ref={dialog}
      inert={leaving}
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
      {present && (
        <div className={classes.layout()} data-testid={ids.layout}>
          <div className={classes.body()} data-testid={ids.body}>
            <div className={classes.header()} data-testid={ids.header}>
              {back !== undefined && <BackButton label={back} onClick={onClose} />}
              <Heading id={titleId} level={3} className={classes.title()}>
                {title}
              </Heading>
              {headerAction}
              {closable && <CloseButton ref={close} onClick={onClose} />}
            </div>
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
