import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { ButtonSize, ButtonVariant } from '@apc/shared/button'
import type { IconShape } from '@apc/shared/icons'
import { Icon } from './Icon.tsx'

// Actions in the theme's look: pill shape, display face in uppercase with the style's tracking. Hover and
// press only apply while enabled; focus-visible draws the theme's ring; loading blocks presses and says so.
// Tailwind only builds classes it finds written out, hence the literal class maps below.

const BASE =
  'relative inline-flex items-center justify-center gap-2 rounded-pill border outline-none ' +
  'transition-[transform,background-color,color,border-color,box-shadow] enabled:active:translate-y-px ' +
  'enabled:cursor-pointer focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-50'
const FRAMED = 'font-display font-semibold uppercase tracking-display'
const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'px-6 py-3 text-sm',
  sm: 'px-4 py-2 text-xs',
}
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: `${FRAMED} border-transparent bg-accent text-on-accent shadow-glow enabled:hover:bg-[color-mix(in_srgb,var(--accent)_86%,var(--text))]`,
  secondary: `${FRAMED} border-hairline text-text enabled:hover:border-accent enabled:hover:text-accent`,
  ghost: `${FRAMED} border-transparent text-text enabled:hover:bg-panel-raised`,
  link: 'border-transparent font-body text-text-muted underline underline-offset-4 enabled:hover:text-accent',
  danger: `${FRAMED} border-transparent bg-danger text-on-danger enabled:hover:bg-[color-mix(in_srgb,var(--danger)_86%,var(--text))]`,
}

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
  const sizeClasses = variant === 'link' ? (size === 'sm' ? 'text-xs' : 'text-sm') : SIZE_CLASSES[size]
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[BASE, sizeClasses, VARIANT_CLASSES[variant], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading ? (
        <span
          data-testid="button-spinner"
          aria-hidden="true"
          className="size-[1em] animate-spin rounded-pill border-2 border-current border-r-transparent"
        />
      ) : (
        icon && <Icon icon={icon} size={variant === 'link' ? 14 : 16} />
      )}
      {children}
    </button>
  )
}
