import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import { Select } from './Select.tsx'

// Single and multiple choice, closed in every state and open with more than five options, so the list
// scrolls. Switch Style and Mode in the toolbar to see each combination.

const CATEGORIES = ['Arrefecimento', 'Elétrica', 'Freios', 'Ignição', 'Motor', 'Suspensão', 'Transmissão'].map(
  (label) => ({ value: label, label }),
)
const SORTS = [
  { value: 'name', label: 'Nome (A–Z)' },
  { value: 'qty', label: 'Quantidade' },
  { value: 'price', label: 'Preço' },
]
const meta = {
  title: 'Components/Select',
  component: Select,
  args: { options: [], value: '', onValueChange: () => {} },
} satisfies Meta<typeof Select>
export const MultipleOpen: Story = {
  render: () => (
    <div className="max-w-xs p-6 pb-60">
      <Multiple initial={['Freios', 'Motor']} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox'))
  },
}
export const SingleOpen: Story = {
  render: () => (
    <div className="max-w-xs p-6 pb-40">
      <Single />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox'))
  },
}
export const States: Story = {
  render: () => (
    <div className="grid max-w-3xl grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 p-6">
      {[
        { name: 'nothing chosen', initial: [] },
        { name: 'one chosen', initial: ['Freios'] },
        { name: 'several chosen', initial: ['Freios', 'Motor', 'Suspensão'] },
      ].map((state) => (
        <div key={state.name} className="grid gap-2">
          <span className="font-mono text-xs text-text-muted">{state.name}</span>
          <Multiple initial={state.initial} />
        </div>
      ))}
      <div className="grid gap-2">
        <span className="font-mono text-xs text-text-muted">single</span>
        <Single />
      </div>
      <div className="grid gap-2">
        <span className="font-mono text-xs text-text-muted">disabled</span>
        <Select aria-label="Categoria" multiple allLabel="Todas" options={CATEGORIES} value={[]} onValueChange={() => {}} disabled />
      </div>
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta

function Multiple({ initial }: { initial: string[] }) {
  const [value, setValue] = useState(initial)
  return <Select aria-label="Categoria" multiple allLabel="Todas" options={CATEGORIES} value={value} onValueChange={setValue} />
}

function Single() {
  const [value, setValue] = useState('name')
  return <Select aria-label="Ordenar" options={SORTS} value={value} onValueChange={setValue} />
}
