import type { Meta, StoryObj } from '@storybook/react-vite'
import { ICONS, searchIcon } from '@apc/shared/icons'
import { Icon } from './Icon.tsx'

// Every icon in the colors it is used with: text, muted text, accent and on-accent (inside a
// filled control). Switch Style and Mode in the toolbar to see each combination.

const COLORS = [
  { name: 'text', className: 'text-text' },
  { name: 'text-muted', className: 'text-text-muted' },
  { name: 'accent', className: 'text-accent' },
  { name: 'on-accent', className: 'rounded-tile bg-accent p-1 text-on-accent' },
]
const meta = { title: 'Foundations/Icon', component: Icon, args: { icon: searchIcon, size: 24 } } satisfies Meta<typeof Icon>
export const Catalog: Story = {
  render: () => (
    <table className="m-6 border-separate border-spacing-x-6 border-spacing-y-3">
      <thead>
        <tr>
          <th />
          {COLORS.map((color) => (
            <th key={color.name} className="font-mono text-xs font-normal text-text-muted">{color.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.entries(ICONS).map(([name, icon]) => (
          <tr key={name}>
            <th className="text-left font-mono text-xs font-normal">{name}</th>
            {COLORS.map((color) => (
              <td key={color.name}>
                <span className={`inline-flex ${color.className}`}>
                  <Icon icon={icon} size={20} />
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}
export const Playground: Story = {}
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6 p-6">
      {[12, 16, 20, 24, 32].map((size) => (
        <figure key={size} className="grid justify-items-center gap-2">
          <Icon icon={searchIcon} size={size} />
          <figcaption className="font-mono text-xs text-text-muted">{size}px</figcaption>
        </figure>
      ))}
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta
