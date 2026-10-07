import type { Meta, StoryObj } from '@storybook/react-vite'
import { FieldValue } from './FieldValue.tsx'
import { TextField } from './TextField.tsx'

// A field's value for reading, beside the text field it stands for, so the two can be compared in every style and
// mode (switch them in the toolbar); the long value shows the ellipsis and the tooltip.

const meta = {
  title: 'Components/FieldValue',
  component: FieldValue,
  args: { label: 'Nome', value: 'Filtro de óleo' },
} satisfies Meta<typeof FieldValue>
export const BesideAField: Story = {
  render: () => (
    <div className="grid max-w-xl grid-cols-2 items-start gap-4 p-6">
      <TextField label="Código da peça" value="W 712/95" onValueChange={() => {}} />
      <FieldValue label="Nome" value="Filtro de óleo" />
      <FieldValue label="Modelo do veículo" value="Qualquer modelo" />
      <FieldValue label="Local" value="Jogo de juntas do cabeçote com retentores de válvula" />
    </div>
  ),
}
export const Default: Story = {}

type Story = StoryObj<typeof meta>

export default meta
