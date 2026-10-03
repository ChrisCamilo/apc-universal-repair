// A ring with a gap, turning while something loads, in the color of the text around it. "sm" follows the
// text it sits in, e.g. inside a button; "md" stands on its own, e.g. over a photo or a panel. With reduced
// motion it doesn't turn but fades softly in and out. With a label it is announced as a status; without
// one it is decorative and whatever holds it says it is busy.

const SIZE_CLASSES = { sm: 'size-[1em]', md: 'size-6' }

type SpinnerProps = {
  size?: keyof typeof SIZE_CLASSES
  /** Announced to screen readers, e.g. "Carregando estoque"; leave it out when the surroundings already say so. */
  label?: string
  className?: string
  'data-testid'?: string
}

export function Spinner({ size = 'md', label, className, ...rest }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={[
        'inline-block shrink-0 rounded-pill border-2 border-current border-r-transparent motion-safe:animate-spin motion-reduce:animate-pulse',
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  )
}
