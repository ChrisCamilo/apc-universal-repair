import { useId, useRef, useState, type InputHTMLAttributes } from 'react'
import { FIELD_KINDS, type FieldKind } from '@apc/shared/field'
import { closeIcon, eyeIcon, searchIcon, type IconShape } from '@apc/shared/icons'
import { Icon } from './Icon.tsx'
import { Label, Text } from './Typography.tsx'

// The pill-shaped inputs of the login and the dashboard searches. The frame lights up in the accent with
// the theme's ring while focused, and in the danger color when there is an error. Each field kind sets
// the input type, autofill hint and keyboard (see @apc/shared/field).

const FRAME =
  'flex min-w-0 items-center gap-2 rounded-pill border bg-panel px-4 py-2.5 transition-[border-color,box-shadow] ' +
  'focus-within:shadow-ring'
const FRAME_BORDER = {
  idle: 'border-hairline focus-within:border-accent',
  error: 'border-danger',
}
const INPUT =
  'min-w-0 flex-1 bg-transparent font-body text-base text-text outline-none placeholder:text-text-muted ' +
  'disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:appearance-none'
const TRAILING_BUTTON =
  'grid shrink-0 place-items-center rounded-pill text-text-muted outline-none transition-colors ' +
  'enabled:cursor-pointer enabled:hover:text-text focus-visible:shadow-ring disabled:cursor-not-allowed'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'size' | 'children'>
type SearchFieldProps = InputProps & {
  /** Accessible name; the search shows no visible label, so it is also a good placeholder. */
  label: string
  value: string
  onValueChange: (value: string) => void
}
type TextFieldProps = InputProps & {
  label: string
  value: string
  onValueChange: (value: string) => void
  /** Kind of data, which sets the input type, autofill and keyboard; "password" adds the reveal toggle. */
  kind?: FieldKind
  /** Leading icon from @apc/shared/icons. */
  icon?: IconShape[]
  /** Hint shown under the field while there is no error. */
  helper?: string
  /** Error shown under the field in the danger color; marks the field invalid. */
  error?: string
}

export function TextField({
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
  const isPassword = kind === 'password'
  const note = error ?? helper

  return (
    <div className={`grid gap-1.5 ${disabled ? 'opacity-50' : ''}`}>
      <Label htmlFor={inputId}>{label}</Label>
      <div className={`${FRAME} ${error ? FRAME_BORDER.error : FRAME_BORDER.idle}`}>
        {icon && (
          <span className="flex text-text-muted">
            <Icon icon={icon} />
          </span>
        )}
        <input
          id={inputId}
          type={isPassword && revealed ? 'text' : spec.type}
          autoComplete={spec.autoComplete}
          inputMode={spec.inputMode}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={INPUT}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className={TRAILING_BUTTON}
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
        <p id={noteId} role="alert" className="m-0 font-body text-sm text-danger">
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
  /** Empties the search and puts the cursor back in it. */
  const clear = () => {
    onValueChange('')
    input.current?.focus()
  }

  return (
    <div className={`${FRAME} ${FRAME_BORDER.idle} ${disabled ? 'opacity-50' : ''}`}>
      <span className="flex text-text-muted">
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
        className={INPUT}
        {...rest}
      />
      {value && !disabled && (
        <button type="button" className={TRAILING_BUTTON} aria-label="Limpar busca" onClick={clear}>
          <Icon icon={closeIcon} />
        </button>
      )}
    </div>
  )
}
