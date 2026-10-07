import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { capitalizeFirst, findOption, matchingOptions } from '@apc/shared/items'
import { chevronIcon } from '@apc/shared/icons'
import {
  FIELD_BORDER_CLASSES,
  FIELD_BUTTON_CLASSES,
  FIELD_FRAME_CLASSES,
  FIELD_INPUT_CLASSES,
  SELECT_LIST_CLASSES,
  SELECT_OPTION_CLASSES,
} from './fieldStyles.ts'
import { Icon } from './Icon.tsx'
import { Label, Text } from './Typography.tsx'

// A text field with a list of options that filters as the user types, ignoring case and accents, and that
// lets them create a new option without leaving the field: when the text names no option, the list ends with
// "+ Criar <noun> “<text>”". The chevron opens the full list. It is an editable combobox (WAI-ARIA): Up/Down
// move through the list, Enter picks, Escape closes only the list, not a dialog around it. On blur, a text
// that names an option takes that option's spelling, and any other text starts with a capital letter. It looks like the TextField, with its error and hint,
// and its list is the Select's, showing at most five options.

type Entry = { kind: 'option'; value: string } | { kind: 'create'; value: string }
type ComboboxProps = {
  label: string
  /** The text in the field. */
  value: string
  onValueChange: (value: string) => void
  options: readonly string[]
  /** Creates a new option, called with the typed text starting with a capital letter; the field then holds it. */
  onCreate: (value: string) => void
  /** What an option is, for the create row, e.g. "categoria" in "+ Criar categoria “Freios”". */
  noun: string
  /** Accessible name of the chevron, e.g. "Mostrar categorias". */
  toggleLabel: string
  /** Shown in the list when there are no options at all, e.g. "Nenhuma categoria cadastrada". */
  emptyLabel: string
  placeholder?: string
  /** Hint shown under the field while there is no error. */
  helper?: string
  /** Error shown under the field in the danger color; marks the field invalid. */
  error?: string
  disabled?: boolean
}

export function Combobox({
  label,
  value,
  onValueChange,
  options,
  onCreate,
  noun,
  toggleLabel,
  emptyLabel,
  placeholder,
  helper,
  error,
  disabled,
}: ComboboxProps) {
  const inputId = useId()
  const listId = `${inputId}-list`
  const noteId = `${inputId}-note`
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [active, setActive] = useState(-1)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const typed = value.trim().replace(/\s+/g, ' ')
  const current = findOption(options, value)
  const entries: Entry[] = [
    ...(showAll ? options : matchingOptions(options, value)).map((option) => ({ kind: 'option' as const, value: option })),
    ...(typed && !current ? [{ kind: 'create' as const, value: capitalizeFirst(typed) }] : []),
  ]
  const note = error ?? helper

  /** Opens the list on its first entry, the full list when the chevron asks for it, or closes it. */
  const show = (next: boolean, all = false) => {
    setOpen(next)
    setShowAll(next && all)
    setActive(next ? 0 : -1)
  }

  /** Highlights an entry and scrolls it into view, as the keyboard moves through the list. */
  const highlight = (index: number) => {
    setActive(index)
    list.current?.children[index]?.scrollIntoView({ block: 'nearest' })
  }

  /** Picks an entry: an option fills the field, the create row creates the option first; the list closes. */
  const pick = (entry: Entry) => {
    if (entry.kind === 'create') {
      onCreate(entry.value)
    }
    onValueChange(entry.value)
    show(false)
  }

  /** Moves through the list and picks with the keyboard; Escape closes only the list. */
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        show(true)
        return
      }
      if (entries.length > 0) {
        highlight((active + (event.key === 'ArrowDown' ? 1 : entries.length - 1)) % entries.length)
      }
    } else if (event.key === 'Enter' && open && entries[active]) {
      event.preventDefault()
      pick(entries[active])
    } else if (event.key === 'Escape' && open) {
      // Close only the list: no dialog around it should close as well.
      event.preventDefault()
      event.stopPropagation()
      show(false)
    }
  }

  return (
    <div className={`grid gap-1.5 ${disabled ? 'opacity-50' : ''}`}>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <div className={`${FIELD_FRAME_CLASSES} ${error ? FIELD_BORDER_CLASSES.error : FIELD_BORDER_CLASSES.idle}`}>
          <input
            ref={input}
            id={inputId}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && entries[active] ? `${listId}-${active}` : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={note ? noteId : undefined}
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            className={FIELD_INPUT_CLASSES}
            onFocus={() => show(true)}
            onChange={(event) => {
              onValueChange(event.target.value)
              show(true)
            }}
            onBlur={() => {
              show(false)
              const written = current ?? (typed ? capitalizeFirst(typed) : value)
              if (written !== value) {
                onValueChange(written)
              }
            }}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={toggleLabel}
            disabled={disabled}
            className={FIELD_BUTTON_CLASSES}
            // Keep the focus in the field, so the list stays tied to it.
            onMouseDown={(event) => {
              event.preventDefault()
              if (open) {
                show(false)
              } else {
                input.current?.focus()
                show(true, true)
              }
            }}
          >
            <Icon icon={chevronIcon} size={12} className={`transition-transform ${open ? '-rotate-90' : 'rotate-90'}`} />
          </button>
        </div>
        {open && (
          <ul ref={list} id={listId} role="listbox" aria-label={label} className={SELECT_LIST_CLASSES}>
            {entries.length === 0 && (
              <li role="presentation" className="flex h-9 items-center px-2.5 font-body text-sm text-text-muted">
                {emptyLabel}
              </li>
            )}
            {entries.map((entry, index) => (
              <li
                key={`${entry.kind}-${entry.value}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={entry.kind === 'option' && entry.value === current}
                data-active={index === active || undefined}
                className={[
                  SELECT_OPTION_CLASSES,
                  entry.kind === 'create' ? 'font-semibold text-accent!' : '',
                  // A hairline sets the create row apart from the options above it.
                  entry.kind === 'create' && index > 0 ? 'border-t border-hairline-soft' : '',
                ].join(' ')}
                // Keep the focus in the field while picking with the mouse.
                onMouseDown={(event) => {
                  event.preventDefault()
                  pick(entry)
                }}
              >
                {entry.kind === 'create' ? `+ Criar ${noun} “${entry.value}”` : entry.value}
              </li>
            ))}
          </ul>
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
