import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { TreeNode } from '@apc/shared/tree'
import { Panel } from './Panel.tsx'
import { TreeView } from './TreeView.tsx'
import { NumericReadout } from './Typography.tsx'

// The model tree of the Catalog tab: the Chevrolet line opened down to the selected engine, next to a readout
// standing in for the detail panel; each state of a row alone; a long line of models scrolling inside a short
// panel, with a name too long for its row; and the tree at a phone's width. Hover and focus-visible are forced
// by storybook-addon-pseudo-states through the classes below; switch Style and Mode in the toolbar to see each
// combination. Click the rows or use the keyboard: the arrows, Home, End, Enter and Space.

const DIPLOMATA: TreeNode = {
  id: 'opala-3-diplomata',
  label: 'Diplomata',
  children: [
    { id: 'opala-3-diplomata-1985', label: '1985', children: [] },
    {
      id: 'opala-3-diplomata-1986',
      label: '1986',
      children: [
        { id: 'opala-3-diplomata-1986-2.5', label: '2.5 L 4 cilindros' },
        { id: 'opala-3-diplomata-1986-4.1', label: '4.1 L 6 cilindros' },
      ],
    },
  ],
}
const OPALA: TreeNode = {
  id: 'opala',
  label: 'Opala',
  children: [
    { id: 'opala-1', label: 'Primeira geração', detail: '1968–1974', children: [] },
    { id: 'opala-2', label: 'Segunda geração', detail: '1975–1979', children: [] },
    {
      id: 'opala-3',
      label: 'Terceira geração',
      detail: '1980–1992',
      children: [{ id: 'opala-3-comodoro', label: 'Comodoro', children: [] }, DIPLOMATA, { id: 'opala-3-ss', label: 'SS', children: [] }],
    },
  ],
}
const CHEVROLET: TreeNode[] = [
  { id: 'chevette', label: 'Chevette', children: [{ id: 'chevette-2', label: 'Segunda geração', detail: '1983–1993', children: [] }] },
  OPALA,
  { id: 'monza', label: 'Monza', children: [] },
]
const LEAF = 'opala-3-diplomata-1986-4.1'
const LINEUP: TreeNode[] = [
  ...CHEVROLET,
  ...['Kadett', 'Ipanema', 'Caravan', 'Marajó', 'D-20', 'Veraneio', 'Omega', 'Vectra'].map((name) => ({
    id: name.toLowerCase(),
    label: name,
    children: [{ id: `${name.toLowerCase()}-1`, label: 'Primeira geração', children: [] }],
  })),
  {
    id: 'bonanza',
    label: 'Bonanza',
    children: [{ id: 'bonanza-1', label: 'Primeira geração, cabine dupla de quatro portas', detail: '1989–1994', children: [] }],
  },
]
const STATES = [
  { name: 'closed', className: undefined, nodes: [OPALA], expanded: [], selected: undefined },
  { name: 'open', className: undefined, nodes: [OPALA], expanded: ['opala'], selected: undefined },
  { name: 'empty branch', className: undefined, nodes: [{ id: 'monza', label: 'Monza', children: [] }], expanded: [], selected: undefined },
  { name: 'hover', className: 'hover', nodes: [OPALA], expanded: [], selected: undefined },
  { name: 'focus-visible', className: 'focus', nodes: [OPALA], expanded: [], selected: undefined },
  { name: 'selected leaf', className: undefined, nodes: [DIPLOMATA], expanded: undefined, selected: LEAF },
]
const meta = {
  title: 'Components/TreeView',
  component: TreeView,
  args: { label: 'Modelos Chevrolet', nodes: [], onSelect: () => {} },
} satisfies Meta<typeof TreeView>
export const Catalog: Story = {
  render: () => <Sample nodes={CHEVROLET} className="h-96" />,
}
export const Long: Story = {
  render: () => <Sample nodes={LINEUP} className="h-72" />,
}
export const Phone: Story = {
  render: () => (
    <div className="w-90">
      <Sample nodes={LINEUP} className="max-h-96" />
    </div>
  ),
}
export const States: Story = {
  parameters: { pseudo: { hover: ['.hover [data-row]'], focusVisible: ['.focus [role=treeitem]'] } },
  render: () => (
    <div className="flex flex-wrap items-start gap-6 p-6">
      {STATES.map((state) => (
        <div key={state.name} className={`grid w-72 gap-2 ${state.className ?? ''}`}>
          <span className="font-mono text-xs text-text-muted">{state.name}</span>
          <Panel>
            <TreeView
              label={state.name}
              nodes={state.nodes}
              defaultExpanded={state.expanded}
              selected={state.selected}
              onSelect={() => {}}
            />
          </Panel>
        </div>
      ))}
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta

function Sample({ nodes, className }: { nodes: TreeNode[]; className: string }) {
  const [selected, setSelected] = useState(LEAF)
  return (
    <div className="grid max-w-xl gap-3 p-6">
      <Panel>
        <TreeView label="Modelos Chevrolet" nodes={nodes} selected={selected} onSelect={setSelected} className={className} />
      </Panel>
      <NumericReadout>{selected}</NumericReadout>
    </div>
  )
}
