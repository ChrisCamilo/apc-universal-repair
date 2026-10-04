import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { cubeIcon, documentIcon, searchIcon, userIcon } from '@apc/shared/icons'
import { DASHBOARD_TAB_STORAGE_KEY } from '@apc/shared/tabs'
import { Text } from './Typography.tsx'
import { TabPanel, Tabs } from './Tabs.tsx'
import { useStoredTab } from './useStoredTab.ts'

// The Dashboard tabs. Hover and focus-visible are forced by storybook-addon-pseudo-states through the classes
// below; switch Style and Mode in the toolbar to see each combination. The Dashboard story remembers the last
// tab, so it reopens on it after a reload. In the Reorderable story, drag a tab by its grip (the accent line
// shows where it lands) or focus one and press Alt + Left/Right.

const DASHBOARD_TABS = ['stock', 'catalog'] as const
const STATES = [
  { name: 'default', className: undefined },
  { name: 'hover', className: 'hover' },
  { name: 'focus-visible', className: 'focus' },
]
const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  args: { label: '', tabs: [], selected: '', onSelect: () => {} },
} satisfies Meta<typeof Tabs>
export const Dashboard: Story = {
  render: () => <DashboardTabs />,
}
export const Reorderable: Story = {
  render: () => <ReorderableTabs />,
}
export const States: Story = {
  parameters: { pseudo: { hover: ['.hover button:not([aria-selected=true])'], focusVisible: ['.focus button[aria-selected=true]'] } },
  render: () => (
    <div className="grid gap-6 p-6">
      {STATES.map((state) => (
        <div key={state.name} className="grid gap-2">
          <span className="font-mono text-xs text-text-muted">{state.name}</span>
          <div className={`border-b border-hairline ${state.className ?? ''}`}>
            <SampleTabs />
          </div>
        </div>
      ))}
      <div className="grid gap-2">
        <span className="font-mono text-xs text-text-muted">label only</span>
        <div className="border-b border-hairline">
          <Tabs
            label="Sem ícone"
            tabs={[
              { id: 'stock', label: 'Estoque' },
              { id: 'catalog', label: 'Catálogo' },
            ]}
            selected="stock"
            onSelect={() => {}}
          />
        </div>
      </div>
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta

function DashboardTabs() {
  const [tab, setTab] = useStoredTab(DASHBOARD_TAB_STORAGE_KEY, DASHBOARD_TABS)
  return (
    <div className="grid gap-4 p-6">
      <div className="border-b border-hairline">
        <Tabs
          label="Seções do Dashboard"
          tabs={[
            { id: 'stock', label: 'Estoque', icon: cubeIcon, count: 12 },
            { id: 'catalog', label: 'Catálogo', icon: documentIcon },
          ]}
          selected={tab}
          onSelect={setTab}
        />
      </div>
      <TabPanel id="stock" selected={tab}>
        <Text>12 itens no estoque.</Text>
      </TabPanel>
      <TabPanel id="catalog" selected={tab}>
        <Text>Catálogo de modelos (fase 2).</Text>
      </TabPanel>
    </div>
  )
}

function ReorderableTabs() {
  const [tab, setTab] = useState('stock')
  const [order, setOrder] = useState(['stock', 'catalog', 'specs', 'clients'])
  const all = {
    stock: { id: 'stock', label: 'Estoque', icon: cubeIcon, count: 12 },
    catalog: { id: 'catalog', label: 'Catálogo', icon: documentIcon },
    specs: { id: 'specs', label: 'Fichas', icon: searchIcon },
    clients: { id: 'clients', label: 'Clientes', icon: userIcon },
  } as Record<string, { id: string; label: string; icon: typeof cubeIcon; count?: number }>
  return (
    <div className="grid gap-3 p-6">
      <div className="border-b border-hairline">
        <Tabs label="Seções do Dashboard" tabs={order.map((id) => all[id])} selected={tab} onSelect={setTab} reorderable onReorder={setOrder} />
      </div>
      <span className="font-mono text-xs text-text-muted">Ordem: {order.join(', ')}</span>
    </div>
  )
}

function SampleTabs() {
  const [tab, setTab] = useState<'stock' | 'catalog'>('stock')
  return (
    <Tabs
      label="Seções do Dashboard"
      tabs={[
        { id: 'stock', label: 'Estoque', icon: cubeIcon, count: 12 },
        { id: 'catalog', label: 'Catálogo', icon: documentIcon, count: 340 },
      ]}
      selected={tab}
      onSelect={setTab}
    />
  )
}
