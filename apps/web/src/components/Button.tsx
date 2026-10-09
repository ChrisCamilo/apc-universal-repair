import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { ButtonSize, ButtonVariant } from '@apc/shared/button'
import { ICON_SIZES, type IconShape } from '@apc/shared/icons'
import { button } from './Button.styles.ts'
import { Icon } from './Icon.tsx'
import { Spinner } from './Spinner.tsx'

// Actions in the theme's look (see Button.styles.ts): the same variants and sizes as mobile. Loading blocks presses
// and says so.

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Leading icon from @apc/shared/icons. */
  icon?: IconShape[]
  /** Shows a spinner, blocks presses and marks the button busy, e.g. while the login is sent. */
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const { classes, ids } = button({ variant, size })
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes.base({ class: className })}
      data-testid={ids.base}
      {...rest}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        icon && <Icon icon={icon} size={variant === 'link' ? ICON_SIZES.inline : ICON_SIZES.body} />
      )}
      {children}
    </button>
  )
}
