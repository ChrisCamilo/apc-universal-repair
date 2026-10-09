import { useId, useRef, useState, type InputHTMLAttributes, type Ref } from 'react'
import { FIELD_KINDS, type FieldKind } from '@apc/shared/field'
import { closeIcon, eyeIcon, searchIcon, type IconShape } from '@apc/shared/icons'
import { Icon } from './Icon.tsx'
import { searchField, textField } from './TextField.styles.ts'
import { Label, Text } from './Typography.tsx'

// The pill-shaped inputs of the login and the dashboard searches (see TextField.styles.ts). Each field kind sets the
// input type, autofill hint and keyboard (see @apc/shared/field).

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'size' | 'children'>
type SearchFieldProps = InputProps & {
  /** Accessible name; the search shows no visible label, so it is also a good placeholder. */
  label: string
  value: string
  onValueChange: (value: string) => void
}
type TextFieldProps = InputProps & {
  /** The input itself, e.g. to focus it. */
  ref?: Ref<HTMLInputElement>
  label: string
  value: string
  onValueChange: (value: string) => void
  /** Kind of data, which sets the input type, autofill and keyboard; a password kind adds the reveal toggle. */
  kind?: FieldKind
  /** Leading icon from @apc/shared/icons. */
  icon?: IconShape[]
  /** Hint shown under the field while there is no error. */
  helper?: string
  /** Error shown under the field in the danger color; marks the field invalid. */
  error?: string
}

export function TextField({
  ref,
  label,
  value,
  onValueChange,
  kind = 'text',
  icon,
  helper,
  error,
  id,
  disabled,
  ...rest
}: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const noteId = `${inputId}-note`
  const [revealed, setRevealed] = useState(false)
  const spec = FIELD_KINDS[kind]
  const isPassword = spec.type === 'password'
  const note = error ?? helper
  const { classes, ids } = textField({ disabled: Boolean(disabled), error: Boolean(error) })

  return (
    <div className={classes.base()} data-testid={ids.base}>
      <Label htmlFor={inputId}>{label}</Label>
      <div className={classes.frame()} data-testid={ids.frame}>
        {icon && (
          <span className={classes.icon()} data-testid={ids.icon}>
            <Icon icon={icon} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={isPassword && revealed ? 'text' : spec.type}
          autoComplete={spec.autoComplete}
          inputMode={spec.inputMode}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={classes.input()}
          data-testid={ids.input}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className={classes.toggle()}
            data-testid={ids.toggle}
            aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={revealed}
            disabled={disabled}
            onClick={() => setRevealed((shown) => !shown)}
          >
            <Icon icon={eyeIcon} />
          </button>
        )}
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

export function SearchField({ label, value, onValueChange, disabled, onKeyDown, ...rest }: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null)
  const spec = FIELD_KINDS.search
  const { classes, ids } = searchField({ disabled: Boolean(disabled) })

  /** Empties the search and puts the cursor back in it. */
  const clear = () => {
    onValueChange('')
    input.current?.focus()
  }

  return (
    <div className={classes.base()} data-testid={ids.base}>
      <span className={classes.icon()} data-testid={ids.icon}>
        <Icon icon={searchIcon} />
      </span>
      <input
        ref={input}
        type={spec.type}
        autoComplete={spec.autoComplete}
        inputMode={spec.inputMode}
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault()
            clear()
          }
          onKeyDown?.(event)
        }}
        disabled={disabled}
        className={classes.input()}
        data-testid={ids.input}
        {...rest}
      />
      {value && !disabled && (
        <button type="button" className={classes.clear()} data-testid={ids.clear} aria-label="Limpar busca" onClick={clear}>
          <Icon icon={closeIcon} />
        </button>
      )}
    </div>
  )
}
