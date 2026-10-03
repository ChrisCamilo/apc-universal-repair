import type { Meta, StoryObj } from '@storybook/react-vite'
import { Divider, Panel } from './Panel.tsx'
import { Heading, Text } from './Typography.tsx'

// Panels as the Dashboard nests them, and each option on its own. Switch Style and Mode in the toolbar to see
// each combination; nested panels take the tile radius and leave the sheen to the outer panel.

const meta = {
  title: 'Components/Panel',
  component: Panel,
  args: { children: null },
} satisfies Meta<typeof Panel>
export const Nesting: Story = {
  render: () => (
    <div className="max-w-3xl p-6">
      <Panel className="grid gap-3">
        <Heading level={3}>Chevrolet Opala</Heading>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
          <Panel>
            <ul className="m-0 grid list-none gap-1 p-0 font-mono text-sm">
              <li>Opala 2.5 · 1975–1992</li>
              <li>Opala 4.1 · 1975–1992</li>
              <li role="presentation">
                <Divider />
              </li>
              <li>Caravan 2.5 · 1975–1992</li>
              <li>Caravan 4.1 · 1975–1992</li>
            </ul>
          </Panel>
          <Panel raised className="grid content-start gap-2">
            <Heading level={4}>Opala 4.1</Heading>
            <Text size="sm" tone="muted">
              Seis cilindros em linha, tração traseira.
            </Text>
          </Panel>
        </div>
      </Panel>
    </div>
  ),
}
export const Options: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-4 p-6 sm:grid-cols-3">
      <Panel>
        <Text size="sm">Padrão: fundo do painel, borda suave e brilho no topo.</Text>
      </Panel>
      <Panel raised>
        <Text size="sm">Elevado: fundo mais claro que o painel ao redor.</Text>
      </Panel>
      <Panel sheen={false}>
        <Text size="sm">Sem brilho no topo.</Text>
      </Panel>
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta
