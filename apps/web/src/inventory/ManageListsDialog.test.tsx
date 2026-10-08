import { useState } from 'react'
import type { Item } from '@apc/shared/items'
import { withEntry, withoutEntry, type ItemLists } from '@apc/shared/lists'
import { itemListsOf } from '@apc/shared/test-lists'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ToastProvider } from '../components/Toast.tsx'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { ManageListsDialog } from './ManageListsDialog.tsx'
import type { RemoveListEntry, RenameListEntry } from './useItemLists.ts'

const ITEMS = [
  item({ code: 'W 712/95', name: 'Filtro de óleo', category: 'Motor', vehicleBrand: 'Volkswagen', vehicleModel: 'Gol' }),
  item({ code: 'J-1', name: 'Junta', category: 'Motor', vehicleBrand: 'Volkswagen', vehicleModel: 'Santana' }),
  item({ code: 'P-1', name: 'Pastilha', category: 'Freios', vehicleBrand: 'Chevrolet', vehicleModel: 'Opala' }),
]
// The lists: what the items use, plus a category, a vehicle brand and a model no item uses.
const LISTS = itemListsOf([
  ...ITEMS,
  item({ code: 'X', name: 'Sem uso', category: 'Turbo', vehicleBrand: 'Renault', vehicleModel: 'Clio' }),
])
const root = document.documentElement

/**
 * Fills in an item with the fields a test doesn't look at.
 * @param fields The fields that matter here.
 * @returns A complete item.
 */
function item(fields: Partial<Item> & Pick<Item, 'code' | 'name'>): Item {
  return {
    id: crypto.randomUUID(),
    category: 'Motor',
    partBrand: 'Bosch',
    vehicleBrand: 'Volkswagen',
    vehicleModel: null,
    position: 'N/A',
    side: 'N/A',
    color: 'N/A',
    location: null,
    quantity: 1,
    minQuantity: 0,
    unitPriceCents: 3990,
    photos: [],
    createdAt: '2026-10-03T12:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z',
    ...fields,
  }
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

afterEach(async () => {
  vi.restoreAllMocks()
  await page.viewport(1280, 720)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the dialog in one style and mode, asks to delete an unused name, and checks the counts are muted and
    // Excluir takes the danger color.
    test(`Web: Manage lists follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Sample />)
      expect(getComputedStyle(screen.getByText('2 itens').first().element()).color).toBe(rgb(colors.textMuted))
      await screen.getByRole('button', { name: 'Excluir Turbo' }).click()
      expect(getComputedStyle(screen.getByRole('button', { name: 'Excluir', exact: true }).element()).backgroundColor).toBe(
        rgb(colors.danger),
      )
    })
  }
}

// Opens the dialog and checks a section for each list, each name with how many items use it, and the models grouped
// by their vehicle brand.
test('Web: Manage lists shows each list with the items using each name', async () => {
  const screen = await render(<Sample />)
  const section = (name: string) => screen.getByRole('region', { name })
  for (const title of ['Categorias', 'Marcas de peça', 'Marcas de veículo', 'Modelos de veículo']) {
    await expect.element(section(title)).toBeVisible()
  }
  await expect.element(section('Categorias').getByRole('listitem').filter({ hasText: 'Motor' })).toHaveTextContent('Motor2 itens')
  await expect.element(section('Categorias').getByRole('listitem').filter({ hasText: 'Turbo' })).toHaveTextContent('Turbosem itens')
  const volkswagen = screen.getByRole('group', { name: 'Modelos de Volkswagen' })
  expect(volkswagen.getByRole('listitem').elements().map((row) => row.firstElementChild?.textContent)).toEqual(['Gol', 'Santana'])
  await expect.element(screen.getByRole('group', { name: 'Modelos de Renault' })).toHaveTextContent('RenaultCliosem itens')
})

// Renames a category in place with Enter and checks the field starts with the name selected, the rename is sent, the
// list shows the new name, a toast confirms it and the inventory is told to load again; Escape leaves a rename
// without closing the dialog.
test('Web: a name is renamed in place', async () => {
  const onRename = vi.fn<RenameListEntry>()
  const onChanged = vi.fn()
  const screen = await render(<Sample onRename={onRename} onChanged={onChanged} />)
  await screen.getByRole('button', { name: 'Renomear Turbo' }).click()
  const field = screen.getByLabelText('Novo nome de “Turbo”')
  await expect.element(field).toHaveFocus()
  await userEvent.keyboard('turbo e escape{Enter}')
  const turbo = LISTS.categories.find((entry) => entry.name === 'Turbo')!
  expect(onRename).toHaveBeenCalledWith('categories', turbo.id, 'turbo e escape')
  await expect.element(screen.getByText('Categoria renomeada para “Turbo e escape”.')).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Renomear Turbo e escape' })).toBeVisible()
  expect(onChanged).toHaveBeenCalledTimes(1)

  await screen.getByRole('button', { name: 'Renomear Freios' }).click()
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByLabelText('Novo nome de “Freios”')).not.toBeInTheDocument()
  await expect.element(screen.getByRole('dialog', { name: 'Gerenciar listas' })).toBeVisible()
})

// Renames to a blank name and to the name of another category, in another case, and checks each is refused under the
// field without sending anything; a name the API says is taken is refused the same way.
test('Web: a rename to a blank or taken name is refused', async () => {
  const onRename = vi.fn<RenameListEntry>(async () => 'taken')
  const screen = await render(<Sample onRename={onRename} />)
  await screen.getByRole('button', { name: 'Renomear Turbo' }).click()
  const field = screen.getByLabelText('Novo nome de “Turbo”')
  await field.fill(' ')
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(screen.getByText('Informe o nome.')).toBeVisible()
  await field.fill('freios')
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(screen.getByText('Já existe uma categoria com esse nome.')).toBeVisible()
  expect(onRename).not.toHaveBeenCalled()

  await field.fill('Escapamento')
  await screen.getByRole('button', { name: 'Salvar' }).click()
  await expect.element(screen.getByText('Já existe uma categoria com esse nome.')).toBeVisible()
  expect(onRename).toHaveBeenCalledTimes(1)
})

// Deletes a vehicle brand no item uses and checks the confirmation says its models go too, Excluir sends the delete,
// the brand and its models leave the dialog and a toast confirms it.
test('Web: a name no item uses is deleted after confirming', async () => {
  const onRemove = vi.fn<RemoveListEntry>(async () => true)
  const screen = await render(<Sample onRemove={onRemove} />)
  await screen.getByRole('button', { name: 'Excluir Renault' }).click()
  const confirm = screen.getByRole('dialog', { name: 'Excluir “Renault”?' })
  await expect.element(confirm).toBeVisible()
  expect(confirm.element().textContent).toContain('“Renault” e os modelos dela saem da lista de marcas de veículo.')
  await confirm.getByRole('button', { name: 'Excluir' }).click()
  const renault = LISTS.vehicleBrands.find((entry) => entry.name === 'Renault')!
  expect(onRemove).toHaveBeenCalledWith('vehicleBrands', renault.id)
  await expect.element(screen.getByText('Marca de veículo “Renault” excluída.')).toBeVisible()
  await expect.element(confirm).not.toBeInTheDocument()
  await expect.element(screen.getByRole('button', { name: 'Excluir Renault' })).not.toBeInTheDocument()
  await expect.element(screen.getByRole('group', { name: 'Modelos de Renault' })).not.toBeInTheDocument()
})

// Asks to delete a model items use and checks nothing can be deleted: the dialog says how many items use it, and Ver
// itens hands over the filters that show them; a vehicle brand of the catalog can't be deleted either.
test('Web: a name in use or of the catalog is not deleted', async () => {
  const onRemove = vi.fn<RemoveListEntry>()
  const onShowItems = vi.fn()
  const screen = await render(<Sample onRemove={onRemove} onShowItems={onShowItems} />)
  await screen.getByRole('group', { name: 'Modelos de Volkswagen' }).getByRole('button', { name: 'Excluir Gol' }).click()
  const blocked = screen.getByRole('dialog', { name: 'Não é possível excluir' })
  await expect.element(blocked).toBeVisible()
  expect(blocked.element().textContent).toContain('1 item usa “Gol”. Troque o modelo do veículo desses itens antes de excluir.')
  await blocked.getByRole('button', { name: 'Ver itens' }).click()
  expect(onShowItems).toHaveBeenCalledWith(expect.objectContaining({ vehicleModel: ['Volkswagen|Gol'], category: [] }))

  await screen.getByRole('button', { name: 'Excluir Chevrolet' }).click()
  await expect.poll(() => blocked.element().textContent).toContain('“Chevrolet” também está no catálogo e não pode ser excluída do estoque.')
  expect(blocked.getByRole('button').elements().map((button) => button.textContent)).toEqual(['Fechar'])
  expect(onRemove).not.toHaveBeenCalled()
})

// Opens the dialog on a 360×780 phone and checks nothing scrolls sideways and each row's trash stays on screen.
test('Web: Manage lists fits a 360×780 phone', async () => {
  await page.viewport(360, 780)
  const screen = await render(<Sample />)
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360)
  expect(screen.getByRole('button', { name: 'Excluir Motor' }).element().getBoundingClientRect().right).toBeLessThanOrEqual(360)
})

function Sample({
  onRename,
  onRemove,
  onChanged = () => {},
  onShowItems = () => {},
}: {
  /** Called with each rename; the name is renamed as asked unless it returns "taken" or null. */
  onRename?: RenameListEntry
  /** Called with each delete; the entry is deleted unless it returns false. */
  onRemove?: RemoveListEntry
  onChanged?: () => void
  onShowItems?: () => void
}) {
  const [lists, setLists] = useState<ItemLists>(LISTS)

  /** Renames as the API would, unless onRename answers otherwise. */
  const rename: RenameListEntry = async (kind, id, name) => {
    const answer = await onRename?.(kind, id, name)
    if (answer === 'taken' || answer === null) {
      return answer
    }
    const held = lists[kind].find((entry) => entry.id === id)!
    const renamed = { ...held, name: name.charAt(0).toUpperCase() + name.slice(1) }
    setLists((current) => withEntry(current, kind, renamed))
    return renamed
  }

  /** Deletes as the API would, unless onRemove says it failed. */
  const remove: RemoveListEntry = async (kind, id) => {
    if ((await onRemove?.(kind, id)) === false) {
      return false
    }
    setLists((current) => withoutEntry(current, kind, id))
    return true
  }

  return (
    <ToastProvider>
      <ManageListsDialog
        open
        lists={lists}
        items={ITEMS}
        onRename={rename}
        onRemove={remove}
        onChanged={onChanged}
        onShowItems={onShowItems}
        onClose={() => {}}
      />
    </ToastProvider>
  )
}
