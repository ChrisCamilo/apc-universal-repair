import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Stepper } from './Stepper.tsx'

// The stepper on its own: at 0, with the − locked, in the middle, at its limit, with the + locked, and with an error.
// Switch Style and Mode in the toolbar to see each combination.

const meta = {
  title: 'Components/Stepper',
  component: Stepper,
  args: { label: 'Quantidade mínima', value: '1', onValueChange: () => {}, max: 5 },
} satisfies Meta<typeof Stepper>
export const Playground: Story = {
  render: (args) => <SampleStepper {...args} />,
}
export const States: Story = {
  render: () => (
    <div className="grid justify-items-start gap-6 p-6">
      <Stepper label="No zero" value="" onValueChange={() => {}} max={5} helper="O − fica travado no zero." />
      <Stepper label="No meio" value="2" onValueChange={() => {}} max={5} />
      <Stepper label="No limite" value="5" onValueChange={() => {}} max={5} helper="O + fica travado no limite." />
      <Stepper label="Com erro" value="9" onValueChange={() => {}} max={5} error="Informe no máximo 5." />
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta

/** A stepper that keeps its own number, starting from the story's. */
function SampleStepper(props: Parameters<typeof Stepper>[0]) {
  const [value, setValue] = useState(props.value)
  return (
    <div className="p-6">
      <Stepper {...props} value={value} onValueChange={setValue} helper="Abaixo disso, somando as marcas, o item fica com estoque baixo." />
    </div>
  )
}
