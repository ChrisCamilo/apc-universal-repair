import { useId } from 'react'
import { fieldValue } from './FieldValue.styles.ts'
import { Label } from './Typography.tsx'

// A field's value shown for reading, such as the item details: the label on top and the value in a frame the size
// and shape of a TextField, so a details view keeps its form's layout. The frame has the soft hairline and no fill,
// so it reads as text and not as a disabled input. A value too long for the frame ends in an ellipsis and shows in
// full as a tooltip. The label names the value for screen readers.

type FieldValueProps = {
  label: string
  value: string
}

export function FieldValue({ label, value }: FieldValueProps) {
  const labelId = useId()
  const { classes, ids } = fieldValue()
  return (
    <div role="group" aria-labelledby={labelId} className={classes.base()} data-testid={ids.base}>
      <Label id={labelId}>{label}</Label>
      <p title={value} className={classes.value()} data-testid={ids.value}>
        {value}
      </p>
    </div>
  )
}
