import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import { Button } from './Button.tsx'
import { Combobox } from './Combobox.tsx'
import { Dialog } from './Dialog.tsx'

// The creatable combobox in every state, open with the full list, typing a new value that offers "+ Criar",
// and inside a dialog, where Escape closes only the list. Switch Style and Mode in the toolbar to see each
// combination.

const CATEGORIES = ['Arrefecimento', 'Elétrica', 'Freios', 'Ignição', 'Motor', 'Suspensão', 'Transmissão']
const meta = {
  title: 'Components/Combobox',
  component: Combobox,
  args: {
    label: '',
    value: '',
    onValueChange: () => {},
    options: [],
    onCreate: () => {},
    noun: '',
    toggleLabel: '',
    emptyLabel: '',
  },
} satisfies Meta<typeof Combobox>
export const CreateNew: Story = {
  render: () => (
    <div className="max-w-sm p-6 pb-60">
      <Category initial="" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole('combobox'), 'escapamento')
  },
}
export const InDialog: Story = {
  render: () => <SampleDialog />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Novo item' }))
  },
}
export const OpenList: Story = {
  render: () => (
    <div className="max-w-sm p-6 pb-60">
      <Category initial="Freios" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Mostrar categorias' }))
  },
}
export const States: Story = {
  render: () => (
    <div className="grid max-w-3xl grid-cols-[repeat(auto-fill,minmax(240px,1fr))] items-start gap-6 p-6">
      <Category initial="" />
      <Category initial="Freios" helper="Escolha da lista ou crie uma nova" />
      <Category initial="" error="Escolha uma categoria da lista ou crie uma nova." />
      <Category initial="Motor" disabled />
      <Category initial="" options={[]} />
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta

function Category({
  initial,
  options = CATEGORIES,
  helper,
  error,
  disabled,
}: {
  initial: string
  options?: string[]
  helper?: string
  error?: string
  disabled?: boolean
}) {
  const [value, setValue] = useState(initial)
  const [list, setList] = useState(options)
  return (
    <Combobox
      label="Categoria"
      placeholder="Escolha ou crie uma categoria"
      value={value}
      onValueChange={setValue}
      options={list}
      onCreate={(created) => setList((prev) => [...prev, created].sort((a, b) => a.localeCompare(b, 'pt-BR')))}
      noun="categoria"
      toggleLabel="Mostrar categorias"
      emptyLabel="Nenhuma categoria cadastrada"
      helper={helper}
      error={error}
      disabled={disabled}
    />
  )
}

function SampleDialog() {
  const [open, setOpen] = useState(false)
  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>Novo item</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Novo item"
        actions={
          <Button size="sm" onClick={() => setOpen(false)}>
            Salvar item
          </Button>
        }
      >
        <Category initial="" />
      </Dialog>
    </div>
  )
}
