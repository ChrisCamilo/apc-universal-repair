import { useState } from 'react'
import { themes } from '@apc/shared/theme'
import { beforeAll, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { Menu, MenuHeader, MenuItem, MenuLabel } from './Menu.tsx'
import { Segmented } from './Segmented.tsx'
import { Switch } from './Switch.tsx'

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
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
})

// Opens the menu and checks the roles: a menu with checkbox, radio and plain items, the header and section
// labels shown but not focusable, the focus on the first item and the trigger lit in the accent.
test('Web: the menu opens with its items and roles', async () => {
  const screen = await render(<UserMenu onTutorial={() => {}} />)
  const trigger = screen.getByRole('button', { name: 'Menu do usuário' })
  await expect.element(trigger).toHaveAttribute('aria-haspopup', 'menu')
  await trigger.click()
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect.element(screen.getByRole('menu', { name: 'Menu do usuário' })).toBeVisible()
  await expect.element(screen.getByText('christian.camilo', { exact: true }).last()).toBeVisible()
  await expect.element(screen.getByText('Aparência')).toBeVisible()
  await expect.element(screen.getByRole('menuitemcheckbox', { name: 'Modo escuro' })).toHaveFocus()
  await expect.element(screen.getByRole('menuitemradio', { name: 'GT4' })).toBeInTheDocument()
  await expect.element(screen.getByRole('group', { name: 'Tema' })).toBeInTheDocument()
  await expect.element(screen.getByRole('menuitem', { name: /Tutorial do estoque/ })).toBeInTheDocument()
  // the trigger fades to the accent with the theme's motion
  await expect.poll(() => getComputedStyle(trigger.element()).borderColor).toBe(rgb(themes.eighties.night.colors.accent))
})

// Walks the items with Up and Down (wrapping around), Home and End, and checks the switch and the theme
// choice change with the keyboard while the menu stays open.
test('Web: arrows move between items and choices keep the menu open', async () => {
  const screen = await render(<UserMenu onTutorial={() => {}} />)
  await screen.getByRole('button', { name: 'Menu do usuário' }).click()
  const dark = screen.getByRole('menuitemcheckbox', { name: 'Modo escuro' })
  await userEvent.keyboard('{Enter}')
  await expect.element(dark).toHaveAttribute('aria-checked', 'false')

  await userEvent.keyboard('{ArrowDown}{ArrowDown}')
  await expect.element(screen.getByRole('menuitemradio', { name: 'GT4' })).toHaveFocus()
  await userEvent.keyboard(' ')
  await expect.element(screen.getByRole('menuitemradio', { name: 'GT4' })).toHaveAttribute('aria-checked', 'true')
  await expect.element(screen.getByRole('menu')).toBeVisible()

  await userEvent.keyboard('{End}')
  await expect.element(screen.getByRole('menuitem', { name: /Tutorial do estoque/ })).toHaveFocus()
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(dark).toHaveFocus()
  await userEvent.keyboard('{ArrowUp}{Home}')
  await expect.element(dark).toHaveFocus()

  await screen.getByRole('menuitemcheckbox', { name: /Arrastar/ }).click()
  await expect.element(screen.getByRole('menuitemcheckbox', { name: /Arrastar/ })).toHaveAttribute('aria-checked', 'true')
  await expect.element(screen.getByRole('menu')).toBeVisible()
})

// Runs a plain action item and checks it runs and closes the menu, with the focus back on the trigger.
test('Web: plain items run their action and close the menu', async () => {
  const onTutorial = vi.fn()
  const screen = await render(<UserMenu onTutorial={onTutorial} />)
  const trigger = screen.getByRole('button', { name: 'Menu do usuário' })
  await trigger.click()
  await screen.getByRole('menuitem', { name: /Tutorial do estoque/ }).click()
  expect(onTutorial).toHaveBeenCalledOnce()
  await expect.element(screen.getByRole('menu')).not.toBeInTheDocument()
  await expect.element(trigger).toHaveFocus()
})

// Closes the menu with Escape, with the trigger and with a click outside, checking the focus returns to
// the trigger after Escape and the trigger.
test('Web: Escape, the trigger and a click outside close the menu', async () => {
  const screen = await render(
    <>
      <UserMenu onTutorial={() => {}} />
      <p style={{ marginTop: 640 }}>Fora do menu</p>
    </>,
  )
  const trigger = screen.getByRole('button', { name: 'Menu do usuário' })
  await trigger.click()
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByRole('menu')).not.toBeInTheDocument()
  await expect.element(trigger).toHaveFocus()

  await trigger.click()
  await trigger.click()
  await expect.element(screen.getByRole('menu')).not.toBeInTheDocument()
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false')

  await trigger.click()
  await screen.getByText('Fora do menu').click()
  await expect.element(screen.getByRole('menu')).not.toBeInTheDocument()
})

// Checks the menu never gets wider than 290px or the screen minus 64px, and lines up with the trigger's end.
test('Web: the menu fits the screen under its trigger', async () => {
  const screen = await render(
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <UserMenu onTutorial={() => {}} />
    </div>,
  )
  const trigger = screen.getByRole('button', { name: 'Menu do usuário' })
  await trigger.click()
  const menu = screen.getByRole('menu').element().getBoundingClientRect()
  const button = trigger.element().getBoundingClientRect()
  expect(menu.width).toBeCloseTo(Math.min(290, window.innerWidth - 64), 0)
  expect(menu.right).toBeCloseTo(button.right, 0)
  expect(menu.top).toBeGreaterThan(button.bottom)
  expect(menu.top - button.bottom).toBeLessThan(8)
})

function UserMenu({ onTutorial }: { onTutorial: () => void }) {
  const [dark, setDark] = useState(true)
  const [style, setStyle] = useState('eighties')
  const [reorder, setReorder] = useState(false)
  return (
    <Menu label="Menu do usuário" trigger={<span>christian.camilo</span>}>
      <MenuHeader title="christian.camilo" subtitle="Oficina APC" />
      <MenuLabel>Aparência</MenuLabel>
      <Switch checked={dark} onCheckedChange={setDark}>
        Modo escuro
      </Switch>
      <Segmented
        label="Tema"
        options={[
          { value: 'eighties', label: 'Anos 80' },
          { value: 'gt4', label: 'GT4' },
        ]}
        value={style}
        onValueChange={setStyle}
      />
      <MenuLabel>Abas</MenuLabel>
      <Switch checked={reorder} onCheckedChange={setReorder} description="Troque a ordem pelo puxador">
        Arrastar para reordenar
      </Switch>
      <MenuItem description="Criar, procurar, editar e excluir um item de teste" onSelect={onTutorial}>
        Tutorial do estoque
      </MenuItem>
    </Menu>
  )
}
