import { useState } from 'react'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import type { TreeNode } from '@apc/shared/tree'
import { beforeAll, expect, test, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { TreeView } from './TreeView.tsx'

const LEAF = '4.1'
const OPALA: TreeNode = {
  id: 'opala',
  label: 'Opala',
  children: [
    { id: 'gen1', label: 'Primeira geração', detail: '1968–1974', children: [] },
    {
      id: 'gen3',
      label: 'Terceira geração',
      detail: '1980–1992',
      children: [
        {
          id: 'diplomata',
          label: 'Diplomata',
          children: [
            {
              id: '1986',
              label: '1986',
              children: [
                { id: '2.5', label: '2.5 L 4 cilindros' },
                { id: LEAF, label: '4.1 L 6 cilindros' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
const MODELS: TreeNode[] = [{ id: 'chevette', label: 'Chevette', children: [{ id: 'chevette-2', label: 'Segunda geração' }] }, OPALA, { id: 'monza', label: 'Monza', children: [] }]
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

/**
 * Finds the row drawn for a tree item.
 * @param name The item's accessible name.
 * @returns The row element.
 */
function row(name: string): HTMLElement {
  return page.getByRole('treeitem', { name, exact: true }).element().querySelector<HTMLElement>('[data-row]')!
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the tree open down to the selected engine in one style and mode, and checks the engine takes the
    // accent on its text and left rule, glowing only where the style has a glow, while the other rows keep the
    // text color and the years the muted one.
    test(`Web: the tree follows the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      await render(<Sample />)
      const chosen = getComputedStyle(row('4.1 L 6 cilindros'))
      expect(chosen.color).toBe(rgb(theme.colors.accent))
      expect(getComputedStyle(row('4.1 L 6 cilindros'), '::before').backgroundColor).toBe(rgb(theme.colors.accent))
      expect(chosen.boxShadow === 'none').toBe(!theme.glow)
      expect(getComputedStyle(row('2.5 L 4 cilindros')).color).toBe(rgb(theme.colors.text))
      const years = row('Terceira geração 1980–1992').lastElementChild!
      expect(getComputedStyle(years).color).toBe(rgb(theme.colors.textMuted))
    })
  }
}

// Checks the tree is named, its branches tell whether they are open, the open ones hold a group of items, the
// leaves tell whether they are selected, and an empty branch has neither a chevron nor aria-expanded. Each item
// is named by its own row, not by the rows inside it.
test('Web: the tree has tree, treeitem and group semantics', async () => {
  const screen = await render(<Sample />)
  await expect.element(screen.getByRole('tree', { name: 'Modelos Chevrolet' })).toBeVisible()
  await expect.element(screen.getByRole('treeitem', { name: 'Opala', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await expect.element(screen.getByRole('treeitem', { name: 'Chevette' })).toHaveAttribute('aria-expanded', 'false')
  const opala = screen.getByRole('treeitem', { name: 'Opala', exact: true }).element()
  expect(opala.querySelector(':scope > div > div > [role=group]')).not.toBeNull()
  await expect.element(screen.getByRole('treeitem', { name: '4.1 L 6 cilindros' })).toHaveAttribute('aria-selected', 'true')
  await expect.element(screen.getByRole('treeitem', { name: '2.5 L 4 cilindros' })).toHaveAttribute('aria-selected', 'false')
  const monza = screen.getByRole('treeitem', { name: 'Monza' })
  await expect.element(monza).not.toHaveAttribute('aria-expanded')
  await expect.element(monza).not.toHaveAttribute('aria-selected')
  expect(monza.element().querySelector('svg')).toBeNull()
  expect(screen.getByRole('treeitem', { name: 'Chevette' }).element().querySelector('svg')).not.toBeNull()
})

// Opens on the path to the selected engine with the rest closed, then clicks a closed branch, an open one, an
// empty one and an engine, and checks the branches open and close, the empty one stays put and the engine goes
// to onSelect and becomes the selected one.
test('Web: clicks open and close branches and select leaves', async () => {
  const onSelect = vi.fn()
  const screen = await render(<Sample onSelect={onSelect} />)
  await expect.element(screen.getByRole('treeitem', { name: 'Segunda geração' })).not.toBeInTheDocument()
  await screen.getByText('Chevette').click()
  await expect.element(screen.getByRole('treeitem', { name: 'Segunda geração' })).toBeVisible()
  await screen.getByText('Diplomata').click()
  await expect.element(screen.getByRole('treeitem', { name: 'Diplomata' })).toHaveAttribute('aria-expanded', 'false')
  await expect.element(screen.getByRole('treeitem', { name: '1986' })).not.toBeInTheDocument()
  await screen.getByText('Monza').click()
  await expect.element(screen.getByRole('treeitem', { name: 'Monza' })).not.toHaveAttribute('aria-expanded')
  await screen.getByText('Diplomata').click()
  await screen.getByText('2.5 L 4 cilindros').click()
  expect(onSelect).toHaveBeenLastCalledWith('2.5')
  await expect.element(screen.getByRole('treeitem', { name: '2.5 L 4 cilindros' })).toHaveAttribute('aria-selected', 'true')
  await expect.element(screen.getByRole('treeitem', { name: '4.1 L 6 cilindros' })).toHaveAttribute('aria-selected', 'false')
})

// Tabs in from a button before the tree and out to one after it, and checks the tree is a single Tab stop on the
// selected engine, whichever item had the focus last.
test('Web: Tab enters the tree on the selected leaf and leaves it at once', async () => {
  const screen = await render(
    <>
      <button type="button">Antes</button>
      <Sample />
      <button type="button">Depois</button>
    </>,
  )
  await screen.getByRole('button', { name: 'Antes' }).click()
  await userEvent.keyboard('{Tab}')
  await expect.element(screen.getByRole('treeitem', { name: '4.1 L 6 cilindros' })).toHaveFocus()
  await userEvent.keyboard('{Home}{Tab}')
  await expect.element(screen.getByRole('button', { name: 'Depois' })).toHaveFocus()
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
  await expect.element(screen.getByRole('treeitem', { name: 'Chevette' })).toHaveFocus()
})

// Walks the tree with the keyboard and checks Down and Up move between rows on screen, Right opens a branch and
// then goes into it, Left closes it or goes up to the parent, Home and End reach the ends, and Enter and Space
// select an engine or open and close a branch.
test('Web: the keyboard moves, opens, closes and selects', async () => {
  const onSelect = vi.fn()
  const screen = await render(<Sample onSelect={onSelect} />)
  const item = (name: string) => screen.getByRole('treeitem', { name, exact: true })
  await userEvent.click(row('Chevette'))
  await userEvent.keyboard('{ArrowRight}')
  await expect.element(item('Chevette')).toHaveAttribute('aria-expanded', 'true')
  await userEvent.keyboard('{ArrowRight}')
  await expect.element(item('Segunda geração')).toHaveFocus()
  await userEvent.keyboard('{ArrowLeft}')
  await expect.element(item('Chevette')).toHaveFocus()
  await userEvent.keyboard('{ArrowLeft}')
  await expect.element(item('Chevette')).toHaveAttribute('aria-expanded', 'false')
  await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
  await expect.element(item('Terceira geração 1980–1992')).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  await expect.element(item('Terceira geração 1980–1992')).toHaveAttribute('aria-expanded', 'false')
  await userEvent.keyboard(' ')
  await expect.element(item('Terceira geração 1980–1992')).toHaveAttribute('aria-expanded', 'true')
  await userEvent.keyboard('{End}')
  await expect.element(item('Monza')).toHaveFocus()
  await userEvent.keyboard('{ArrowUp}')
  await expect.element(item('4.1 L 6 cilindros')).toHaveFocus()
  await userEvent.keyboard('{ArrowUp}{Enter}')
  expect(onSelect).toHaveBeenLastCalledWith('2.5')
  await expect.element(item('2.5 L 4 cilindros')).toHaveAttribute('aria-selected', 'true')
  await userEvent.keyboard('{ArrowDown} ')
  expect(onSelect).toHaveBeenLastCalledWith(LEAF)
  await userEvent.keyboard('{ArrowLeft}')
  await expect.element(item('1986')).toHaveFocus()
  await userEvent.keyboard('{Home}')
  await expect.element(item('Chevette')).toHaveFocus()
})

// Opens a branch and checks its children show at once, so the keyboard can move into them, and its chevron turns
// and its children slide open over the motion duration; then turns reduced motion on and checks both happen at
// once. Once closed, the children are hidden, not only cut off.
test('Web: the chevron turns and the children slide open, at once with reduced motion', async () => {
  try {
    const screen = await render(<Sample selected={undefined} />)
    const chevette = screen.getByRole('treeitem', { name: 'Chevette' }).element()
    const chevron = chevette.querySelector('svg')!
    const group = chevette.querySelector<HTMLElement>(':scope > div[role=none]')!
    expect(getComputedStyle(chevron).rotate).toBe('none')
    expect(getComputedStyle(group).visibility).toBe('hidden')
    expect(getComputedStyle(group).transitionDuration).toMatch(/^0\.18s/)
    expect(getComputedStyle(chevron).transitionDuration).toMatch(/^0\.18s/)
    await userEvent.click(row('Chevette'))
    expect(getComputedStyle(group).visibility).toBe('visible')
    await expect.poll(() => getComputedStyle(chevron).rotate).toBe('90deg')
    await commands.reduceMotion(true)
    expect(getComputedStyle(group).transitionProperty).toBe('none')
    expect(getComputedStyle(chevron).transitionProperty).toBe('none')
    await userEvent.click(row('Chevette'))
    expect(getComputedStyle(group).visibility).toBe('hidden')
  } finally {
    await commands.reduceMotion(false)
  }
})

// Puts a long line of models with a long name in a short tree on a 360px phone, and checks the tree scrolls
// inside its own height without getting wider than its column, the long name is cut short on one line, and End
// brings the last model into view.
test('Web: the tree scrolls inside its own height on a phone', async () => {
  await page.viewport(360, 780)
  try {
    const many: TreeNode[] = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, label: `Modelo ${i + 1}`, children: [] }))
    const long: TreeNode = { id: 'long', label: 'Bonanza cabine dupla de quatro portas e caçamba', detail: '1989–1994', children: [] }
    const screen = await render(
      <div style={{ width: 328 }}>
        <TreeView label="Modelos" nodes={[long, ...many]} onSelect={() => {}} className="h-40" />
      </div>,
    )
    const tree = screen.getByRole('tree').element()
    expect(tree.scrollWidth).toBeLessThanOrEqual(tree.clientWidth)
    expect(tree.getBoundingClientRect().width).toBeLessThanOrEqual(328)
    expect(tree.scrollHeight).toBeGreaterThan(tree.clientHeight)
    const longRow = row('Bonanza cabine dupla de quatro portas e caçamba 1989–1994').getBoundingClientRect()
    expect(longRow.height).toBe(row('Modelo 1').getBoundingClientRect().height)
    await userEvent.click(row('Modelo 1'))
    await userEvent.keyboard('{End}')
    const last = screen.getByRole('treeitem', { name: 'Modelo 12' }).element().getBoundingClientRect()
    expect(last.bottom).toBeLessThanOrEqual(tree.getBoundingClientRect().bottom)
  } finally {
    await page.viewport(1280, 720)
  }
})

function Sample({ onSelect, ...props }: { onSelect?: (id: string) => void; selected?: string }) {
  const [selected, setSelected] = useState<string | undefined>('selected' in props ? props.selected : LEAF)
  return (
    <TreeView
      label="Modelos Chevrolet"
      nodes={MODELS}
      selected={selected}
      onSelect={(id) => {
        setSelected(id)
        onSelect?.(id)
      }}
    />
  )
}
