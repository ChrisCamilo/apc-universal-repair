import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { TourStep } from '@apc/shared/tour'
import { searchIcon } from '@apc/shared/icons'
import { Button } from './Button.tsx'
import { Dialog } from './Dialog.tsx'
import { Panel } from './Panel.tsx'
import { TextField } from './TextField.tsx'
import { Tour } from './Tour.tsx'

// The guided tour over a small inventory screen: create a test item in a dialog, search for it and look at
// it. The full run starts on the first step; the other stories start on a step to show each state: a step
// inside the dialog, an info-only step with Next, and the last step with no target. Do each step or use
// "Fazer por mim" to see it move on by itself; close the dialog mid-step to see it go back. Switch Style and
// Mode in the toolbar, and the phone viewports to see the card pinned to the bottom.

const PARTS = ['Criar um item', 'Procurar']
const TEST_ITEM = 'Item de teste do tutorial'
const meta = {
  title: 'Components/Tour',
  component: Tour,
  args: { open: true, onClose: () => {}, steps: [] },
} satisfies Meta<typeof Tour>
export const FullRun: Story = {
  render: () => <SampleScreen />,
}
export const InDialog: Story = {
  render: () => <SampleScreen from="fill" />,
}
export const InfoStep: Story = {
  render: () => <SampleScreen from="found" />,
}
export const LastStep: Story = {
  render: () => <SampleScreen from="end" />,
}
export const Phone: Story = {
  globals: { viewport: { value: 'phoneMin' } },
  render: () => <SampleScreen />,
}

type Story = StoryObj<typeof meta>

export default meta

function SampleScreen({ from = 'new' }: { from?: string }) {
  const [touring, setTouring] = useState(true)
  const [items, setItems] = useState(['Filtro de óleo', 'Pastilha de freio', ...(from === 'new' || from === 'fill' ? [] : [TEST_ITEM])])
  const [creating, setCreating] = useState(from === 'fill')
  const [name, setName] = useState('')
  const [search, setSearch] = useState(from === 'found' || from === 'end' ? 'teste' : '')
  const shown = items.filter((item) => item.toLowerCase().includes(search.toLowerCase()))
  const byId = (id: string) => document.getElementById(id)

  const save = () => {
    setItems((prev) => [TEST_ITEM, ...prev.filter((item) => item !== TEST_ITEM)])
    setCreating(false)
  }
  const saved = items.includes(TEST_ITEM)
  const steps: TourStep<Element>[] = [
    {
      id: 'new',
      part: 1,
      title: 'Abra o cadastro',
      text: 'Clique em Novo item para cadastrar uma peça de teste.',
      target: () => byId('tour-new'),
      done: () => creating,
      auto: () => setCreating(true),
    },
    {
      id: 'fill',
      part: 1,
      title: 'Dê um nome',
      text: `Escreva “${TEST_ITEM}” no nome.`,
      target: () => byId('tour-name')?.closest('.grid') ?? null,
      done: () => name.trim() === TEST_ITEM,
      auto: () => setName(TEST_ITEM),
      lost: () => (creating ? null : 'new'),
    },
    {
      id: 'save',
      part: 1,
      title: 'Salve o item',
      text: 'Clique em Adicionar item. O item novo entra no topo da lista.',
      target: () => byId('tour-save'),
      done: () => saved && !creating,
      auto: save,
      lost: () => (creating || saved ? null : 'new'),
    },
    {
      id: 'search',
      part: 2,
      title: 'Procure pelo nome',
      text: 'Digite “teste” na busca.',
      target: () => byId('tour-search')?.closest('.grid') ?? null,
      done: () => search.toLowerCase().includes('teste'),
      auto: () => setSearch('teste'),
    },
    {
      id: 'found',
      part: 2,
      title: 'Aqui está o seu item',
      text: 'A busca deixou na lista só o que combina com ela: o item de teste.',
      target: () => document.querySelector('[data-item="test"]'),
    },
    {
      id: 'end',
      title: 'Pronto!',
      text: 'Você criou e encontrou um item. Para rever este tutorial, abra o menu do usuário.',
    },
  ]
  const start = steps.findIndex((step) => step.id === from)

  return (
    <div className="grid max-w-3xl gap-4 p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1">
          <TextField id="tour-search" label="Buscar" icon={searchIcon} value={search} onValueChange={setSearch} />
        </div>
        <Button id="tour-new" onClick={() => setCreating(true)}>
          Novo item
        </Button>
        {!touring && (
          <Button variant="secondary" onClick={() => setTouring(true)}>
            Rever tutorial
          </Button>
        )}
      </div>
      <Panel className="grid gap-1">
        {shown.map((item) => (
          <div key={item} data-item={item === TEST_ITEM ? 'test' : undefined} className="rounded-tile px-2 py-2 font-body text-sm text-text">
            {item}
          </div>
        ))}
      </Panel>
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Novo item"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button id="tour-save" size="sm" onClick={save}>
              Adicionar item
            </Button>
          </>
        }
      >
        <TextField id="tour-name" label="Nome" value={name} onValueChange={setName} />
      </Dialog>
      <Tour open={touring} onClose={() => setTouring(false)} steps={steps.slice(start)} parts={PARTS} />
    </div>
  )
}
