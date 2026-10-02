import type { Meta, StoryObj } from '@storybook/react-vite'
import { BrandMark } from './BrandMark.tsx'

// The APC mark in its two variants. Switch Style and Mode in the toolbar: the needle and the inner
// rule follow the accent, the rest follows the text colors.

const meta = { title: 'Brand/BrandMark', component: BrandMark } satisfies Meta<typeof BrandMark>
export const Badge: Story = { args: { variant: 'badge', size: 240 } }
export const Compact: Story = { args: { variant: 'compact', size: 48 } }
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-8 p-6">
      {[120, 240].map((size) => (
        <figure key={`badge-${size}`} className="grid justify-items-center gap-2">
          <BrandMark variant="badge" size={size} />
          <figcaption className="font-mono text-xs text-text-muted">badge · {size}px</figcaption>
        </figure>
      ))}
      {[16, 24, 48].map((size) => (
        <figure key={`compact-${size}`} className="grid justify-items-center gap-2">
          <BrandMark variant="compact" size={size} />
          <figcaption className="font-mono text-xs text-text-muted">compact · {size}px</figcaption>
        </figure>
      ))}
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta
