import type { Ref } from 'react'
import { closeIcon } from '@apc/shared/icons'
import { Icon } from './Icon.tsx'

// The round × that closes a window, such as the photo viewer or a dialog: a hairline ring around the icon that
// turns to the accent on hover, named "Fechar".

type CloseButtonProps = {
  onClick: () => void
  ref?: Ref<HTMLButtonElement>
}

export function CloseButton({ onClick, ref }: CloseButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Fechar"
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-pill border border-hairline-soft text-text outline-none transition-colors hover:border-accent hover:text-accent focus-visible:shadow-ring"
      onClick={onClick}
    >
      <Icon icon={closeIcon} />
    </button>
  )
}
