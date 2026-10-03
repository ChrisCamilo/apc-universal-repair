import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FilterChip, FilterChipGroup } from './FilterChip.tsx'

// Chips on their own in every state, a single-choice group (stock status) and multiple groups of small chips
// (position and side). Hover and focus-visible are forced by storybook-addon-pseudo-states through the
// classes below; switch Style and Mode in the toolbar to see each combination.

const POSITIONS = [
  { value: 'D', label: 'D', title: 'Dianteiro (inclui peças Ambos)' },
  { value: 'T', label: 'T', title: 'Traseiro (inclui peças Ambos)' },
  { value: 'N/A', label: 'N/A', title: 'Posição não se aplica' },
]
const SIDES = [
  { value: 'LD', label: 'LD', title: 'Direito (inclui peças Ambos)' },
  { value: 'LE', label: 'LE', title: 'Esquerdo (inclui peças Ambos)' },
  { value: 'N/A', label: 'N/A', title: 'Lado não se aplica' },
]
const STATES = [
  { name: 'off', pressed: false, className: undefined },
  { name: 'hover', pressed: false, className: 'hover' },
  { name: 'focus-visible', pressed: false, className: 'focus' },
  { name: 'on', pressed: true, className: undefined },
]
const meta = {
  title: 'Components/FilterChip',
  component: FilterChip,
  args: { pressed: false, onPressedChange: () => {}, children: 'Estoque baixo' },
} satisfies Meta<typeof FilterChip>
export const Groups: Story = {
  render: () => <SampleGroups />,
}
export const States: Story = {
  parameters: { pseudo: { hover: ['.hover'], focusVisible: ['.focus'] } },
  render: () => (
    <div className="flex flex-wrap items-end gap-6 p-6">
      {STATES.map((state) => (
        <div key={state.name} className="grid justify-items-start gap-2">
          <span className="font-mono text-xs text-text-muted">{state.name}</span>
          <FilterChip pressed={state.pressed} onPressedChange={() => {}} className={state.className}>
            Estoque baixo
          </FilterChip>
          <FilterChip size="sm" pressed={state.pressed} onPressedChange={() => {}} className={state.className}>
            LD
          </FilterChip>
        </div>
      ))}
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta

function SampleGroups() {
  const [status, setStatus] = useState<string | null>('low')
  const [positions, setPositions] = useState(['D'])
  const [sides, setSides] = useState<string[]>([])
  return (
    <div className="grid justify-items-start gap-6 p-6">
      <FilterChipGroup
        label="Situação do estoque"
        options={[
          { value: 'low', label: 'Estoque baixo' },
          { value: 'out', label: 'Esgotado' },
        ]}
        value={status}
        onValueChange={setStatus}
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <FilterChipGroup multiple size="sm" label="Posição" options={POSITIONS} value={positions} onValueChange={setPositions} />
        <FilterChipGroup multiple size="sm" label="Lado" options={SIDES} value={sides} onValueChange={setSides} />
      </div>
    </div>
  )
}
