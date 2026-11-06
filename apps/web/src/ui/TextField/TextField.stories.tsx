import { useState, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { lockIcon, userIcon } from '@apc/shared/icons'
import { SearchField, TextField } from './TextField.tsx'

// Every field state. Focus is forced on the frame inside the "focus" wrapper by storybook-addon-pseudo-states; switch
// Style and Mode in the toolbar to see each combination.

const meta = { title: 'Components/TextField', component: TextField } satisfies Meta<typeof TextField>
export const Login: Story = {
  args: { label: '', value: '', onValueChange: () => {} },
  render: () => (
    <div className="grid max-w-sm gap-4 p-6">
      <Field label="Usuário" kind="username" icon={userIcon} initial="christian.camilo" />
      <Field label="Senha" kind="password" icon={lockIcon} initial="opala4100" />
    </div>
  ),
}
export const Searches: Story = {
  args: { label: '', value: '', onValueChange: () => {} },
  render: () => (
    <div className="grid max-w-md gap-4 p-6">
      <Search label="Procure marca" initial="" />
      <Search label="Procure modelo ou código da peça" initial="Opala" />
    </div>
  ),
}
export const States: Story = {
  args: { label: '', value: '', onValueChange: () => {} },
  parameters: { pseudo: { focusWithin: ['.focus .rounded-pill'] } },
  render: () => (
    <div className="grid max-w-3xl grid-cols-[repeat(auto-fill,minmax(240px,1fr))] items-start gap-6 p-6">
      <Field label="Vazio" placeholder="Digite o nome" initial="" />
      <Field label="Preenchido" initial="Bomba d’água" />
      <div className="focus">
        <Field label="Com foco" initial="Bomba d’água" />
      </div>
      <Field label="Com ajuda" initial="" helper="Como está na embalagem" />
      <Field label="Com erro" initial="" error="Dê um nome ao item para salvar." />
      <Field label="Desligado" initial="Bomba d’água" disabled />
      <Field label="Valor unitário" kind="decimal" initial="189,90" />
      <Search label="Busca com conteúdo" initial="Opala" />
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta

function Field({ initial, ...props }: Omit<ComponentProps<typeof TextField>, 'value' | 'onValueChange'> & { initial: string }) {
  const [value, setValue] = useState(initial)
  return <TextField value={value} onValueChange={setValue} {...props} />
}

function Search({ label, initial }: { label: string; initial: string }) {
  const [value, setValue] = useState(initial)
  return <SearchField label={label} value={value} onValueChange={setValue} />
}
