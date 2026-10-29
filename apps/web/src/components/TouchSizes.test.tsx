import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH, MIN_TOUCH_TARGET } from '@apc/shared/screens'
import { scales } from '@apc/shared/theme'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { BackButton } from './BackButton.tsx'
import { Button } from './Button.tsx'
import { CloseButton } from './CloseButton.tsx'
import { Combobox } from './Combobox.tsx'
import { FilterChip } from './FilterChip.tsx'
import { Menu, MenuItem } from './Menu.tsx'
import { Segmented } from './Segmented.tsx'
import { Select } from './Select.tsx'
import { TextField } from './TextField.tsx'

// The heights each control had on the desktop before the phone sizes, which it keeps there, in px.
const DESKTOP = {
  buttonMd: 46,
  buttonSm: 34,
  back: 44,
  close: 36,
  chip: 26,
  segmentedOption: 24,
  segmented: 30,
  field: 46,
  combobox: 46,
  select: 34,
  listOption: 36,
  menuTrigger: 35.59375,
  menuItem: 36,
}
const OPTIONS = [
  { value: 'freios', label: 'Freios' },
  { value: 'motor', label: 'Motor' },
]
// The heights each control has on a phone, in px: what a finger needs.
const PHONE = {
  buttonMd: scales.touch.button,
  buttonSm: scales.touch.buttonSm,
  back: scales.touch.icon,
  close: scales.touch.icon,
  chip: scales.touch.icon,
  segmentedOption: scales.touch.segment,
  // The options and the track's 4px padding on each side.
  segmented: scales.touch.segment + 2 * scales.space.s1 + 2,
  field: scales.touch.field,
  combobox: scales.touch.field,
  select: scales.touch.field,
  listOption: scales.touch.row,
  menuTrigger: MIN_TOUCH_TARGET,
  menuItem: scales.touch.row,
}

/**
 * Renders one of each control and reads their heights, with the select's list and then the menu open.
 * @returns Each control's height, in px, with the password field's eye button's width and height.
 */
async function heights() {
  const screen = await render(<Controls />)
  const height = (id: string) => screen.getByTestId(id).first().element().getBoundingClientRect().height
  await screen.getByTestId('common.select.button').click()
  const select = height('common.select.button')
  const listOption = height('common.select.list.option')
  await screen.getByTestId('common.select.button').click()
  await screen.getByRole('button', { name: 'Menu do usuário' }).click()
  const eye = screen.getByRole('button', { name: 'Mostrar senha' }).element().getBoundingClientRect()
  const found = {
    buttonMd: screen.getByRole('button', { name: 'Salvar' }).element().getBoundingClientRect().height,
    buttonSm: screen.getByRole('button', { name: 'Cancelar' }).element().getBoundingClientRect().height,
    back: height('common.back-button'),
    close: height('common.close-button'),
    chip: height('common.filter-chip'),
    segmentedOption: height('common.segmented.option'),
    segmented: height('common.segmented'),
    field: height('common.text-field.frame'),
    combobox: height('common.combobox.frame'),
    select,
    listOption,
    menuTrigger: height('common.menu.trigger'),
    menuItem: height('common.menu-item'),
  }
  const password = screen.getByTestId('common.text-field.frame').last().element().getBoundingClientRect().height
  await screen.unmount()
  return { found, eye: [eye.width, eye.height], password }
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

afterAll(async () => {
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

// Renders every control a finger reaches at 360×780 and checks each is as tall as a phone asks: 52px for a button, a
// field and a select, 44px for a small button, the back arrow, the ×, a chip and the menu's trigger, 56px for a list's
// or a menu's row. The password field's eye is a 44px button, and the field stays 52px around it.
test('Web: on a phone every control is tall enough for a finger', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const { found, eye, password } = await heights()
  expect(found).toEqual(PHONE)
  expect(Math.min(...Object.values(found))).toBeGreaterThanOrEqual(scales.touch.segment)
  expect(eye).toEqual([scales.touch.icon, scales.touch.icon])
  expect(password).toBe(scales.touch.field)
})

// Renders the same controls at 1280×720 and checks each keeps the height it had before the phone sizes.
test('Web: on the desktop every control keeps its height', async () => {
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
  const { found } = await heights()
  expect(found).toEqual(DESKTOP)
})

// Checks the text a phone's keyboard types into is 16px, so the browser doesn't zoom in when a field gets focus.
test('Web: on a phone the fields type in 16px text', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const screen = await render(<Controls />)
  for (const field of [screen.getByLabelText('Nome'), screen.getByLabelText('Categoria')]) {
    expect(getComputedStyle(field.element()).fontSize).toBe(`${scales.fontSize.base}px`)
  }
  expect(getComputedStyle(screen.getByTestId('common.select.button').element()).fontSize).toBe(`${scales.fontSize.base}px`)
})

function Controls() {
  return (
    <div className="grid gap-4 p-4">
      <Button>Salvar</Button>
      <Button size="sm" variant="secondary">
        Cancelar
      </Button>
      <BackButton label="Voltar" onClick={() => {}} />
      <CloseButton onClick={() => {}} />
      <FilterChip pressed={false} onPressedChange={() => {}}>
        Esgotado
      </FilterChip>
      <Segmented label="Posição" options={OPTIONS} value="freios" onValueChange={() => {}} />
      <TextField label="Nome" value="" onValueChange={() => {}} />
      <Combobox
        label="Categoria"
        value=""
        onValueChange={() => {}}
        options={['Freios']}
        onCreate={() => {}}
        noun="categoria"
        toggleLabel="Mostrar categorias"
        emptyLabel="Nenhuma"
      />
      <Select aria-label="Ordenar" options={OPTIONS} value="freios" onValueChange={() => {}} />
      <Menu label="Menu do usuário" trigger={<span>CC</span>}>
        <MenuItem onSelect={() => {}}>Sair</MenuItem>
      </Menu>
      <TextField label="Senha" kind="password" value="" onValueChange={() => {}} />
    </div>
  )
}
