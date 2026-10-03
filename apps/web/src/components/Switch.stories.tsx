import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Segmented } from './Segmented.tsx'
import { Switch } from './Switch.tsx'

// The switch and the segmented choice on their own, in every state. Focus-visible is forced by
// storybook-addon-pseudo-states through the class below; switch Style and Mode in the toolbar to see each
// combination.

const meta = {
  title: 'Components/Switch',
  component: Switch,
  args: { checked: false, onCheckedChange: () => {}, children: 'Modo escuro' },
} satisfies Meta<typeof Switch>
export const SegmentedChoice: Story = {
  render: () => <SampleSegmented />,
}
export const States: Story = {
  parameters: { pseudo: { focusVisible: ['.focus button'] } },
  render: () => (
    <div className="grid justify-items-start gap-4 p-6">
      <Switch checked={false} onCheckedChange={() => {}}>Desligado</Switch>
      <Switch checked onCheckedChange={() => {}}>Ligado</Switch>
      <div className="focus">
        <Switch checked onCheckedChange={() => {}}>Com foco</Switch>
      </div>
      <Switch checked={false} onCheckedChange={() => {}} disabled>
        Desativado
      </Switch>
      <SampleSwitch />
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta

function SampleSegmented() {
  const [value, setValue] = useState('eighties')
  return (
    <div className="p-6">
      <Segmented
        label="Tema"
        options={[
          { value: 'eighties', label: 'Anos 80' },
          { value: 'gt4', label: 'GT4' },
          { value: 'bmw90', label: 'BMW 90' },
          { value: 'fiat90', label: 'Fiat 90' },
        ]}
        value={value}
        onValueChange={setValue}
      />
    </div>
  )
}

function SampleSwitch() {
  const [checked, setChecked] = useState(false)
  return (
    <Switch checked={checked} onCheckedChange={setChecked}>
      Clique para alternar
    </Switch>
  )
}
