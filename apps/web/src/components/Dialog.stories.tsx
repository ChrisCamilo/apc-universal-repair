import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import { Button } from './Button.tsx'
import { Dialog } from './Dialog.tsx'
import { TextField } from './TextField.tsx'
import { Text } from './Typography.tsx'
import { useToast } from './toastContext.ts'
import { ToastProvider } from './Toast.tsx'

// A long form dialog, whose fields scroll while Cancel and Save stay pinned at the bottom, a delete
// confirmation with the danger button, and the toast that follows each. The stories open them on load;
// switch Style and Mode in the toolbar, and the mobile viewport to see them at 360px.

const FIELDS = ['Nome', 'Código da peça', 'Categoria', 'Marca da peça', 'Marca do veículo', 'Modelo do veículo', 'Cor', 'Localização', 'Valor unitário', 'Quantidade', 'Quantidade mínima']
const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  args: { open: false, onClose: () => {}, title: '', actions: null, children: null },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof Dialog>
export const Confirm: Story = {
  render: () => <DeleteConfirm />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Excluir item' }))
  },
}
export const LongForm: Story = {
  render: () => <ItemForm />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Novo item' }))
  },
}

type Story = StoryObj<typeof meta>

export default meta

function DeleteConfirm() {
  const [open, setOpen] = useState(false)
  const toast = useToast()
  return (
    <div className="p-6">
      <Button variant="danger" onClick={() => setOpen(true)}>
        Excluir item
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Excluir item?"
        size="confirm"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setOpen(false)
                toast('Item excluído')
              }}
            >
              Excluir
            </Button>
          </>
        }
      >
        <Text tone="muted">A pastilha de freio dianteira sai do estoque. Não dá para desfazer.</Text>
      </Dialog>
    </div>
  )
}

function ItemForm() {
  const [open, setOpen] = useState(false)
  const toast = useToast()
  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>Novo item</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Novo item"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setOpen(false)
                toast('Item adicionado')
              }}
            >
              Salvar item
            </Button>
          </>
        }
      >
        {FIELDS.map((label) => (
          <Field key={label} label={label} />
        ))}
      </Dialog>
    </div>
  )
}

function Field({ label }: { label: string }) {
  const [value, setValue] = useState('')
  return <TextField label={label} value={value} onValueChange={setValue} />
}
