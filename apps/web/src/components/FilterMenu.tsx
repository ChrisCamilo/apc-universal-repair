import { useEffect, useEffectEvent, useId, useRef, useState, type KeyboardEvent } from 'react'
import { activeFilterCount, clearedFilters, type FilterValues } from '@apc/shared/filters'
import { filterIcon, ICON_SIZES } from '@apc/shared/icons'
import { Button } from './Button.tsx'
import { FilterChipGroup } from './FilterChip.tsx'
import { filterMenu } from './FilterMenu.styles.ts'
import { Icon } from './Icon.tsx'
import { Panel } from './Panel.tsx'
import { Select } from './Select.tsx'
import { Label } from './Typography.tsx'

// The detailed filters of a list: a button that opens a panel with one row per filter. A row holds a
// multiple-choice Select, or toggle chips split into labeled groups for small fixed sets of values; a row
// with any value chosen lights up. Nothing changes until Apply; Clear resets every row and applies right
// away; Escape or a click outside closes the panel without applying. The button counts the filters on. Rows may
// depend on what is chosen in the panel, e.g. the vehicle models of the chosen brands: a value a row stops
// offering leaves the choice. An owner may also open and close the panel itself, as the Inventory tutorial does.

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
  /** Whether the panel is open, for an owner that opens or closes it itself, e.g. a tutorial; it follows its button otherwise. */
  open?: boolean
  /** Called when the panel opens or closes. */
  onOpenChange?: (open: boolean) => void
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

export function FilterMenu({ label, title, rows: rowsFor, values, onApply, open: openProp, onOpenChange }: FilterMenuProps) {
  const baseId = useId()
  const panelId = `${baseId}-panel`
  const [ownOpen, setOwnOpen] = useState(false)
  const open = openProp ?? ownOpen
  const [draft, setDraft] = useState(values)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const count = activeFilterCount(values)
  const { classes, ids } = filterMenu({ active: count > 0 })
  const rows = typeof rowsFor === 'function' ? rowsFor(draft) : rowsFor

  /** Opens or closes the panel, telling the owner. */
  const setOpen = (next: boolean) => {
    setOwnOpen(next)
    onOpenChange?.(next)
  }

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
  const closeOutside = useEffectEvent((event: MouseEvent) => {
    if (!root.current?.contains(event.target as Node)) {
      setOpen(false)
    }
  })
  useEffect(() => {
    if (!open) {
      return
    }
    const onPress = (event: MouseEvent) => closeOutside(event)
    document.addEventListener('mousedown', onPress)
    return () => document.removeEventListener('mousedown', onPress)
  }, [open])

  return (
    <div ref={root} className={classes.base()} data-testid={ids.base} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={count ? `Filtros, ${count} ${count === 1 ? 'ativo' : 'ativos'}` : 'Filtros'}
        className={classes.trigger()}
        data-testid={ids.trigger}
        onClick={() => show(!open)}
      >
        <Icon icon={filterIcon} size={ICON_SIZES.compact} />
        Filtros
        {count > 0 && (
          <span className={classes.count()} data-testid={ids.count}>
            {count}
          </span>
        )}
      </button>
      {open && (
        <Panel
          id={panelId}
          role="dialog"
          aria-label={label}
          className={classes.panel()}
        >
          <Label>{title}</Label>
          {rows.map((row) => {
            const on = rowKeys(row).some((key) => (draft[key] ?? []).length > 0)
            const rowId = `${baseId}-${rowKeys(row).join('-')}`
            return (
              <div
                key={rowId}
                data-on={on || undefined}
                className={classes.row()}
                data-testid={ids.row}
              >
                {'groups' in row ? (
                  <>
                    <Label tone={on ? 'accent' : 'muted'}>{row.label}</Label>
                    <div className={classes.chips()} data-testid={ids.chips}>
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
          <div className={classes.actions()} data-testid={ids.actions}>
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
