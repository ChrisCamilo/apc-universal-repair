import { useEffect, useId, useRef, useState } from 'react'
import { clearedFilters, offeredValues, selectionSummary, toggleValue, type FilterValues } from '@apc/shared/filters'
import { checkIcon, chevronIcon, ICON_SIZES, sortIcon } from '@apc/shared/icons'
import { sortFromValue, sortValue, type Sort } from '@apc/shared/table'
import { BackButton } from './BackButton.tsx'
import { BottomSheet } from './BottomSheet.tsx'
import { Button } from './Button.tsx'
import { filterSheet } from './FilterSheet.styles.ts'
import { Icon } from './Icon.tsx'
import { Segmented } from './Segmented.tsx'

// A list's filters and sort on a phone, in a bottom sheet (the Filtros mockup), in place of the desktop's Filtros
// menu and column headers. "Ordenar por" comes first, then a row per filter with what it has chosen ("Todas", "Freios",
// "Freios +2"), in the accent once something is; a row opens its options inside the sheet, under a ← back to the rows,
// "Todas" first, and a filter of a small fixed set of values, such as the position, is a segmented choice of one value
// in place. Rows may depend on what is chosen, e.g. the vehicle models of the chosen brands: a value a row stops
// offering leaves the choice. Nothing changes until "Ver n itens", which counts the items the choice would show as it
// changes; "Limpar" turns every filter and the sort off in the sheet, and Escape goes back from a list, then closes
// the sheet without applying, as a tap above it or a drag down does. SortSheet is the sort alone, for the toolbar's
// Ordenar: a pick sorts the list at once and closes it.

type Option = { value: string; label: string }
type FilterSheetProps = {
  open: boolean
  /** Called on a tap above the sheet, a drag down, or Escape on its rows; the owner closes it, dropping the choice. */
  onClose: () => void
  /** The rows for what is chosen in the sheet so far. */
  rows: (draft: FilterValues) => Row[]
  /** Applied values per filter key. */
  values: FilterValues
  /** The sort applied, or null. */
  sort: Sort | null
  /** The sorts to choose from, the one with no sort first, e.g. "Ordem de cadastro". */
  sortOptions: Option[]
  /** How many items the list would show with the values chosen in the sheet. */
  count: (draft: FilterValues) => number
  /** Applies the values and the sort chosen; the owner closes the sheet. */
  onApply: (values: FilterValues, sort: Sort | null) => void
}
/** A row of the sheet: a multiple choice opened as a list, or segmented choices sharing a heading, e.g. position and side. */
type Row =
  | { key: string; label: string; allLabel: string; options: Option[] }
  | { label: string; groups: { key: string; label: string; segments: Option[] }[] }
type SortSheetProps = {
  open: boolean
  onClose: () => void
  sort: Sort | null
  /** The sorts to choose from, the one with no sort first. */
  options: Option[]
  /** Sorts the list; the sheet then asks to close. */
  onSortChange: (sort: Sort | null) => void
}
/** What the sheet shows: its rows, or the options of the sort or of a filter. */
type View = { list: 'rows' } | { list: 'sort' } | { list: 'filter'; key: string }

export function FilterSheet({ open, onClose, rows: rowsFor, values, sort, sortOptions, count, onApply }: FilterSheetProps) {
  const { classes, ids } = filterSheet()
  const [draft, setDraft] = useState(values)
  const [sorted, setSorted] = useState(sortValue(sort))
  const [view, setView] = useState<View>({ list: 'rows' })
  // Each opening starts from what is applied, on the rows.
  const [openedFor, setOpenedFor] = useState(open)
  if (openedFor !== open) {
    setOpenedFor(open)
    if (open) {
      setDraft(values)
      setSorted(sortValue(sort))
      setView({ list: 'rows' })
    }
  }
  const content = useRef<HTMLDivElement>(null)
  // The row a list was opened from, which takes the focus back when the list closes.
  const openedFrom = useRef<string | null>(null)
  const rows = rowsFor(draft)
  const shown = count(draft)
  const filter = view.list === 'filter' ? rows.find((row) => 'key' in row && row.key === view.key) : undefined

  // Moving between the rows and a list, the focus goes to the list's ←, or back to the row it was opened from.
  useEffect(() => {
    const target = view.list === 'rows' ? openedFrom.current && `[data-row="${openedFrom.current}"]` : 'button'
    if (target) {
      content.current?.querySelector<HTMLElement>(target)?.focus()
    }
    if (view.list === 'rows') {
      openedFrom.current = null
    }
  }, [view])

  /** Opens a list from its row. */
  const openList = (next: View, row: string) => {
    openedFrom.current = row
    setView(next)
  }

  /** Changes one filter in the sheet, without applying it, dropping what the other rows stop offering. */
  const change = (key: string, chosen: string[]) =>
    setDraft((prev) => {
      const next = { ...prev, [key]: chosen }
      return offeredValues(next, rowsFor(next))
    })

  const back = () => setView({ list: 'rows' })
  const sortLabel = sortOptions.find((option) => option.value === sorted)?.label ?? ''

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      onBack={view.list === 'rows' ? undefined : back}
      title="Filtrar e ordenar"
      action={
        <button
          type="button"
          className={classes.clear()}
          data-testid={ids.clear}
          onClick={() => {
            setDraft(clearedFilters(draft))
            setSorted('')
          }}
        >
          Limpar
        </button>
      }
      footer={
        <Button className={classes.apply()} onClick={() => onApply(draft, sortFromValue(sorted))}>
          {`Ver ${shown} ${shown === 1 ? 'item' : 'itens'}`}
        </Button>
      }
    >
      <div ref={content} data-tour="filter-panel" className={classes.base()} data-testid={ids.base}>
        {view.list === 'sort' && (
          <OptionList
            label="Ordenar por"
            onBack={back}
            options={sortOptions}
            selected={(value) => value === sorted}
            onPick={(value) => {
              setSorted(value)
              back()
            }}
          />
        )}
        {filter && 'key' in filter && (
          <OptionList
            label={filter.label}
            onBack={back}
            multiple
            options={[{ value: '', label: filter.allLabel }, ...filter.options]}
            selected={(value) => (value ? (draft[filter.key] ?? []).includes(value) : (draft[filter.key] ?? []).length === 0)}
            onPick={(value) =>
              change(filter.key, value ? toggleValue(draft[filter.key] ?? [], value, filter.options.map((option) => option.value)) : [])
            }
          />
        )}
        {view.list === 'rows' && (
          <>
            <SheetRow
              id="sort"
              icon
              label="Ordenar por"
              value={sortLabel}
              chosen={sorted !== ''}
              onClick={() => openList({ list: 'sort' }, 'sort')}
            />
            <div aria-hidden="true" className={classes.strip()} data-testid={ids.strip} />
            {rows.map((row) => {
              if ('groups' in row) {
                return row.groups.map((group, index) => {
                  const chosen = draft[group.key] ?? []
                  return (
                    <div key={group.key} className={classes.segments({ first: index === 0 })} data-testid={ids.segments}>
                      <span aria-hidden="true" className={classes.segmentsLabel()} data-testid={ids.segmentsLabel}>
                        {group.label}
                      </span>
                      <Segmented
                        fill
                        label={group.label}
                        options={group.segments}
                        // A choice of several values, made on the desktop, matches no segment.
                        value={chosen.join()}
                        onValueChange={(value) => change(group.key, value ? [value] : [])}
                      />
                    </div>
                  )
                })
              }
              const chosen = (draft[row.key] ?? []).flatMap((value) => row.options.find((option) => option.value === value)?.label ?? [])
              return (
                <SheetRow
                  key={row.key}
                  id={row.key}
                  label={row.label}
                  value={selectionSummary(chosen, row.allLabel)}
                  chosen={chosen.length > 0}
                  onClick={() => openList({ list: 'filter', key: row.key }, row.key)}
                />
              )
            })}
          </>
        )}
      </div>
    </BottomSheet>
  )
}

export function SortSheet({ open, onClose, sort, options, onSortChange }: SortSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Ordenar">
      <OptionList
        label="Ordenar"
        options={options}
        selected={(value) => value === sortValue(sort)}
        onPick={(value) => {
          onSortChange(sortFromValue(value))
          onClose()
        }}
      />
    </BottomSheet>
  )
}

type SheetRowProps = {
  /** The filter key, or "sort", which takes the focus back when its list closes. */
  id: string
  label: string
  /** What it has chosen, e.g. "Todas" or "Freios +2". */
  value: string
  /** Whether something is chosen, which draws the value in the accent. */
  chosen: boolean
  /** Leads with the sort's icon. */
  icon?: boolean
  onClick: () => void
}

/** A row of the sheet: its label, what it has chosen and a chevron, opening its options. */
function SheetRow({ id, label, value, chosen, icon = false, onClick }: SheetRowProps) {
  const { classes, ids } = filterSheet({ chosen })
  return (
    <button type="button" data-row={id} className={classes.row()} data-testid={ids.row} onClick={onClick}>
      {icon && (
        <span aria-hidden="true" className={classes.icon()} data-testid={ids.icon}>
          <Icon icon={sortIcon} size={ICON_SIZES.thumbnail} />
        </span>
      )}
      <span className={classes.label()} data-testid={ids.label}>
        {label}
      </span>
      <span className={classes.value()} data-testid={ids.value}>
        {value}
      </span>
      <span aria-hidden="true" className={classes.icon()} data-testid={ids.icon}>
        <Icon icon={chevronIcon} size={ICON_SIZES.thumbnail} />
      </span>
    </button>
  )
}

type OptionListProps = {
  /** The list's name, e.g. "Categoria"; with onBack, also shown over it, beside the ←. */
  label: string
  /** Goes back to the rows, inside the filter sheet. */
  onBack?: () => void
  options: Option[]
  /** Whether several options can be on at once. */
  multiple?: boolean
  selected: (value: string) => boolean
  onPick: (value: string) => void
}

/** The options of a sort or a filter, a check beside each one chosen. */
function OptionList({ label, onBack, options, multiple = false, selected, onPick }: OptionListProps) {
  const titleId = useId()
  const { classes, ids } = filterSheet()
  return (
    <>
      {onBack && (
        <div className={classes.listHeader()} data-testid={ids.listHeader}>
          <BackButton label="Voltar aos filtros" onClick={onBack} />
          <span id={titleId} className={classes.listTitle()} data-testid={ids.listTitle}>
            {label}
          </span>
        </div>
      )}
      <div
        role="listbox"
        aria-labelledby={onBack ? titleId : undefined}
        aria-label={onBack ? undefined : label}
        aria-multiselectable={multiple || undefined}
      >
        {options.map((option) => {
          const on = selected(option.value)
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={on}
              className={classes.option()}
              data-testid={ids.option}
              onClick={() => onPick(option.value)}
            >
              {option.label}
              {on && (
                <span aria-hidden="true" className={classes.check()} data-testid={ids.check}>
                  <Icon icon={checkIcon} size={ICON_SIZES.prominent} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}
