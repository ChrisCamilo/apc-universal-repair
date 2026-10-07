import { useState, type ComponentProps } from 'react'
import { pencilIcon, trashIcon } from '@apc/shared/icons'
import { sortRows, type Sort } from '@apc/shared/table'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { DataTable, RowAction, TableThumbnail, TableTitle } from './DataTable.tsx'

const ITEMS: Item[] = [
  { code: 'FR-0142', name: 'Pastilha de freio', loc: 'A-10', qty: 12, photo: null },
  { code: 'MO-0031', name: 'Junta do cabeçote', loc: 'a-2', qty: 2, photo: null },
  { code: 'SU-0007', name: 'Amortecedor', loc: 'B-1', qty: 0, photo: null },
]
const root = document.documentElement

type Item = { code: string; name: string; loc: string; qty: number; photo: string | null }

/**
 * Lets the browser compute a theme color laid over transparency at an opacity, as it reports it.
 * @param hex Color as `#RRGGBB`.
 * @param percent Opacity in percent.
 * @returns The computed color.
 */
function mixed(hex: string, percent: number): string {
  const probe = document.createElement('span')
  probe.style.color = `color-mix(in srgb, ${hex} ${percent}%, transparent)`
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}

/**
 * Reads the quantities down the table, to check the row order.
 * @returns The text of the quantity cell of each row.
 */
function quantities(): string[] {
  return [...document.querySelectorAll('tbody tr')].map((row) => row.children[3].textContent ?? '')
}

/**
 * Converts a hex color to the `rgb(r, g, b)` form the browser reports for computed styles.
 * @param hex Color as `#RRGGBB`.
 * @returns The same color as `rgb(r, g, b)`.
 */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(1280, 720)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders an in-stock, a low and an out-of-stock row in one style and mode and checks the low row takes
    // the soft warn tint and a warn stripe, the out row the danger ones, and every row keeps the text color.
    test(`Web: table rows follow the ${style}/${mode} status colors`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Inventory />)
      const rows = [...screen.container.querySelectorAll('tbody tr')]
      const [ok, low, out] = rows.map((row) => getComputedStyle(row))

      expect(ok.backgroundColor).toBe('rgba(0, 0, 0, 0)')
      expect(low.backgroundColor).toBe(mixed(colors.warn, 15))
      expect(out.backgroundColor).toBe(mixed(colors.danger, 13))
      expect(getComputedStyle(rows[1].children[0]).boxShadow).toContain(`${rgb(colors.warn)} 3px 0px 0px 0px inset`)
      expect(getComputedStyle(rows[2].children[0]).boxShadow).toContain(`${rgb(colors.danger)} 3px 0px 0px 0px inset`)
      for (const row of [ok, low, out]) {
        expect(row.color).toBe(rgb(colors.text))
      }
    })
  }
}

// Checks the status is also written out for screen readers, and in-stock rows say nothing extra.
test('Web: row status is read out, not only shown in color', async () => {
  const screen = await render(<Inventory />)
  const rows = screen.container.querySelectorAll('tbody tr')
  expect(rows[0].textContent).not.toContain('Estoque baixo')
  expect(rows[1].textContent).toContain('Estoque baixo: ')
  expect(rows[2].textContent).toContain('Esgotado: ')
  const hidden = rows[2].querySelector('.sr-only')!
  expect(hidden.getBoundingClientRect().width).toBeLessThanOrEqual(1)
})

// Sorts by a text and a numeric column with the headers: the first click sorts ascending, the second
// descending, with aria-sort and the arrow following, and the other columns back to none.
test('Web: header clicks sort ascending, then descending', async () => {
  const screen = await render(<Inventory />)
  const qty = screen.getByRole('button', { name: /Qtd\./ })
  const loc = screen.getByRole('button', { name: /Local/ })
  const header = (button: typeof qty) => button.element().closest('th')!

  await qty.click()
  expect(header(qty).getAttribute('aria-sort')).toBe('ascending')
  expect(quantities()).toEqual(['0', '2', '12'])
  await expect.element(qty).toHaveTextContent('Qtd.↑')
  await qty.click()
  expect(header(qty).getAttribute('aria-sort')).toBe('descending')
  expect(quantities()).toEqual(['12', '2', '0'])
  await expect.element(qty).toHaveTextContent('Qtd.↓')

  await loc.click()
  expect(header(loc).getAttribute('aria-sort')).toBe('ascending')
  expect(header(qty).getAttribute('aria-sort')).toBe('none')
  expect(quantities()).toEqual(['2', '12', '0'])
})

// Checks numeric columns align right with tabular figures, and the photo and actions columns are not
// sortable and keep their header for screen readers only.
test('Web: numeric columns align right and data-less columns do not sort', async () => {
  const screen = await render(<Inventory />)
  const qtyCell = screen.container.querySelectorAll('tbody tr')[0].children[3]
  expect(getComputedStyle(qtyCell).textAlign).toBe('right')
  expect(getComputedStyle(qtyCell).fontVariantNumeric).toBe('tabular-nums')

  const headers = [...screen.container.querySelectorAll('th')]
  const photo = headers.find((th) => th.textContent === 'Foto')!
  expect(photo.hasAttribute('aria-sort')).toBe(false)
  expect(photo.querySelector('button')).toBeNull()
  expect(photo.querySelector('.sr-only')).not.toBeNull()
  await expect.element(screen.getByRole('columnheader', { name: 'Ações' })).toBeInTheDocument()
})

// Opens a photo from the thumbnail and runs the row actions, finding each by its accessible name, and
// checks a thumbnail without a photo shows the placeholder icon.
test('Web: thumbnails and row actions are named buttons', async () => {
  const onOpen = vi.fn()
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const screen = await render(
    <>
      <TableThumbnail label="Ver foto de Amortecedor" onOpen={onOpen} />
      <RowAction icon={pencilIcon} label="Editar Amortecedor" onClick={onEdit} />
      <RowAction icon={trashIcon} label="Excluir Amortecedor" tone="danger" onClick={onDelete} />
    </>,
  )
  const thumbnail = screen.getByRole('button', { name: 'Ver foto de Amortecedor' })
  expect(thumbnail.element().querySelector('svg')).not.toBeNull()
  expect(thumbnail.element().querySelector('img')).toBeNull()
  await thumbnail.click()
  await screen.getByRole('button', { name: 'Editar Amortecedor' }).click()
  await screen.getByRole('button', { name: 'Excluir Amortecedor' }).click()
  expect(onOpen).toHaveBeenCalledOnce()
  expect(onEdit).toHaveBeenCalledOnce()
  expect(onDelete).toHaveBeenCalledOnce()

  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
  await userEvent.hover(screen.getByRole('button', { name: 'Excluir Amortecedor' }))
  await expect
    .poll(() => getComputedStyle(screen.getByRole('button', { name: 'Excluir Amortecedor' }).element()).color)
    .toBe(rgb(themes.eighties.night.colors.danger))
})

// Shows the empty slot instead of the table when there are no rows.
test('Web: the empty state replaces the table with no rows', async () => {
  const screen = await render(<Inventory items={[]} />)
  await expect.element(screen.getByText('Nenhum item encontrado')).toBeVisible()
  expect(screen.getByRole('table').query()).toBeNull()
})

// At phone width, checks the header hides, rows become cards with only the card cells, and the "Ordenar"
// select sorts the same way the headers do.
test('Web: at phone width rows become cards sorted by a select', async () => {
  await page.viewport(360, 780)
  try {
    const screen = await render(<Inventory />)
    expect(getComputedStyle(screen.container.querySelector('thead')!).display).toBe('none')
    const card = screen.container.querySelector('tbody tr')!
    expect(getComputedStyle(card).display).toBe('grid')
    expect(getComputedStyle(card.children[2]).display).toBe('none')

    const select = screen.getByRole('combobox', { name: 'Ordenar' })
    await expect.element(select).toHaveTextContent('Ordem de cadastro')
    await select.click()
    await screen.getByRole('option', { name: 'Quantidade (maior → menor)' }).click()
    expect(quantities()).toEqual(['12', '2', '0'])
  } finally {
    await page.viewport(1280, 720)
  }
})

// Shows a row's name, code and details in the title cell, and checks the code takes the mono face and the muted
// color, and the details line stays hidden on the desktop table, where its columns show, and appears on a card.
test('Web: the title cell shows the code, and the details only on a phone card', async () => {
  root.dataset.style = 'gt4'
  root.dataset.mode = 'day'
  const screen = await render(
    <DataTable
      label="Itens do estoque"
      rows={ITEMS.slice(0, 1)}
      rowKey={(item) => item.code}
      sort={null}
      onSortChange={() => {}}
      unsortedLabel="Ordem de cadastro"
      empty={null}
      columns={[
        { key: 'name', header: 'Item', card: 'main', cell: (item) => <TableTitle title={item.name} code={item.code} details={`Freios · ${item.loc}`} /> },
        { key: 'loc', header: 'Local', cell: (item) => item.loc },
      ]}
    />,
  )
  const code = getComputedStyle(screen.getByText('FR-0142').element())
  expect(code.fontFamily).toMatch(/JetBrains Mono/)
  expect(code.color).toBe(rgb(themes.gt4.day.colors.textMuted))
  await expect.element(screen.getByText('Pastilha de freio')).toBeVisible()
  await expect.element(screen.getByText('Freios · A-10')).not.toBeVisible()
  await page.viewport(360, 780)
  try {
    await expect.element(screen.getByText('Freios · A-10')).toBeVisible()
  } finally {
    await page.viewport(1280, 720)
  }
})

function Inventory({ items = ITEMS }: { items?: Item[] }) {
  const [sort, setSort] = useState<Sort | null>(null)
  const sorted = sort ? sortRows(items, (item) => item[sort.key as keyof Item] ?? '', sort.dir) : items
  const props: ComponentProps<typeof DataTable<Item>> = {
    label: 'Itens do estoque',
    rows: sorted,
    rowKey: (item) => item.code,
    rowStatus: (item) =>
      item.qty === 0 ? { tone: 'danger', label: 'Esgotado' } : item.qty <= 2 ? { tone: 'warn', label: 'Estoque baixo' } : undefined,
    sort,
    onSortChange: setSort,
    unsortedLabel: 'Ordem de cadastro',
    empty: <p>Nenhum item encontrado</p>,
    columns: [
      { key: 'photo', header: 'Foto', headerHidden: true, card: 'thumb', cell: (item) => item.photo },
      { key: 'name', header: 'Item', sortable: true, card: 'main', cell: (item) => item.name },
      { key: 'loc', header: 'Local', sortable: true, cell: (item) => item.loc },
      { key: 'qty', header: 'Qtd.', sortLabel: 'Quantidade', numeric: true, sortable: true, card: 'end', cell: (item) => item.qty },
      { key: 'actions', header: 'Ações', headerHidden: true, card: 'actions', cell: () => null },
    ],
  }
  return <DataTable {...props} />
}
