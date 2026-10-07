import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { activeFilterCount, clearedFilters, type FilterValues } from '@apc/shared/filters'
import { filterIcon } from '@apc/shared/icons'
import { Button } from './Button.tsx'
import { FilterChipGroup } from './FilterChip.tsx'
import { Icon } from './Icon.tsx'
import { Panel } from './Panel.tsx'
import { Select } from './Select.tsx'
import { Label } from './Typography.tsx'

// The detailed filters of a list: a button that opens a panel with one row per filter. A row holds a
// multiple-choice Select, or toggle chips split into labeled groups for small fixed sets of values; a row
// with any value chosen lights up. Nothing changes until Apply; Clear resets every row and applies right
// away; Escape or a click outside closes the panel without applying. The button counts the filters on. Rows may
// depend on what is chosen in the panel, e.g. the vehicle models of the chosen brands: a value a row stops
// offering leaves the choice.

const TRIGGER =
  'inline-flex cursor-pointer items-center gap-2 rounded-pill border px-4 py-2 font-display text-xs font-semibold ' +
  'uppercase tracking-display outline-none transition-[background-color,color,border-color,box-shadow] ' +
  'focus-visible:shadow-ring'
const TRIGGER_STATE = {
  idle: 'border-hairline text-text hover:border-accent hover:text-accent',
  active: 'border-accent bg-accent-soft text-accent',
}

type ChipsRow = {
  label: string
  /** Chip groups sharing the row, each its own filter, e.g. position and side. */
  groups: { key: string; label: string; options: { value: string; label: string; title?: string }[] }[]
}
type FilterMenuProps = {
  /** Accessible name of the panel, e.g. "Filtros do estoque". */
  label: string
  /** Heading at the top of the panel, e.g. "Filtrar estoque". */
  title: string
  /** The rows, or the rows for what is chosen in the panel so far. */
  rows: Row[] | ((draft: FilterValues) => Row[])
  /** Applied values per filter key. */
  values: FilterValues
  onApply: (values: FilterValues) => void
}
type Row = SelectRow | ChipsRow
type SelectRow = {
  key: string
  label: string
  options: { value: string; label: string }[]
  /** Label of the option that clears the row, e.g. "Todas". */
  allLabel: string
}

/**
 * Drops from each Select row the values it no longer offers, once the rest of the choice changed what it lists.
 * @param draft Values chosen in the panel.
 * @param rows The rows for those values.
 * @returns The values each row still offers.
 */
function offered(draft: FilterValues, rows: Row[]): FilterValues {
  const kept = { ...draft }
  for (const row of rows) {
    if (!('groups' in row) && kept[row.key]) {
      kept[row.key] = kept[row.key].filter((value) => row.options.some((option) => option.value === value))
    }
  }
  return kept
}

/**
 * Lists the filter keys a row sets: its own key, or one per chip group.
 * @param row A Select or chips row.
 * @returns The row's filter keys.
 */
function rowKeys(row: Row): string[] {
  return 'groups' in row ? row.groups.map((group) => group.key) : [row.key]
}

export function FilterMenu({ label, title, rows: rowsFor, values, onApply }: FilterMenuProps) {
  const baseId = useId()
  const panelId = `${baseId}-panel`
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(values)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const count = activeFilterCount(values)
  const rows = typeof rowsFor === 'function' ? rowsFor(draft) : rowsFor

  /** Opens the panel on the applied values, or closes it and drops what was not applied. */
  const show = (next: boolean) => {
    setDraft(values)
    setOpen(next)
  }

  /** Applies values, closes the panel and puts the focus back on the button. */
  const apply = (next: FilterValues) => {
    onApply(next)
    setOpen(false)
    trigger.current?.focus()
  }

  /** Changes one filter in the panel, without applying it, dropping what the other rows stop offering. */
  const change = (key: string, chosen: string[]) =>
    setDraft((prev) => {
      const next = { ...prev, [key]: chosen }
      return typeof rowsFor === 'function' ? offered(next, rowsFor(next)) : next
    })

  /** Closes the panel without applying on Escape (a Select closes only its own list first). */
  const onKeyDown = (event: KeyboardEvent) => {
    if (open && event.key === 'Escape') {
      show(false)
      trigger.current?.focus()
    }
  }

  // Move the focus into the panel when it opens.
  useEffect(() => {
    if (open) {
      root.current?.querySelector<HTMLElement>('[role="dialog"] button')?.focus()
    }
  }, [open])

  // A press anywhere outside the menu closes the panel without applying.
  useEffect(() => {
    if (!open) {
      return
    }
    const closeOutside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [open])

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={count ? `Filtros, ${count} ${count === 1 ? 'ativo' : 'ativos'}` : 'Filtros'}
        className={`${TRIGGER} ${count ? TRIGGER_STATE.active : TRIGGER_STATE.idle}`}
        onClick={() => show(!open)}
      >
        <Icon icon={filterIcon} size={13} />
        Filtros
        {count > 0 && (
          <span className="min-w-4.5 rounded-pill bg-accent px-1.5 text-center font-mono text-xs font-medium tracking-normal text-on-accent">
            {count}
          </span>
        )}
      </button>
      {open && (
        <Panel
          id={panelId}
          role="dialog"
          aria-label={label}
          className="absolute left-0 top-full z-20 mt-1.5 grid w-[min(calc(var(--spacing)*90),calc(100vw-var(--spacing)*20))] gap-2 shadow-pop"
        >
          <Label>{title}</Label>
          {rows.map((row) => {
            const on = rowKeys(row).some((key) => (draft[key] ?? []).length > 0)
            const rowId = `${baseId}-${rowKeys(row).join('-')}`
            return (
              <div
                key={rowId}
                data-on={on || undefined}
                className="grid grid-cols-[calc(var(--spacing)*28)_minmax(0,1fr)] items-center gap-3"
              >
                {'groups' in row ? (
                  <>
                    <Label tone={on ? 'accent' : 'muted'}>{row.label}</Label>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      {row.groups.map((group) => (
                        <FilterChipGroup
                          key={group.key}
                          multiple
                          size="sm"
                          label={group.label}
                          options={group.options}
                          value={draft[group.key] ?? []}
                          onValueChange={(chosen) => change(group.key, chosen)}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <Label htmlFor={rowId} tone={on ? 'accent' : 'muted'}>
                      {row.label}
                    </Label>
                    <Select
                      id={rowId}
                      multiple
                      allLabel={row.allLabel}
                      options={row.options}
                      value={draft[row.key] ?? []}
                      onValueChange={(chosen) => change(row.key, chosen)}
                    />
                  </>
                )}
              </div>
            )
          })}
          <div className="mt-0.5 flex justify-end gap-2 border-t border-hairline-soft pt-2">
            <Button size="sm" variant="secondary" onClick={() => apply(clearedFilters(draft))}>
              Limpar
            </Button>
            <Button size="sm" onClick={() => apply(draft)}>
              Aplicar
            </Button>
          </div>
        </Panel>
      )}
    </div>
  )
}

export function ClearFilters({ active, onClear }: { active: boolean; onClear: () => void }) {
  if (!active) {
    return null
  }
  return (
    <Button variant="link" onClick={onClear}>
      Limpar filtros
    </Button>
  )
}
