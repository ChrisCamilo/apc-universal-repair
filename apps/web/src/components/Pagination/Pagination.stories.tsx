import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PAGE_SIZES } from '@apc/shared/pagination'
import { Pagination } from './Pagination.tsx'

// Pagination at the start, middle and end of a long list, on a single page, and with a page button hovered
// and focused; then working lists to page through and resize. Hover and focus-visible are forced by
// storybook-addon-pseudo-states through the classes below; switch Style and Mode in the toolbar to see each
// combination, and the mobile viewport to see it wrap at 360px.

const STATES = [
  { name: 'primeira página', page: 1, total: 240, className: undefined },
  { name: 'meio de uma lista longa', page: 5, total: 240, className: undefined },
  { name: 'última página', page: 10, total: 240, className: undefined },
  { name: 'página única', page: 1, total: 18, className: undefined },
  { name: 'hover na página 2', page: 1, total: 64, className: 'hover' },
  { name: 'focus-visible na página 2', page: 1, total: 64, className: 'focus' },
]
const meta = {
  title: 'Components/Pagination',
  component: Pagination,
  args: {
    label: 'Páginas do estoque',
    page: 1,
    pageSize: 25,
    total: 64,
    pageSizes: PAGE_SIZES,
    onPageChange: () => {},
    onPageSizeChange: () => {},
  },
} satisfies Meta<typeof Pagination>
export const LongList: Story = {
  render: () => <SampleList total={1234} />,
}
export const ShortList: Story = {
  render: () => <SampleList total={64} />,
}
export const States: Story = {
  // The page 2 button is the third in the nav, after "Página anterior" and page 1.
  parameters: { pseudo: { hover: ['.hover nav button:nth-child(3)'], focusVisible: ['.focus nav button:nth-child(3)'] } },
  render: () => (
    <div className="grid max-w-4xl gap-8 p-6">
      {STATES.map((state) => (
        <div key={state.name} className={`grid gap-2 ${state.className ?? ''}`}>
          <span className="font-mono text-xs text-text-muted">{state.name}</span>
          <Pagination
            label="Páginas do estoque"
            page={state.page}
            pageSize={25}
            total={state.total}
            pageSizes={PAGE_SIZES}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
          />
        </div>
      ))}
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta

function SampleList({ total }: { total: number }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0])
  return (
    <div className="max-w-4xl p-6">
      <Pagination
        label="Páginas do estoque"
        page={page}
        pageSize={pageSize}
        total={total}
        pageSizes={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}
