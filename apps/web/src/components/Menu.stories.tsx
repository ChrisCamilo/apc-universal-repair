import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { documentIcon } from '@apc/shared/icons'
import { userEvent, within } from 'storybook/test'
import { Menu, MenuHeader, MenuItem, MenuLabel } from './Menu.tsx'
import { Segmented } from './Segmented.tsx'
import { Switch } from './Switch.tsx'

// The Dashboard's user menu: header, section labels, switches, segmented choices and a plain action. The
// Open story opens it; switches and choices keep it open, the action closes it. Switch Style and Mode in the
// toolbar to see each combination, and the mobile viewport to see it at 360px.

const meta = {
  title: 'Components/Menu',
  component: Menu,
  args: { label: '', trigger: null, children: null },
} satisfies Meta<typeof Menu>
export const Closed: Story = {
  render: () => <UserMenu />,
}
export const Open: Story = {
  render: () => <UserMenu />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Menu do usuário' }))
  },
}

type Story = StoryObj<typeof meta>

export default meta

function UserMenu() {
  const [dark, setDark] = useState(true)
  const [style, setStyle] = useState('eighties')
  const [reorder, setReorder] = useState(false)
  const [pageSize, setPageSize] = useState('25')
  const [rowOpen, setRowOpen] = useState(true)
  return (
    <div className="flex min-h-[calc(var(--spacing)*130)] justify-end p-6">
      <Menu
        label="Menu do usuário"
        trigger={
          <>
            <span className="grid size-7 place-items-center rounded-pill bg-accent font-display text-xs font-bold text-on-accent">CC</span>
            <span className="font-mono text-xs">christian.camilo</span>
          </>
        }
      >
        <MenuHeader title="christian.camilo" subtitle="Oficina APC" />
        <MenuLabel>Aparência</MenuLabel>
        <Switch checked={dark} onCheckedChange={setDark}>
          Modo escuro
        </Switch>
        <Segmented
          label="Tema"
          options={[
            { value: 'eighties', label: 'Anos 80' },
            { value: 'gt4', label: 'GT4' },
            { value: 'bmw90', label: 'BMW 90' },
            { value: 'fiat90', label: 'Fiat 90' },
          ]}
          value={style}
          onValueChange={setStyle}
        />
        <MenuLabel>Abas</MenuLabel>
        <Switch checked={reorder} onCheckedChange={setReorder} description="Troque a ordem pelo puxador ou com Alt + setas">
          Arrastar para reordenar
        </Switch>
        <MenuLabel>Estoque</MenuLabel>
        <Segmented
          label="Itens por página"
          description="Padrão ao abrir o estoque"
          options={['25', '50', '100'].map((size) => ({ value: size, label: size }))}
          value={pageSize}
          onValueChange={setPageSize}
        />
        <Switch checked={rowOpen} onCheckedChange={setRowOpen} description="Mostra os detalhes; editar fica a um clique">
          Abrir item ao clicar na linha
        </Switch>
        <MenuItem icon={documentIcon} description="Criar, procurar, editar e excluir um item de teste" onSelect={() => {}}>
          Tutorial do estoque
        </MenuItem>
      </Menu>
    </div>
  )
}
