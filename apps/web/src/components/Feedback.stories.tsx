import type { Meta, StoryObj } from '@storybook/react-vite'
import { searchIcon } from '@apc/shared/icons'
import { Button } from './Button.tsx'
import { EmptyState, ErrorState } from './EmptyState.tsx'
import { Panel } from './Panel.tsx'
import { Skeleton } from './Skeleton.tsx'
import { Spinner } from './Spinner.tsx'

// The shared loading and empty-state vocabulary: spinners in both sizes, alone and inside a button;
// skeletons shaped as the catalog tree rows, the detail panel and the inventory rows; the empty states
// with and without an action; and the error state. Switch Style and Mode in the toolbar to see each
// combination; with the system set to reduce motion, spinners fade instead of turning and skeletons stand still.

const meta = {
  title: 'Components/Feedback',
  component: Spinner,
} satisfies Meta<typeof Spinner>
export const EmptyStates: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-6">
      <Panel>
        <EmptyState
          title="Nenhum item cadastrado"
          message="Cadastre a primeira peça para começar o estoque."
          action={{ label: 'Adicionar item', onClick: () => {} }}
        />
      </Panel>
      <Panel>
        <EmptyState
          icon={searchIcon}
          title="Nenhum item encontrado"
          message="Ajuste a busca ou limpe os filtros para ver o estoque inteiro."
        />
      </Panel>
    </div>
  ),
}
export const ErrorStates: Story = {
  render: () => (
    <div className="max-w-md p-6">
      <Panel>
        <ErrorState
          title="Não foi possível carregar o estoque"
          message="O servidor não respondeu. Verifique a conexão e tente de novo."
          action={{ label: 'Tentar de novo', onClick: () => {} }}
        />
      </Panel>
    </div>
  ),
}
export const Skeletons: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-[minmax(0,1fr)_minmax(0,330px)] gap-3 p-6 max-[720px]:grid-cols-1">
      <Panel aria-busy="true" className="grid content-start gap-3">
        <Spinner size="sm" label="Carregando catálogo" className="text-text-muted" />
        {[70, 55, 62, 48, 66].map((width, i) => (
          <div key={i} className="flex items-center gap-2" style={{ paddingLeft: (i % 3) * 14 }}>
            <Skeleton shape="circle" width={12} />
            <Skeleton width={`${width}%`} />
          </div>
        ))}
      </Panel>
      <Panel aria-busy="true" className="grid content-start gap-3">
        <Skeleton shape="block" height={180} />
        <Skeleton width="60%" className="h-4" />
        <div className="flex gap-1.5">
          <Skeleton width={64} />
          <Skeleton width={52} />
          <Skeleton width={72} />
        </div>
        <Skeleton />
        <Skeleton />
        <Skeleton width="80%" />
      </Panel>
      <Panel aria-busy="true" className="col-span-full grid gap-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <Skeleton shape="block" width={44} height={44} />
            <div className="grid flex-1 gap-1.5">
              <Skeleton width="40%" />
              <Skeleton width="20%" />
            </div>
            <Skeleton width={56} />
          </div>
        ))}
      </Panel>
    </div>
  ),
}
export const Spinners: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-6 p-6 text-text">
      <Spinner size="sm" label="Carregando" />
      <Spinner label="Carregando" />
      <span className="text-accent">
        <Spinner label="Carregando" />
      </span>
      <Button loading>Entrando</Button>
      <Button variant="secondary" size="sm" loading>
        Salvando
      </Button>
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta
