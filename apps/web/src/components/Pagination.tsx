import type { ReactNode } from 'react'
import { chevronIcon } from '@apc/shared/icons'
import { pageCount, pageForSize, pageRange, pageSlots } from '@apc/shared/pagination'
import { Icon } from './Icon.tsx'
import { Segmented } from './Segmented.tsx'
import { Label, NumericReadout } from './Typography.tsx'

// Page navigation for long lists, under the list: the page size selector, the range shown ("1–25 de 64",
// announced as it changes) and the page buttons. Long lists show the first page, the last page and the
// neighbors of the current one, with an ellipsis for skipped ranges, in at most seven slots. The current page
// fills with the accent and has aria-current="page". Previous and next are disabled at the ends with
// aria-disabled, so the focus stays on them. Changing the page size keeps the first item in view. At phone
// width the parts wrap onto more lines. An empty list shows no pagination.

const PAGE_BUTTON =
  'inline-grid h-8 min-w-8 place-items-center rounded-tile border px-2 font-mono text-xs tabular-nums outline-none ' +
  'transition-[border-color,color,background-color,box-shadow] focus-visible:shadow-ring'
const PAGE_STATE = {
  current: 'cursor-pointer border-transparent bg-accent text-on-accent shadow-glow',
  other:
    'border-hairline-soft bg-transparent text-text not-aria-disabled:cursor-pointer not-aria-disabled:hover:border-accent ' +
    'not-aria-disabled:hover:text-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
}

type PaginationProps = {
  /** Accessible name of the page buttons, e.g. "Páginas do estoque". */
  label: string
  /** Current page, from 1. */
  page: number
  pageSize: number
  /** Number of items in the whole list. */
  total: number
  /** Sizes the selector offers, e.g. PAGE_SIZES. */
  pageSizes: readonly number[]
  onPageChange: (page: number) => void
  /** Called with the new size; onPageChange then moves to the page holding the first item that was showing. */
  onPageSizeChange: (pageSize: number) => void
}

type PageButtonProps = {
  /** Page the button goes to. */
  target: number
  /** Accessible name, e.g. "Página 3" or "Próxima página". */
  label: string
  current?: boolean
  disabled?: boolean
  onPageChange: (page: number) => void
  children: ReactNode
}

export function Pagination({ label, page, pageSize, total, pageSizes, onPageChange, onPageSizeChange }: PaginationProps) {
  if (total === 0) {
    return null
  }
  const pages = pageCount(total, pageSize)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline-soft pt-3">
      <div className="flex items-center gap-2">
        <Label aria-hidden="true">Itens por página</Label>
        <Segmented
          label="Itens por página"
          options={pageSizes.map((size) => ({ value: String(size), label: String(size) }))}
          value={String(pageSize)}
          onValueChange={(value) => {
            onPageSizeChange(Number(value))
            onPageChange(pageForSize(page, pageSize, Number(value)))
          }}
        />
      </div>
      <NumericReadout tone="muted" aria-live="polite" className="ms-auto max-[720px]:ms-0">
        {pageRange(page, pageSize, total)}
      </NumericReadout>
      <nav aria-label={label} className="flex flex-wrap gap-1">
        <PageButton target={page - 1} disabled={page === 1} label="Página anterior" onPageChange={onPageChange}>
          <Icon icon={chevronIcon} size={12} className="rotate-180" />
        </PageButton>
        {pageSlots(page, pages).map((slot, index) =>
          slot === null ? (
            <span
              key={index < 2 ? 'gap-start' : 'gap-end'}
              aria-hidden="true"
              className="self-center px-0.5 font-mono text-xs text-text-muted"
            >
              …
            </span>
          ) : (
            <PageButton key={slot} target={slot} current={slot === page} label={`Página ${slot}`} onPageChange={onPageChange}>
              {slot}
            </PageButton>
          ),
        )}
        <PageButton target={page + 1} disabled={page === pages} label="Próxima página" onPageChange={onPageChange}>
          <Icon icon={chevronIcon} size={12} />
        </PageButton>
      </nav>
    </div>
  )
}

function PageButton({ target, label, current = false, disabled = false, onPageChange, children }: PageButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      aria-disabled={disabled || undefined}
      className={`${PAGE_BUTTON} ${current ? PAGE_STATE.current : PAGE_STATE.other}`}
      onClick={() => {
        if (!disabled && !current) {
          onPageChange(target)
        }
      }}
    >
      {children}
    </button>
  )
}
