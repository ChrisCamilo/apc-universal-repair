import { createRef, useState, type ComponentProps } from 'react'
import { FIELD_KINDS } from '@apc/shared/field'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../fonts.ts'
import '../index.css'
import { themeCss } from '../theme.ts'
import { SearchField, TextField } from './TextField.tsx'

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
    // Renders a plain field and one with an error in one style and mode, focuses the plain one with Tab
    // and checks the hairline, danger and accent frames and the ring.
    test(`Web: fields follow the ${style}/${mode} frame colors`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(
        <>
          <TextField label="Usuário" value="" onValueChange={() => {}} />
          <TextField label="Nome do item" value="" onValueChange={() => {}} error="Dê um nome ao item para salvar." />
        </>,
      )
      const frameOf = (label: string) => screen.getByLabelText(label).element().parentElement!
      expect(getComputedStyle(frameOf('Usuário')).borderColor).toBe(rgb(colors.hairline))
      expect(getComputedStyle(frameOf('Nome do item')).borderColor).toBe(rgb(colors.danger))
      expect(getComputedStyle(screen.getByRole('alert').element()).color).toBe(rgb(colors.danger))

      await userEvent.keyboard('{Tab}')
      await expect.element(screen.getByLabelText('Usuário')).toHaveFocus()
      await expect.poll(() => getComputedStyle(frameOf('Usuário')).borderColor).toBe(rgb(colors.accent))
      await expect.poll(() => getComputedStyle(frameOf('Usuário')).boxShadow).toContain('0px 0px 0px 3px')
    })
  }
}

// Types into a field through its visible label and checks the value reaches the owner, and that the
// error marks the field invalid and is read out with it.
test('Web: fields are labeled, typed into and described by their error', async () => {
  const onValueChange = vi.fn()
  const screen = await render(
    <>
      <Controlled label="Usuário" onChanged={onValueChange} />
      <TextField label="Código da peça" value="" onValueChange={() => {}} error="Informe o código da peça." />
    </>,
  )
  await screen.getByLabelText('Usuário').fill('christian')
  expect(onValueChange).toHaveBeenLastCalledWith('christian')

  const code = screen.getByLabelText('Código da peça')
  await expect.element(code).toHaveAttribute('aria-invalid', 'true')
  await expect.element(code).toHaveAccessibleDescription('Informe o código da peça.')
})

// Checks each kind sets the input type, autofill hint and on-screen keyboard.
test('Web: field kinds set the input type, autofill and keyboard', async () => {
  const kinds = ['username', 'password', 'email', 'number', 'decimal'] as const
  const screen = await render(
    <>
      {kinds.map((kind) => (
        <TextField key={kind} label={kind} kind={kind} value="" onValueChange={() => {}} />
      ))}
    </>,
  )
  for (const kind of kinds) {
    const input = screen.getByLabelText(kind).element()
    expect(input.getAttribute('type')).toBe(FIELD_KINDS[kind].type)
    expect(input.getAttribute('autocomplete')).toBe(FIELD_KINDS[kind].autoComplete)
    expect(input.getAttribute('inputmode')).toBe(FIELD_KINDS[kind].inputMode)
  }
})

// Reveals and hides a password with the eye toggle and checks the input type and the toggle's name
// and pressed state follow, and that the toggle shows the hand cursor like any clickable control.
test('Web: password fields hide the text until revealed', async () => {
  const screen = await render(<TextField label="Senha" kind="password" value="opala4100" onValueChange={() => {}} />)
  const input = screen.getByLabelText('Senha')
  await expect.element(input).toHaveAttribute('type', 'password')
  const show = screen.getByRole('button', { name: 'Mostrar senha' })
  expect(getComputedStyle(show.element()).cursor).toBe('pointer')

  await show.click()
  await expect.element(input).toHaveAttribute('type', 'text')
  const hide = screen.getByRole('button', { name: 'Ocultar senha' })
  await expect.element(hide).toHaveAttribute('aria-pressed', 'true')

  await hide.click()
  await expect.element(input).toHaveAttribute('type', 'password')
})

// Hands a ref to a field and checks it reaches the input, so a form can move the cursor to it, e.g. to the
// first empty field.
test('Web: a ref reaches the field input', async () => {
  const ref = createRef<HTMLInputElement>()
  const screen = await render(<TextField ref={ref} label="Usuário" value="" onValueChange={() => {}} />)
  ref.current!.focus()
  await expect.element(screen.getByLabelText('Usuário')).toHaveFocus()
})

// Types into a search, then clears it with the X and with Escape, checking the X only shows with
// content and the cursor stays in the search.
test('Web: search shows a clear button once there is content', async () => {
  const screen = await render(<ControlledSearch />)
  const search = screen.getByRole('searchbox', { name: 'Procure marca' })
  await expect.element(screen.getByRole('button', { name: 'Limpar busca' })).not.toBeInTheDocument()

  await search.fill('Opala')
  const clear = screen.getByRole('button', { name: 'Limpar busca' })
  expect(getComputedStyle(clear.element()).cursor).toBe('pointer')
  await clear.click()
  await expect.element(search).toHaveValue('')
  await expect.element(search).toHaveFocus()

  await search.fill('Santana')
  await userEvent.keyboard('{Escape}')
  await expect.element(search).toHaveValue('')
})

function Controlled({ label, onChanged }: { label: string; onChanged: (value: string) => void }) {
  const [value, setValue] = useState('')
  const props: ComponentProps<typeof TextField> = {
    label,
    value,
    onValueChange: (next) => {
      setValue(next)
      onChanged(next)
    },
  }
  return <TextField {...props} />
}

function ControlledSearch() {
  const [value, setValue] = useState('')
  return <SearchField label="Procure marca" value={value} onValueChange={setValue} />
}
