import type { Meta, StoryObj } from '@storybook/react-vite'
import { Panel } from '../Panel/Panel.tsx'
import { Text } from '../Typography/Typography.tsx'
import { Accordion } from './Accordion.tsx'

// Sections that open and close under their headers: two features' guides, the first one open; each state of a header
// alone; and the accordion at a phone's width, its headers a finger tall. Hover and focus-visible are forced by
// storybook-addon-pseudo-states through the classes below; switch Style and Mode in the toolbar to see each combination.
// Click the headers or use the keyboard: the arrows, Home and End move between them, and Enter or Space opens one.

const SECTIONS = [
  {
    id: 'oficina',
    title: 'Oficina',
    detail: '3 guias',
    content: (
      <div className="grid gap-2">
        <Text size="sm">Receber um carro e abrir a ordem de serviço.</Text>
        <Text size="sm">Pedir as peças que faltam.</Text>
        <Text size="sm">Entregar o carro com a nota.</Text>
      </div>
    ),
  },
  {
    id: 'balcao',
    title: 'Balcão',
    detail: '1 guia',
    content: <Text size="sm">Vender uma peça avulsa e dar baixa no estoque.</Text>,
  },
]
const STATES = [
  { name: 'closed', className: undefined, open: [] },
  { name: 'open', className: undefined, open: ['balcao'] },
  { name: 'hover', className: 'hover', open: [] },
  { name: 'focus-visible', className: 'focus', open: [] },
]
const meta = {
  title: 'Components/Accordion',
  component: Accordion,
  args: { sections: SECTIONS, defaultOpen: ['oficina'] },
} satisfies Meta<typeof Accordion>

type Story = StoryObj<typeof meta>

export default meta

export const Guides: Story = {
  render: (args) => (
    <div className="max-w-xl p-6">
      <Panel>
        <Accordion {...args} />
      </Panel>
    </div>
  ),
}
export const Phone: Story = {
  render: (args) => (
    <div className="w-90 p-4">
      <Panel>
        <Accordion {...args} />
      </Panel>
    </div>
  ),
}
export const States: Story = {
  parameters: { pseudo: { hover: ['.hover button'], focusVisible: ['.focus button'] } },
  render: () => (
    <div className="flex flex-wrap items-start gap-6 p-6">
      {STATES.map((state) => (
        <div key={state.name} className={`grid w-72 gap-2 ${state.className ?? ''}`}>
          <span className="font-mono text-xs text-text-muted">{state.name}</span>
          <Panel>
            <Accordion sections={[SECTIONS[1]]} defaultOpen={state.open} />
          </Panel>
        </div>
      ))}
    </div>
  ),
}
