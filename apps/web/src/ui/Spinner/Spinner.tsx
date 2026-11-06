import { spinner } from './Spinner.styles.ts'

// A ring with a gap, turning while something loads, in the color of the text around it. "sm" follows the
// text it sits in, e.g. inside a button; "md" stands on its own, e.g. over a photo or a panel. With reduced
// motion it doesn't turn but fades softly in and out. With a label it is announced as a status; without
// one it is decorative and whatever holds it says it is busy.

type SpinnerProps = {
  size?: 'sm' | 'md'
  /** Announced to screen readers, e.g. "Carregando estoque"; leave it out when the surroundings already say so. */
  label?: string
  className?: string
}

export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  const { classes, ids } = spinner({ size })
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={classes.base({ class: className })}
      data-testid={ids.base}
    />
  )
}
