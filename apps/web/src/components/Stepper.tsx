import { useId } from 'react'
import { ICON_SIZES, minusIcon, plusIcon } from '@apc/shared/icons'
import { Icon } from './Icon.tsx'
import { stepper } from './Stepper.styles.ts'
import { Label, Text } from './Typography.tsx'

// A whole number between a − and a +, such as an item's minimum stock on a phone (see Stepper.styles.ts): each press
// takes one away or adds one, from 0 up to the limit, the − locked at 0 and the + at the limit, and the field between
// them still takes what is typed, which the owner reads. The buttons and the field are a group named by the label.
// Like the TextField, the hint or the error goes under it.

type StepperProps = {
  label: string
  /** The number as typed; empty counts as 0. */
  value: string
  onValueChange: (value: string) => void
  /** Most the + reaches, e.g. MAX_QUANTITY. */
  max: number
  /** Hint shown under the field while there is no error. */
  helper?: string
  /** Error shown under the field in the danger color; marks the field invalid. */
  error?: string
}

export function Stepper({ label, value, onValueChange, max, helper, error }: StepperProps) {
  const labelId = useId()
  const inputId = useId()
  const noteId = `${inputId}-note`
  const note = error ?? helper
  const count = Number(value) || 0
  const { classes, ids } = stepper({ error: Boolean(error) })

  return (
    <div className={classes.base()} data-testid={ids.base}>
      <Label id={labelId} htmlFor={inputId}>
        {label}
      </Label>
      <div role="group" aria-labelledby={labelId} className={classes.row()} data-testid={ids.row}>
        <button
          type="button"
          aria-label="Diminuir"
          disabled={count <= 0}
          className={classes.button()}
          data-testid={ids.button}
          onClick={() => onValueChange(String(count - 1))}
        >
          <Icon icon={minusIcon} size={ICON_SIZES.prominent} />
        </button>
        <input
          id={inputId}
          inputMode="numeric"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={classes.input()}
          data-testid={ids.input}
        />
        <button
          type="button"
          aria-label="Aumentar"
          disabled={count >= max}
          className={classes.button()}
          data-testid={ids.button}
          onClick={() => onValueChange(String(count + 1))}
        >
          <Icon icon={plusIcon} size={ICON_SIZES.prominent} />
        </button>
      </div>
      {error ? (
        <p id={noteId} role="alert" className={classes.error()} data-testid={ids.error}>
          {error}
        </p>
      ) : (
        helper && (
          <Text id={noteId} size="sm" tone="muted">
            {helper}
          </Text>
        )
      )}
    </div>
  )
}
