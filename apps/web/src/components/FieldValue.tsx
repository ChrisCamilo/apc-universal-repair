import { useId } from 'react'
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
  return (
    <div role="group" aria-labelledby={labelId} className="grid content-start gap-1.5">
      <Label id={labelId}>{label}</Label>
      <p
        title={value}
        className="m-0 min-w-0 truncate rounded-pill border border-hairline-soft px-4 py-2.5 font-body text-base text-text"
      >
        {value}
      </p>
    </div>
  )
}
