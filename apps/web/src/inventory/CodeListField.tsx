import { useId, useState } from 'react'
import { closeIcon, ICON_SIZES } from '@apc/shared/icons'
import { addCodes, codesInput, splitCodes } from '@apc/shared/item-form'
import { Icon } from '../components/Icon.tsx'
import { Label, Text } from '../components/Typography.tsx'
import { codeListField } from './CodeListField.styles.ts'

// A field of codes typed as chips, such as an item's original codes: a code typed joins the list as a chip with Enter,
// a comma or a semicolon, or on leaving the field, and several pasted at once all join it, one a line too (read from
// the paste, since the field itself is one line); a code the list already has is left out (see addCodes). Each chip's × takes its code out, and so does Backspace in the empty field, the last
// one. A code with a message, such as one another item uses, is shown in the danger color, its message under the
// field, read out with it.

type CodeListFieldProps = {
  label: string
  codes: readonly string[]
  onCodesChange: (codes: string[]) => void
  /** Each code's message, in the codes' order; a code without one is fine. */
  messages?: readonly (string | undefined)[]
  /** Hint shown under the field while no code has a message. */
  helper?: string
}

export function CodeListField({ label, codes, onCodesChange, messages = [], helper }: CodeListFieldProps) {
  const inputId = useId()
  const [text, setText] = useState('')
  const { classes, ids } = codeListField()
  const notes = codes.flatMap((code, index) => (messages[index] ? [{ code, message: messages[index], id: `${inputId}-${index}` }] : []))

  /** Adds what is typed as a code, and empties the field. */
  const commit = () => {
    if (text.trim()) {
      onCodesChange(addCodes(codes, [text]))
    }
    setText('')
  }

  /** Takes a code out of the list. */
  const remove = (index: number) => onCodesChange(codes.filter((_, at) => at !== index))

  return (
    <div className={classes.base()} data-testid={ids.base}>
      <Label htmlFor={inputId}>{label}</Label>
      <div className={classes.frame()} data-testid={ids.frame}>
        <ul className={classes.chips()} data-testid={ids.chips}>
          {codes.map((code, index) => (
            <li
              key={code}
              className={classes.chip()}
              data-testid={ids.chip}
              data-invalid={messages[index] ? true : undefined}
              aria-describedby={messages[index] ? `${inputId}-${index}` : undefined}
            >
              <span className={classes.code()} data-testid={ids.code}>
                {code}
              </span>
              <button type="button" className={classes.remove()} data-testid={ids.remove} aria-label={`Remover ${code}`} onClick={() => remove(index)}>
                <Icon icon={closeIcon} size={ICON_SIZES.mark} />
              </button>
            </li>
          ))}
        </ul>
        <input
          id={inputId}
          value={text}
          onChange={(event) => {
            const read = codesInput(codes, text, event.target.value)
            if (read.codes.length !== codes.length) {
              onCodesChange(read.codes)
            }
            setText(read.text)
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData('text')
            if (/[\r\n]/.test(pasted)) {
              event.preventDefault()
              onCodesChange(addCodes(codes, splitCodes(text + pasted)))
              setText('')
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Backspace' && !text && codes.length > 0) {
              remove(codes.length - 1)
            }
          }}
          onBlur={commit}
          aria-invalid={notes.length > 0 ? true : undefined}
          className={classes.input()}
          data-testid={ids.input}
        />
      </div>
      {notes.length > 0 ? (
        <ul role="alert" className={classes.messages()} data-testid={ids.messages}>
          {notes.map((note) => (
            <li key={note.code} id={note.id} className={classes.message()} data-testid={ids.message}>
              {`${note.code}: ${note.message}`}
            </li>
          ))}
        </ul>
      ) : (
        helper && (
          <Text size="sm" tone="muted">
            {helper}
          </Text>
        )
      )}
    </div>
  )
}
