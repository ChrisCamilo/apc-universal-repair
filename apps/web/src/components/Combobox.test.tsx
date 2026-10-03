import { useState } from 'react'
import { SELECT_VISIBLE_OPTIONS } from '@apc/shared/filters'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { Combobox } from './Combobox.tsx'
import { Dialog } from './Dialog.tsx'

const CATEGORIES = ['Arrefecimento', 'Elétrica', 'Freios', 'Ignição', 'Motor', 'Suspensão', 'Transmissão']
const root = document.documentElement

/**
 * Converts a hex color to the `rgb(r, g, b)` form the browser reports for computed styles.
 * @param hex Color as `#RRGGBB`.
 * @returns The same color as `rgb(r, g, b)`.
 */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the list on a field holding an option in one style and mode and checks the frame lights up in the
    // accent, the current option is marked in the accent and the field with an error has a danger frame.
    test(`Web: comboboxes follow the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(
        <>
          <Category initial="Freios" />
          <Category label="Marca" initial="" error="Escolha uma marca da lista ou crie uma nova." />
        </>,
      )
      const field = screen.getByRole('combobox', { name: 'Categoria' })
      await field.click()
      await expect.poll(() => getComputedStyle(field.element().parentElement!).borderColor).toBe(rgb(colors.accent))
      const chosen = screen.getByRole('option', { name: 'Freios' })
      await expect.element(chosen).toHaveAttribute('aria-selected', 'true')
      expect(getComputedStyle(chosen.element()).color).toBe(rgb(colors.accent))
      expect(getComputedStyle(screen.getByRole('combobox', { name: 'Marca' }).element().parentElement!).borderColor).toBe(
        rgb(colors.danger),
      )
    })
  }
}

// Types part of a name without accents and checks the list keeps only the matching option, followed by the
// create row since the text names no option yet; then types a new value and picks the create row, which
// creates it with a capital letter, in the accent, and fills the field.
test('Web: typing filters the list and offers to create a new option', async () => {
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
  const onCreate = vi.fn()
  const screen = await render(<Category initial="" onCreated={onCreate} />)
  const field = screen.getByRole('combobox', { name: 'Categoria' })
  await field.fill('eletr')
  await expect.poll(() => screen.getByRole('option').elements().map((option) => option.textContent)).toEqual([
    'Elétrica',
    '+ Criar categoria “Eletr”',
  ])

  await field.fill('escapamento')
  const create = screen.getByRole('option', { name: '+ Criar categoria “Escapamento”' })
  expect(getComputedStyle(create.element()).color).toBe(rgb(themes.eighties.night.colors.accent))
  await create.click()
  expect(onCreate).toHaveBeenCalledWith('Escapamento')
  await expect.element(field).toHaveValue('Escapamento')
  await expect.element(field).toHaveAttribute('aria-expanded', 'false')
})

// Drives the list with the keyboard: Down opens it and moves the highlight, Enter picks, and the highlighted
// option is the active descendant of the field.
test('Web: the keyboard moves through the list and picks', async () => {
  const screen = await render(<Category initial="" />)
  const field = screen.getByRole('combobox', { name: 'Categoria' })
  await field.click()
  await userEvent.keyboard('{ArrowDown}{ArrowDown}')
  const activeId = field.element().getAttribute('aria-activedescendant')!
  expect(document.getElementById(activeId)).toHaveTextContent('Freios')
  await userEvent.keyboard('{Enter}')
  await expect.element(field).toHaveValue('Freios')
  await expect.element(field).toHaveAttribute('aria-expanded', 'false')
})

// Opens the list inside a dialog and presses Escape: only the list closes, the dialog stays open.
test('Web: Escape closes only the list, not the dialog around it', async () => {
  const onClose = vi.fn()
  const screen = await render(
    <Dialog open onClose={onClose} title="Novo item" actions={null}>
      <Category initial="" />
    </Dialog>,
  )
  const field = screen.getByRole('combobox', { name: 'Categoria' })
  await expect.element(field).toHaveAttribute('aria-expanded', 'true')
  await userEvent.keyboard('{Escape}')
  await expect.element(field).toHaveAttribute('aria-expanded', 'false')
  expect(onClose).not.toHaveBeenCalled()
  await expect.element(screen.getByRole('dialog')).toBeVisible()
})

// Types an option in another case and without its accent, leaves the field, and checks it takes the option's
// spelling; a new value is left as typed.
test('Web: leaving the field normalizes a known option to its spelling', async () => {
  const screen = await render(
    <>
      <Category initial="" />
      <button type="button">Depois</button>
    </>,
  )
  const field = screen.getByRole('combobox', { name: 'Categoria' })
  await field.fill('ELETRICA')
  await userEvent.keyboard('{Tab}')
  await expect.element(field).toHaveValue('Elétrica')

  await field.fill('cabos')
  await userEvent.keyboard('{Tab}')
  await expect.element(field).toHaveValue('cabos')
})

// Opens the full list with the chevron while the field holds a filtering text, and checks it shows only five
// options at a time and scrolls the highlighted one into view.
test('Web: the chevron opens the full list, five options at a time', async () => {
  const screen = await render(<Category initial="Mot" />)
  await screen.getByRole('button', { name: 'Mostrar categorias' }).click()
  const list = screen.getByRole('listbox').element()
  await expect.element(screen.getByRole('option', { name: 'Arrefecimento' })).toBeInTheDocument()
  const option = screen.getByRole('option', { name: 'Arrefecimento' }).element().getBoundingClientRect().height
  expect(Math.floor(list.clientHeight / option)).toBe(SELECT_VISIBLE_OPTIONS)

  await userEvent.keyboard('{ArrowUp}')
  await expect.poll(() => list.scrollTop).toBeGreaterThan(0)
})

// Checks the error is read out with the field and marks it invalid, and that an empty list says so.
test('Web: errors describe the field and an empty list says so', async () => {
  const screen = await render(
    <Category initial="" options={[]} error="Escolha uma categoria da lista ou crie uma nova." />,
  )
  const field = screen.getByRole('combobox', { name: 'Categoria' })
  await expect.element(field).toHaveAttribute('aria-invalid', 'true')
  await expect.element(field).toHaveAccessibleDescription('Escolha uma categoria da lista ou crie uma nova.')
  await field.click()
  await expect.element(screen.getByText('Nenhuma categoria cadastrada')).toBeVisible()
})

function Category({
  initial,
  label = 'Categoria',
  options = CATEGORIES,
  error,
  onCreated,
}: {
  initial: string
  label?: string
  options?: string[]
  error?: string
  onCreated?: (value: string) => void
}) {
  const [value, setValue] = useState(initial)
  const [list, setList] = useState(options)
  return (
    <Combobox
      label={label}
      value={value}
      onValueChange={setValue}
      options={list}
      onCreate={(created) => {
        setList((prev) => [...prev, created])
        onCreated?.(created)
      }}
      noun="categoria"
      toggleLabel="Mostrar categorias"
      emptyLabel="Nenhuma categoria cadastrada"
      error={error}
    />
  )
}
