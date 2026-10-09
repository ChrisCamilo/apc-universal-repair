import { useId, type ReactNode } from 'react'
import { cubeIcon, ICON_SIZES, type IconShape } from '@apc/shared/icons'
import { nextSort, sortFromValue, sortOptions, sortValue, type Sort } from '@apc/shared/table'
import { dataTable, rowAction, tableThumbnail, tableTitle } from './DataTable.styles.ts'
import { Icon } from './Icon.tsx'
import { Select } from './Select.tsx'
import { Label } from './Typography.tsx'

// A list of rows with sortable columns, for the inventory and later data screens. The owner sorts the rows
// (sortRows in @apc/shared/table) and the table shows the sort: a click on a header sorts ascending, a second
// click descending, with an arrow and aria-sort. Numeric columns are right-aligned with tabular figures.
// A row's status (low stock, out of stock) tints the whole row with a stripe at its start, and is also
// written out for screen readers, since color alone doesn't reach them; the cell text keeps the text color,
// so it stays readable on every tint. Below TABLE_CARD_BREAKPOINT (720px) each row becomes a card
// (thumbnail | main | end and actions), the header hides and a "Sort by" select takes its place. TableTitle is
// the main cell: the name, the code under it and, on a card, a line with what the hidden columns said. With
// onRowOpen, a click on a row opens it, except on its own buttons (thumbnail, actions), which keep their click; the
// rows join the Tab order with a focus outline and open with Enter or Space.

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
  /** Opens a row, e.g. the item details; without it rows aren't clickable. */
  onRowOpen?: (row: Row) => void
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
type TableTitleProps = {
  /** The row's name, e.g. "Pastilha de freio dianteira". */
  title: string
  /** Its code, in the mono face, e.g. "FR-0142". */
  code: string
  /** What the columns left off a phone card say, shown only on the card, e.g. "Freios · Cobreq · A-2". */
  details?: string
}
type TableThumbnailProps = {
  /** Photo URL; without one the thumbnail shows a placeholder icon. */
  src?: string | null
  /** Accessible name of the button, e.g. "Ver foto de Pastilha de freio". */
  label: string
  /** Opens a larger view; without it the thumbnail is a plain picture, not a button. */
  onOpen?: () => void
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
  onRowOpen,
}: DataTableProps<Row>) {
  const sortId = useId()
  const sortable = columns.filter((column) => column.sortable)
  const { classes, ids } = dataTable()

  return (
    <div className={classes.base()} data-testid={ids.base}>
      {sortable.length > 0 && (
        <div className={classes.sortBar()} data-testid={ids.sortBar}>
          <Label htmlFor={sortId}>Ordenar</Label>
          <div className={classes.sortSelect()} data-testid={ids.sortSelect}>
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
        <div className={classes.scroll()} data-testid={ids.scroll}>
          <table aria-label={label} className={classes.table()} data-testid={ids.table}>
            <thead className={classes.head()} data-testid={ids.head}>
              <tr>
                {columns.map((column) => {
                  const order = ariaSort(sort, column.key)
                  const header = dataTable({ numeric: column.numeric, sorted: order !== 'none' }).classes
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={column.sortable ? order : undefined}
                      className={header.header()}
                      data-testid={ids.header}
                    >
                      {column.headerHidden ? (
                        <span className={header.hidden()} data-testid={ids.hidden}>
                          {column.header}
                        </span>
                      ) : column.sortable ? (
                        <button
                          type="button"
                          className={header.sort()}
                          data-testid={ids.sort}
                          onClick={() => onSortChange(nextSort(sort, column.key))}
                        >
                          {column.header}
                          <span aria-hidden="true" className={header.arrow()} data-testid={ids.arrow}>
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
            <tbody className={classes.body()} data-testid={ids.body}>
              {rows.map((row) => {
                const status = rowStatus?.(row)
                return (
                  <tr
                    key={rowKey(row)}
                    data-status={status?.tone}
                    tabIndex={onRowOpen ? 0 : undefined}
                    className={dataTable({ tint: status?.tone ?? 'none', openable: Boolean(onRowOpen) }).classes.row()}
                    data-testid={ids.row}
                    onClick={
                      onRowOpen &&
                      ((event) => {
                        if (!(event.target as Element).closest('button, a, input')) {
                          onRowOpen(row)
                        }
                      })
                    }
                    onKeyDown={
                      onRowOpen &&
                      ((event) => {
                        if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
                          event.preventDefault()
                          onRowOpen(row)
                        }
                      })
                    }
                  >
                    {columns.map((column, index) => (
                      <td
                        key={column.key}
                        className={dataTable({ numeric: column.numeric, area: column.card ?? 'none' }).classes.cell()}
                        data-testid={ids.cell}
                      >
                        {index === 0 && status && (
                          <span className={classes.status()} data-testid={ids.status}>
                            {status.label}:{' '}
                          </span>
                        )}
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
  const { classes, ids } = rowAction({ tone })
  return (
    <button type="button" aria-label={label} className={classes.base()} data-testid={ids.base} onClick={onClick}>
      <Icon icon={icon} size={ICON_SIZES.label} />
    </button>
  )
}

export function TableThumbnail({ src, label, onOpen }: TableThumbnailProps) {
  const { classes, ids } = tableThumbnail({ opens: Boolean(onOpen) })
  const content = src ? (
    <img src={src} alt="" className={classes.image()} data-testid={ids.image} />
  ) : (
    <Icon icon={cubeIcon} size={ICON_SIZES.thumbnail} />
  )
  if (!onOpen) {
    return (
      <span className={classes.base()} data-testid={ids.base}>
        {content}
      </span>
    )
  }
  return (
    <button type="button" aria-label={label} className={classes.base()} data-testid={ids.base} onClick={onOpen}>
      {content}
    </button>
  )
}

export function TableTitle({ title, code, details }: TableTitleProps) {
  const { classes, ids } = tableTitle()
  return (
    <span className={classes.base()} data-testid={ids.base}>
      <b className={classes.title()} data-testid={ids.title}>
        {title}
      </b>
      <code className={classes.code()} data-testid={ids.code}>
        {code}
      </code>
      {details && (
        <span className={classes.details()} data-testid={ids.details}>
          {details}
        </span>
      )}
    </span>
  )
}
