import type { Ref } from 'react'
import { closeIcon } from '@apc/tokens/icons'
import { COMMON_TEXTS } from '@apc/domain/app-texts'
import { useMessages } from '../../app/useLocale.ts'
import { closeButton } from './CloseButton.styles.ts'
import { Icon } from '../Icon/Icon.tsx'

// The round × that closes a window, such as the photo viewer or a dialog (see CloseButton.styles.ts), named
// "Fechar".

type CloseButtonProps = {
  onClick: () => void
  ref?: Ref<HTMLButtonElement>
}

export function CloseButton({ onClick, ref }: CloseButtonProps) {
  const { classes, ids } = closeButton()
  const common = useMessages(COMMON_TEXTS)
  return (
    <button
      ref={ref}
      type="button"
      aria-label={common.close}
      className={classes.base()}
      data-testid={ids.base}
      onClick={onClick}
    >
      <Icon icon={closeIcon} />
    </button>
  )
}
