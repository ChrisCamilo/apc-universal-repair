import { backIcon, ICON_SIZES } from '@apc/shared/icons'
import { backButton } from './BackButton.styles.ts'
import { Icon } from './Icon.tsx'

// The round ← at the left of a phone screen's title, which goes back to the screen before (see BackButton.styles.ts),
// named for where it goes, e.g. "Voltar ao login".

type BackButtonProps = {
  /** Says where it goes back to, e.g. "Voltar ao login". */
  label: string
  onClick: () => void
}

export function BackButton({ label, onClick }: BackButtonProps) {
  const { classes, ids } = backButton()
  return (
    <button type="button" aria-label={label} className={classes.base()} data-testid={ids.base} onClick={onClick}>
      <Icon icon={backIcon} size={ICON_SIZES.prominent} />
    </button>
  )
}
