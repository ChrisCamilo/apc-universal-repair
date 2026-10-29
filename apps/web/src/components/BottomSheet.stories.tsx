import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import { BottomSheet } from './BottomSheet.tsx'
import { Button } from './Button.tsx'
import { Text } from './Typography.tsx'

// The Inventory's other actions in a sheet, as on a phone, and a long list of choices with "Limpar" beside the title
// and a footer, whose choices scroll once the sheet is as tall as it gets. The stories open at the phone's design size;
// drag the handle down, click the backdrop or press Escape to close, and switch Style and Mode in the toolbar.

const ACTIONS = ['Gerenciar listas', 'Importar CSV', 'Exportar CSV', 'Tutorial do estoque']
const CATEGORIES = ['Todas', 'Arrefecimento', 'Carroceria', 'Direção', 'Elétrica', 'Escapamento', 'Freios', 'Ignição', 'Iluminação', 'Injeção', 'Motor', 'Suspensão', 'Transmissão', 'Vidros']
const meta = {
  title: 'Components/BottomSheet',
  component: BottomSheet,
  args: { open: false, onClose: () => {}, title: '', children: null },
  globals: { viewport: { value: 'phone' } },
} satisfies Meta<typeof BottomSheet>
export const Actions: Story = {
  render: () => <MoreActions />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Mais ações' }))
  },
}
export const LongList: Story = {
  render: () => <CategoryChoice />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Categoria' }))
  },
}

type Story = StoryObj<typeof meta>

export default meta

function MoreActions() {
  const [open, setOpen] = useState(false)
  return (
    <div className="p-4">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Mais ações
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Mais ações">
        <div className="grid pb-4">
          {ACTIONS.map((action) => (
            <Button key={action} variant="ghost" onClick={() => setOpen(false)}>
              {action}
            </Button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}

function CategoryChoice() {
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState('Todas')
  return (
    <div className="grid justify-items-start gap-2 p-4">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Categoria
      </Button>
      <Text tone="muted">Escolhida: {chosen}</Text>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Categoria"
        action={
          <Button variant="ghost" size="sm" onClick={() => setChosen('Todas')}>
            Limpar
          </Button>
        }
        footer={<Button onClick={() => setOpen(false)}>Ver itens</Button>}
      >
        <div className="grid">
          {CATEGORIES.map((category) => (
            <Button key={category} variant={category === chosen ? 'secondary' : 'ghost'} onClick={() => setChosen(category)}>
              {category}
            </Button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
