import type { Ref } from 'react'
import { closeIcon } from '@apc/shared/icons'
import { closeButton } from './CloseButton.styles.ts'
import { Icon } from './Icon.tsx'

// The round × that closes a window, such as the photo viewer or a dialog (see CloseButton.styles.ts), named
// "Fechar".

type CloseButtonProps = {
  onClick: () => void
  ref?: Ref<HTMLButtonElement>
}

export function CloseButton({ onClick, ref }: CloseButtonProps) {
  const { classes, ids } = closeButton()
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Fechar"
      className={classes.base()}
      data-testid={ids.base}
      onClick={onClick}
    >
      <Icon icon={closeIcon} />
    </button>
  )
}
