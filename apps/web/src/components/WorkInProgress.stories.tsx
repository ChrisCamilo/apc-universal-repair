import type { Meta, StoryObj } from '@storybook/react-vite'
import { EmptyState } from './EmptyState.tsx'
import { Panel } from './Panel.tsx'
import { Heading, Text } from './Typography.tsx'
import { WorkInProgress } from './WorkInProgress.tsx'

// A screen still being built, as the Catalog tab shows while it is marked `wip`: the screen blurred and out of reach
// behind the notice with the mechanic. Switch Style and Mode in the toolbar to see each combination.

const meta = {
  title: 'Components/WorkInProgress',
  component: WorkInProgress,
  args: { label: 'Catálogo', children: null },
} satisfies Meta<typeof WorkInProgress>
export const CatalogTab: Story = {
  render: (args) => (
    <div className="p-6">
      <WorkInProgress {...args}>
        <div className="grid gap-3 md:grid-cols-[184px_minmax(0,1fr)]">
          <Panel>
            <EmptyState title="Marcas" message="Chevrolet, Volkswagen, Fiat e Ford." />
          </Panel>
          <Panel className="grid gap-2">
            <Heading level={3}>1986 · Chevrolet Opala Diplomata 2.5</Heading>
            <Text size="sm" tone="muted">
              Sedã de entrada do Diplomata, com o quatro cilindros 2.5.
            </Text>
          </Panel>
        </div>
      </WorkInProgress>
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta
