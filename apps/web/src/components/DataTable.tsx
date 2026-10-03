import { useId, type ReactNode } from 'react'
import { cubeIcon, type IconShape } from '@apc/shared/icons'
import { nextSort, sortFromValue, sortOptions, sortValue, type Sort } from '@apc/shared/table'
import { Icon } from './Icon.tsx'
import { Select } from './Select.tsx'
import { Label } from './Typography.tsx'

// A list of rows with sortable columns, for the inventory and later data screens. The owner sorts the rows
// (sortRows in @apc/shared/table) and the table shows the sort: a click on a header sorts ascending, a second
// click descending, with an arrow and aria-sort. Numeric columns are right-aligned with tabular figures.
// A row's status (low stock, out of stock) tints the whole row with a stripe at its start, and is also
// written out for screen readers, since color alone doesn't reach them; the cell text keeps the text color,
// so it stays readable on every tint. Below TABLE_CARD_BREAKPOINT (720px) each row becomes a card
// (thumbnail | main | end and actions), the header hides and a "Sort by" select takes its place.
// Tailwind only builds classes it finds written out, hence the literal class maps below.

const CARD_AREA_CLASSES: Record<CardArea, string> = {
  thumb: 'max-[720px]:[grid-area:thumb]',
  main: 'max-[720px]:[grid-area:main]',
  end: 'max-[720px]:[grid-area:end] max-[720px]:justify-self-end',
  actions: 'max-[720px]:[grid-area:actions] max-[720px]:justify-self-end',
}
const ROW =
  'transition-[background-color] max-[720px]:grid max-[720px]:grid-cols-[calc(var(--spacing)*11)_minmax(0,1fr)_auto] ' +
  "max-[720px]:items-center max-[720px]:gap-x-3 max-[720px]:gap-y-1 max-[720px]:[grid-template-areas:'thumb_main_end''thumb_main_actions'] " +
  'max-[720px]:border-b max-[720px]:border-hairline-soft max-[720px]:py-2.5 max-[720px]:pr-1 max-[720px]:pl-2'
const STATUS_CLASSES: Record<RowTone, string> = {
  warn:
    'bg-warn-soft hover:bg-warn-soft-hover [&>td:first-child]:shadow-[inset_calc(var(--spacing)*0.75)_0_0_var(--warn)] ' +
    'max-[720px]:shadow-[inset_calc(var(--spacing)*0.75)_0_0_var(--warn)] max-[720px]:[&>td:first-child]:shadow-none',
  danger:
    'bg-danger-soft hover:bg-danger-soft-hover [&>td:first-child]:shadow-[inset_calc(var(--spacing)*0.75)_0_0_var(--danger)] ' +
    'max-[720px]:shadow-[inset_calc(var(--spacing)*0.75)_0_0_var(--danger)] max-[720px]:[&>td:first-child]:shadow-none',
}
const SORT_ARROWS = { ascending: '↑', descending: '↓', none: '↕' }

type CardArea = 'thumb' | 'main' | 'end' | 'actions'
type Column<Row> = {
  key: string
  header: string
  cell: (row: Row) => ReactNode
  /** Right-aligned with tabular figures, e.g. price and quantity. */
  numeric?: boolean
  /** The header sorts by this column. */
  sortable?: boolean
  /** Name in the "Sort by" select when it differs from the header, e.g. "Quantidade" for "Qtd.". */
  sortLabel?: string
  /** Keeps the header for screen readers only, e.g. for the photo and the actions. */
  headerHidden?: boolean
  /** Place of the cell on a phone card; cells without one are left off the card. */
  card?: CardArea
}
type DataTableProps<Row> = {
  /** Accessible name of the table, e.g. "Itens do estoque". */
  label: string
  columns: Column<Row>[]
  rows: Row[]
  rowKey: (row: Row) => string
  /** Status of a row, which tints it; the label is read out, e.g. "Esgotado". */
  rowStatus?: (row: Row) => { tone: RowTone; label: string } | undefined
  sort: Sort | null
  onSortChange: (sort: Sort | null) => void
  /** Option of the "Sort by" select with no sort, e.g. "Ordem de cadastro". */
  unsortedLabel: string
  /** Shown instead of the table when there are no rows. */
  empty: ReactNode
}
type RowActionProps = {
  icon: IconShape[]
  /** Accessible name, e.g. "Editar Pastilha de freio". */
  label: string
  onClick: () => void
  /** Danger tints the hover, for actions like delete. */
  tone?: 'default' | 'danger'
}
type RowTone = 'warn' | 'danger'
type TableThumbnailProps = {
  /** Photo URL; without one the thumbnail shows a placeholder icon. */
  src?: string | null
  /** Accessible name of the button, e.g. "Ver foto de Pastilha de freio". */
  label: string
  onOpen: () => void
}

/**
 * Tells how a column is sorted, in the words of aria-sort.
 * @param sort Sort in place, or null.
 * @param key Column key.
 * @returns "ascending", "descending" or "none".
 */
function ariaSort(sort: Sort | null, key: string): 'ascending' | 'descending' | 'none' {
  if (sort?.key !== key) {
    return 'none'
  }
  return sort.dir === 'asc' ? 'ascending' : 'descending'
}

export function DataTable<Row>({
  label,
  columns,
  rows,
  rowKey,
  rowStatus,
  sort,
  onSortChange,
  unsortedLabel,
  empty,
}: DataTableProps<Row>) {
  const sortId = useId()
  const sortable = columns.filter((column) => column.sortable)

  return (
    <div className="grid min-w-0 gap-3">
      {sortable.length > 0 && (
        <div className="hidden items-center gap-2 max-[720px]:flex">
          <Label htmlFor={sortId}>Ordenar</Label>
          <div className="min-w-0 flex-1">
            <Select
              id={sortId}
              options={sortOptions(
                sortable.map((column) => ({ key: column.key, label: column.sortLabel ?? column.header, numeric: column.numeric })),
                unsortedLabel,
              )}
              value={sortValue(sort)}
              onValueChange={(value) => onSortChange(sortFromValue(value))}
            />
          </div>
        </div>
      )}
      {rows.length === 0 ? (
        empty
      ) : (
        <div className="overflow-x-auto max-[720px]:overflow-visible">
          <table aria-label={label} className="w-full border-collapse font-body text-sm text-text max-[720px]:block">
            <thead className="max-[720px]:hidden">
              <tr>
                {columns.map((column) => {
                  const order = ariaSort(sort, column.key)
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={column.sortable ? order : undefined}
                      className={`whitespace-nowrap border-b border-hairline px-2.5 py-2 font-display text-xs font-semibold uppercase tracking-display ${
                        column.numeric ? 'text-right' : 'text-left'
                      } ${order === 'none' ? 'text-text-muted' : 'text-accent'}`}
                    >
                      {column.headerHidden ? (
                        <span className="sr-only">{column.header}</span>
                      ) : column.sortable ? (
                        <button
                          type="button"
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-tile uppercase tracking-[inherit] outline-none transition-colors focus-visible:shadow-ring ${
                            order === 'none' ? 'hover:text-text' : ''
                          }`}
                          onClick={() => onSortChange(nextSort(sort, column.key))}
                        >
                          {column.header}
                          <span aria-hidden="true" className={`font-mono tracking-normal ${order === 'none' ? 'opacity-45' : ''}`}>
                            {SORT_ARROWS[order]}
                          </span>
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="max-[720px]:block">
              {rows.map((row) => {
                const status = rowStatus?.(row)
                return (
                  <tr
                    key={rowKey(row)}
                    data-status={status?.tone}
                    className={`${ROW} ${status ? STATUS_CLASSES[status.tone] : 'hover:bg-panel-raised'}`}
                  >
                    {columns.map((column, index) => (
                      <td
                        key={column.key}
                        className={[
                          'border-b border-hairline-soft px-2.5 py-2 align-middle max-[720px]:border-0 max-[720px]:p-0',
                          column.numeric ? 'text-right font-mono tabular-nums' : '',
                          column.card ? CARD_AREA_CLASSES[column.card] : 'max-[720px]:hidden',
                        ].join(' ')}
                      >
                        {index === 0 && status && <span className="sr-only">{status.label}: </span>}
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function RowAction({ icon, label, onClick, tone = 'default' }: RowActionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`grid size-8 cursor-pointer place-items-center rounded-tile text-text-muted outline-none transition-colors hover:bg-panel focus-visible:shadow-ring ${
        tone === 'danger' ? 'hover:text-danger' : 'hover:text-accent'
      }`}
      onClick={onClick}
    >
      <Icon icon={icon} size={15} />
    </button>
  )
}

export function TableThumbnail({ src, label, onOpen }: TableThumbnailProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-11 cursor-zoom-in place-items-center overflow-hidden rounded-tile border border-hairline-soft bg-panel-raised text-text-muted outline-none transition-[border-color,box-shadow] hover:border-accent hover:shadow-glow focus-visible:shadow-ring"
      onClick={onOpen}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : <Icon icon={cubeIcon} size={20} />}
    </button>
  )
}
